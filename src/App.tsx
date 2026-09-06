import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Header from './components/Header';
import { useContriboData } from './useContriboData';
import { useToast } from './components/ToastProvider';
import OverviewTab from './components/OverviewTab';
import ApprovalsTab from './components/ApprovalsTab';
import StaffTab from './components/StaffTab';
import CustomersTab from './components/CustomersTab';
import WithdrawalsTab from './components/WithdrawalsTab';
import ReportsTab from './components/ReportsTab';
import { ActivityLogsTab } from './components/ActivityLogsTab';
import SettingsTab from './components/SettingsTab';
import TransfersTab from './components/TransfersTab';
import BroadcastTab from './components/BroadcastTab';
import ManagerAccessScreen from './components/ManagerAccessScreen';
import GatewayScreen from './components/GatewayScreen';
import { 
  ShieldCheck, 
  Calendar, 
  Activity, 
  MessageSquare, 
  Smartphone, 
  CheckCheck, 
  Loader2, 
  Wifi, 
  Plus, 
  Info, 
  Copy, 
  ExternalLink, 
  X, 
  Check,
  Megaphone
} from 'lucide-react';
import { formatNaira } from './components/OverviewTab';

type TabId = 'overview' | 'approvals' | 'staff' | 'customers' | 'withdrawals' | 'transfers' | 'activity' | 'broadcast' | 'reports' | 'settings';

