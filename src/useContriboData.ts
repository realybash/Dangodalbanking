import { useState, useEffect } from 'react';
import { DashboardState, Customer, StaffMember, Transaction, ContriboSettings, AlertLog, AuditLog, Announcement } from './types';
import { db, auth } from './lib/firebase';
import { 
  doc, 
  collection, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  addDoc, 
  deleteDoc,
  query,
  orderBy,
  limit,
  Timestamp,
  getDocFromServer
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { OperationType, handleFirestoreError } from './lib/firestore-errors';
import { useToast } from './components/ToastProvider';

const STORAGE_KEY = 'contribo_dashboard_state_v10';
const USERS_KEY = 'contribo_local_auth_users_v2';

const DEFAULT_STATE: DashboardState = {
  settings: {
    profileName: '',
    profileInitials: '',
    orgName: 'Dan Godal savings',
    isLive: false,
    dailyTargetSavings: 0,
    profileEmail: '',
    profilePhone: '',
    profileRole: '',
    profileLocation: '',
    securityPin: '000000',
    currencySymbol: '₦',
    platformCommissionRate: 1.5,
    defaultSlotValue: 2000,
    withdrawalHoldLimit: 0,
    minBalanceThreshold: 0,
    partnerBankName: '',
    gatewayMode: 'disabled',
    gatewayApiKey: '',
    gatewayWebhookSecret: '',
    treasuryBalance: 50000000,
    treasuryAccountName: 'Central Contribution Treasury',
    treasuryAccountNumber: '1000000001',
  },
  staff: [],
  customers: [],
  transactions: [],
  alerts: [],
  auditLogs: [],
  announcements: []
};

const deduplicateById = <T extends { id: string }>(arr: T[]): T[] => {
  if (!Array.isArray(arr)) return [];
  const seen = new Set<string>();
  return arr.filter(item => {
    if (!item || !item.id) return false;
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const generateSeedAuditLogs = (loadedState: DashboardState): AuditLog[] => {
  const seedLogs: AuditLog[] = [];

  // 1. Trace Staff additions
  loadedState.staff.forEach((s, index) => {
    seedLogs.push({
      id: `aud_seed_staff_${s.id}`,
      timestamp: s.joinedDate || new Date(Date.now() - 30 * 24 * 3600 * 1000 - index * 3600 * 1000).toISOString(),
      actionType: 'ONBOARDING',
      actor: 'HQ Manager',
      title: 'Agent Account Created',
      description: `Mobilizer Agent ${s.name} (${s.code || 'STF-' + s.id}) registered and active at branch location ${s.location || 'Main Branch'}.`,
      severity: 'success'
    });
  });

  // 2. Trace Customer registrations
  loadedState.customers.forEach((c, index) => {
    // registration
    seedLogs.push({
      id: `aud_seed_cust_reg_${c.id}`,
      timestamp: c.joinedDate || new Date(Date.now() - 15 * 24 * 3600 * 1000 - index * 1800 * 1000).toISOString(),
      actionType: 'REGISTRATION',
      actor: 'Staff Agent',
      title: 'New Client Registered',
      description: `Registered new savings customer ${c.name} (NUBAN: ${c.accountNumber || 'Pending'}) assigned to primary mobilizer.`,
      severity: 'info'
    });

    // approvals if already active/approved
    if (c.approvalStatus === 'approved' || c.status === 'active') {
      const joinedObj = new Date(c.joinedDate || Date.now());
      seedLogs.push({
        id: `aud_seed_cust_app_${c.id}`,
        timestamp: new Date(joinedObj.getTime() + 5 * 60 * 1000).toISOString(), // 5 minutes later
        actionType: 'APPROVAL',
        actor: 'HQ Manager',
        title: 'Client Card Approved',
        description: `Verified security profile and approved savings passcard for ${c.name}.`,
        severity: 'success'
      });
    }
  });

  // 3. Trace past Transactions approvals/rejections
  loadedState.transactions.forEach((t) => {
    const txTime = new Date(t.timestamp);
    
    // Original submission
    seedLogs.push({
      id: `aud_seed_tx_sub_${t.id}`,
      timestamp: new Date(txTime.getTime() - 2 * 60 * 1000).toISOString(), // 2 mins before action
      actionType: 'SUBMISSION',
      actor: t.staffName || 'Staff Operator',
      title: 'Deposit Ticket Submitted',
      description: `Staff agent ${t.staffName || 'Operator'} posted a ${t.type} ticket of ₦${t.amount.toLocaleString()} for ${t.customerName}.`,
      severity: 'warning'
    });

    if (t.status === 'approved') {
      seedLogs.push({
        id: `aud_seed_tx_app_${t.id}`,
        timestamp: t.timestamp,
        actionType: 'APPROVAL',
        actor: 'HQ Manager',
        title: 'Posting Cleared & Credited',
        description: `Approved and verified ${t.type} receipt of ₦${t.amount.toLocaleString()} for ${t.customerName} (Ref: ${t.reference}).`,
        severity: 'success'
      });
    } else if (t.status === 'rejected') {
      seedLogs.push({
        id: `aud_seed_tx_rej_${t.id}`,
        timestamp: t.timestamp,
        actionType: 'REJECTION',
        actor: 'HQ Manager',
        title: 'Posting Denied',
        description: `Rejected ${t.type} request of ₦${t.amount.toLocaleString()} for ${t.customerName} (Ref: ${t.reference}).`,
        severity: 'error'
      });
    }
  });

  // Sort chronologically desc and deduplicate
  return deduplicateById(seedLogs).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export function useContriboData() {
  const { showToast } = useToast();

  const handleDatabaseError = (error: any, type: OperationType, path: string) => {
    const msg = handleFirestoreError(error, type, path);
    showToast(`Database error: ${msg}`, 'error');
  };

  const [state, setState] = useState<DashboardState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let loadedState: DashboardState;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        loadedState = {
          ...DEFAULT_STATE,
          ...parsed,
          settings: { ...DEFAULT_STATE.settings, ...(parsed?.settings || {}) },
          staff: deduplicateById(Array.isArray(parsed?.staff) ? parsed.staff : DEFAULT_STATE.staff),
          customers: deduplicateById(Array.isArray(parsed?.customers) ? parsed.customers : DEFAULT_STATE.customers),
          transactions: deduplicateById(Array.isArray(parsed?.transactions) ? parsed.transactions : DEFAULT_STATE.transactions),
          alerts: deduplicateById((Array.isArray(parsed?.alerts) && parsed.alerts.length > 0) ? parsed.alerts : DEFAULT_STATE.alerts),
          auditLogs: deduplicateById(Array.isArray(parsed?.auditLogs) ? parsed.auditLogs : []),
          announcements: Array.isArray(parsed?.announcements) ? parsed.announcements : DEFAULT_STATE.announcements
        };
      } catch (e) {
        console.error("Error parsing saved state, using default:", e);
        loadedState = DEFAULT_STATE;
      }
    } else {
      loadedState = DEFAULT_STATE;
    }

    // Auto-backfill existing local storage accounts if any are missing required fields or have old placeholders
    let updated = false;

    // Sort customers stably by joinedDate and then id to ensure deterministic layout arrangement
    const sortedLoadedCustomers = [...loadedState.customers].sort((a, b) => {
      const dateA = a.joinedDate || '';
      const dateB = b.joinedDate || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return a.id.localeCompare(b.id);
    });

    const seenUsernames = new Set<string>();
    const backfilledCustomers = sortedLoadedCustomers.map((c, index) => {
      let isCustUpdated = false;
      
      const expectedAcc = String(3000000001 + index);
      const expectedContribAcc = String(4000000001 + index);

      let accountNumber = c.accountNumber;
      if (accountNumber !== expectedAcc) {
        accountNumber = expectedAcc;
        isCustUpdated = true;
      }
      let contributionAccountNumber = c.contributionAccountNumber;
      if (contributionAccountNumber !== expectedContribAcc) {
        contributionAccountNumber = expectedContribAcc;
        isCustUpdated = true;
      }

      // Generate clean unique username
      let username = c.username;
      if (!username) {
        const base = c.name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
        let candidate = base || `user_${index}`;
        let count = 1;
        while (seenUsernames.has(candidate)) {
          candidate = `${base}_${count}`;
          count++;
        }
        username = candidate;
        isCustUpdated = true;
      }
      seenUsernames.add(username);

      // Generate staffCustomerId (ID number grouping under assigned staff)
      let staffCustomerId = c.staffCustomerId;
      if (!staffCustomerId) {
        const staff = loadedState.staff.find(s => s.id === c.assignedStaffId);
        const initials = staff ? staff.initials.toUpperCase() : 'ST';
        const sameStaffCusts = sortedLoadedCustomers.filter(cust => cust.assignedStaffId === c.assignedStaffId);
        const relativeIndex = sameStaffCusts.findIndex(cust => cust.id === c.id);
        const seq = String((relativeIndex >= 0 ? relativeIndex : index) + 1).padStart(3, '0');
        staffCustomerId = `${initials}-CS-${seq}`;
        isCustUpdated = true;
      }

      if (isCustUpdated) {
        updated = true;
        return {
          ...c,
          accountNumber,
          contributionAccountNumber,
          username,
          staffCustomerId
        };
      }
      return c;
    });

    // Sort staff stably by joinedDate and then id to ensure deterministic layout arrangement
    const sortedLoadedStaff = [...loadedState.staff].sort((a, b) => {
      const dateA = a.joinedDate || '';
      const dateB = b.joinedDate || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return a.id.localeCompare(b.id);
    });

    const backfilledStaff = sortedLoadedStaff.map((s, index) => {
      let isStaffUpdated = false;
      
      const expectedAccNum = String(2000000001 + index);
      const initials = (s.initials || s.name.split(' ').map(part => part[0]).join('') || 'ST').toUpperCase().slice(0, 2);
      const expectedCode = `${initials}-${100 + index + 1}`;

      let code = s.code;
      if (!code || code === expectedAccNum || /^[2]\d{9}$/.test(code) || !code.includes('-')) {
        code = expectedCode;
        isStaffUpdated = true;
      }

      let accountNumber = s.accountNumber;
      if (accountNumber !== expectedAccNum) {
        accountNumber = expectedAccNum;
        isStaffUpdated = true;
      }

      let walletBalance = s.walletBalance;
      if (walletBalance === undefined) {
        walletBalance = 0;
        isStaffUpdated = true;
      }

      if (isStaffUpdated) {
        updated = true;
        return {
          ...s,
          code,
          accountNumber,
          walletBalance
        };
      }
      return s;
    });

    // Deduplicate loadedState after backfilling
    const dedupedCustomers = Array.from(new Map(backfilledCustomers.map(c => [c.id, c])).values());
    const dedupedStaff = Array.from(new Map(backfilledStaff.map(s => [s.id, s])).values());
    if (updated || dedupedCustomers.length !== backfilledCustomers.length || dedupedStaff.length !== backfilledStaff.length) {
      loadedState = { ...loadedState, customers: dedupedCustomers, staff: dedupedStaff };
    }

    if (!loadedState.auditLogs || loadedState.auditLogs.length === 0) {
      loadedState.auditLogs = generateSeedAuditLogs(loadedState);
      updated = true;
    }

    if (updated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loadedState));
    }

    return loadedState;
  });

  const [isOnline, setIsOnline] = useState(window.navigator.onLine);
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  // Connection monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auth monitoring
  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
    });
  }, []);

  // REAL-TIME FIRESTORE SYNC
  useEffect(() => {
    if (!authReady || !currentUser) return;

    console.log("Firebase: Initializing real-time listeners for", currentUser.email);

    // Sync Settings
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        setState(prev => ({ ...prev, settings: { ...prev.settings, ...snapshot.data() as ContriboSettings } }));
      }
    }, (error) => {
      handleDatabaseError(error, OperationType.GET, 'settings/global');
    });

    // Sync Staff
    const unsubStaff = onSnapshot(collection(db, 'staff'), (snapshot) => {
      const staffMap = new Map<string, StaffMember>();
      snapshot.forEach(doc => {
        staffMap.set(doc.id, { id: doc.id, ...doc.data() } as StaffMember);
      });
      const rawStaff = deduplicateById(Array.from(staffMap.values()));
      
      // Sort stably by joinedDate and then id for sequential arrangement
      const sortedStaff = [...rawStaff].sort((a, b) => {
        const dateA = a.joinedDate || '';
        const dateB = b.joinedDate || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return a.id.localeCompare(b.id);
      });

      const processedStaff = sortedStaff.map((s, index) => {
        let isDocUpdated = false;
        const expectedAccNum = String(2000000001 + index);
        const initials = (s.initials || s.name.split(' ').map(part => part[0]).join('') || 'ST').toUpperCase().slice(0, 2);
        const expectedCode = `${initials}-${100 + index + 1}`;

        let code = s.code;
        if (!code || code === expectedAccNum || /^[2]\d{9}$/.test(code) || !code.includes('-')) {
          code = expectedCode;
          isDocUpdated = true;
        }

        let accountNumber = s.accountNumber;
        if (accountNumber !== expectedAccNum) {
          accountNumber = expectedAccNum;
          isDocUpdated = true;
        }

        let walletBalance = s.walletBalance;
        if (walletBalance === undefined) {
          walletBalance = 0;
          isDocUpdated = true;
        }

        if (isDocUpdated) {
          // Fire-and-forget heal back to Firestore
          updateDoc(doc(db, 'staff', s.id), {
            code,
            accountNumber,
            walletBalance
          }).catch(err => console.error(`Error repairing staff ${s.id}:`, err));

          return {
            ...s,
            code,
            accountNumber,
            walletBalance
          };
        }
        return s;
      });

      setState(prev => ({ ...prev, staff: processedStaff }));
    }, (error) => {
      handleDatabaseError(error, OperationType.LIST, 'staff');
    });

    // Sync Customers
    const unsubCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const customerMap = new Map<string, Customer>();
      snapshot.forEach(doc => {
        customerMap.set(doc.id, { id: doc.id, ...doc.data() } as Customer);
      });
      const rawCustomers = deduplicateById(Array.from(customerMap.values()));
      
      // Sort stably by joinedDate and then id for sequential arrangement
      const sortedCusts = [...rawCustomers].sort((a, b) => {
        const dateA = a.joinedDate || '';
        const dateB = b.joinedDate || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return a.id.localeCompare(b.id);
      });

      const seenUsernames = new Set<string>();
      const processedCusts = sortedCusts.map((c, index) => {
        let isDocUpdated = false;
        const expectedAcc = String(3000000001 + index);
        const expectedContribAcc = String(4000000001 + index);

        let accountNumber = c.accountNumber;
        if (accountNumber !== expectedAcc) {
          accountNumber = expectedAcc;
          isDocUpdated = true;
        }

        let contributionAccountNumber = c.contributionAccountNumber;
        if (contributionAccountNumber !== expectedContribAcc) {
          contributionAccountNumber = expectedContribAcc;
          isDocUpdated = true;
        }

        let username = c.username;
        if (!username) {
          const base = c.name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
          let candidate = base || `user_${index}`;
          let count = 1;
          while (seenUsernames.has(candidate)) {
            candidate = `${base}_${count}`;
            count++;
          }
          username = candidate;
          isDocUpdated = true;
        }
        seenUsernames.add(username);

        let staffCustomerId = c.staffCustomerId;
        if (!staffCustomerId) {
          staffCustomerId = `KC-CS-${String(index + 1).padStart(3, '0')}`;
          isDocUpdated = true;
        }

        if (isDocUpdated) {
          // Fire-and-forget heal back to Firestore
          updateDoc(doc(db, 'customers', c.id), {
            accountNumber,
            contributionAccountNumber,
            username,
            staffCustomerId
          }).catch(err => console.error(`Error repairing customer ${c.id}:`, err));

          return {
            ...c,
            accountNumber,
            contributionAccountNumber,
            username,
            staffCustomerId
          };
        }
        return c;
      });

      setState(prev => ({ ...prev, customers: processedCusts }));
    }, (error) => {
      handleDatabaseError(error, OperationType.LIST, 'customers');
    });

    // Sync Transactions (limit to last 500 for performance)
    const qTx = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'), limit(500));
    const unsubTx = onSnapshot(qTx, (snapshot) => {
      const txMap = new Map<string, Transaction>();
      snapshot.forEach(doc => {
        txMap.set(doc.id, { id: doc.id, ...doc.data() } as Transaction);
      });
      setState(prev => ({ ...prev, transactions: deduplicateById(Array.from(txMap.values())) }));
    }, (error) => {
      handleDatabaseError(error, OperationType.LIST, 'transactions');
    });

    // Sync Alerts
    const qAlerts = query(collection(db, 'alerts'), orderBy('timestamp', 'desc'), limit(200));
    const unsubAlerts = onSnapshot(qAlerts, (snapshot) => {
      const alertMap = new Map<string, AlertLog>();
      snapshot.forEach(doc => {
        alertMap.set(doc.id, { id: doc.id, ...doc.data() } as AlertLog);
      });
      setState(prev => ({ ...prev, alerts: deduplicateById(Array.from(alertMap.values())) }));
    }, (error) => {
      handleDatabaseError(error, OperationType.LIST, 'alerts');
    });

    // Sync Audit Logs
    const qAudit = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(300));
    const unsubAudit = onSnapshot(qAudit, (snapshot) => {
      const auditList: AuditLog[] = [];
      snapshot.forEach(doc => auditList.push({ id: doc.id, ...doc.data() } as AuditLog));
      setState(prev => ({ ...prev, auditLogs: deduplicateById(auditList) }));
    }, (error) => {
      handleDatabaseError(error, OperationType.LIST, 'audit_logs');
    });

    // Sync Announcements
    const qAnnounce = query(collection(db, 'announcements'), orderBy('timestamp', 'desc'), limit(100));
    const unsubAnnounce = onSnapshot(qAnnounce, (snapshot) => {
      const announceList: any[] = [];
      snapshot.forEach(doc => announceList.push({ id: doc.id, ...doc.data() }));
      setState(prev => ({ ...prev, announcements: deduplicateById(announceList) }));
    }, (error) => {
      handleDatabaseError(error, OperationType.LIST, 'announcements');
    });

    return () => {
      unsubSettings();
      unsubStaff();
      unsubCustomers();
      unsubTx();
      unsubAlerts();
      unsubAudit();
      unsubAnnounce();
    };
  }, [authReady, currentUser]);

  const saveState = (newState: DashboardState) => {
    setState(newState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  };

  const createAuditLogEntry = async (
    actionType: AuditLog['actionType'],
    title: string,
    description: string,
    severity: AuditLog['severity'] = 'info'
  ) => {
    const newLog: AuditLog = {
      id: `aud_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date().toISOString(),
      actionType,
      actor: currentUser?.email || 'HQ Manager',
      title,
      description,
      severity
    };

    setState(prev => {
      const mergedLogs = [newLog, ...(prev.auditLogs || [])];
      const nextState = { ...prev, auditLogs: mergedLogs };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      return nextState;
    });

    if (currentUser) {
      try {
        await setDoc(doc(db, 'audit_logs', newLog.id), newLog);
      } catch (e) {
        handleDatabaseError(e, OperationType.WRITE, `audit_logs/${newLog.id}`);
      }
    }
  };

  const resetToDefaults = () => {
    saveState(DEFAULT_STATE);
    createAuditLogEntry('DEACTIVATION', 'System Ledger Reset', 'Reset the local dashboard state and variable logs back to pre-seeded demonstration defaults.', 'warning');
  };

  const generateAlertsForDeposit = (tx: Transaction, customer: Customer, newBalance: number): AlertLog[] => {
    const phone = customer.phoneNumber || '+234 812 345 6789';
    const acctSuffix = customer.accountNumber ? customer.accountNumber.slice(-4) : 'N/A';
    const formattedAmt = tx.amount.toLocaleString();
    const formattedBal = newBalance.toLocaleString();
    const dateStr = new Date(tx.timestamp).toLocaleString('en-US', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const smsMessage = `Dan Godal savings Credit! Acct: *${acctSuffix} Amt: ₦${formattedAmt} Bal: ₦${formattedBal} Ref: ${tx.reference} Date: ${dateStr}. Thanks for saving!`;
    const whatsappMessage = `*Dan Godal savings HQ - Deposit Receipt* 🧾\n---------------------------------------\n*Customer:* ${customer.name}\n*Account:* ${customer.accountNumber || 'NUBAN'}\n*Ref:* ${tx.reference}\n*Staff Agent:* ${tx.staffName || 'HQ'}\n*Deposit Amount:* ₦${formattedAmt}\n*New Balance:* ₦${formattedBal}\n*Time:* ${dateStr}\n*Status:* Approved & Dispatched ✅\n---------------------------------------\nClick to access your user portal: ${window.location.origin}`;

    const newSmsAlert: AlertLog = {
      id: `alert_sms_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      txId: tx.id,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: phone,
      type: 'sms',
      message: smsMessage,
      status: 'queued',
      timestamp: new Date().toISOString()
    };

    const newWaAlert: AlertLog = {
      id: `alert_wa_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      txId: tx.id,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: phone,
      type: 'whatsapp',
      message: whatsappMessage,
      status: 'queued',
      timestamp: new Date().toISOString()
    };

    const alerts: AlertLog[] = [newWaAlert];
    if (state.settings.smsNotificationsEnabled !== false) {
      alerts.push(newSmsAlert);
    }

    return alerts;
  };

  const generateAlertsForWithdrawal = (tx: Transaction, customer: Customer, newBalance: number): AlertLog[] => {
    const phone = customer.phoneNumber || '+234 812 345 6789';
    const acctSuffix = customer.accountNumber ? customer.accountNumber.slice(-4) : 'N/A';
    const formattedAmt = tx.amount.toLocaleString();
    const formattedBal = newBalance.toLocaleString();
    const dateStr = new Date(tx.timestamp).toLocaleString('en-US', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const smsMessage = `Dan Godal savings Debit! Acct: *${acctSuffix} Amt: ₦${formattedAmt} Bal: ₦${formattedBal} Ref: ${tx.reference} Date: ${dateStr}. Thanks for saving!`;
    const whatsappMessage = `*Dan Godal savings HQ - Withdrawal Receipt* 🧾\n---------------------------------------\n*Customer:* ${customer.name}\n*Account:* ${customer.accountNumber || 'NUBAN'}\n*Ref:* ${tx.reference}\n*Staff Agent:* ${tx.staffName || 'HQ'}\n*Withdrawal Amount:* ₦${formattedAmt}\n*New Balance:* ₦${formattedBal}\n*Time:* ${dateStr}\n*Status:* Approved & Dispatched ✅\n---------------------------------------\nClick to access your user portal: ${window.location.origin}`;

    const newSmsAlert: AlertLog = {
      id: `alert_sms_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      txId: tx.id,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: phone,
      type: 'sms',
      message: smsMessage,
      status: 'queued',
      timestamp: new Date().toISOString()
    };

    const newWaAlert: AlertLog = {
      id: `alert_wa_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      txId: tx.id,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: phone,
      type: 'whatsapp',
      message: whatsappMessage,
      status: 'queued',
      timestamp: new Date().toISOString()
    };

    const alerts: AlertLog[] = [newWaAlert];
    if (state.settings.smsNotificationsEnabled !== false) {
      alerts.push(newSmsAlert);
    }

    return alerts;
  };

  // Daily collections reset logic
  useEffect(() => {
    const lastReset = localStorage.getItem('contribo_last_daily_reset');
    const today = new Date().toISOString().split('T')[0];
    
    if (lastReset !== today && state.staff.length > 0) {
      const resetStaff = state.staff.map(s => ({ ...s, collectionsToday: 0 }));
      setState(prev => ({ ...prev, staff: resetStaff }));
      localStorage.setItem('contribo_last_daily_reset', today);
      
      // If online, also update Firestore
      if (currentUser) {
        state.staff.forEach(async (s) => {
          try {
            await updateDoc(doc(db, 'staff', s.id), { collectionsToday: 0 });
          } catch (e) {
            console.error("Failed to reset daily collections in Firestore:", e);
          }
        });
      }
    }
  }, [state.staff.length, currentUser]);

  // Robust retry-queue manager for failed SMS alerts
  useEffect(() => {
    // Only run this loop if logged in and we have alerts
    if (!currentUser || !state.alerts || state.alerts.length === 0) return;

    let isProcessing = false;
    let timeoutId: NodeJS.Timeout;

    const processRetryQueue = async () => {
      if (isProcessing) return;
      isProcessing = true;

      try {
        const now = new Date();
        // Find alerts that are queued or failed and need retrying
        const alertsToRetry = state.alerts.filter((alert) => {
          if (alert.type !== 'sms') return false;
          if (alert.status !== 'queued' && alert.status !== 'failed') return false;
          
          if (alert.nextRetryTime) {
            return new Date(alert.nextRetryTime) <= now;
          }
          // If it's queued or failed and has no nextRetryTime, retry it immediately
          return true;
        });

        // Don't overwhelm the API - max 5 at a time
        const batch = alertsToRetry.slice(0, 5);

        for (const alert of batch) {
          try {
            console.log(`[Retry Queue] Attempting dispatch for alert ${alert.id}...`);
            const response = await fetch('/api/send-sms', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: alert.customerPhone,
                message: alert.message,
                apiKey: state.settings?.smsApiKey,
                senderId: state.settings?.smsSenderId
              })
            });

            const data = await response.json();

            if (response.ok) {
              await updateDoc(doc(db, 'alerts', alert.id), {
                status: 'delivered',
                deliveryTimestamp: new Date().toISOString(),
                gatewayResponse: JSON.stringify(data),
                retryCount: (alert.retryCount || 0) + 1,
              });
            } else {
              // Exponential backoff logic
              const currentRetryCount = (alert.retryCount || 0) + 1;
              // E.g. retry 1 = wait 2 mins, retry 2 = wait 4 mins, retry 3 = wait 8 mins
              const nextRetryMinutes = Math.pow(2, currentRetryCount);
              const nextRetry = new Date(Date.now() + nextRetryMinutes * 60000);
              
              await updateDoc(doc(db, 'alerts', alert.id), {
                status: 'failed',
                errorCode: data.error?.message || data.error?.code || 'GATEWAY_ERROR',
                gatewayResponse: JSON.stringify(data),
                retryCount: currentRetryCount,
                nextRetryTime: nextRetry.toISOString(),
              });
            }
          } catch (e: any) {
            console.error(`[Retry Queue] Network error for alert ${alert.id}:`, e);
            const currentRetryCount = (alert.retryCount || 0) + 1;
            const nextRetryMinutes = Math.pow(2, currentRetryCount);
            const nextRetry = new Date(Date.now() + nextRetryMinutes * 60000);

            await updateDoc(doc(db, 'alerts', alert.id), {
              status: 'failed',
              errorCode: 'NETWORK_ERROR',
              gatewayResponse: e.message,
              retryCount: currentRetryCount,
              nextRetryTime: nextRetry.toISOString(),
            });
          }
        }
      } catch (err) {
        console.error("Error in retry queue processor:", err);
      } finally {
        isProcessing = false;
        // Schedule next run in 15 seconds
        timeoutId = setTimeout(processRetryQueue, 15000);
      }
    };

    // Initial kickoff
    timeoutId = setTimeout(processRetryQueue, 10000);

    return () => clearTimeout(timeoutId);
  }, [currentUser, state.alerts, state.settings?.smsApiKey, state.settings?.smsSenderId]);

  const updateSettings = async (updated: Partial<ContriboSettings>) => {
    const newSettings = { ...state.settings, ...updated };
    // Optimistic update
    saveState({ ...state, settings: newSettings });
    createAuditLogEntry('EDIT', 'System Settings Modified', `Modified configuration key(s): ${Object.keys(updated).join(', ')}`, 'info');

    if (currentUser) {
      try {
        await setDoc(doc(db, 'settings', 'global'), updated, { merge: true });
      } catch (e) {
        handleDatabaseError(e, OperationType.WRITE, 'settings/global');
      }
    }
  };

  const addStaff = async (newStaff: Partial<StaffMember> & { name: string; phoneNumber: string; email: string }) => {
    const initials = newStaff.name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    // Generate sequential staff account number (starts with 2000000001)
    const staffWithAcc = state.staff.filter(s => s.accountNumber && /^[2]\d{9}$/.test(s.accountNumber));
    let nextStaffAccNum = 2000000001;
    if (staffWithAcc.length > 0) {
      const numbers = staffWithAcc.map(s => parseInt(s.accountNumber || '', 10)).filter(num => !isNaN(num));
      if (numbers.length > 0) {
        nextStaffAccNum = Math.max(...numbers) + 1;
      }
    }
    const staffAccountNumber = newStaff.accountNumber || String(nextStaffAccNum);

    const totalStaffCount = state.staff.length;
    const finalStaffCode = `${initials}-${100 + totalStaffCount + 1}`;

    const id = 's_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const staffMember: StaffMember = {
      managerId: currentUser?.uid || 'M001',
      status: 'active',
      role: 'Collector',
      pinStatus: 'pending',
      location: 'Main Branch',
      collectionsCount: 0,
      totalCollectionsAmount: 0,
      walletBalance: 0,
      ...newStaff,
      id: id,
      initials,
      collectionsToday: 0,
      joinedDate: new Date().toISOString().split('T')[0],
      code: finalStaffCode,
      accountNumber: staffAccountNumber,
    };

    // Optimistic update
    saveState({ ...state, staff: [...state.staff, staffMember] });
    createAuditLogEntry('ONBOARDING', 'Collector Agent Onboarded', `Onboarded brand new mobilizer collector ${staffMember.name} (Agent Code: ${staffMember.code}) into system operations.`, 'success');

    if (currentUser) {
      try {
        await setDoc(doc(db, 'staff', id), staffMember);
      } catch (e) {
        handleDatabaseError(e, OperationType.WRITE, `staff/${id}`);
      }
    }
  };

  const updateStaffStatus = async (id: string, status: 'active' | 'inactive') => {
    // Optimistic
    saveState({
      ...state,
      staff: state.staff.map(s => s.id === id ? { ...s, status } : s)
    });
    
    const staff = state.staff.find(s => s.id === id);
    createAuditLogEntry(
      status === 'active' ? 'ACTIVATION' : 'DEACTIVATION',
      `Collector Account ${status === 'active' ? 'Re-activated' : 'Suspended'}`,
      `${status === 'active' ? 'Enabled' : 'Disabled'} credentials and system access for collector agent ${staff?.name || 'Agent ID ' + id}.`,
      status === 'active' ? 'success' : 'warning'
    );

    if (currentUser) {
      try {
        await updateDoc(doc(db, 'staff', id), { status });
      } catch (e) {
        handleDatabaseError(e, OperationType.WRITE, `staff/${id}`);
      }
    }
  };

  const updateStaff = async (id: string, updatedFields: Partial<StaffMember>) => {
    saveState({
      ...state,
      staff: state.staff.map(s => s.id === id ? { ...s, ...updatedFields } : s)
    });

    const staff = state.staff.find(s => s.id === id);
    createAuditLogEntry(
      'EDIT',
      'Collector Profile Updated',
      `Modified specific details (${Object.keys(updatedFields).join(', ')}) for collector agent ${staff?.name || 'Agent ID ' + id}.`,
      'info'
    );

    if (currentUser) {
      try {
        await updateDoc(doc(db, 'staff', id), updatedFields);
      } catch (e) {
        handleDatabaseError(e, OperationType.WRITE, `staff/${id}`);
      }
    }
  };

  const deleteStaff = async (id: string) => {
    const staff = state.staff.find(s => s.id === id);
    saveState({
      ...state,
      staff: state.staff.filter(s => s.id !== id)
    });

    createAuditLogEntry(
      'DEACTIVATION',
      'Collector Account Terminated',
      `Permanently removed collector agent ${staff?.name || 'Agent' + id} from the platform's register.`,
      'error'
    );

    if (currentUser) {
      try {
        await deleteDoc(doc(db, 'staff', id));
      } catch (e) {
        handleDatabaseError(e, OperationType.DELETE, `staff/${id}`);
      }
    }
  };

  const addCustomer = async (newCust: Partial<Customer> & { name: string; phoneNumber: string }) => {
    // Generate sequential customer wallet account number (starts with 3000000001)
    const custWithAcc = state.customers.filter(c => c.accountNumber && /^[3]\d{9}$/.test(c.accountNumber));
    let nextCustAccNum = 3000000001;
    if (custWithAcc.length > 0) {
      const numbers = custWithAcc.map(c => parseInt(c.accountNumber || '', 10)).filter(num => !isNaN(num));
      if (numbers.length > 0) {
        nextCustAccNum = Math.max(...numbers) + 1;
      }
    }
    const customerAccountNumber = String(nextCustAccNum);

    // Generate sequential contribution account number (starts with 4000000001)
    const contribWithAcc = state.customers.filter(c => c.contributionAccountNumber && /^[4]\d{9}$/.test(c.contributionAccountNumber));
    let nextContribAccNum = 4000000001;
    if (contribWithAcc.length > 0) {
      const numbers = contribWithAcc.map(c => parseInt(c.contributionAccountNumber || '', 10)).filter(num => !isNaN(num));
      if (numbers.length > 0) {
        nextContribAccNum = Math.max(...numbers) + 1;
      }
    }
    const contributionAccountNumber = String(nextContribAccNum);

    const baseUsr = (newCust.username || newCust.name).toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
    let uniqueUser = baseUsr || 'user';
    let count = 1;
    while (state.customers.some(c => c.username === uniqueUser)) {
      uniqueUser = `${baseUsr || 'user'}_${count}`;
      count++;
    }

    const staffId = newCust.assignedStaffId || 's1';
    const staff = state.staff.find(s => s.id === staffId);
    const initials = staff ? staff.initials.toUpperCase() : 'ST';
    const sameStaffCusts = state.customers.filter(cust => cust.assignedStaffId === staffId);
    const seq = String(sameStaffCusts.length + 1).padStart(3, '0');
    const staffCustomerId = `${initials}-CS-${seq}`;

    const customerId = newCust.id || 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    let finalAccountNumber = newCust.accountNumber;
    if (!finalAccountNumber || !/^[3]\d{9}$/.test(finalAccountNumber)) {
      finalAccountNumber = customerAccountNumber;
    }

    let finalContribAccountNumber = newCust.contributionAccountNumber;
    if (!finalContribAccountNumber || !/^[4]\d{9}$/.test(finalContribAccountNumber)) {
      finalContribAccountNumber = contributionAccountNumber;
    }

    const customer: Customer = {
      assignedStaffId: 's1',
      status: 'active',
      approvalStatus: 'approved',
      location: 'Kaduna North',
      balance: 0,
      joinedDate: new Date().toISOString().split('T')[0],
      username: uniqueUser,
      staffCustomerId,
      smsNotificationsEnabled: true,
      emailNotificationsEnabled: true,
      ...newCust,
      accountNumber: finalAccountNumber,
      contributionAccountNumber: finalContribAccountNumber,
      id: customerId
    };

    let updatedTransactions = [...state.transactions];
    let updatedStaff = [...state.staff];
    let generatedAlerts: AlertLog[] = [];

    if (customer.balance > 0) {
      const activeStaff = state.staff.find(s => s.id === customer.assignedStaffId);
      const ref = `CBP-D${Math.floor(1000 + Math.random() * 9000)}`;
      const txId = 't_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      const newTx: Transaction = {
        id: txId,
        customerId: customer.id,
        customerName: customer.name,
        staffId: customer.assignedStaffId,
        staffName: activeStaff ? activeStaff.name : 'Platform',
        type: 'deposit',
        amount: customer.balance,
        status: 'approved',
        timestamp: new Date().toISOString(),
        reference: ref,
      };

      updatedTransactions = [newTx, ...state.transactions];
      updatedStaff = state.staff.map(s => s.id === customer.assignedStaffId ? {
        ...s,
        collectionsToday: (s.collectionsToday || 0) + customer.balance,
        collectionsCount: (s.collectionsCount || 0) + 1,
        totalCollectionsAmount: (s.totalCollectionsAmount || 0) + customer.balance
      } : s);

      generatedAlerts = generateAlertsForDeposit(newTx, customer, customer.balance);
      
      if (currentUser) {
        try {
          await setDoc(doc(db, 'transactions', txId), newTx);
          for (const a of generatedAlerts) {
            await setDoc(doc(db, 'alerts', a.id), a);
          }
        } catch (e) {
          handleDatabaseError(e, OperationType.WRITE, 'bulk_customer_add_sync');
        }
      }
    }

    saveState({
      ...state,
      customers: [...state.customers, customer],
      transactions: updatedTransactions,
      staff: updatedStaff,
      alerts: [...generatedAlerts, ...(state.alerts || [])],
    });

    createAuditLogEntry('REGISTRATION', 'New Client Registered', `Registered brand new thrift savings client ${customer.name} with NUBAN ${customer.accountNumber}.`, 'success');

    if (currentUser) {
      try {
        await setDoc(doc(db, 'customers', customerId), customer);
      } catch (e) {
        handleDatabaseError(e, OperationType.WRITE, `customers/${customerId}`);
      }
    }
  };

  const updateCustomerStatus = async (id: string, status: 'active' | 'inactive') => {
    saveState({
      ...state,
      customers: state.customers.map(c => c.id === id ? { ...c, status } : c)
    });
    const customer = state.customers.find(c => c.id === id);
    createAuditLogEntry(status === 'active' ? 'ACTIVATION' : 'DEACTIVATION', `Client ${status === 'active' ? 'Activated' : 'Suspended'}`, `Changed ledger state for customer ${customer?.name || 'Client ID ' + id} to ${status}.`, status === 'active' ? 'success' : 'warning');
    if (currentUser) {
      try {
        await updateDoc(doc(db, 'customers', id), { status });
      } catch (e) {
        handleDatabaseError(e, OperationType.WRITE, `customers/${id}`);
      }
    }
  };

  const updateCustomer = async (id: string, updatedFields: Partial<Customer>) => {
    saveState({
      ...state,
      customers: state.customers.map(c => c.id === id ? { ...c, ...updatedFields } : c)
    });
    const customer = state.customers.find(c => c.id === id);
    createAuditLogEntry('EDIT', 'Client Profile Updated', `Edited profile fields (${Object.keys(updatedFields).join(', ')}) for customer ${customer?.name || 'Client ID ' + id}.`, 'info');
    if (currentUser) {
      try {
        await updateDoc(doc(db, 'customers', id), updatedFields);
      } catch (e) {
        handleDatabaseError(e, OperationType.WRITE, `customers/${id}`);
      }
    }
  };

  const deleteCustomer = async (id: string) => {
    const customer = state.customers.find(c => c.id === id);
    saveState({
      ...state,
      customers: state.customers.filter(c => c.id !== id)
    });
    createAuditLogEntry('DEACTIVATION', 'Client Ledger Deleted', `Permanently deleted customer card for ${customer?.name || 'Client ID ' + id} from records.`, 'error');
    if (currentUser) {
      try {
        await deleteDoc(doc(db, 'customers', id));
      } catch (e) {
        handleDatabaseError(e, OperationType.DELETE, `customers/${id}`);
      }
    }
  };

  const approveCustomer = async (id: string) => {
    saveState({
      ...state,
      customers: state.customers.map(c => c.id === id ? { ...c, approvalStatus: 'approved' as const, status: 'active' as const } : c)
    });
    const customer = state.customers.find(c => c.id === id);
    createAuditLogEntry('APPROVAL', 'Client Passcard Approved', `Approved security verification and KYC passcard for client ${customer?.name || 'Client ID ' + id}.`, 'success');
    if (currentUser) {
      try {
        await updateDoc(doc(db, 'customers', id), { approvalStatus: 'approved', status: 'active' });
      } catch (e) {
        handleDatabaseError(e, OperationType.WRITE, `customers/${id}`);
      }
    }
  };

  const rejectCustomer = async (id: string) => {
    const customer = state.customers.find(c => c.id === id);
    saveState({
      ...state,
      customers: state.customers.filter(c => c.id !== id)
    });
    createAuditLogEntry('REJECTION', 'Client Passcard Rejected', `Rejected savings card registration for ${customer?.name || 'Client ID' + id}.`, 'error');
    if (currentUser) {
      try {
        await deleteDoc(doc(db, 'customers', id));
      } catch (e) {
        handleDatabaseError(e, OperationType.DELETE, `customers/${id}`);
      }
    }
  };

  const addTransaction = async (tx: {
    customerId: string;
    type: 'deposit' | 'withdrawal';
    amount: number;
    profitAmount?: number;
    staffId: string;
    status?: 'pending' | 'approved';
    withdrawalPhoto?: string;
    cardPhoto?: string;
    payoutBankName?: string;
    payoutAccountName?: string;
    payoutAccountNumber?: string;
  }): Promise<Transaction | undefined> => {
    const customer = state.customers.find(c => c.id === tx.customerId);
    const staff = state.staff.find(s => s.id === tx.staffId);
    if (!customer) return undefined;

    if (customer.status !== 'active') {
      showToast("The account number is not active.", "error");
      return undefined;
    }

    if (staff && staff.status !== 'active') {
      showToast("The account number is not active.", "error");
      return undefined;
    }

    // Verify staff wallet balance for deposits
    if (tx.type === 'deposit' && tx.staffId) {
      const staffMember = state.staff.find(s => s.id === tx.staffId);
      if (staffMember) {
        const staffWallet = staffMember.walletBalance || 0;
        if (staffWallet < tx.amount) {
          showToast(`Insufficient staff wallet balance (Available: ₦${staffWallet.toLocaleString()}). Required: ₦${tx.amount.toLocaleString()}`, "error");
          return undefined;
        }
      }
    }

    const ref = `CBP-${tx.type === 'deposit' ? 'D' : 'W'}${Math.floor(1000 + Math.random() * 9000)}`;
    const initialStatus = tx.status || (tx.type === 'deposit' ? 'approved' : 'pending');

    const txId = 't_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const newTx: Transaction = {
      id: txId,
      customerId: tx.customerId,
      customerName: customer.name,
      staffId: tx.staffId,
      staffName: staff ? staff.name : 'Platform',
      type: tx.type,
      amount: tx.amount,
      profitAmount: tx.profitAmount,
      status: initialStatus,
      timestamp: new Date().toISOString(),
      reference: ref,
      withdrawalPhoto: tx.withdrawalPhoto,
      cardPhoto: tx.cardPhoto,
      payoutBankName: tx.payoutBankName,
      payoutAccountName: tx.payoutAccountName,
      payoutAccountNumber: tx.payoutAccountNumber,
    };

    if (currentUser) {
      try {
        await setDoc(doc(db, 'transactions', txId), newTx);
      } catch (e) {
        handleDatabaseError(e, OperationType.WRITE, `transactions/${txId}`);
      }
    }
    
    // ... logic for balance update local
    let updatedCustomers = [...state.customers];
    let updatedStaff = [...state.staff];
    let calculatedBalance = customer.balance;
    let generatedAlerts: AlertLog[] = [];

    if (initialStatus === 'approved') {
      updatedCustomers = state.customers.map(c => {
        if (c.id === tx.customerId) {
          const nextBalance = tx.type === 'deposit' ? c.balance + tx.amount : Math.max(0, c.balance - tx.amount);
          calculatedBalance = nextBalance;
          return { ...c, balance: nextBalance, contributionsCount: (c.contributionsCount || 0) + (tx.type === 'deposit' ? 1 : 0) };
        }
        return c;
      });

      if (tx.type === 'deposit' && tx.staffId) {
        updatedStaff = state.staff.map(s => {
          if (s.id === tx.staffId) {
            const nextWallet = Math.max(0, (s.walletBalance || 0) - tx.amount);
            return {
              ...s,
              walletBalance: nextWallet,
              collectionsToday: (s.collectionsToday || 0) + tx.amount,
              collectionsCount: (s.collectionsCount || 0) + 1,
              totalCollectionsAmount: (s.totalCollectionsAmount || 0) + tx.amount
            };
          }
          return s;
        });

        if (currentUser) {
          const staffToUpdate = updatedStaff.find(s => s.id === tx.staffId);
          if (staffToUpdate) {
            try {
              await updateDoc(doc(db, 'staff', tx.staffId), {
                walletBalance: staffToUpdate.walletBalance || 0,
                collectionsToday: staffToUpdate.collectionsToday,
                collectionsCount: staffToUpdate.collectionsCount,
                totalCollectionsAmount: staffToUpdate.totalCollectionsAmount
              });
            } catch (e) {
              handleDatabaseError(e, OperationType.WRITE, `staff/${tx.staffId}`);
            }
          }
        }
      }

      if (tx.type === 'deposit') {
        generatedAlerts = generateAlertsForDeposit(newTx, customer, calculatedBalance);
      } else if (tx.type === 'withdrawal') {
        generatedAlerts = generateAlertsForWithdrawal(newTx, customer, calculatedBalance);
      }
      
      if (generatedAlerts.length > 0 && currentUser) {
        for (const a of generatedAlerts) {
          try {
            const queuedAlert = { ...a, status: 'queued' as const };
            await setDoc(doc(db, 'alerts', a.id), queuedAlert);
            dispatchAlert(queuedAlert);
          } catch (e) {
            console.error("Error saving alert doc:", e);
          }
        }
      }

      if (currentUser) {
        try {
          await updateDoc(doc(db, 'customers', tx.customerId), { 
            balance: calculatedBalance, 
            contributionsCount: (customer.contributionsCount || 0) + (tx.type === 'deposit' ? 1 : 0) 
          });
        } catch (e) {
          handleDatabaseError(e, OperationType.WRITE, `customers/${tx.customerId}`);
        }
      }
    }

    saveState({
      ...state,
      customers: updatedCustomers,
      staff: updatedStaff,
      transactions: [newTx, ...state.transactions],
      alerts: [...generatedAlerts, ...(state.alerts || [])],
    });

    return newTx;
  };

  const dispatchAlert = async (alert: AlertLog) => {
    if (alert.type !== 'sms') return;

    try {
      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: alert.customerPhone,
          message: alert.message,
          apiKey: state.settings?.smsApiKey,
          senderId: state.settings?.smsSenderId
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        await updateDoc(doc(db, 'alerts', alert.id), {
          status: 'delivered',
          deliveryTimestamp: new Date().toISOString(),
          gatewayResponse: JSON.stringify(data),
          retryCount: (alert.retryCount || 0) + 1,
        });
      } else {
        const currentRetryCount = (alert.retryCount || 0) + 1;
        const nextRetryMinutes = Math.pow(2, currentRetryCount);
        const nextRetry = new Date(Date.now() + nextRetryMinutes * 60000);

        await updateDoc(doc(db, 'alerts', alert.id), {
          status: 'failed',
          errorCode: data.error?.message || data.error?.code || 'GATEWAY_ERROR',
          gatewayResponse: JSON.stringify(data),
          retryCount: currentRetryCount,
          nextRetryTime: nextRetry.toISOString(),
        });
      }
    } catch (e: any) {
      console.error("Failed to dispatch alert:", e);
      if (currentUser) {
        try {
          const currentRetryCount = (alert.retryCount || 0) + 1;
          const nextRetryMinutes = Math.pow(2, currentRetryCount);
          const nextRetry = new Date(Date.now() + nextRetryMinutes * 60000);

          await updateDoc(doc(db, 'alerts', alert.id), {
            status: 'failed',
            errorCode: 'NETWORK_ERROR',
            gatewayResponse: e.message,
            retryCount: currentRetryCount,
            nextRetryTime: nextRetry.toISOString(),
          });
        } catch (err) {
          console.error("Failed to update fail status:", err);
        }
      }
    }
  };

  const approveTransaction = async (txId: string, receiptPhoto?: string) => {
    const tx = state.transactions.find(t => t.id === txId);
    if (!tx || tx.status !== 'pending') return;

    const customer = state.customers.find(c => c.id === tx.customerId);
    let calculatedBalance = customer ? customer.balance : 0;
    let generatedAlerts: AlertLog[] = [];

    const updatedCustomers = state.customers.map(c => {
      if (c.id === tx.customerId) {
        let newBalance = c.balance;
        let increment = 0;
        if (tx.type === 'deposit') {
          newBalance += tx.amount;
          increment = 1;
        } else if (tx.type === 'withdrawal') {
          newBalance = Math.max(0, newBalance - tx.amount);
        }
        calculatedBalance = newBalance;
        return {
          ...c,
          balance: newBalance,
          contributionsCount: (c.contributionsCount || 0) + increment,
          status: newBalance > 0 ? 'active' as const : c.status
        };
      }
      return c;
    });

    if (currentUser && customer) {
      try {
        await updateDoc(doc(db, 'customers', tx.customerId), { 
          balance: calculatedBalance, 
          contributionsCount: (customer.contributionsCount || 0) + (tx.type === 'deposit' ? 1 : 0) 
        });
      } catch (e) {
        handleDatabaseError(e, OperationType.WRITE, `customers/${tx.customerId}`);
      }
    }

    const updatedTransactions = state.transactions.map(t => t.id === txId ? { ...t, status: 'approved' as const, receiptPhoto: receiptPhoto || t.receiptPhoto } : t);

    let updatedStaff = [...state.staff];
    if (tx.type === 'deposit' && tx.staffId) {
      updatedStaff = state.staff.map(s => {
        if (s.id === tx.staffId) {
          return {
            ...s,
            collectionsToday: (s.collectionsToday || 0) + tx.amount,
            collectionsCount: (s.collectionsCount || 0) + 1,
            totalCollectionsAmount: (s.totalCollectionsAmount || 0) + tx.amount
          };
        }
        return s;
      });

      if (currentUser) {
        const staffToUpdate = updatedStaff.find(s => s.id === tx.staffId);
        if (staffToUpdate) {
          try {
            await updateDoc(doc(db, 'staff', tx.staffId), {
              collectionsToday: staffToUpdate.collectionsToday,
              collectionsCount: staffToUpdate.collectionsCount,
              totalCollectionsAmount: staffToUpdate.totalCollectionsAmount
            });
          } catch (e) {
            handleDatabaseError(e, OperationType.WRITE, `staff/${tx.staffId}`);
          }
        }
      }
    }

    if (currentUser) {
      try {
        await updateDoc(doc(db, 'transactions', txId), { status: 'approved', receiptPhoto: receiptPhoto || null });
      } catch (e) {
        handleDatabaseError(e, OperationType.WRITE, `transactions/${txId}`);
      }
    }

    if (customer && (tx.type === 'deposit' || tx.type === 'withdrawal')) {
      const approvedTx: Transaction = { ...tx, status: 'approved' };
      if (tx.type === 'deposit') {
        generatedAlerts = generateAlertsForDeposit(approvedTx, customer, calculatedBalance);
      } else {
        generatedAlerts = generateAlertsForWithdrawal(approvedTx, customer, calculatedBalance);
      }
      
      if (currentUser) {
        for (const a of generatedAlerts) {
          try {
            const queuedAlert = { ...a, status: 'queued' as const };
            await setDoc(doc(db, 'alerts', a.id), queuedAlert);
            dispatchAlert(queuedAlert);
          } catch (e) {
            handleDatabaseError(e, OperationType.WRITE, `alerts/${a.id}`);
          }
        }
      }
    }

    saveState({
      ...state,
      customers: updatedCustomers,
      staff: updatedStaff,
      transactions: updatedTransactions,
      alerts: [...generatedAlerts, ...(state.alerts || [])],
    });
    createAuditLogEntry('APPROVAL', 'Transaction Approved', `Cleared and approved pending ${tx.type} of ₦${tx.amount.toLocaleString()} for ${tx.customerName} (Ref: ${tx.reference || 'N/A'}).`, 'success');
  };

  const rejectTransaction = async (txId: string) => {
    const tx = state.transactions.find(t => t.id === txId);
    saveState({
      ...state,
      transactions: state.transactions.map(t => t.id === txId ? { ...t, status: 'rejected' as const } : t)
    });
    if (tx) {
      createAuditLogEntry('REJECTION', 'Transaction Rejected', `Denied and rejected pending ${tx.type} of ₦${tx.amount.toLocaleString()} for ${tx.customerName} (Ref: ${tx.reference || 'N/A'}).`, 'error');
    }
    if (currentUser) {
      try {
        await updateDoc(doc(db, 'transactions', txId), { status: 'rejected' });
      } catch (e) {
        handleDatabaseError(e, OperationType.WRITE, `transactions/${txId}`);
      }
    }
  };

  // Helper function to simulate random daily contributions to make the dashboard feel live (Optional setting)
  const fundStaffWallet = async (staffId: string, amount: number) => {
    const staffMember = state.staff.find(s => s.id === staffId);
    if (!staffMember) return;

    const currentTreasury = state.settings.treasuryBalance !== undefined ? state.settings.treasuryBalance : 50000000;
    if (currentTreasury < amount) {
      showToast("Insufficient treasury balance to fund wallet.", "error");
      return;
    }

    const newTreasury = currentTreasury - amount;
    const newWalletBalance = (staffMember.walletBalance || 0) + amount;

    // Save changes to settings (treasuryBalance) and staff (walletBalance)
    await updateSettings({ treasuryBalance: newTreasury });
    await updateStaff(staffId, { walletBalance: newWalletBalance });

    // Generate transaction ref and receipt/alert
    const ref = `TRX-${Math.floor(100000 + Math.random() * 900000)}`;
    const txId = `t_fund_${Date.now()}`;
    const newTx: Transaction = {
      id: txId,
      customerId: 'central_treasury',
      customerName: 'Central Contribution Treasury',
      staffId: staffId,
      staffName: staffMember.name,
      type: 'deposit',
      amount: amount,
      status: 'approved',
      timestamp: new Date().toISOString(),
      reference: ref
    };

    if (currentUser) {
      try {
        await setDoc(doc(db, 'transactions', txId), newTx);
      } catch (e) {
        console.error("Failed to post funding transaction to Firebase:", e);
      }
    }

    // Add alert notification
    const alertId = `alert_fund_${Date.now()}`;
    const dateStr = new Date().toLocaleString();
    const smsMessage = `Wallet Funded! Acct: ${staffMember.accountNumber || staffMember.code} Amt: ₦${amount.toLocaleString()} Bal: ₦${newWalletBalance.toLocaleString()} Ref: ${ref} Date: ${dateStr}. Central Treasury debited.`;
    const newSmsAlert: AlertLog = {
      id: alertId,
      txId: txId,
      customerId: staffId,
      customerName: staffMember.name,
      customerPhone: staffMember.phoneNumber || '',
      type: 'sms',
      message: smsMessage,
      status: 'queued',
      timestamp: new Date().toISOString()
    };

    if (currentUser) {
      try {
        await setDoc(doc(db, 'alerts', alertId), newSmsAlert);
        dispatchAlert(newSmsAlert);
      } catch (e) {
        console.error("Failed to post alert:", e);
      }
    }

    saveState({
      ...state,
      settings: { ...state.settings, treasuryBalance: newTreasury },
      staff: state.staff.map(s => s.id === staffId ? { ...s, walletBalance: newWalletBalance } : s),
      transactions: [newTx, ...state.transactions],
      alerts: [newSmsAlert, ...(state.alerts || [])]
    });

    createAuditLogEntry('ONBOARDING', 'Staff Wallet Funded', `HQ Treasury debited ₦${amount.toLocaleString()} to fund Collector ${staffMember.name}'s wallet (NUBAN: ${staffMember.accountNumber || 'Pending'}).`, 'success');
    showToast(`Successfully funded ${staffMember.name}'s wallet with ₦${amount.toLocaleString()}`, "success");
  };

  const triggerSimulation = () => {
    // Select a random active customer and random active staff
    const activeCustomers = state.customers.filter(c => c.status === 'active');
    const activeStaff = state.staff.filter(s => s.status === 'active');

    if (activeCustomers.length === 0 || activeStaff.length === 0) return;

    const randomCustomer = activeCustomers[Math.floor(Math.random() * activeCustomers.length)];
    const randomStaff = activeStaff[Math.floor(Math.random() * activeStaff.length)];
    // Random deposit between 5k and 50k
    const randomAmount = Math.floor(5 + Math.random() * 45) * 1000;
    const ref = `CBP-DSIM${Math.floor(1000 + Math.random() * 9000)}`;

    const simTx: Transaction = {
      id: 't_sim_' + Date.now(),
      customerId: randomCustomer.id,
      customerName: randomCustomer.name,
      staffId: randomStaff.id,
      staffName: randomStaff.name,
      type: 'deposit',
      amount: randomAmount,
      status: 'approved', // auto-approved for simulation live
      timestamp: new Date().toISOString(),
      reference: ref,
    };

    // Update balances
    const updatedCustomers = state.customers.map(c => {
      if (c.id === randomCustomer.id) {
        return { ...c, balance: c.balance + randomAmount };
      }
      return c;
    });

    const updatedStaff = state.staff.map(s => {
      if (s.id === randomStaff.id) {
        return { ...s, collectionsToday: (s.collectionsToday || 0) + randomAmount };
      }
      return s;
    });

    saveState({
      ...state,
      customers: updatedCustomers,
      staff: updatedStaff,
      transactions: [simTx, ...state.transactions],
    });
  };

  const dispatchAnnouncement = async (announcementId: string) => {
    const announcement = state.announcements?.find(a => a.id === announcementId);
    if (!announcement) return;

    const recipients = [
      ...state.customers.map(c => ({ phone: c.phoneNumber, name: c.name })),
      ...state.staff.map(s => ({ phone: s.phoneNumber, name: s.name }))
    ].filter(r => r.phone);

    if (recipients.length === 0) {
      showToast("No recipients found", "error");
      return;
    }

    try {
      const response = await fetch('/api/broadcast-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: announcement.message,
          recipients: recipients.map(r => r.phone),
          apiKey: state.settings?.smsApiKey,
          senderId: state.settings?.smsSenderId
        })
      });

      if (response.ok) {
        await updateDoc(doc(db, 'announcements', announcementId), {
          status: 'sent',
          recipientsCount: recipients.length
        });
        createAuditLogEntry('BROADCAST_SENT', 'Broadcast Dispatched', `Announcement message successfully sent to ${recipients.length} recipients.`, 'success');
        showToast("Broadcast completed successfully", "success");
      } else {
        const errorData = await response.json();
        showToast(errorData.error || "Failed to dispatch broadcast", "error");
      }
    } catch (e) {
      console.error("Dispatch error:", e);
      showToast("Error during broadcast dispatch", "error");
    }
  };

  const requestAnnouncement = async (message: string, sender: { id: string; name: string; role: string }) => {
    const id = `ann_${Date.now()}`;
    const announcement: Announcement = {
      id,
      senderId: sender.id,
      senderName: sender.name,
      senderRole: sender.role,
      message,
      status: 'pending',
      timestamp: new Date().toISOString(),
      type: 'broadcast'
    };

    if (currentUser) {
      try {
        await setDoc(doc(db, 'announcements', id), announcement);
        createAuditLogEntry('BROADCAST_REQUEST', 'Announcement Requested', `${sender.name} (${sender.role}) requested a broadcast message.`, 'info');
        showToast("Announcement request submitted for approval", "success");
      } catch (e) {
        handleDatabaseError(e, OperationType.WRITE, `announcements/${id}`);
      }
    }
  };

  const approveAnnouncement = async (announcementId: string, managerName: string) => {
    if (currentUser) {
      try {
        await updateDoc(doc(db, 'announcements', announcementId), {
          status: 'approved',
          approvedBy: managerName,
          approvedAt: new Date().toISOString()
        });
        showToast("Announcement approved. Starting dispatch...", "success");
        await dispatchAnnouncement(announcementId);
      } catch (e) {
        handleDatabaseError(e, OperationType.WRITE, `announcements/${announcementId}`);
      }
    }
  };

  const declineAnnouncement = async (announcementId: string) => {
    if (currentUser) {
      try {
        await updateDoc(doc(db, 'announcements', announcementId), {
          status: 'declined'
        });
        showToast("Announcement request declined", "info");
      } catch (e) {
        handleDatabaseError(e, OperationType.WRITE, `announcements/${announcementId}`);
      }
    }
  };

  const directAnnouncement = async (message: string) => {
    const id = `ann_${Date.now()}`;
    const announcement: Announcement = {
      id,
      senderId: 'MANAGER',
      senderName: 'HQ Manager',
      senderRole: 'Manager',
      message,
      status: 'approved',
      timestamp: new Date().toISOString(),
      type: 'broadcast'
    };

    if (currentUser) {
      try {
        await setDoc(doc(db, 'announcements', id), announcement);
        showToast("Starting broadcast dispatch...", "info");
        await dispatchAnnouncement(id);
      } catch (e) {
        handleDatabaseError(e, OperationType.WRITE, `announcements/${id}`);
      }
    }
  };

  return {
    state,
    resetToDefaults,
    updateSettings,
    addStaff,
    updateStaffStatus,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    updateCustomerStatus,
    addTransaction,
    approveTransaction,
    rejectTransaction,
    triggerSimulation,
    approveCustomer,
    rejectCustomer,
    createAuditLogEntry,
    updateStaff,
    deleteStaff,
    fundStaffWallet,
    requestAnnouncement,
    approveAnnouncement,
    declineAnnouncement,
    directAnnouncement,
    isOnline,
    authReady,
    currentUser
  };
}