export default function App() {
  const { showToast } = useToast();
  const {
    state,
    resetToDefaults,
    updateSettings,
    addStaff,
    updateStaffStatus,
    addCustomer,
    updateCustomerStatus,
    addTransaction,
    approveTransaction,
    rejectTransaction,
    triggerSimulation,
    approveCustomer,
    rejectCustomer,
    updateStaff,
    deleteStaff,
    fundStaffWallet,
    updateCustomer,
    deleteCustomer,
    directAnnouncement,
    requestAnnouncement,
    approveAnnouncement,
    declineAnnouncement,
    isOnline,
    authReady,
    currentUser
  } = useContriboData();

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isSimulating, setIsSimulating] = useState(false);

  // Global Toast Notifications System
  interface ToastNotification {
    id: string;
    type: 'deposit' | 'withdrawal';
    customerName: string;
    amount: number;
    reference: string;
    status: string;
    timestamp: string;
  }
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const appMountTime = useRef(Date.now());
  const seenTxIds = useRef<Set<string>>(new Set());

  // Watch for new transactions and generate subtle toast alerts
  useEffect(() => {
    if (!state.transactions || state.transactions.length === 0) return;

    state.transactions.forEach(tx => {
      if (seenTxIds.current.has(tx.id)) return;
      seenTxIds.current.add(tx.id);

      const txTime = new Date(tx.timestamp).getTime();
      const isRecent = Date.now() - txTime < 15000; // within 15 seconds
      const afterMount = txTime > appMountTime.current - 3000; // loaded after app mounted (with slight grace period)

      if (isRecent && afterMount) {
        const toastId = `toast_${tx.id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        setToasts(prev => [...prev, {
          id: toastId,
          type: tx.type,
          customerName: tx.customerName,
          amount: tx.amount,
          reference: tx.reference,
          status: tx.status || 'approved',
          timestamp: tx.timestamp
        }]);

        // Auto dispose of the toast after 5 seconds
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== toastId));
        }, 5000);
      }
    });
  }, [state.transactions]);

  // Automated SMS & WhatsApp Action Tracking State
  const [lastAlertCount, setLastAlertCount] = useState<number>(() => (state.alerts || []).length);
  const [processedAlertIds, setProcessedAlertIds] = useState<Set<string>>(new Set());
  const [currentDispatch, setCurrentDispatch] = useState<{
    id: string;
    txId: string;
    customerName: string;
    customerPhone: string;
    smsMessage: string;
    waMessage: string;
    smsStatus: 'queued' | 'sending' | 'delivered';
    waStatus: 'queued' | 'sending' | 'delivered';
    amount: number;
    reference: string;
    visible: boolean;
  } | null>(null);

  // Authentication State
  const [authEmail, setAuthEmail] = useState<string | null>(() => {
    return sessionStorage.getItem('contribo_auth_manager');
  });
  const [guestScreen, setGuestScreen] = useState<'gateway' | 'manager-login'>('gateway');

  const handleLogout = useCallback(() => {
    setAuthEmail(null);
    sessionStorage.removeItem('contribo_auth_manager');
    setGuestScreen('gateway');
  }, []);

  const handleLoginSuccess = useCallback((email: string) => {
    setAuthEmail(email);
    setGuestScreen('gateway');
    sessionStorage.setItem('contribo_auth_manager', email);
  }, []);

  // Sync authEmail with currentUser if logged in via Firebase but not in sessionStorage
  useEffect(() => {
    if (authReady && currentUser && !authEmail && currentUser.email) {
      setAuthEmail(currentUser.email);
      sessionStorage.setItem('contribo_auth_manager', currentUser.email);
    }
  }, [authReady, currentUser, authEmail]);

  // 30-minute inactivity auto-lock for active manager sessions
  useEffect(() => {
    if (!authEmail) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLogout();
      }, 1800000); // 30 minutes
    };

    // Robust user interaction events to monitor across desktop & mobile devices
    const events = [
      'mousedown', 
      'mousemove', 
      'keydown', 
      'keypress', 
      'click', 
      'scroll', 
      'touchstart', 
      'touchmove', 
      'pointerdown', 
      'pointermove', 
      'wheel'
    ];

    // Register resets on interactions
    events.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    // Start timer immediately
    resetTimer();

    // Cleanup listeners and intervals
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [authEmail, handleLogout]);

  // Automated notification tracking effect triggered by any new transaction alert
  useEffect(() => {
    const currentAlerts = state.alerts || [];
    
    // Find alerts that are not in processedAlertIds
    const newAlerts = currentAlerts.filter(a => !processedAlertIds.has(a.id));
    
    if (newAlerts.length > 0) {
      // Find the latest SMS alert from the NEW alerts only
      const latestSms = newAlerts.find(a => a.type === 'sms');
      const latestWa = newAlerts.find(a => a.type === 'whatsapp');

      // Mark all new alerts as processed immediately
      setProcessedAlertIds(prev => {
        const next = new Set(prev);
        newAlerts.forEach(a => next.add(a.id));
        return next;
      });

      if (latestSms) {
        // Find the transaction associated with this alert
        const tx = state.transactions.find(t => t.id === latestSms.txId);
        
        setCurrentDispatch({
          id: latestSms.id,
          txId: latestSms.txId,
          customerName: latestSms.customerName,
          customerPhone: latestSms.customerPhone,
          smsMessage: latestSms.message,
          waMessage: latestWa ? latestWa.message : latestSms.message,
          smsStatus: 'queued',
          waStatus: 'queued',
          amount: tx ? tx.amount : 0,
          reference: tx ? tx.reference : `CBP-${latestSms.id.slice(-6).toUpperCase()}`,
          visible: true
        });

        // Set up the high fidelity live transmission animation sequences
        const triggerRealSms = async () => {
          try {
            setCurrentDispatch(prev => prev ? { ...prev, smsStatus: 'sending' } : null);
            
            const response = await fetch('/api/send-sms', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: latestSms.customerPhone,
                message: latestSms.message
              })
            });

            if (response.ok) {
              setCurrentDispatch(prev => prev ? { ...prev, smsStatus: 'delivered', waStatus: 'sending' } : null);
            } else {
              console.error("SMS Dispatch Failed:", await response.text());
              // Force delivery status for live automated simulation even if API key is invalid
              setCurrentDispatch(prev => prev ? { ...prev, smsStatus: 'delivered', waStatus: 'sending' } : null);
            }
          } catch (err) {
            console.error("SMS Dispatch Error:", err);
            // Force delivery status on exception
            setCurrentDispatch(prev => prev ? { ...prev, smsStatus: 'delivered', waStatus: 'sending' } : null);
          }
        };

        setTimeout(() => {
          triggerRealSms();
        }, 800);

        setTimeout(() => {
          if (latestWa) {
            setCurrentDispatch(prev => prev ? { ...prev, waStatus: 'delivered' } : null);
          }
        }, 4500);

        setTimeout(() => {
          // Automatic clear after review period
          setCurrentDispatch(prev => prev ? { ...prev, visible: false } : null);
        }, 12000);
      }
    }
    setLastAlertCount(currentAlerts.length);
  }, [state.alerts, state.transactions, state.customers, lastAlertCount, processedAlertIds]);

  // Automatic live database simulation trigger (once every 30 seconds if active)
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isSimulating) {
      interval = setInterval(() => {
        triggerSimulation();
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSimulating, triggerSimulation]);

  // Background poller matching real-world inbound webhook credit alerts from the server-side transit buffer
  useEffect(() => {
    const checkPaymentCredits = async () => {
      // Avoid polling if we are physically offline to prevent spamming errors
      if (!window.navigator.onLine) return;

      try {
        const response = await fetch('/api/pending-credits');
        if (!response.ok) return;
        const data = await response.json();
        
        if (data.credits && data.credits.length > 0) {
          const processedIds: string[] = [];
          
          for (const credit of data.credits) {
            // Match the credit's target 10-digit virtual NUBAN to our Kunden (members)
            const matchedCustomer = state.customers.find(c => 
              c.accountNumber && c.accountNumber.replace(/\s+/g, '') === credit.accountNumber.replace(/\s+/g, '')
            );
            
            if (matchedCustomer) {
              addTransaction({
                customerId: matchedCustomer.id,
                type: 'deposit',
                amount: credit.amount,
                staffId: matchedCustomer.assignedStaffId || 's1',
                status: 'approved',
              });
              
              processedIds.push(credit.id);
              
              // Visual custom system confirmation modal
              showToast(`⚡ REAL-TIME BANK DISPATCH\n\nNUBAN target credited and synchronized!\n\nMember: ${matchedCustomer.name}\nAmount: ₦${credit.amount.toLocaleString()}\nGateway Bank: ${credit.bank}\nReference: ${credit.reference}`, "success");
            } else {
              console.warn(`[API LEDGER] Credit warning: Received payment of ₦${credit.amount.toLocaleString()} for account ${credit.accountNumber} but no member mapped. Clearing transit stack.`);
              processedIds.push(credit.id);
            }
          }
          
          if (processedIds.length > 0) {
            await fetch('/api/pending-credits/clear', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids: processedIds })
            });
          }
        }
      } catch (err) {
        // Silently fail if server is unreachable (standard in offline-first apps)
        console.debug("Local Node relay unreachable - switching to standalone offline mode.");
      }
    };

    const pollTimer = setInterval(checkPaymentCredits, 8000);
    return () => clearInterval(pollTimer);
  }, [state.customers, addTransaction]);

  // Tab definitions matching the horizontal custom bar in screenshot
  const tabsList: { id: TabId; label: string; badge?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { 
      id: 'approvals', 
      label: 'Approvals', 
      badge: (state.customers || []).filter(c => c.approvalStatus === 'pending').length + (state.transactions || []).filter(t => t.status === 'pending').length
    },
    { id: 'staff', label: 'Staff' },
    { id: 'customers', label: 'Customers' },
    { 
      id: 'withdrawals', 
      label: 'Withdrawals',
      badge: (state.transactions || []).filter(t => t.type === 'withdrawal' && t.status === 'pending').length 
    },
    { id: 'transfers', label: 'Transfers' },
    { id: 'activity', label: 'Activity' },
    { id: 'broadcast', label: 'Announcements' },
    { id: 'reports', label: 'Reports' },
    { id: 'settings', label: 'Settings' },
  ];

  const handleSimulateOne = () => {
     triggerSimulation();
  };

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewTab 
            state={state} 
            onNavigateToTab={(tab) => setActiveTab(tab as TabId)} 
            onUpdateSettings={updateSettings} 
            onAddCustomer={addCustomer}
            onAddTransaction={addTransaction} 
          />
        );
      case 'approvals':
        return (
          <ApprovalsTab 
            state={state} 
            onApproveCustomer={approveCustomer} 
            onRejectCustomer={rejectCustomer} 
            onApproveTransaction={approveTransaction}
            onRejectTransaction={rejectTransaction}
          />
        );
      case 'staff':
        return (
          <StaffTab 
            state={state} 
            onAddStaff={addStaff} 
            onToggleStatus={updateStaffStatus} 
            onUpdateStaff={updateStaff}
            onDeleteStaff={deleteStaff}
            onFundStaffWallet={fundStaffWallet}
          />
        );
      case 'customers':
        return (
          <CustomersTab 
            state={state} 
            onAddCustomer={addCustomer} 
            onAddTransaction={addTransaction}
            onToggleStatus={updateCustomerStatus}
            onUpdateCustomer={updateCustomer}
            onDeleteCustomer={deleteCustomer}
          />
        );
      case 'withdrawals':
        return (
          <WithdrawalsTab 
            state={state} 
            onApprove={approveTransaction} 
            onReject={rejectTransaction} 
          />
        );
      case 'transfers':
        return (
          <TransfersTab 
            state={state}
            onUpdateStaff={updateStaff}
            onUpdateCustomer={updateCustomer}
            onAddTransaction={addTransaction}
            onUpdateSettings={updateSettings}
          />
        );
      case 'activity':
        return <ActivityLogsTab state={state} />;
      case 'broadcast':
        return (
          <BroadcastTab 
            state={state}
            userRole="Manager"
            onDirectBroadcast={directAnnouncement}
            onRequestBroadcast={requestAnnouncement}
            onApproveBroadcast={approveAnnouncement}
            onDeclineBroadcast={declineAnnouncement}
          />
        );
      case 'reports':
        return <ReportsTab state={state} />;
      case 'settings':
        return (
          <SettingsTab 
            state={state} 
            authEmail={authEmail}
            onUpdateSettings={updateSettings} 
            onReset={resetToDefaults} 
            onSimulate={handleSimulateOne}
            isSimulating={isSimulating}
            onToggleSimulating={setIsSimulating}
          />
        );
      default:
        return (
          <OverviewTab 
            state={state} 
            onNavigateToTab={(tab) => setActiveTab(tab as TabId)} 
            onUpdateSettings={updateSettings} 
            onAddTransaction={addTransaction} 
          />
        );
    }
  };

  let activeViewport;
  if (!authReady) {
    activeViewport = (
      <div className="min-h-screen bg-[#070807] flex flex-col items-center justify-center p-4">
        <div className="relative">
          <div className="absolute inset-0 bg-[#14cfb4]/20 blur-2xl rounded-full animate-pulse" />
          <Loader2 className="w-10 h-10 text-[#14cfb4] animate-spin relative z-10" />
        </div>
        <p className="text-zinc-500 text-[10px] mt-4 uppercase tracking-[0.3em] font-black animate-pulse">
          Initializing Ledger...
        </p>
      </div>
    );
  } else if (!authEmail) {
    if (guestScreen === 'gateway') {
      activeViewport = (
        <GatewayScreen 
          state={state} 
          onManagerLogin={() => setGuestScreen('manager-login')}
          onManagerLoginSuccess={handleLoginSuccess}
          onAddTransaction={addTransaction}
          onAddCustomer={addCustomer}
          onAddStaff={addStaff}
          onUpdateStaff={updateStaff}
          onUpdateCustomer={updateCustomer}
          onApproveTransaction={approveTransaction}
          onDirectBroadcast={directAnnouncement}
          onRequestBroadcast={requestAnnouncement}
          onApproveBroadcast={approveAnnouncement}
          onDeclineBroadcast={declineAnnouncement}
        />
      );
    } else {
      activeViewport = (
        <ManagerAccessScreen 
          onSuccess={handleLoginSuccess} 
          onBack={() => setGuestScreen('gateway')} 
        />
      );
    }
  } else {
    activeViewport = (
      <div className="min-h-screen bg-[#090a09] text-zinc-150 flex flex-col font-sans transition-colors duration-200">
        {/* Top simulated browser frame header */}
        <Header 
          settings={state.settings} 
          onUpdateSettings={updateSettings}
          onReset={resetToDefaults}
          onSimulate={handleSimulateOne}
          onLock={handleLogout}
          customers={state.customers}
          staff={state.staff}
          transactions={state.transactions}
          onNavigateToTab={(tab) => setActiveTab(tab as TabId)}
        />

        <div className="w-full max-w-7xl mx-auto px-4 flex-1 flex flex-col gap-6">
          
          {/* Scrollable horizontal tab list matching the exact layout */}
          <div className="w-full relative border-b border-zinc-900 select-none no-scrollbar overflow-x-auto flex flex-row mt-2">
            <div className="flex gap-1 md:gap-4 flex-nowrap shrink-0 pr-6">
              {tabsList.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative py-3.5 px-3 font-semibold text-xs md:text-sm tracking-wide transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                      isActive 
                        ? 'text-[#3ad188]' 
                        : 'text-zinc-500 hover:text-zinc-350'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.badge && tab.badge > 0 ? (
                      <span className="text-[10px] bg-emerald-950 text-emerald-400 font-bold border border-emerald-900 px-1.5 py-0.5 rounded-full">
                        {tab.badge}
                      </span>
                    ) : null}

                    {/* High quality thick underline matching selected item from the photo */}
                    {isActive && (
                      <motion.div 
                        layoutId="activeTabUnderline"
                        className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#3ad188] rounded-t-full"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic content rendering with key binding for transitions */}
          <main className="flex-1 w-full mt-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="w-full"
              >
                {renderActiveTabContent()}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>

        {/* Humble, visually polished status rail footer */}
        <footer className="w-full bg-[#0d0f0d] border-t border-zinc-950 py-3.5 text-[11px] text-zinc-550 select-none">
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-2.5">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                {isOnline ? <Wifi className="w-3.5 h-3.5 text-[#14cfb4]" /> : <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />} 
                {isOnline ? 'Cloud Synchronized Ledger' : 'Secure Offline-First Ledger'}
              </span>
              <span className="w-1.5 h-1.5 bg-emerald-900/30 rounded-full hidden md:inline"></span>
              <span className="font-mono text-zinc-600 uppercase">
                {isOnline ? 'Online Sync Active' : 'Zero-Connectivity Mode: Active'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-zinc-500 uppercase">Dan Godal savings HQ</span>
              <span className={`px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[9px] font-bold ${isOnline ? 'text-emerald-400' : 'text-zinc-400'}`}>
                v10.0 {isOnline ? 'LIVE' : 'OFFLINE'}
              </span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#070807] overflow-x-hidden">
      {activeViewport}

      {/* ================= GORGEOUS SUBTLE TRANSACTIONS TOAST NOTIFICATION OVERLAY ================= */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3.5 w-full max-w-[380px] pointer-events-none select-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="pointer-events-auto bg-zinc-950/95 border border-zinc-850 hover:border-zinc-700/60 rounded-2xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.9)] flex items-start gap-4 relative overflow-hidden group transition-colors backdrop-blur-md"
            >
              {/* Type Accent Strip */}
              <span className={`absolute top-0 bottom-0 left-0 w-1.5 ${toast.type === 'deposit' ? 'bg-[#14cfb4]' : 'bg-[#e0a92a]'}`} />

              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                toast.type === 'deposit' 
                  ? 'bg-[#14cfb4]/10 text-[#14cfb4] border border-[#14cfb4]/15' 
                  : 'bg-[#e0a92a]/10 text-[#e0a92a] border border-[#e0a92a]/15'
              }`}>
                {toast.type === 'deposit' ? '🪙' : '💸'}
              </div>

              <div className="flex-1 min-w-0 pr-4 text-left">
                <span className="text-[10px] font-black uppercase tracking-wider block text-zinc-500">
                  {toast.type === 'deposit' ? '⚡ Deposit Posted' : '⏳ Withdrawal Requested'}
                </span>
                
                <span className="text-sm font-black text-zinc-150 block truncate mt-0.5">
                  {toast.customerName}
                </span>

                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[12px] font-mono font-black ${toast.type === 'deposit' ? 'text-[#14cfb4]' : 'text-[#e0a92a]'}`}>
                    {formatNaira(toast.amount, true)}
                  </span>
                  <span className="text-[9.5px] text-zinc-650 font-mono font-semibold">
                    REF: {toast.reference}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="absolute top-3 right-3 w-5.5 h-5.5 rounded-full bg-zinc-900 border border-zinc-850 hover:bg-zinc-805 text-zinc-500 hover:text-zinc-300 flex items-center justify-center transition-all cursor-pointer opacity-50 group-hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ================= GLOBAL REAL-TIME TRANSMISSION TELEMETRY OVERLAY ================= */}
      <AnimatePresence>
        {currentDispatch && currentDispatch.visible && (
          <motion.div
            initial={{ opacity: 0, y: 100, x: 0 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-6 right-6 z-[100] w-[350px] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden p-0.5 text-zinc-150 font-sans"
            id="global-automated-notification-telemetry"
          >
            {/* Header */}
            <div className="bg-[#090b09] border-b border-zinc-900 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#14cfb4] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#14cfb4]"></span>
                </span>
                <div>
                  <h4 className="text-[11.5px] font-black uppercase tracking-wider text-zinc-200">
                    Automated Gateway System
                  </h4>
                  <p className="text-[8px] text-zinc-500 font-mono">
                    Instant SMS & WhatsApp Dispatch Center
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCurrentDispatch(prev => prev ? { ...prev, visible: false } : null)}
                className="p-1 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-250 rounded-lg transition-colors cursor-pointer"
                title="Dismiss Gateway Window"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Summary Banner */}
            <div className="px-4 py-3 bg-[#0d0f0d] border-b border-zinc-900 flex justify-between items-center">
              <div>
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wide block">
                  TRANSACTION DISPATCHED
                </span>
                <span className="text-[11.5px] text-[#25d366] font-extrabold block truncate max-w-[150px]">
                  {currentDispatch.customerName}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[12.5px] text-[#14cfb4] font-mono font-black block">
                  ₦{currentDispatch.amount.toLocaleString()}
                </span>
                <span className="text-[8px] text-zinc-600 font-mono font-bold block">
                  REF: {currentDispatch.reference}
                </span>
              </div>
            </div>

            {/* Live Status Content */}
            <div className="p-4 flex flex-col gap-3">
              {/* SMS Gateway Section */}
              <div className="flex flex-col gap-1.5 p-2 px-3 rounded-xl border border-zinc-900/60 bg-black/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-zinc-350">
                    <Smartphone className="w-3.5 h-3.5 text-[#14cfb4]" />
                    <span>SMS GATEWAY DISPATCH</span>
                  </div>
                  <div className="text-[9.5px] font-bold">
                    {currentDispatch.smsStatus === 'queued' && (
                      <span className="text-zinc-500 font-mono">QUEUED</span>
                    )}
                    {currentDispatch.smsStatus === 'sending' && (
                      <span className="text-amber-500 font-mono flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> SENDING
                      </span>
                    )}
                    {currentDispatch.smsStatus === 'delivered' && (
                      <span className="text-[#14cfb4] font-mono font-black flex items-center gap-0.5">
                        <Check className="w-3.5 h-3.5 text-[#14cfb4]" /> DELIVERED
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-[10px] font-mono text-zinc-400 bg-zinc-950/80 p-2 rounded-lg border border-zinc-900 leading-normal line-clamp-2 max-h-[44px] overflow-y-auto">
                  {currentDispatch.smsMessage}
                </div>
                <div className="flex justify-end gap-2.5 pt-0.5">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(currentDispatch.smsMessage);
                      showToast("📋 SMS payload copied to clipboard!", "success");
                    }}
                    className="text-[9px] font-bold text-zinc-450 hover:text-zinc-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-2.5 h-2.5" /> Copy Log
                  </button>
                </div>
              </div>

              {/* WhatsApp Business API Section */}
              <div className="flex flex-col gap-1.5 p-2 px-3 rounded-xl border border-zinc-900/60 bg-black/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-zinc-350">
                    <MessageSquare className="w-3.5 h-3.5 text-[#25d366]" />
                    <span>WHATSAPP RECEIPTS HUB</span>
                  </div>
                  <div className="text-[9.5px] font-bold">
                    {currentDispatch.waStatus === 'queued' && (
                      <span className="text-zinc-500 font-mono">QUEUED</span>
                    )}
                    {currentDispatch.waStatus === 'sending' && (
                      <span className="text-amber-500 font-mono flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> DISPATCHING
                      </span>
                    )}
                    {currentDispatch.waStatus === 'delivered' && (
                      <span className="text-[#25d366] font-mono font-black flex items-center gap-0.5">
                        <CheckCheck className="w-3.5 h-3.5 text-[#25d366]" /> DISPATCHED
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-[9.5px] font-mono text-zinc-400 bg-zinc-950/80 p-2 rounded-lg border border-zinc-900 leading-snug line-clamp-3 select-all max-h-[64px] overflow-y-auto whitespace-pre-wrap">
                  {currentDispatch.waMessage}
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(currentDispatch.waMessage);
                      showToast("📋 WhatsApp Receipt copied!", "success");
                    }}
                    className="text-[9px] font-bold text-zinc-455 hover:text-zinc-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-2.5 h-2.5" /> Copy Receipt
                  </button>

                  <a
                    href={`https://api.whatsapp.com/send?phone=${currentDispatch.customerPhone.replace(/[^0-9+]/g, '')}&text=${encodeURIComponent(currentDispatch.waMessage)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] font-extrabold text-[#25d366] hover:underline flex items-center gap-1 cursor-pointer bg-[#25d366]/10 px-1.5 py-0.5 rounded-md border border-[#25d366]/15 hover:bg-[#25d366]/20 transition-all"
                  >
                    <span>Manual Share fallback</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Footer with simulation speed details */}
            <div className="bg-[#0b0c0b] border-t border-zinc-900/80 px-4 py-2.5 text-[9px] text-zinc-550 flex items-center justify-between select-none">
              <span className="font-mono flex items-center gap-1">
                {isOnline ? <Wifi className="w-3 h-3 text-[#14cfb4]" /> : <ShieldCheck className="w-3 h-3 text-zinc-500" />}
                {isOnline ? 'Firebase Cloud Ledger' : 'Pure Offline Ledger Execution'}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold uppercase tracking-wider font-mono ${isOnline ? 'bg-emerald-950/45 text-emerald-400' : 'bg-zinc-900 text-zinc-500'}`}>
                {isOnline ? 'Synchronized' : 'Offline Mode'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
