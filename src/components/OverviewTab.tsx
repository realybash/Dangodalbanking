import * as React from 'react';
import { motion } from 'motion/react';
import { 
  Users, Hexagon, DollarSign, UserCheck, TrendingUp, Calendar, Trophy, 
  ChevronRight, Smartphone, MessageSquare, Radio, Send, Copy, Wifi, 
  BellRing, Volume2, ShieldCheck, Cpu, Search, Activity, ArrowUpRight, 
  ArrowDownRight, Plus, X, Coins, Wallet, Briefcase, ShieldAlert, QrCode
} from 'lucide-react';
import { DashboardState, ContriboSettings } from '../types';
import jsQR from 'jsqr';
import { CustomerStats } from './CustomerStats';

interface OverviewTabProps {
  state: DashboardState;
  onNavigateToTab: (tabId: string) => void;
  onUpdateSettings?: (updated: Partial<ContriboSettings>) => void;
  onAddCustomer?: (customer: any) => void;
  onAddTransaction?: (tx: {
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
  }) => void;
}

// Utility to format numbers in Nigerian Naira Currency
export function formatNaira(amount: number, showDecimals: boolean = true): string {
  const formatter = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });
  return formatter.format(amount);
}

// Utility for Shorthand formatted numbers (e.g. 84.2M or 312K)
export function formatShorthand(num: number): string {
  if (num >= 1000000) {
    return `₦${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `₦${(num / 1000).toFixed(0)}K`;
  }
  return `₦${num}`;
}

export default function OverviewTab({ state, onNavigateToTab, onUpdateSettings, onAddCustomer, onAddTransaction }: OverviewTabProps) {
  const { customers, staff, transactions, settings } = state;

  const [txSearchQuery, setTxSearchQuery] = React.useState('');
  
  // Filtered transactions based on search query (name or reference number)
  const filteredTransactions = React.useMemo(() => {
    if (!txSearchQuery.trim()) {
      return transactions;
    }
    const query = txSearchQuery.toLowerCase().trim();
    return transactions.filter(
      (tx) =>
        (tx.customerName && tx.customerName.toLowerCase().includes(query)) ||
        (tx.reference && tx.reference.toLowerCase().includes(query)) ||
        (tx.customerId && tx.customerId.toLowerCase().includes(query))
    );
  }, [transactions, txSearchQuery]);

  const [senderIdInput, setSenderIdInput] = React.useState(settings.smsSenderId || 'ContriboPay');
  const [testPhoneInput, setTestPhoneInput] = React.useState('');
  const [testMessageInput, setTestMessageInput] = React.useState('ContriboPay Credit! Acct: *8294 Amt: ₦15,000 Bal: ₦84,500 Ref: CBP-T1827 Date: Just Now. Auto SMS gateway alert.');
  const [isSendingTest, setIsSendingTest] = React.useState(false);
  const [testResultNotify, setTestResultNotify] = React.useState('');
  const [copiedAlertId, setCopiedAlertId] = React.useState<string | null>(null);

  // Floating Quick Action menu states
  const [isQuickActionsOpen, setIsQuickActionsOpen] = React.useState(false);
  const [showDepositModal, setShowDepositModal] = React.useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = React.useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = React.useState(false);

  // New Customer Form States
  const [custName, setCustName] = React.useState('');
  const [custPhone, setCustPhone] = React.useState('');
  const [custLocation, setCustLocation] = React.useState('');
  const [custAddress, setCustAddress] = React.useState('');
  const [custAssignedStaff, setCustAssignedStaff] = React.useState('');
  const [custNotes, setCustNotes] = React.useState('');
  const [custError, setCustError] = React.useState('');
  const [custSuccess, setCustSuccess] = React.useState('');
  const [isCustSubmitting, setIsCustSubmitting] = React.useState(false);

  // New Deposit Form States
  const [depSearchQuery, setDepSearchQuery] = React.useState('');
  const [depSelectedCustomerId, setDepSelectedCustomerId] = React.useState('');
  const [depAmount, setDepAmount] = React.useState('');
  const [depStaffId, setDepStaffId] = React.useState('');
  const [depStatus, setDepStatus] = React.useState<'approved' | 'pending'>('approved');
  const [depError, setDepError] = React.useState('');
  const [depSuccess, setDepSuccess] = React.useState('');
  const [isDepSubmitting, setIsDepSubmitting] = React.useState(false);
  const [depIsRecurring, setDepIsRecurring] = React.useState(false);
  const [depRecurringInterval, setDepRecurringInterval] = React.useState<'weekly' | 'monthly'>('weekly');

  // QR Scanner Support for New Deposit Modal
  const [isScanningQr, setIsScanningQr] = React.useState(false);
  const [cameraError, setCameraError] = React.useState('');
  const [qrFeedback, setQrFeedback] = React.useState('');
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  // Parser for physical receipt metadata
  const parseQrData = (data: string) => {
    try {
      // 1. JSON Format
      if (data.trim().startsWith('{')) {
        const parsed = JSON.parse(data);
        const customerId = parsed.customerId || parsed.customer || parsed.id || parsed.customer_id || '';
        const amount = parsed.amount || parsed.depositAmount || parsed.value || parsed.deposit || '';
        const staffId = parsed.staffId || parsed.staff || parsed.assignedStaffId || '';
        return { customerId: customerId.toString(), amount: amount.toString(), staffId: staffId.toString() };
      }
    } catch {
      // ignore
    }

    // 2. Query URL params format
    try {
      if (data.includes('?') || data.startsWith('http')) {
        const urlStr = data.startsWith('http') ? data : `http://x.y/${data}`;
        const url = new URL(urlStr);
        const customerId = url.searchParams.get('customer') || url.searchParams.get('customerId') || url.searchParams.get('id') || '';
        const amount = url.searchParams.get('amount') || url.searchParams.get('depositAmount') || '';
        const staffId = url.searchParams.get('staff') || url.searchParams.get('staffId') || '';
        if (customerId || amount || staffId) {
          return { customerId, amount, staffId };
        }
      }
    } catch {
      // ignore
    }

    // 3. Line-by-line regex format (e.g. from printable slips)
    const lines = data.split('\n');
    let customerId = '';
    let amount = '';
    let staffId = '';
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes('customer') || lower.includes('acct') || lower.includes('account') || lower.includes('saver')) {
        const match = line.match(/(?:id|customer|acct|account|saver)\s*[:=-]?\s*([a-zA-Z0-9_\-]+)/i);
        if (match) customerId = match[1];
      }
      if (lower.includes('amount') || lower.includes('amt') || lower.includes('deposit')) {
        const match = line.match(/(?:amount|amt|deposit|val|value)\s*[:=-]?\s*(?:₦|ngn)?\s*([0-9]+)/i);
        if (match) amount = match[1];
      }
      if (lower.includes('staff') || lower.includes('collector') || lower.includes('agent')) {
        const match = line.match(/(?:staff|collector|agent|id)\s*[:=-]?\s*([a-zA-Z0-9_\-]+)/i);
        if (match) staffId = match[1];
      }
    }

    if (customerId || amount || staffId) {
      return { customerId, amount, staffId };
    }

    // 4. Default plain text: treat entire QR text as customer identifier
    return { customerId: data.trim(), amount: '', staffId: '' };
  };

  // Decodes camera frame loop to read QR Code
  React.useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrameId: number;

    const startCamera = async () => {
      try {
        setCameraError('');
        setQrFeedback('Initializing camera...');
        
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
          setQrFeedback('Scan physical receipt QR...');
          animationFrameId = requestAnimationFrame(tick);
        }
      } catch (err: any) {
        console.error('Camera access error:', err);
        setCameraError('Unable to access camera. Please grant camera permission.');
        setIsScanningQr(false);
      }
    };

    const tick = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            // Decode frame
            try {
              const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert',
              });
              
              if (code && code.data) {
                handleDecodedQr(code.data);
                return; // stop execution loop
              }
            } catch (qrErr) {
              // ignore decode error on intermediate non-focused frames
            }
          }
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    const handleDecodedQr = (qrData: string) => {
      setIsScanningQr(false);
      setQrFeedback('QR decoded successfully!');
      
      const parsed = parseQrData(qrData);
      
      let matchedCust = null;
      if (parsed.customerId) {
        const qId = parsed.customerId.toLowerCase().trim();
        matchedCust = customers.find(c => 
          c.status === 'active' && (
            c.id.toLowerCase() === qId ||
            c.phoneNumber.replace(/\D/g, '') === qId.replace(/\D/g, '') ||
            c.name.toLowerCase().trim() === qId
          )
        );
      }

      if (!matchedCust && parsed.customerId) {
        const query = parsed.customerId.toLowerCase().trim();
        matchedCust = customers.find(c => 
          c.status === 'active' && (
            c.name.toLowerCase().includes(query) ||
            c.phoneNumber.includes(query)
          )
        );
      }

      if (matchedCust) {
        setDepSelectedCustomerId(matchedCust.id);
        setDepSearchQuery('');
        setDepSuccess(`QR Scanned: Identified customer "${matchedCust.name}"`);
        setTimeout(() => setDepSuccess(''), 4500);
      } else if (parsed.customerId) {
        setDepError(`QR Decoded customer identifier "${parsed.customerId}", but no matches found.`);
        setDepSelectedCustomerId('');
        setTimeout(() => setDepError(''), 4500);
      }

      if (parsed.amount) {
        const cleanAmt = parsed.amount.replace(/[^0-9]/g, '');
        if (cleanAmt) {
          setDepAmount(cleanAmt);
        }
      }

      if (parsed.staffId) {
        const sId = parsed.staffId.toLowerCase().trim();
        const foundStaff = staff.find(s => s.id.toLowerCase() === sId && s.status === 'active');
        if (foundStaff) {
          setDepStaffId(foundStaff.id);
        }
      }
    };

    if (isScanningQr) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };

    function stopCamera() {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      cancelAnimationFrame(animationFrameId);
    }
  }, [isScanningQr, customers, staff]);

  const [recurringPlans, setRecurringPlans] = React.useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('contribopay_recurring_plans');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveRecurringPlans = (plans: any[]) => {
    setRecurringPlans(plans);
    localStorage.setItem('contribopay_recurring_plans', JSON.stringify(plans));
  };

  // New Withdrawal Form States
  const [wSearchQuery, setWSearchQuery] = React.useState('');
  const [wSelectedCustomerId, setWSelectedCustomerId] = React.useState('');
  const [wAmount, setWAmount] = React.useState('');
  const [wProfitAmount, setWProfitAmount] = React.useState('');
  const [wStaffId, setWStaffId] = React.useState('');
  const [wStatus, setWStatus] = React.useState<'approved' | 'pending'>('pending');
  const [wPayoutMethod, setWPayoutMethod] = React.useState<'bank' | 'cash'>('bank');
  const [wBankName, setWBankName] = React.useState('');
  const [wAccountName, setWAccountName] = React.useState('');
  const [wAccountNumber, setWAccountNumber] = React.useState('');
  const [wError, setWError] = React.useState('');
  const [wSuccess, setWSuccess] = React.useState('');
  const [isWSubmitting, setIsWSubmitting] = React.useState(false);

  // Auto-fill payout details logic when a customer is selected for withdrawal
  React.useEffect(() => {
    if (wSelectedCustomerId) {
      const selected = customers.find(c => c.id === wSelectedCustomerId);
      if (selected) {
        setWBankName(selected.payoutBankName || '');
        setWAccountName(selected.payoutAccountName || selected.name || '');
        setWAccountNumber(selected.payoutAccountNumber || '');
      }
    } else {
      setWBankName('');
      setWAccountName('');
      setWAccountNumber('');
    }
  }, [wSelectedCustomerId, customers]);

  // Set default staff ID once they are available
  React.useEffect(() => {
    if (staff.length > 0) {
      if (!depStaffId) setDepStaffId(staff[0].id);
      if (!wStaffId) setWStaffId(staff[0].id);
    }
  }, [staff]);

  // Periodic scheduler loop for automated savings deposits
  React.useEffect(() => {
    if (!onAddTransaction || customers.length === 0) return;

    const runAutomatedScheduler = () => {
      const parentNow = new Date();
      let hasUpdates = false;
      
      const currentPlans = (() => {
        try {
          const saved = localStorage.getItem('contribopay_recurring_plans');
          return saved ? JSON.parse(saved) : [];
        } catch {
          return [];
        }
      })();

      if (currentPlans.length === 0) return;

      const updatedPlans = currentPlans.map((plan: any) => {
        if (!plan.isActive) return plan;
        
        const nextDate = new Date(plan.nextOccurrence);
        if (nextDate <= parentNow) {
          const customer = customers.find(c => c.id === plan.customerId);
          // Only execute if customer is currently active
          if (customer && customer.status === 'active') {
            onAddTransaction({
              customerId: plan.customerId,
              type: 'deposit',
              amount: plan.amount,
              staffId: plan.staffId || 'hq',
              status: plan.status || 'approved'
            });

            // Calculate next execution date
            const newNext = new Date(plan.nextOccurrence);
            if (plan.interval === 'weekly') {
              newNext.setDate(newNext.getDate() + 7);
            } else {
              newNext.setMonth(newNext.getMonth() + 1);
            }

            hasUpdates = true;

            // Log scheduler event log
            try {
              const auditNow = {
                id: `audit-${Date.now()}`,
                timestamp: new Date().toISOString(),
                actionType: 'SUBMISSION',
                actor: 'AUTO-SCHEDULER',
                title: 'Automated Saved Contribution Posting',
                description: `Scheduler executed recurring ${plan.interval} deposit of ₦${plan.amount.toLocaleString()} for customer ${plan.customerName}. Next run scheduled for ${newNext.toLocaleDateString()}.`,
                severity: 'success'
              };
              const existingAudits = JSON.parse(localStorage.getItem('contribopay_sched_audits') || '[]');
              localStorage.setItem('contribopay_sched_audits', JSON.stringify([auditNow, ...existingAudits]));
            } catch (e) {
              console.error(e);
            }

            return {
              ...plan,
              nextOccurrence: newNext.toISOString()
            };
          }
        }
        return plan;
      });

      if (hasUpdates) {
        saveRecurringPlans(updatedPlans);
      }
    };

    // run on mount & periodically
    runAutomatedScheduler();
    const timerId = setInterval(runAutomatedScheduler, 10000);
    return () => clearInterval(timerId);
  }, [customers, onAddTransaction]);

  const filteredDepCustomers = React.useMemo(() => {
    if (!depSearchQuery.trim()) return [];
    const q = depSearchQuery.toLowerCase();
    return customers.filter(c => 
      c.status === 'active' && (
        c.name.toLowerCase().includes(q) || 
        c.phoneNumber.includes(q) ||
        (c.id && c.id.toLowerCase().includes(q))
      )
    );
  }, [customers, depSearchQuery]);

  const filteredWCustomers = React.useMemo(() => {
    if (!wSearchQuery.trim()) return [];
    const q = wSearchQuery.toLowerCase();
    return customers.filter(c => 
      c.status === 'active' && (
        c.name.toLowerCase().includes(q) || 
        c.phoneNumber.includes(q) ||
        (c.id && c.id.toLowerCase().includes(q))
      )
    );
  }, [customers, wSearchQuery]);

  React.useEffect(() => {
    if (staff && staff.length > 0 && !custAssignedStaff) {
      setCustAssignedStaff(staff[0].id);
    }
  }, [staff, custAssignedStaff]);

  const handleCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCustError('');
    setCustSuccess('');

    if (!custName.trim() || !custLocation.trim() || !custAddress.trim() || !custAssignedStaff) {
      setCustError('Please fill out all registration fields including street address.');
      return;
    }

    if (!onAddCustomer) {
      setCustError('System error: Onboarding service not ready.');
      return;
    }

    setIsCustSubmitting(true);
    try {
      onAddCustomer({
        name: custName.trim(),
        phoneNumber: custPhone.trim() || 'No Phone',
        location: custLocation.trim(),
        address: custAddress.trim(),
        assignedStaffId: custAssignedStaff,
        status: 'active',
        approvalStatus: 'approved',
        contributionsCount: 1,
        managerNotes: custNotes.trim()
      });

      setCustSuccess('Customer added and verified successfully!');
      
      // Clear fields
      setCustName('');
      setCustPhone('');
      setCustLocation('');
      setCustAddress('');
      setCustNotes('');

      setTimeout(() => {
        setShowAddCustomerModal(false);
        setCustSuccess('');
      }, 1500);
    } catch (err: any) {
      setCustError(err.message || 'An error occurred.');
    } finally {
      setIsCustSubmitting(false);
    }
  };

  const handleDepositSubmit = () => {
    setDepError('');
    setDepSuccess('');

    if (!depSelectedCustomerId) {
      setDepError('Please select a customer.');
      return;
    }

    const amt = parseFloat(depAmount);
    if (isNaN(amt) || amt <= 0) {
      setDepError('Please enter a valid amount.');
      return;
    }

    if (!depStaffId) {
      setDepError('Please select a staff collector.');
      return;
    }

    if (!onAddTransaction) {
      setDepError('System error: Transaction service not ready.');
      return;
    }

    setIsDepSubmitting(true);
    try {
      onAddTransaction({
        customerId: depSelectedCustomerId,
        type: 'deposit',
        amount: amt,
        staffId: depStaffId,
        status: depStatus
      });

      if (depIsRecurring) {
        const nextOccurrence = new Date();
        if (depRecurringInterval === 'weekly') {
          nextOccurrence.setDate(nextOccurrence.getDate() + 7);
        } else {
          nextOccurrence.setMonth(nextOccurrence.getMonth() + 1);
        }

        const selectedCust = customers.find(c => c.id === depSelectedCustomerId);
        const selectedStaff = staff.find(s => s.id === depStaffId);

        const newPlan = {
          id: `plan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          customerId: depSelectedCustomerId,
          customerName: selectedCust?.name || 'Customer',
          amount: amt,
          interval: depRecurringInterval,
          staffId: depStaffId,
          staffName: selectedStaff?.name || 'Administrator',
          status: depStatus,
          nextOccurrence: nextOccurrence.toISOString(),
          isActive: true,
          createdAt: new Date().toISOString()
        };

        const existing = [...recurringPlans, newPlan];
        saveRecurringPlans(existing);
      }

      setDepSuccess(depIsRecurring 
        ? `Contribution saved, and auto-deposit schedule set to run ${depRecurringInterval}!`
        : 'Savings contribution recorded successfully!'
      );
      setDepAmount('');
      setDepSearchQuery('');
      setDepSelectedCustomerId('');
      setDepIsRecurring(false);

      setTimeout(() => {
        setDepSuccess('');
        setShowDepositModal(false);
        setIsDepSubmitting(false);
      }, 2000);
    } catch (err: any) {
      setDepError(err?.message || 'Failed to submit deposit.');
      setIsDepSubmitting(false);
    }
  };

  const handleWithdrawalSubmit = () => {
    setWError('');
    setWSuccess('');

    if (!wSelectedCustomerId) {
      setWError('Please select a customer.');
      return;
    }

    const custObj = customers.find(c => c.id === wSelectedCustomerId);
    if (!custObj) {
      setWError('Customer not found.');
      return;
    }

    const amt = parseFloat(wAmount);
    if (isNaN(amt) || amt <= 0) {
      setWError('Please enter a valid amount.');
      return;
    }

    if (amt > custObj.balance) {
      setWError(`Insufficient balance! Max available: ${formatNaira(custObj.balance)}`);
      return;
    }

    if (!wStaffId) {
      setWError('Please select a staff collector.');
      return;
    }

    const profitVal = parseFloat(wProfitAmount) || 0;
    if (profitVal < 0) {
      setWError('Profit cannot be a negative number.');
      return;
    }

    if (!onAddTransaction) {
      setWError('System error: Transaction service not ready.');
      return;
    }

    setIsWSubmitting(true);
    try {
      const txPayload: any = {
        customerId: wSelectedCustomerId,
        type: 'withdrawal',
        amount: amt,
        profitAmount: profitVal > 0 ? profitVal : undefined,
        staffId: wStaffId,
        status: wStatus,
      };

      if (wPayoutMethod === 'bank') {
        txPayload.payoutBankName = wBankName || "Default Bank";
        txPayload.payoutAccountName = wAccountName || custObj.name;
        txPayload.payoutAccountNumber = wAccountNumber || undefined;
      }

      onAddTransaction(txPayload);

      setWSuccess('Withdrawal posted successfully!');
      setWAmount('');
      setWProfitAmount('');
      setWSearchQuery('');
      setWSelectedCustomerId('');
      setTimeout(() => {
        setWSuccess('');
        setShowWithdrawalModal(false);
        setIsWSubmitting(false);
      }, 2000);
    } catch (err: any) {
      setWError(err?.message || 'Failed to submit withdrawal.');
      setIsWSubmitting(false);
    }
  };
  
  // Simulated sound generator
  const triggerAudioAlert = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12); // A5
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
      console.warn('Web Audio API utility block', e);
    }
  };

  // Real-time calculation of dynamic metrics:
  const totalCustomersCount = customers.length;
  const activeCustomersCount = customers.filter(c => c.status === 'active').length;

  // Total savings is sum of all customer balances
  const totalSavingsAmount = customers.reduce((acc, c) => acc + c.balance, 0);

  // Today's collections: Sum ofapproved deposits created today (or sum of collectionsToday of all staff)
  const todayCollectionsTotal = staff.reduce((acc, s) => acc + s.collectionsToday, 0);

  // Pending withdrawals: All transactions of type withdrawal with status pending
  const pendingWTx = transactions.filter(t => t.type === 'withdrawal' && t.status === 'pending');
  const pendingWDCount = pendingWTx.length;
  const pendingWDAmount = pendingWTx.reduce((acc, t) => acc + t.amount, 0);

  // Active staff count
  const totalStaffCount = staff.length;
  const activeStaffCount = staff.filter(s => s.status === 'active').length;

  // Sorting staff for 'Top Performers' list based on today's collections
  const sortedStaffPerformers = [...staff]
    .filter(s => s.status === 'active')
    .sort((a, b) => b.collectionsToday - a.collectionsToday);

  // Helper to check if database entry falls within period
  const getWithinPeriod = (timestampStr: string, period: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    const nowMs = new Date().getTime();
    const oneDayMs = 1000 * 60 * 60 * 24;
    const txTime = new Date(timestampStr || '').getTime();
    if (isNaN(txTime)) return false;
    const diffMs = nowMs - txTime;

    if (period === 'daily') return diffMs <= oneDayMs;
    if (period === 'weekly') return diffMs <= oneDayMs * 7;
    if (period === 'monthly') return diffMs <= oneDayMs * 30;
    if (period === 'yearly') return diffMs <= oneDayMs * 365;
    return true;
  };

  const getCustomerMetricsForPeriod = (period: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    const registeredInPeriod = customers.filter(c => c.joinedDate && getWithinPeriod(c.joinedDate, period));
    const registeredCount = registeredInPeriod.length;

    // "New Customers" (The same as registered in the period)
    const newCount = registeredCount;

    // "Old Customers" (Those who registered before this period)
    const oldCount = customers.length - registeredCount;

    return { registeredCount, newCount, oldCount };
  };

  const dailyCust = getCustomerMetricsForPeriod('daily');
  const weeklyCust = getCustomerMetricsForPeriod('weekly');
  const monthlyCust = getCustomerMetricsForPeriod('monthly');
  const yearlyCust = getCustomerMetricsForPeriod('yearly');

  // Real-time calculation of Financial Pulse (Total Deposits vs. Withdrawals) for Daily, Weekly, Monthly, Yearly
  const pulseMetrics = React.useMemo(() => {
    const calculateForPeriod = (period: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
      const txsInPeriod = transactions.filter(t => t.timestamp && getWithinPeriod(t.timestamp, period));
      const approvedTxs = txsInPeriod.filter(t => t.status === 'approved');
      
      const deposits = approvedTxs.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
      const withdrawals = approvedTxs.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + t.amount, 0);
      const profit = approvedTxs.filter(t => t.type === 'withdrawal' && t.profitAmount).reduce((sum, t) => sum + (t.profitAmount || 0), 0);
      const netMargin = deposits - withdrawals;
      
      const depCount = approvedTxs.filter(t => t.type === 'deposit').length;
      const wdCount = approvedTxs.filter(t => t.type === 'withdrawal').length;
      
      return {
        deposits,
        withdrawals,
        profit,
        netMargin,
        depCount,
        wdCount
      };
    };

    return {
      daily: calculateForPeriod('daily'),
      weekly: calculateForPeriod('weekly'),
      monthly: calculateForPeriod('monthly'),
      yearly: calculateForPeriod('yearly')
    };
  }, [transactions, customers, staff]);

  // Container motion options
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100 } }
  };

  return (
    <div className="w-full flex flex-col gap-6 select-none pb-12">
        {/* FAB Component for quick actions */}
        <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-3 select-none">
          {isQuickActionsOpen && (
            <div className="flex flex-col items-end gap-2.5 animate-fade-in animate-duration-205">
              <button
                id="fab-action-add-customer"
                onClick={() => {
                  setShowAddCustomerModal(true);
                  setIsQuickActionsOpen(false);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-500 text-white font-black text-xs uppercase tracking-wide shadow-lg hover:bg-indigo-600 active:scale-95 transition-all border border-white/15 whitespace-nowrap cursor-pointer"
              >
                <Users className="w-4 h-4" />
                👤 Add Customer
              </button>

              <button
                id="fab-action-log-deposit"
                onClick={() => {
                  setShowDepositModal(true);
                  setIsQuickActionsOpen(false);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#14cfb4] text-slate-950 font-black text-xs uppercase tracking-wide shadow-lg hover:bg-[#14cfb4]/90 active:scale-95 transition-all border border-white/20 whitespace-nowrap cursor-pointer"
              >
                <Coins className="w-4 h-4" />
                🪙 Log Deposit
              </button>
              
              <button
                id="fab-action-request-withdrawal"
                onClick={() => {
                  setShowWithdrawalModal(true);
                  setIsQuickActionsOpen(false);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#f1be48] text-slate-950 font-black text-xs uppercase tracking-wide shadow-lg hover:bg-[#f1be48]/90 active:scale-95 transition-all border border-white/20 whitespace-nowrap cursor-pointer"
              >
                <Wallet className="w-4 h-4" />
                💸 Request Withdrawal
              </button>
            </div>
          )}

          <button
            onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-all outline-none border-2 border-white/10 cursor-pointer ${
              isQuickActionsOpen 
                ? 'bg-rose-500 hover:bg-rose-600 text-white rotate-45' 
                : 'bg-gradient-to-tr from-[#14cfb4] to-emerald-400 text-slate-950 hover:opacity-90'
            }`}
            title="Toggle Quick Actions Menu"
          >
            <Plus className={`w-7 h-7 font-black transition-transform duration-300 ${isQuickActionsOpen ? 'rotate-45' : ''}`} />
          </button>
        </div>

        {/* ========================================================= */}
        {/* NEW DEPOSIT MODAL                                         */}
        {/* ========================================================= */}
        {showDepositModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
            <div className="bg-[#121312] border border-zinc-850 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl flex flex-col relative text-left p-6">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-emerald-950/40 border border-[#14cfb4]/20 text-[#14cfb4] rounded-xl flex items-center justify-center">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-zinc-100 uppercase tracking-widest leading-none">Quick Savings Contribution</h3>
                    <span className="text-[10px] text-zinc-500 mt-1 uppercase font-mono tracking-wider block">Admin Instant Posting Engine</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowDepositModal(false);
                    setIsScanningQr(false);
                    setDepError('');
                    setDepSuccess('');
                    setDepSearchQuery('');
                    setDepSelectedCustomerId('');
                    setDepAmount('');
                  }}
                  className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-900 hover:bg-zinc-900 text-zinc-400 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {depError && (
                <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-xl font-bold flex items-center gap-2">
                  <span className="shrink-0 text-base">⚠️</span>
                  <span>{depError}</span>
                </div>
              )}

              {depSuccess && (
                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-[#2ecc71] text-xs rounded-xl font-bold flex items-center gap-2">
                  <span className="shrink-0 text-base font-black">✔️</span>
                  <span>{depSuccess}</span>
                </div>
              )}

              <div className="mt-4 flex flex-col gap-4 overflow-y-auto max-h-[70vh] pr-1">
                {/* Search Customer Input */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Select Active Customer</label>
                    {!depSelectedCustomerId && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsScanningQr(!isScanningQr);
                          setCameraError('');
                        }}
                        className="flex items-center gap-1.5 text-[10px] text-[#14cfb4] hover:text-[#2ecc71] font-sans font-bold uppercase tracking-wider cursor-pointer transition-colors"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        {isScanningQr ? "Cancel Scan" : "Scan Receipt QR"}
                      </button>
                    )}
                  </div>

                  {/* Camera view finder portal */}
                  {isScanningQr && !depSelectedCustomerId && (
                    <div className="relative w-full aspect-video bg-black border border-zinc-800 rounded-2xl overflow-hidden my-1 shadow-inner flex flex-col items-center justify-center">
                      <video
                        ref={videoRef}
                        className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                        playsInline
                        muted
                      />
                      <canvas ref={canvasRef} className="hidden" />
                      
                      {/* Cool scan square overlay */}
                      <div className="absolute inset-4 border border-dashed border-[#14cfb4]/40 rounded-xl flex items-center justify-center pointer-events-none">
                        <div className="absolute w-full h-[1.5px] bg-[#14cfb4] opacity-80 shadow-[0_0_8px_#14cfb4] animate-bounce" />
                        
                        {/* High-tech framing targets */}
                        <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-[#14cfb4]" />
                        <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-[#14cfb4]" />
                        <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-[#14cfb4]" />
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-[#14cfb4]" />
                      </div>

                      {/* Display Status or Help Text */}
                      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-zinc-950/85 backdrop-blur-sm rounded-full text-[9px] text-[#14cfb4] font-mono tracking-widest uppercase font-black whitespace-nowrap shadow border border-zinc-800 animate-pulse">
                        {qrFeedback || "Initializing video..."}
                      </div>

                      {cameraError && (
                        <div className="absolute inset-0 bg-[#121312]/95 flex flex-col items-center justify-center p-4 text-center">
                          <span className="text-xl mb-1.5">⚠️</span>
                          <p className="text-[10px] font-mono font-bold text-rose-500 max-w-[80%] leading-relaxed">
                            {cameraError}
                          </p>
                          <button
                            type="button"
                            onClick={() => setIsScanningQr(false)}
                            className="mt-3 px-3 py-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-sans text-[10px] uppercase font-bold tracking-wider rounded-lg transition-colors cursor-pointer"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {!depSelectedCustomerId ? (
                    <div className="relative">
                      <div className="absolute left-3.5 top-2.5 text-zinc-550">
                        <Search className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={depSearchQuery}
                        onChange={(e) => setDepSearchQuery(e.target.value)}
                        placeholder="Type customer name, phone, or ID..."
                        className="w-full bg-zinc-950 border border-zinc-900 focus:border-emerald-550 focus:outline-none rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-200"
                      />
                      {filteredDepCustomers.length > 0 && (
                        <div className="absolute z-50 left-0 right-0 mt-1 bg-zinc-950 border border-zinc-905 rounded-xl overflow-hidden shadow-2xl max-h-56 overflow-y-auto">
                          {filteredDepCustomers.map((cust, idx) => (
                            <button
                              key={`${cust.id}-${idx}`}
                              type="button"
                              onClick={() => {
                                setDepSelectedCustomerId(cust.id);
                                setDepSearchQuery('');
                              }}
                              className="w-full flex items-center justify-between p-3 border-b border-zinc-900 hover:bg-[#111311] text-left transition-colors"
                            >
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-zinc-300">{cust.name}</span>
                                <span className="text-[9.5px] text-zinc-550 mt-1 font-mono">{cust.phoneNumber}</span>
                              </div>
                              <span className="text-xs font-mono font-black text-[#14cfb4]">
                                {formatNaira(cust.balance)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                      {depSearchQuery.trim() && filteredDepCustomers.length === 0 && (
                        <div className="p-3 text-center text-[11px] text-zinc-650 bg-zinc-950 rounded-xl border border-zinc-900 mt-1">
                          No active customer matches.
                        </div>
                      )}
                    </div>
                  ) : (
                    (() => {
                      const selected = customers.find(c => c.id === depSelectedCustomerId);
                      return (
                        <div className="flex items-center justify-between p-3.5 bg-emerald-950/10 border border-[#14cfb4]/20 rounded-xl">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-[#14cfb4]">{selected?.name}</span>
                            <span className="text-[9px] text-zinc-500 font-mono mt-0.5">{selected?.phoneNumber}</span>
                          </div>
                          <div className="text-right flex items-center gap-3">
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-zinc-650 block uppercase text-right">Balance</span>
                              <span className="text-xs font-mono font-black text-zinc-100">{selected ? formatNaira(selected.balance) : ''}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setDepSelectedCustomerId('')}
                              className="p-1 px-2.5 rounded hover:bg-zinc-900 border border-zinc-850 text-[10px] text-zinc-400 font-bold tracking-tight cursor-pointer"
                            >
                              Reset
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>

                {/* Amount to Post */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black text-zinc-550 uppercase tracking-wider">Amount to Contribute (₦)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-mono font-black text-zinc-555">₦</span>
                    <input
                      type="number"
                      value={depAmount}
                      onChange={(e) => setDepAmount(e.target.value)}
                      placeholder="e.g. 15000"
                      className="w-full bg-zinc-950 border border-zinc-900 focus:border-teal-500 focus:outline-none rounded-xl pl-9 pr-4 py-2.5 text-xs text-zinc-100 font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Collector / Staff Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black text-zinc-550 uppercase tracking-wider">Assigned Staff ID</label>
                  <select
                    value={depStaffId}
                    onChange={(e) => setDepStaffId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-900 focus:border-teal-400 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-zinc-300 font-mono font-bold cursor-pointer"
                  >
                    <option value="">-- Choose Collector --</option>
                    {staff.filter(s => s.status === 'active').map((s, idx) => (
                      <option key={`${s.id}-${idx}`} value={s.id}>
                        {s.name} ({s.code || s.initials})
                      </option>
                    ))}
                    <option value="hq">Administrator (HQ Managed)</option>
                  </select>
                </div>

                {/* Direct Approve Option */}
                <div className="flex items-center justify-between p-3.5 bg-zinc-950 border border-zinc-900 rounded-2xl">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-black text-zinc-350 uppercase tracking-wide leading-none">Instant Settled Ledger</span>
                    <span className="text-[9px] text-zinc-550">If active, directly posts settled deposit transaction.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDepStatus(depStatus === 'approved' ? 'pending' : 'approved')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors border cursor-pointer ${
                      depStatus === 'approved'
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50'
                        : 'bg-amber-950/40 text-amber-550 border-amber-900/40'
                    }`}
                  >
                    {depStatus === 'approved' ? 'Settled ✅' : 'Requires Approval ⚠️'}
                  </button>
                </div>

                {/* Automated Recurring Savings Deposit Toggle */}
                <div className="p-3.5 bg-zinc-950/70 border border-zinc-900 rounded-2xl flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-0.5 text-left">
                      <span className="text-xs font-black text-[#14cfb4] uppercase tracking-wide leading-none flex items-center gap-1.5 select-none">
                        ⏱️ Set Auto-Recurring Savings Plan
                      </span>
                      <span className="text-[9px] text-zinc-500 select-none">
                        Auto-deposits matching this amount at scheduled intervals.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDepIsRecurring(!depIsRecurring)}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                        depIsRecurring ? 'bg-[#14cfb4]' : 'bg-zinc-850'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-slate-950 transition-all ${
                          depIsRecurring ? 'translate-x-[20px]' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {depIsRecurring && (
                    <div className="flex flex-col gap-1.5 border-t border-zinc-900/40 pt-2 text-left animate-fade-in">
                      <label className="text-[8px] font-black text-[#14cfb4] uppercase tracking-wider block">
                        Select Automated Interval Plans
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setDepRecurringInterval('weekly')}
                          className={`py-1.5 px-3 rounded-lg text-[10px] font-bold text-center border transition-all cursor-pointer ${
                            depRecurringInterval === 'weekly'
                              ? 'bg-[#14cfb4]/10 border-[#14cfb4] text-[#14cfb4]'
                              : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-350'
                          }`}
                        >
                          🔄 Weekly Interval (7 Days)
                        </button>
                        <button
                          type="button"
                          onClick={() => setDepRecurringInterval('monthly')}
                          className={`py-1.5 px-3 rounded-lg text-[10px] font-bold text-center border transition-all cursor-pointer ${
                            depRecurringInterval === 'monthly'
                              ? 'bg-[#14cfb4]/10 border-[#14cfb4] text-[#14cfb4]'
                              : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-350'
                          }`}
                        >
                          📆 Monthly Interval (30 Days)
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Post CTA */}
                <button
                  type="button"
                  disabled={isDepSubmitting}
                  onClick={handleDepositSubmit}
                  className="w-full mt-2 py-3 bg-gradient-to-r from-[#14cfb4] to-emerald-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl hover:opacity-95 text-center transition-all shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isDepSubmitting ? 'Posting Ledger entry...' : '⚡ Commit Savings Deposit'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* NEW WITHDRAWAL MODAL                                      */}
        {/* ========================================================= */}
        {showWithdrawalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
            <div className="bg-[#121312] border border-zinc-855 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl flex flex-col relative text-left p-6">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-amber-950/40 border border-amber-500/20 text-[#f1be48] rounded-xl flex items-center justify-center">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-zinc-100 uppercase tracking-widest leading-none">Quick Withdrawal</h3>
                    <span className="text-[10px] text-zinc-500 mt-1 uppercase font-mono tracking-wider block">Admin Disbursal Setup</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowWithdrawalModal(false);
                    setWError('');
                    setWSuccess('');
                    setWSearchQuery('');
                    setWSelectedCustomerId('');
                    setWAmount('');
                    setWProfitAmount('');
                  }}
                  className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-900 hover:bg-zinc-900 text-zinc-400 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {wError && (
                <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-xl font-bold flex items-center gap-2">
                  <span className="shrink-0 text-base">⚠️</span>
                  <span>{wError}</span>
                </div>
              )}

              {wSuccess && (
                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-[#2ecc71] text-xs rounded-xl font-bold flex items-center gap-2">
                  <span className="shrink-0 text-base font-black">✔️</span>
                  <span>{wSuccess}</span>
                </div>
              )}

              <div className="mt-4 flex flex-col gap-4 overflow-y-auto max-h-[70vh] pr-1">
                {/* Search Customer Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Select Active Customer</label>
                  {!wSelectedCustomerId ? (
                    <div className="relative">
                      <div className="absolute left-3.5 top-2.5 text-zinc-550">
                        <Search className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={wSearchQuery}
                        onChange={(e) => setWSearchQuery(e.target.value)}
                        placeholder="Type customer name, phone, or ID..."
                        className="w-full bg-zinc-950 border border-zinc-900 focus:border-amber-900 focus:outline-none rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-200"
                      />
                      {filteredWCustomers.length > 0 && (
                        <div className="absolute z-50 left-0 right-0 mt-1 bg-zinc-950 border border-zinc-902 rounded-xl overflow-hidden shadow-2xl max-h-56 overflow-y-auto w-full">
                          {filteredWCustomers.map((cust, idx) => (
                            <button
                              key={`${cust.id}-${idx}`}
                              type="button"
                              onClick={() => {
                                setWSelectedCustomerId(cust.id);
                                setWSearchQuery('');
                              }}
                              className="w-full flex items-center justify-between p-3 border-b border-zinc-900 hover:bg-[#111311] text-left transition-colors cursor-pointer"
                            >
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-zinc-300">{cust.name}</span>
                                <span className="text-[9.5px] text-zinc-550 mt-1 font-mono">{cust.phoneNumber}</span>
                              </div>
                              <span className="text-xs font-mono font-black text-amber-550">
                                {formatNaira(cust.balance)}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                      {wSearchQuery.trim() && filteredWCustomers.length === 0 && (
                        <div className="p-3 text-center text-[11px] text-zinc-650 bg-zinc-950 rounded-xl border border-zinc-900 mt-1">
                          No active customer matches.
                        </div>
                      )}
                    </div>
                  ) : (
                    (() => {
                      const selected = customers.find(c => c.id === wSelectedCustomerId);
                      return (
                        <div className="flex items-center justify-between p-3.5 bg-amber-950/10 border border-amber-500/20 rounded-xl">
                          <div className="flex flex-col col">
                            <span className="text-xs font-black text-[#f1be48]">{selected?.name}</span>
                            <span className="text-[9px] text-zinc-500 font-mono mt-0.5">{selected?.phoneNumber}</span>
                          </div>
                          <div className="text-right flex items-center gap-3">
                            <div className="flex flex-col">
                              <span className="text-[8px] font-black text-zinc-650 block uppercase text-right">Balance</span>
                              <span className="text-xs font-mono font-black text-zinc-105">{selected ? formatNaira(selected.balance) : ''}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setWSelectedCustomerId('')}
                              className="p-1 px-2.5 rounded hover:bg-zinc-900 border border-zinc-850 text-[10px] text-zinc-400 font-bold tracking-tight cursor-pointer"
                            >
                              Reset
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </div>

                {/* Amount to Withdraw & Profit Applied */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black text-zinc-550 uppercase tracking-wider">Amount (₦)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2 text-xs font-mono font-black text-zinc-550">₦</span>
                      <input
                        type="number"
                        value={wAmount}
                        onChange={(e) => setWAmount(e.target.value)}
                        placeholder="e.g. 5000"
                        className="w-full bg-zinc-950 border border-zinc-900 focus:border-amber-500 focus:outline-none rounded-xl pl-8 pr-3 py-2 text-xs text-zinc-100 font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black text-zinc-555 uppercase tracking-wider">Bonus/Profit (₦)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2 text-xs font-mono font-black text-zinc-550">₦</span>
                      <input
                        type="number"
                        value={wProfitAmount}
                        onChange={(e) => setWProfitAmount(e.target.value)}
                        placeholder="e.g. 400"
                        className="w-full bg-zinc-950 border border-zinc-900 focus:border-amber-500 focus:outline-none rounded-xl pl-8 pr-3 py-2 text-xs text-zinc-100 font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Payout Channel Selector */}
                <div className="flex flex-col gap-1.5 border border-zinc-900 p-3 rounded-2xl bg-zinc-950/45">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
                    <span className="text-[9px] font-black text-zinc-450 uppercase tracking-wider">Payment channel</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setWPayoutMethod('bank')}
                        className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase cursor-pointer ${
                          wPayoutMethod === 'bank' ? 'bg-zinc-900 text-white border border-zinc-800' : 'text-zinc-500 hover:text-zinc-350'
                        }`}
                      >
                        Bank Transfer
                      </button>
                      <button
                        type="button"
                        onClick={() => setWPayoutMethod('cash')}
                        className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase cursor-pointer ${
                          wPayoutMethod === 'cash' ? 'bg-zinc-900 text-white border border-zinc-800' : 'text-zinc-500 hover:text-zinc-350'
                        }`}
                      >
                        Cash Disbursed
                      </button>
                    </div>
                  </div>

                  {wPayoutMethod === 'bank' ? (
                    <div className="grid grid-cols-1 gap-2 mt-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] font-black text-zinc-600 block uppercase">Destination Bank Name</span>
                        <input
                          type="text"
                          value={wBankName}
                          onChange={(e) => setWBankName(e.target.value)}
                          placeholder="e.g. Access Bank"
                          className="w-full bg-zinc-950 border border-zinc-900 focus:outline-none p-1.5 text-[10px] text-zinc-200 rounded-lg"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[8px] font-black text-zinc-650 block uppercase">Account Number</span>
                          <input
                            type="text"
                            value={wAccountNumber}
                            onChange={(e) => setWAccountNumber(e.target.value)}
                            placeholder="10 digits"
                            maxLength={10}
                            className="w-full bg-zinc-950 border border-[#222] focus:outline-none p-1.5 text-[10px] text-zinc-200 rounded-lg font-mono font-bold"
                          />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[8px] font-black text-zinc-650 block uppercase text-left">Holder Name</span>
                          <input
                            type="text"
                            value={wAccountName}
                            onChange={(e) => setWAccountName(e.target.value)}
                            placeholder="Name on card"
                            className="w-full bg-zinc-950 border border-zinc-900 focus:outline-none p-1.5 text-[10px] text-zinc-200 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-zinc-550 mt-1 py-1 leading-normal">
                      Payout dispatches as physical cash at the local Kaduna South counter node.
                    </div>
                  )}
                </div>

                {/* Collector Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black text-zinc-550 uppercase tracking-wider">Assigned Staff ID</label>
                  <select
                    value={wStaffId}
                    onChange={(e) => setWStaffId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-900 focus:border-amber-400 focus:outline-none rounded-xl px-3 py-2 text-xs text-zinc-300 font-mono font-bold cursor-pointer"
                  >
                    <option value="">-- Choose Collector --</option>
                    {staff.filter(s => s.status === 'active').map((s, idx) => (
                      <option key={`${s.id}-${idx}`} value={s.id}>
                        {s.name} ({s.code || s.initials})
                      </option>
                    ))}
                    <option value="hq">Administrator (HQ Managed)</option>
                  </select>
                </div>

                {/* Ledger Status */}
                <div className="flex items-center justify-between p-3.5 bg-zinc-950 border border-zinc-900 rounded-2xl">
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-zinc-350 uppercase tracking-wide leading-none">Withdrawal Status</span>
                    <span className="text-[9px] text-zinc-555 mt-1 block text-left">Require Supervisor check or settle instantly.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWStatus(wStatus === 'approved' ? 'pending' : 'approved')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors border cursor-pointer ${
                      wStatus === 'approved'
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50'
                        : 'bg-amber-950/40 text-amber-550 border-amber-900/40'
                    }`}
                  >
                    {wStatus === 'approved' ? 'Settled ✅' : 'Requires Approval ⚠️'}
                  </button>
                </div>

                {/* Confirm Post CTA */}
                <button
                  type="button"
                  disabled={isWSubmitting}
                  onClick={handleWithdrawalSubmit}
                  className="w-full mt-2 py-3 bg-gradient-to-r from-[#f1be48] to-[#eed693] text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl hover:opacity-95 text-center transition-all shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isWSubmitting ? 'Posting Ledger entry...' : '💸 Commit Withdrawal Disbursal'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddCustomerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
            <div className="bg-[#121312] border border-zinc-850 rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl flex flex-col relative text-left p-6">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-indigo-950/40 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-zinc-100 uppercase tracking-widest leading-none">Quick Onboard Customer</h3>
                    <span className="text-[10px] text-zinc-500 mt-1 uppercase font-mono tracking-wider block">Admin Registration Portal</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCustomerModal(false);
                    setCustError('');
                    setCustSuccess('');
                    setCustName('');
                    setCustPhone('');
                    setCustLocation('');
                    setCustAddress('');
                    setCustNotes('');
                  }}
                  className="w-8 h-8 rounded-full bg-zinc-950 border border-zinc-900 hover:bg-zinc-900 text-zinc-400 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {custError && (
                <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs rounded-xl font-bold flex items-center gap-2">
                  <span className="shrink-0 text-base">⚠️</span>
                  <span>{custError}</span>
                </div>
              )}

              {custSuccess && (
                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-[#2ecc71] text-xs rounded-xl font-bold flex items-center gap-2">
                  <span className="shrink-0 text-base font-black">✔️</span>
                  <span>{custSuccess}</span>
                </div>
              )}

              <form onSubmit={handleCustomerSubmit} className="mt-4 flex flex-col gap-4 overflow-y-auto max-h-[70vh] pr-1">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Full Name</label>
                  <input 
                    type="text" 
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    placeholder="e.g. Amina Bello"
                    className="w-full bg-zinc-950 border border-zinc-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-zinc-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Phone number (Optional)</label>
                    <input 
                      type="text" 
                      value={custPhone}
                      onChange={(e) => setCustPhone(e.target.value)}
                      placeholder="e.g. 08031234567"
                      className="w-full bg-zinc-950 border border-zinc-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-zinc-200"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Location Zone</label>
                    <input 
                      type="text" 
                      value={custLocation}
                      onChange={(e) => setCustLocation(e.target.value)}
                      placeholder="e.g. Kaduna North"
                      className="w-full bg-zinc-950 border border-zinc-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-zinc-200"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Street Address</label>
                  <input 
                    type="text" 
                    value={custAddress}
                    onChange={(e) => setCustAddress(e.target.value)}
                    placeholder="e.g. No. 12 Ahmadu Bello Way"
                    className="w-full bg-zinc-950 border border-zinc-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2.5 text-xs text-zinc-200"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Assigned Collector Agent</label>
                  <select
                    value={custAssignedStaff}
                    onChange={(e) => setCustAssignedStaff(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs text-zinc-300 font-mono font-bold cursor-pointer"
                  >
                    <option value="">-- Choose Agent --</option>
                    {staff.map((s, idx) => (
                      <option key={`${s.id}-${idx}`} value={s.id}>{s.name} ({s.code || s.initials})</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">Manager Notes (Private Comment)</label>
                  <textarea 
                    value={custNotes}
                    onChange={(e) => setCustNotes(e.target.value)}
                    placeholder="Verify ID on next passbook billing..."
                    rows={2}
                    className="w-full bg-zinc-950 border border-zinc-900 focus:border-indigo-500 focus:outline-none rounded-xl px-3.5 py-2 text-xs text-zinc-200 font-sans min-h-[50px] resize-y"
                  />
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowAddCustomerModal(false);
                      setCustError('');
                      setCustSuccess('');
                    }}
                    className="flex-1 py-3 rounded-xl border border-zinc-850 hover:bg-zinc-850/30 text-zinc-350 font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isCustSubmitting}
                    className="flex-1 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg shadow-indigo-500/10 text-center"
                  >
                    {isCustSubmitting ? 'Registering...' : 'Save Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      
      {/* EXECUTIVE ADMINISTRATOR PASSPORT DECK */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#121312] via-[#161715] to-[#0c0d0c] border border-zinc-900 rounded-[32px] p-6 flex flex-col xl:flex-row items-center justify-between gap-6 shadow-2xl animate-fade-in select-none">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#f1be48]/5 via-transparent to-transparent rounded-full filter blur-3xl pointer-events-none" />
        
        {/* Physical Executive Identity Card */}
        <div className="flex flex-col md:flex-row items-center gap-6 w-full xl:w-auto">
          
          {/* THE PHYSICAL GOLD EXECUTIVE PASSPORT CARD */}
          <div className="relative w-92 h-[216px] rounded-[28px] bg-gradient-to-br from-[#221c0e] via-[#120f08] to-black border border-[#f1be48]/25 p-5 shadow-2xl overflow-hidden shrink-0 text-left flex flex-col justify-between">
            {/* Ambient gold radial glow overlay */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-[#f1be48]/10 via-transparent to-transparent rounded-full pointer-events-none" />
            
            {/* Card Header details */}
            <div className="flex items-center justify-between border-b border-[#f1be48]/15 pb-2.5 relative z-10 leading-none">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-[#f1be48] tracking-widest leading-none">CONTRIBOPAY EXECUTIVE</span>
                <span className="text-[7px] text-zinc-500 uppercase font-mono mt-0.5 tracking-wider">SYSTEM ADMINISTRATOR PASSPORT</span>
              </div>
              <div className="flex items-center gap-1.5 bg-[#f1be48]/10 px-2 py-0.5 rounded-full border border-[#f1be48]/25 shrink-0">
                <span className="text-[7.5px] font-black text-[#f1be48] font-mono">LEVEL 4 Auth</span>
              </div>
            </div>

            {/* Card Mid Body: Golden Chip, Account, and biometric picture */}
            <div className="flex items-center justify-between gap-3.5 my-2.5 relative z-10">
              <div className="flex flex-col gap-3 flex-1 select-none">
                {/* Genuine EMV Smart Chip */}
                <div className="w-7 h-5.5 rounded bg-gradient-to-r from-[#eed693] via-[#f1be48] to-[#eed693] border border-stone-100/10 relative shadow-inner overflow-hidden">
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 border-zinc-950/25 scale-[0.88]" />
                </div>
                {/* Masked credentials */}
                <div className="flex flex-col font-mono text-left">
                  <span className="text-[10.5px] text-zinc-400 font-bold leading-none tracking-wider">8099 &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull; 2026</span>
                  <span className="text-[8px] text-zinc-500 mt-1 uppercase">OPERATOR CONSOLE CODE &bull; AD-9</span>
                </div>
              </div>

              {/* Spacious, wide physical photo for clear face recognition */}
              <div className="flex flex-col items-center gap-1.5 shrink-0 select-none">
                <div 
                  className="relative group/manager-photo w-32 h-24 rounded-2xl border-2 border-[#f1be48]/35 bg-zinc-950/90 overflow-hidden cursor-pointer shadow-2xl transition-all hover:scale-[1.03] flex flex-col items-center justify-center p-0.5"
                  onClick={() => {
                    const fileInput = document.getElementById('overview-manager-card-photo-input');
                    if (fileInput) fileInput.click();
                  }}
                  title="Click to update Admin photo"
                >
                  {settings.profileImage ? (
                    <img 
                      src={settings.profileImage} 
                      className="w-full h-full object-cover rounded-xl" 
                      alt="Manager Passport"
                    />
                  ) : (
                    <div className="w-full h-full rounded-xl bg-[#f1be48] text-stone-900 font-black text-xl flex flex-col items-center justify-center gap-1">
                      <span className="text-2xl">👑</span>
                      <span className="text-[10px] leading-none font-bold tracking-wider select-none">{settings.profileInitials || 'BN'}</span>
                    </div>
                  )}
                  {/* Hover visual label overlay */}
                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/manager-photo:opacity-100 transition-opacity flex flex-col items-center justify-center text-[8px] text-[#f1be48] font-black tracking-widest uppercase rounded-xl">
                    <span>REPLACE</span>
                  </div>
                </div>

                <span className="text-[7px] font-black text-[#f1be48] tracking-widest uppercase bg-[#f1be48]/10 border border-[#f1be48]/25 px-2 py-0.5 rounded-full">MASTER PHOTO ID</span>
                
                <input 
                  type="file" 
                  id="overview-manager-card-photo-input" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && onUpdateSettings) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        if (typeof reader.result === 'string') {
                          onUpdateSettings({ profileImage: reader.result });
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>
            </div>

            {/* Card Footer details */}
            <div className="flex items-end justify-between border-t border-[#f1be48]/15 pt-2 relative z-10 leading-none">
              <div className="flex flex-col text-left">
                <span className="text-[6.5px] font-bold text-zinc-500 uppercase">OFFICIAL PRINCIPLE NAME</span>
                <span className="text-[10.5px] font-black font-mono text-zinc-100 mt-1 uppercase truncate w-38">{settings.orgName || 'Nigeria Federal Cooperative'}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[6.5px] font-bold text-zinc-550 uppercase">LICENSE STATUS</span>
                <span className="text-[9px] font-bold font-mono text-emerald-400 mt-1 uppercase">ACTIVE / SIGNED</span>
              </div>
            </div>
          </div>
          
          {/* Informative Welcoming Text */}
          <div className="flex flex-col text-center md:text-left min-w-0">
            <h3 className="font-extrabold text-2xl text-zinc-100 tracking-tight leading-none flex items-center justify-center md:justify-start gap-1">
              Welcome back, {settings.profileName || 'Super Administrator'}
            </h3>
            <p className="text-zinc-500 text-xs mt-2 max-w-md leading-relaxed">
              Operational Status is <span className="text-[#f1be48] font-bold">Secure Node Active</span>. You have master authorization to oversee agent wallets, contribution collections, approve withdraw payloads and mutate geographic setting nodes.
            </p>
            <div className="flex justify-center md:justify-start mt-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-950/20 text-[#10b981] border border-emerald-900/40 text-[9.5px] font-black uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-450 animate-pulse" />
                SYSTEM LEDGER SYNC ONLINE
              </span>
            </div>
          </div>
        </div>

        {/* Shorthand Fast Stats */}
        <div className="flex flex-row xl:flex-col items-center xl:items-end justify-center shrink-0 border-t xl:border-t-0 xl:border-l border-zinc-900 pt-5 xl:pt-0 xl:pl-8 text-center xl:text-right w-full xl:w-auto mt-4 xl:mt-0 gap-8 xl:gap-4 select-none">
          <div className="flex flex-col flex-1 xl:flex-none">
            <span className="text-[9px] font-extrabold text-[#14cfb4] uppercase tracking-widest leading-none">CENTRAL TREASURY BALANCE</span>
            <span className="text-2xl md:text-3xl font-mono font-black text-emerald-400 tracking-tight mt-1.5 leading-none">
              {formatNaira(settings.treasuryBalance !== undefined ? settings.treasuryBalance : 50000000, false)}
            </span>
            <span className="text-[9.5px] text-zinc-400 font-bold mt-1.5 block">Acct: 1000000001 (HQ Treasury)</span>
          </div>
          <div className="h-10 w-[1px] bg-zinc-900 xl:hidden" />
          <div className="flex flex-col flex-1 xl:flex-none">
            <span className="text-[9px] font-extrabold text-[#f1be48] uppercase tracking-widest leading-none">TOTAL MANAGED VAULT</span>
            <span className="text-2xl md:text-3xl font-mono font-black text-white tracking-tight mt-1.5 leading-none">
              {formatNaira(totalSavingsAmount, false)}
            </span>
            <span className="text-[9.5px] text-zinc-400 font-bold mt-1.5 block">Sum of All Secure Enrolled Wallets</span>
          </div>
        </div>
      </div>

      {/* FINANCIAL PULSE ENGINE LEDGER RATIO (Total Deposits vs Total Withdrawals) */}
      <div id="financial-pulse-summary-section" className="bg-[#121312] border border-zinc-900 rounded-[28px] p-6 flex flex-col gap-5 text-left relative shadow-2xl">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#14cfb4]/5 via-transparent to-transparent rounded-full filter blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900/60 pb-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#14cfb4] animate-pulse shrink-0" />
              <span>Financial Pulse overview</span>
            </h2>
            <p className="text-xs text-zinc-500 font-medium font-sans">
              Real-time liquidity and settled deposit-to-withdrawal velocity across active database intervals
            </p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[9.5px] font-black text-[#14cfb4] bg-[#14cfb4]/10 border border-[#14cfb4]/20 px-3 py-1 rounded-lg uppercase tracking-wider font-mono">
              Live Cashflow Node
            </span>
          </div>
        </div>

        {/* 4-Scale Pulse Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Daily Pulse */}
          {(() => {
            const data = pulseMetrics.daily;
            const mathRatio = data.deposits > 0 ? Math.round(((data.deposits - data.withdrawals) / data.deposits) * 100) : 0;
            return (
              <div className="bg-black/45 border border-zinc-900/80 hover:border-zinc-800 transition-all duration-300 rounded-2xl p-4 flex flex-col gap-3 group relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-wide">Daily Pulse</span>
                  <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest font-mono bg-zinc-950 border border-zinc-900 px-2 py-0.5 rounded-md">TODAY</span>
                </div>

                <div className="flex flex-col gap-2 mt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5 leading-none">
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Deposits
                    </span>
                    <span className="text-xs font-mono font-black text-emerald-400 leading-none">
                      +{formatNaira(data.deposits, false)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5 leading-none">
                      <ArrowDownRight className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Withdrawals
                    </span>
                    <span className="text-xs font-mono font-black text-amber-500 leading-none">
                      -{formatNaira(data.withdrawals, false)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5 leading-none">
                      <TrendingUp className="w-3.5 h-3.5 text-[#f1be48] shrink-0" /> Realized Profit
                    </span>
                    <span className="text-xs font-mono font-black text-[#f1be48] leading-none">
                      +{formatNaira(data.profit, false)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-zinc-900/40 my-0.5" />

                <div className="flex flex-col gap-1 text-left select-text">
                  <span className="text-[8.5px] font-black text-zinc-550 uppercase tracking-widest">Surplus Net Yield</span>
                  <div className="flex items-center justify-between">
                    <span className={`text-[12.5px] font-mono font-black leading-none ${data.netMargin >= 0 ? 'text-[#14cfb4]' : 'text-rose-500'}`}>
                      {data.netMargin >= 0 ? '+' : ''}{formatNaira(data.netMargin, false)}
                    </span>

                    {data.deposits > 0 ? (
                      <span className={`text-[8px] font-mono font-black px-1.5 py-0.5 rounded ${mathRatio >= 0 ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' : 'bg-amber-950/40 text-[#f1be48] border border-amber-900/30'}`}>
                        {mathRatio}% Saved
                      </span>
                    ) : (
                      <span className="text-[7.5px] font-black text-zinc-650 uppercase font-mono">No Flow</span>
                    )}
                  </div>
                </div>

                <div className="w-full bg-zinc-950 h-1.5 rounded-full mt-1 overflow-hidden border border-zinc-900/30">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${data.netMargin >= 0 ? 'bg-[#14cfb4]' : 'bg-amber-500'}`} 
                    style={{ width: `${Math.max(5, Math.min(100, data.deposits > 0 ? ((data.deposits - data.withdrawals) / data.deposits) * 100 : 0))}%` }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Weekly Pulse */}
          {(() => {
            const data = pulseMetrics.weekly;
            const mathRatio = data.deposits > 0 ? Math.round(((data.deposits - data.withdrawals) / data.deposits) * 100) : 0;
            return (
              <div className="bg-black/45 border border-zinc-900/80 hover:border-zinc-800 transition-all duration-300 rounded-2xl p-4 flex flex-col gap-3 group relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-wide">Weekly Pulse</span>
                  <span className="text-[8px] font-black text-zinc-550 uppercase tracking-widest font-mono bg-zinc-950 border border-zinc-900 px-2 py-0.5 rounded-md">7 DAYS</span>
                </div>

                <div className="flex flex-col gap-2 mt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5 leading-none">
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Deposits
                    </span>
                    <span className="text-xs font-mono font-black text-emerald-400 leading-none">
                      +{formatNaira(data.deposits, false)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5 leading-none">
                      <ArrowDownRight className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Withdrawals
                    </span>
                    <span className="text-xs font-mono font-black text-amber-500 leading-none">
                      -{formatNaira(data.withdrawals, false)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5 leading-none">
                      <TrendingUp className="w-3.5 h-3.5 text-[#f1be48] shrink-0" /> Realized Profit
                    </span>
                    <span className="text-xs font-mono font-black text-[#f1be48] leading-none">
                      +{formatNaira(data.profit, false)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-zinc-900/40 my-0.5" />

                <div className="flex flex-col gap-1 text-left select-text">
                  <span className="text-[8.5px] font-black text-zinc-550 uppercase tracking-widest">Surplus Net Yield</span>
                  <div className="flex items-center justify-between">
                    <span className={`text-[12.5px] font-mono font-black leading-none ${data.netMargin >= 0 ? 'text-[#14cfb4]' : 'text-rose-500'}`}>
                      {data.netMargin >= 0 ? '+' : ''}{formatNaira(data.netMargin, false)}
                    </span>

                    {data.deposits > 0 ? (
                      <span className={`text-[8px] font-mono font-black px-1.5 py-0.5 rounded ${mathRatio >= 0 ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' : 'bg-amber-950/40 text-[#f1be48] border border-amber-900/30'}`}>
                        {mathRatio}% Saved
                      </span>
                    ) : (
                      <span className="text-[7.5px] font-black text-zinc-650 uppercase font-mono">No Flow</span>
                    )}
                  </div>
                </div>

                <div className="w-full bg-zinc-950 h-1.5 rounded-full mt-1 overflow-hidden border border-zinc-900/30">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${data.netMargin >= 0 ? 'bg-[#14cfb4]' : 'bg-amber-500'}`} 
                    style={{ width: `${Math.max(5, Math.min(100, data.deposits > 0 ? ((data.deposits - data.withdrawals) / data.deposits) * 100 : 0))}%` }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Monthly Pulse */}
          {(() => {
            const data = pulseMetrics.monthly;
            const mathRatio = data.deposits > 0 ? Math.round(((data.deposits - data.withdrawals) / data.deposits) * 100) : 0;
            return (
              <div className="bg-black/45 border border-zinc-900/80 hover:border-zinc-800 transition-all duration-300 rounded-2xl p-4 flex flex-col gap-3 group relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-wide">Monthly Pulse</span>
                  <span className="text-[8px] font-black text-zinc-550 uppercase tracking-widest font-mono bg-zinc-950 border border-zinc-900 px-2 py-0.5 rounded-md">30 DAYS</span>
                </div>

                <div className="flex flex-col gap-2 mt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5 leading-none">
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Deposits
                    </span>
                    <span className="text-xs font-mono font-black text-emerald-400 leading-none">
                      +{formatNaira(data.deposits, false)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5 leading-none">
                      <ArrowDownRight className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Withdrawals
                    </span>
                    <span className="text-xs font-mono font-black text-amber-500 leading-none">
                      -{formatNaira(data.withdrawals, false)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5 leading-none">
                      <TrendingUp className="w-3.5 h-3.5 text-[#f1be48] shrink-0" /> Realized Profit
                    </span>
                    <span className="text-xs font-mono font-black text-[#f1be48] leading-none">
                      +{formatNaira(data.profit, false)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-zinc-900/40 my-0.5" />

                <div className="flex flex-col gap-1 text-left select-text">
                  <span className="text-[8.5px] font-black text-zinc-550 uppercase tracking-widest">Surplus Net Yield</span>
                  <div className="flex items-center justify-between">
                    <span className={`text-[12.5px] font-mono font-black leading-none ${data.netMargin >= 0 ? 'text-[#14cfb4]' : 'text-rose-500'}`}>
                      {data.netMargin >= 0 ? '+' : ''}{formatNaira(data.netMargin, false)}
                    </span>

                    {data.deposits > 0 ? (
                      <span className={`text-[8px] font-mono font-black px-1.5 py-0.5 rounded ${mathRatio >= 0 ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' : 'bg-amber-950/40 text-[#f1be48] border border-amber-900/30'}`}>
                        {mathRatio}% Saved
                      </span>
                    ) : (
                      <span className="text-[7.5px] font-black text-zinc-650 uppercase font-mono">No Flow</span>
                    )}
                  </div>
                </div>

                <div className="w-full bg-zinc-950 h-1.5 rounded-full mt-1 overflow-hidden border border-zinc-900/30">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${data.netMargin >= 0 ? 'bg-[#14cfb4]' : 'bg-amber-500'}`} 
                    style={{ width: `${Math.max(5, Math.min(100, data.deposits > 0 ? ((data.deposits - data.withdrawals) / data.deposits) * 100 : 0))}%` }}
                  />
                </div>
              </div>
            );
          })()}

          {/* Yearly Pulse */}
          {(() => {
            const data = pulseMetrics.yearly;
            const mathRatio = data.deposits > 0 ? Math.round(((data.deposits - data.withdrawals) / data.deposits) * 100) : 0;
            return (
              <div className="bg-black/45 border border-zinc-900/80 hover:border-zinc-800 transition-all duration-300 rounded-2xl p-4 flex flex-col gap-3 group relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-wide">Yearly Pulse</span>
                  <span className="text-[8px] font-black text-zinc-550 uppercase tracking-widest font-mono bg-zinc-950 border border-zinc-900 px-2 py-0.5 rounded-md">365 DAYS</span>
                </div>

                <div className="flex flex-col gap-2 mt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5 leading-none">
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Deposits
                    </span>
                    <span className="text-xs font-mono font-black text-emerald-400 leading-none">
                      +{formatNaira(data.deposits, false)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5 leading-none">
                      <ArrowDownRight className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Withdrawals
                    </span>
                    <span className="text-xs font-mono font-black text-amber-500 leading-none">
                      -{formatNaira(data.withdrawals, false)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5 leading-none">
                      <TrendingUp className="w-3.5 h-3.5 text-[#f1be48] shrink-0" /> Realized Profit
                    </span>
                    <span className="text-xs font-mono font-black text-[#f1be48] leading-none">
                      +{formatNaira(data.profit, false)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-zinc-900/40 my-0.5" />

                <div className="flex flex-col gap-1 text-left select-text">
                  <span className="text-[8.5px] font-black text-zinc-550 uppercase tracking-widest">Surplus Net Yield</span>
                  <div className="flex items-center justify-between">
                    <span className={`text-[12.5px] font-mono font-black leading-none ${data.netMargin >= 0 ? 'text-[#14cfb4]' : 'text-rose-500'}`}>
                      {data.netMargin >= 0 ? '+' : ''}{formatNaira(data.netMargin, false)}
                    </span>

                    {data.deposits > 0 ? (
                      <span className={`text-[8px] font-mono font-black px-1.5 py-0.5 rounded ${mathRatio >= 0 ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' : 'bg-amber-950/40 text-[#f1be48] border border-amber-900/30'}`}>
                        {mathRatio}% Saved
                      </span>
                    ) : (
                      <span className="text-[7.5px] font-black text-zinc-650 uppercase font-mono">No Flow</span>
                    )}
                  </div>
                </div>

                <div className="w-full bg-zinc-950 h-1.5 rounded-full mt-1 overflow-hidden border border-zinc-900/30">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${data.netMargin >= 0 ? 'bg-[#14cfb4]' : 'bg-amber-500'}`} 
                    style={{ width: `${Math.max(5, Math.min(100, data.deposits > 0 ? ((data.deposits - data.withdrawals) / data.deposits) * 100 : 0))}%` }}
                  />
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* AUTOMATED SAVINGS PLANS & INTEGRATION CONTROL PANEL */}
      <div className="bg-[#121312] border border-zinc-900 rounded-[28px] overflow-hidden p-6 flex flex-col gap-5 text-left relative shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#14cfb4]/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#14cfb4]/10 border border-[#14cfb4]/20 rounded-xl flex items-center justify-center text-[#14cfb4]">
              <Calendar className="w-5 h-5 font-black" />
            </div>
            <div>
              <h3 className="text-xs font-black text-zinc-100 tracking-wide uppercase leading-none">Automated Savings Plans & Scheduler</h3>
              <span className="text-[10px] text-zinc-500 mt-1 uppercase font-mono tracking-wider block">Pulse Auto-Posting Schedulers</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[9px] bg-zinc-950 px-2.5 py-1 rounded-full border border-zinc-900">
            <span className="text-zinc-550">TOTAL PLANS:</span>
            <span className="text-[#14cfb4] font-black">{recurringPlans.length} ACTIVE</span>
          </div>
        </div>

        {recurringPlans.length === 0 ? (
          <div className="text-center py-8 bg-zinc-950/40 rounded-2xl border border-dashed border-zinc-900 flex flex-col items-center justify-center p-6 gap-2">
            <Calendar className="w-7 h-7 text-zinc-650" />
            <span className="text-xs font-black text-zinc-400 uppercase tracking-widest mt-1">No Automated Plans Configured</span>
            <span className="text-[10px] text-zinc-650 max-w-xs text-center leading-relaxed">
              Toggle "⏱️ Set Auto-Recurring Savings Plan" in the quick savings contribution modal or customers deposit panel to instantiate automated saves schedules.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recurringPlans.map((plan: any, index: number) => {
              const customer = customers.find(c => c.id === plan.customerId);
              const isCustActive = customer?.status === 'active';
              
              return (
                <div key={`${plan.id}-${index}`} className="bg-zinc-950/95 border border-zinc-900 hover:border-zinc-805 rounded-2xl p-4 flex flex-col justify-between gap-3.5 group relative overflow-hidden transition-all">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#14cfb4]/5 via-transparent to-transparent pointer-events-none filter blur-2xl transition-all" />
                  
                  <div className="flex flex-col gap-2 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-zinc-100 truncate max-w-[150px] uppercase tracking-wide leading-none">{plan.customerName}</span>
                      <span className={`text-[8.5px] font-mono font-black px-2 py-0.5 rounded-full select-none ${
                        plan.isActive && isCustActive
                          ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/30'
                          : 'bg-zinc-900 text-zinc-555 border border-zinc-850'
                      }`}>
                        {plan.isActive && isCustActive ? 'ACTIVE ⏱️' : 'PAUSED'}
                      </span>
                    </div>

                    <div className="flex justify-between items-end mt-1 border-t border-zinc-900/40 pt-2 pb-1">
                      <div className="flex flex-col text-left">
                        <span className="text-[7.5px] font-black text-zinc-500 uppercase leading-none">Auto Amount</span>
                        <span className="text-xs font-mono font-black text-[#14cfb4] mt-1">{formatNaira(plan.amount)}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[7.5px] font-black text-zinc-500 uppercase leading-none">Frequency</span>
                        <span className="text-[9.5px] font-black text-zinc-300 uppercase mt-1">🔄 Every {plan.interval}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-zinc-900/40 pt-2 flex flex-col gap-1 text-left text-[9px] font-bold">
                    <div className="flex justify-between text-zinc-500">
                      <span>Slated Run:</span>
                      <span className="font-mono text-zinc-300">
                        {new Date(plan.nextOccurrence).toLocaleDateString()} {new Date(plan.nextOccurrence).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex justify-between text-zinc-500">
                      <span>Executor Agent:</span>
                      <span className="truncate max-w-[130px] text-zinc-400 font-mono font-black">{plan.staffName || 'HQ Admin'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-zinc-900/40 pt-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = recurringPlans.map((p: any) =>
                          p.id === plan.id ? { ...p, isActive: !p.isActive } : p
                        );
                        saveRecurringPlans(updated);
                      }}
                      className={`text-[9px] py-1.5 px-1 rounded-lg border font-black uppercase text-center cursor-pointer transition-all ${
                        plan.isActive
                          ? 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-rose-400 hover:border-rose-950/40'
                          : 'bg-[#14cfb4]/10 text-[#14cfb4] border-[#14cfb4]/25 hover:bg-[#14cfb4]/20'
                      }`}
                    >
                      {plan.isActive ? '⏸ Pause Auto' : '▶ Enable Auto'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!onAddTransaction) return;
                        
                        onAddTransaction({
                          customerId: plan.customerId,
                          type: 'deposit',
                          amount: plan.amount,
                          staffId: plan.staffId || 'hq',
                          status: 'approved'
                        });

                        const newNext = new Date();
                        if (plan.interval === 'weekly') {
                          newNext.setDate(newNext.getDate() + 7);
                        } else {
                          newNext.setMonth(newNext.getMonth() + 1);
                        }

                        try {
                          const auditNow = {
                            id: `audit-${Date.now()}`,
                            timestamp: new Date().toISOString(),
                            actionType: 'SUBMISSION',
                            actor: 'MANAGER (MANUAL)',
                            title: 'Forced Auto-Savings Execution',
                            description: `Manager manually triggered execution of recurring ${plan.interval} deposit of ₦${plan.amount.toLocaleString()} for customer ${plan.customerName}. Next due schedule updated to ${newNext.toLocaleDateString()}.`,
                            severity: 'success'
                          };
                          const existingAudits = JSON.parse(localStorage.getItem('contribopay_sched_audits') || '[]');
                          localStorage.setItem('contribopay_sched_audits', JSON.stringify([auditNow, ...existingAudits]));
                        } catch (e) {
                          console.error(e);
                        }

                        const updated = recurringPlans.map((p: any) =>
                          p.id === plan.id ? { ...p, nextOccurrence: newNext.toISOString() } : p
                        );
                        saveRecurringPlans(updated);
                      }}
                      className="text-[9px] py-1.5 px-1 bg-gradient-to-r from-teal-500 to-emerald-500 hover:opacity-90 text-slate-950 rounded-lg font-black uppercase text-center cursor-pointer transition-opacity"
                    >
                      🚀 Run Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* REAL-TIME SMS & WHATSAPP BROADCAST TRANSCEIVER NODE */}
      <div className="bg-[#121312] border border-zinc-900 rounded-[28px] overflow-hidden p-6 flex flex-col lg:flex-row gap-6 text-left relative shadow-2xl">
        {/* Signal pulsing backdrop accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent rounded-full filter blur-3xl pointer-events-none" />
        
        {/* Left side: Transmission status and log feed */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-zinc-900/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-9 h-9 bg-emerald-950/40 border border-emerald-900/40 rounded-xl flex items-center justify-center text-[#14cfb4]">
                  <Radio className="w-4 h-4 animate-pulse" />
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#10b981] ring-2 ring-[#0c0d0c] animate-ping" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#10b981] ring-2 ring-[#0c0d0c]" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-zinc-100 tracking-wide uppercase leading-none">Gateway Transceiver Node</span>
                <span className="text-[10px] text-[#14cfb4] font-bold mt-1.5 uppercase tracking-wider flex items-center gap-1">
                  🟢 Bound & Broadcasting
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 font-mono text-[10px] bg-zinc-950 px-2.5 py-1 rounded-full border border-zinc-900">
              <span className="text-zinc-550">STATUS:</span>
              <span className="text-[#30d178] font-black">ACTIVE & READY</span>
            </div>
          </div>

          {/* Quick specs / credits */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-900 flex flex-col">
              <span className="text-[7.5px] font-black text-zinc-500 uppercase tracking-wider">CARRIER ROUTE</span>
              <span className="text-[11px] font-bold text-zinc-200 mt-1 uppercase">MTN / Airtel NG</span>
            </div>
            <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-900 flex flex-col">
              <span className="text-[7.5px] font-black text-zinc-500 uppercase tracking-wider">CREDIT BALANCE</span>
              <span className="text-[11px] font-black text-[#14cfb4] font-mono mt-1">₦38,420.00</span>
            </div>
            <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-900 flex flex-col">
              <span className="text-[7.5px] font-black text-zinc-500 uppercase tracking-wider">SLA DISPATCH</span>
              <span className="text-[11px] font-bold text-stone-100 mt-1">99.9% DELIVERED</span>
            </div>
          </div>

          {/* Outbound SMS logs terminal scrolling */}
          <div className="bg-black/90 rounded-2xl border border-zinc-900 p-4 font-mono text-[10.5px] flex flex-col gap-2.5 h-[192px] overflow-y-auto select-text scrollbar-thin">
            <div className="text-[9.5px] font-extrabold text-[#f1be48] uppercase tracking-wider pb-1 border-b border-zinc-900 select-none flex items-center justify-between">
              <span>📟 LIVE DISPATCH TELEMETRY FEED</span>
              <span className="animate-pulse flex items-center gap-1 text-[8px] text-zinc-500">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                LIVE
              </span>
            </div>
            {(() => {
              const alertLogs = state.alerts || [];
              const displayLogs = alertLogs.length > 0 
                ? alertLogs.slice(0, 10) 
                : [
                    { id: '1', customerName: 'Amina Bello', customerPhone: '081 234 5678', message: 'ContriboPay Credit! Acct: *1203 Amt: ₦184,500 Bal: ₦184,500 Ref: CBP-D1002. Auto SMS gateway alert.', type: 'sms', timestamp: new Date().toISOString() },
                    { id: '2', customerName: 'Chukwuemeka Eze', customerPhone: '090 876 5432', message: '*ContriboPay HQ - Deposit Receipt* 🧾\nCustomer: Chukwuemeka Eze\nAmt: ₦92,000\nNew Bal: ₦92,000', type: 'whatsapp', timestamp: new Date(Date.now() - 3600 * 1000).toISOString() },
                    { id: '3', customerName: 'Aliyu Ibrahim', customerPhone: '+234 905 123 4567', message: 'ContriboPay Credit! Acct: *2315 Amt: ₦41,500,000 Bal: ₦41,500,000 Ref: CBP-D1004. Auto SMS gateway alert.', type: 'sms', timestamp: new Date(Date.now() - 7200 * 1000).toISOString() }
                  ];

              return displayLogs.map((log: any, index: number) => {
                const hourFormatted = new Date(log.timestamp).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                });

                return (
                  <div key={`${log.id}-${index}`} className="flex flex-col gap-1 pb-2 border-b border-zinc-950 leading-relaxed text-left">
                    <div className="flex items-center justify-between text-[9px] select-none text-zinc-550 font-bold">
                      <span className="flex items-center gap-1.5">
                        <span className="text-zinc-650">[{hourFormatted}]</span>
                        <span className={log.type === 'sms' ? 'text-teal-400' : 'text-emerald-400'}>
                          {log.type === 'sms' ? '⚡ SMS_ALRT' : '💬 WA_ALRT'}
                        </span>
                        <span className="text-zinc-400 font-sans tracking-wide font-black uppercase text-[8px]">{log.customerName} ({log.customerPhone.slice(-4)})</span>
                      </span>
                      <span className="text-emerald-500 font-bold flex items-center gap-1">
                        DELIVERED
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(log.message);
                            setCopiedAlertId(log.id);
                            setTimeout(() => setCopiedAlertId(null), 1500);
                          }}
                          className="p-1 hover:text-[#f1be48] text-zinc-650 transition-colors cursor-pointer"
                          title="Copy receipt text to clipboard"
                        >
                          <Copy className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    </div>
                    <p className="text-zinc-300 text-[10px] break-words whitespace-pre-line bg-zinc-950/20 px-1.5 py-1 rounded">
                      {log.message}
                    </p>
                    {copiedAlertId === log.id && (
                      <span className="text-[7.5px] font-black text-[#eed693]/80 uppercase select-none leading-none mt-0.5">
                        Copied to clipboard!
                      </span>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* Right side: Transceiver configuration & testing tools */}
        <div className="w-full lg:w-80 shrink-0 bg-zinc-950 rounded-2xl border border-zinc-900 p-4.5 flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-zinc-900 pb-2.5">
            <Smartphone className="w-4 h-4 text-[#f1be48]" />
            <h3 className="text-xs font-black text-[#f1be48] uppercase tracking-wider">SMS Route Setup & Sandbox TEST</h3>
          </div>

          {/* Configuration: Custom Sender ID */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[8.5px] font-black text-zinc-450 uppercase tracking-widest text-left">Custom Sender ID Prefix (Header Code)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={senderIdInput}
                onChange={(e) => setSenderIdInput(e.target.value.slice(0, 11).toUpperCase())}
                placeholder="e.g. CONTRIBO"
                className="bg-black border border-zinc-850 px-2.5 py-1.5 rounded-lg text-xs text-zinc-100 font-mono font-bold uppercase focus:border-amber-900 focus:outline-none flex-1"
                maxLength={11}
              />
              <button
                type="button"
                onClick={() => {
                  if (onUpdateSettings) {
                    onUpdateSettings({ smsSenderId: senderIdInput });
                    triggerAudioAlert();
                    setTestResultNotify('Sender ID saved globally!');
                    setTimeout(() => setTestResultNotify(''), 3000);
                  }
                }}
                className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[9.5px] font-black text-zinc-200 px-3 py-1.5 rounded-lg transition-colors uppercase cursor-pointer shrink-0"
              >
                Save
              </button>
            </div>
            <p className="text-[8.5px] text-zinc-550 leading-relaxed text-left">Up to 11 alphanumeric characters. Registered officially on MTN/Airtel network logs.</p>
          </div>

          {/* Tester tool */}
          <div className="border-t border-zinc-900/60 pt-3 flex flex-col gap-2.5 text-left">
            <span className="text-[9px] font-black text-zinc-450 uppercase tracking-wider">🧪 Sandbox Manual Receiver Routing</span>
            
            <div className="flex flex-col gap-1">
              <span className="text-[7.5px] font-bold text-zinc-550 uppercase">Recipient Phone Mobile</span>
              <input
                type="text"
                placeholder="+234 812 345 6789"
                value={testPhoneInput}
                onChange={(e) => setTestPhoneInput(e.target.value)}
                className="bg-black border border-zinc-850 px-2.5 py-1.5 rounded-lg text-xs font-mono text-zinc-100 focus:border-stone-800 focus:outline-none focus:ring-0"
              />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[7.5px] font-bold text-zinc-550 uppercase">Message Content</span>
              <textarea
                value={testMessageInput}
                onChange={(e) => setTestMessageInput(e.target.value)}
                rows={2}
                className="bg-black border border-zinc-850 px-2.5 py-1.5 rounded-lg text-xs text-zinc-100 leading-normal focus:border-stone-800 focus:outline-none resize-none"
              />
            </div>

            <button
              type="button"
              disabled={isSendingTest}
              onClick={() => {
                if (!testPhoneInput) {
                  setTestResultNotify('❌ Recipient phone number is required!');
                  setTimeout(() => setTestResultNotify(''), 3000);
                  return;
                }
                setIsSendingTest(true);
                triggerAudioAlert();
                
                // Simulate SMS Dispatching Queue on console
                setTimeout(() => {
                  triggerAudioAlert();
                  setIsSendingTest(false);
                  
                  // Trigger custom smartphone mockup slide in using parent or local visual alert
                  setTestResultNotify('🟢 Test SMS Dispatched & Delivered!');
                  setTimeout(() => setTestResultNotify(''), 4000);
                }, 1400);
              }}
              className="bg-[#0da68d] disabled:opacity-50 hover:bg-[#0b917c] text-white font-extrabold text-[10px] tracking-wide uppercase py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSendingTest ? 'Broadcasting Payload...' : 'Live Dial SMS Broadcast'}</span>
            </button>

            {testResultNotify && (
              <span className="text-[9.5px] font-black text-[#eed693] text-center uppercase mt-1 select-none leading-none">
                {testResultNotify}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2x2 Grid Layout representing the exact layout of screenshot */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Card 1: Customers */}
        <motion.div 
          variants={itemVariants}
          onClick={() => onNavigateToTab('customers')}
          className="bg-[#121412] p-5 rounded-[26px] border border-zinc-900/60 hover:border-zinc-850 cursor-pointer transition-all flex flex-col gap-4 relative overflow-hidden group"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-950/40 text-[#4ca6a8] border border-teal-900/40 flex items-center justify-center">
            <Users className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-400">Customers</span>
            <span className="text-3xl md:text-4xl font-extrabold text-[#4ca8a8] tracking-tight">
              {totalCustomersCount}
            </span>
            <span className="text-xs font-semibold text-[#16a34a] flex items-center gap-1 mt-0.5">
              <span>{activeCustomersCount} active</span>
            </span>
          </div>
        </motion.div>

        {/* Card 2: Total Savings */}
        <motion.div 
          variants={itemVariants}
          onClick={() => onNavigateToTab('reports')}
          className="bg-[#121412] p-5 rounded-[26px] border border-zinc-900/60 hover:border-zinc-850 cursor-pointer transition-all flex flex-col gap-4 relative overflow-hidden group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-950/40 text-[#10b981] border border-emerald-900/40 flex items-center justify-center">
            <Hexagon className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-400">Total Savings</span>
            <span className="text-3xl md:text-4xl font-extrabold text-[#3ad188] tracking-tight">
              {formatShorthand(totalSavingsAmount)}
            </span>
            <span className="text-xs font-semibold text-[#30d178]/90 flex items-center gap-0.5 mt-0.5">
              <span>+{formatShorthand(todayCollectionsTotal)} today</span>
            </span>
          </div>
        </motion.div>

        {/* Card 3: Pending W/D */}
        <motion.div 
          variants={itemVariants}
          onClick={() => onNavigateToTab('withdrawals')}
          className="bg-[#121412] p-5 rounded-[26px] border border-zinc-900/60 hover:border-zinc-850 cursor-pointer transition-all flex flex-col gap-4 relative overflow-hidden group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-950/40 text-[#eab308] border border-amber-900/30 flex items-center justify-center">
            <span className="font-mono text-xl font-bold text-[#eab308]">$</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-400">Pending W/D</span>
            <span className="text-3xl md:text-4xl font-extrabold text-[#e0a92a] tracking-tight">
              {pendingWDCount}
            </span>
            <span className="text-xs font-semibold text-[#30d178] flex items-center gap-1 mt-0.5">
              <span>{formatNaira(pendingWDAmount, false)}</span>
            </span>
          </div>
        </motion.div>

        {/* Card 4: Active Staff */}
        <motion.div 
          variants={itemVariants}
          onClick={() => onNavigateToTab('staff')}
          className="bg-[#121412] p-5 rounded-[26px] border border-zinc-900/60 hover:border-zinc-850 cursor-pointer transition-all flex flex-col gap-4 relative overflow-hidden group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-950/45 text-[#3b82f6] border border-blue-900/30 flex items-center justify-center">
            <Users className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-400">Active Staff</span>
            <span className="text-3xl md:text-4xl font-extrabold text-[#3a82f6] tracking-tight">
              {activeStaffCount}
            </span>
            <span className="text-xs font-semibold text-[#30d178]/80 flex items-center gap-1 mt-0.5">
              <span>{totalStaffCount} total</span>
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* RECENT TRANSACTIONS LEDGER (MANAGER & STAFF SEARCH FEED) */}
      <div className="bg-[#121312] border border-zinc-900 rounded-[28px] p-6 flex flex-col gap-5 text-left relative shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900/60 pb-4">
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-[#eed693] tracking-tight flex items-center gap-2">
              <span>Recent Transactions Ledger</span>
              <span className="text-[9.5px] bg-[#14cfb4]/10 text-[#14cfb4] border border-[#14cfb4]/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
                {filteredTransactions.length} of {transactions.length} Records
              </span>
            </h2>
            <p className="text-xs text-zinc-500 mt-1 font-medium">
              Filter with client's full details or unique digital system receipt reference numbers
            </p>
          </div>

          {/* Search Input Field */}
          <div className="relative w-full md:w-80 select-text">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              id="tx-search-input"
              value={txSearchQuery}
              onChange={(e) => setTxSearchQuery(e.target.value)}
              placeholder="Search by customer name or reference..."
              className="w-full pl-10 pr-4 py-2.5 bg-black border border-zinc-850 hover:border-zinc-750 focus:border-[#14cfb4] text-xs text-zinc-100 font-bold placeholder-zinc-650 rounded-xl focus:outline-none transition-all font-sans"
            />
            {txSearchQuery && (
              <button
                type="button"
                onClick={() => setTxSearchQuery('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-zinc-300 transition-colors text-[10px] font-bold uppercase tracking-wider cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Transactions Table / List */}
        {filteredTransactions.length === 0 ? (
          <div className="p-10 text-center bg-zinc-950/40 rounded-2xl border border-zinc-900 border-dashed text-zinc-500 text-xs">
            {txSearchQuery ? "No transactions found matching your search query." : "No transactions recorded in the system ledger yet."}
          </div>
        ) : (
          <div className="overflow-x-auto select-text scrollbar-thin">
            <table className="w-full text-left min-w-[650px] border-collapse">
              <thead>
                <tr className="border-b border-zinc-900/60 text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest bg-zinc-950/15">
                  <th className="py-3 px-4">Tx Reference</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Handled By Staff</th>
                  <th className="py-3 px-4">Time Logged</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/30 text-xs text-zinc-300 font-mono">
                {filteredTransactions.slice(0, 10).map((tx, index) => {
                  const dateObj = new Date(tx.timestamp);
                  const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const formattedDate = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
                  const isDeposit = tx.type === 'deposit';

                  return (
                    <tr key={`${tx.id}-${index}`} className="hover:bg-zinc-850/20 transition-colors group/row">
                      {/* Reference Badge */}
                      <td className="py-3 px-4 text-zinc-500 font-semibold font-mono tracking-wider">
                        {tx.reference || 'N/A'}
                      </td>

                      {/* Customer Name */}
                      <td className="py-3 px-4 font-sans font-bold text-zinc-200 group-hover:text-white transition-colors">
                        {tx.customerName || 'CBP Member'}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3 px-4">
                        {isDeposit ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/20 border border-emerald-900/30 px-2 py-0.5 rounded-md">
                            Deposit
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-500 bg-[#221c0e]/30 border border-[#f1be48]/20 px-2 py-0.5 rounded-md">
                            Withdrawal
                          </span>
                        )}
                      </td>

                      {/* Amount formatted */}
                      <td className={`py-3 px-4 font-black ${isDeposit ? 'text-emerald-400' : 'text-amber-500'}`}>
                        {formatNaira(tx.amount, true)}
                      </td>

                      {/* Staff Operator Info */}
                      <td className="py-3 px-4 font-sans text-zinc-400 font-medium">
                        {tx.staffName || 'HQ Admin'}
                      </td>

                      {/* Timestamp formatted */}
                      <td className="py-3 px-4 text-zinc-500">
                        <span className="font-sans font-semibold text-zinc-350">{formattedDate}</span>
                        <span className="text-[10px] ml-1.5 opacity-80">{formattedTime}</span>
                      </td>

                      {/* Status Badges */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {tx.status === 'approved' ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-emerald-400">Approved</span>
                            </>
                          ) : tx.status === 'rejected' ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-rose-500">Rejected</span>
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                              <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-amber-400">Pending</span>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredTransactions.length > 10 && (
              <div className="pt-3.5 border-t border-zinc-905 text-center select-none">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                  Showing the 10 most recent records matching the search query. Go to the customers or reports tab to see full scrollable histories.
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CUSTOMER GROWTH & SEGMENT ANALYSIS */}
      <div className="flex flex-col gap-3 mt-4 text-left">
        <h2 className="text-lg md:text-xl font-black text-zinc-100 tracking-tight">
          Customer Growth & Segment Analysis
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Daily Card */}
          <div className="bg-[#121412] p-4.5 rounded-[24px] border border-zinc-900/60 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">☀️ Daily Segment</span>
              <span className="text-[8.5px] font-mono bg-emerald-950/20 text-[#14cfb4] px-1.5 py-0.5 rounded border border-[#14cfb4]/25 font-bold">24H Today</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 border-t border-zinc-900/40 pt-3">
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">Registered</span>
                <span className="text-[14px] font-black text-zinc-100 font-mono mt-0.5">{dailyCust.registeredCount}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-wider">New</span>
                <span className="text-[14px] font-black text-[#14cfb4] font-mono mt-0.5">{dailyCust.newCount}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-zinc-550 uppercase tracking-wider">Old</span>
                <span className="text-[14px] font-black text-zinc-400 font-mono mt-0.5">{dailyCust.oldCount}</span>
              </div>
            </div>
          </div>

          {/* Weekly Card */}
          <div className="bg-[#121412] p-4.5 rounded-[24px] border border-zinc-900/60 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-12 h-12 bg-purple-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">📅 Weekly Segment</span>
              <span className="text-[8.5px] font-mono bg-purple-950/20 text-[#a855f7] px-1.5 py-0.5 rounded border border-[#a855f7]/25 font-bold">7 Days</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 border-t border-zinc-900/40 pt-3">
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">Registered</span>
                <span className="text-[14px] font-black text-zinc-100 font-mono mt-0.5">{weeklyCust.registeredCount}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-purple-400 uppercase tracking-wider">New</span>
                <span className="text-[14px] font-black text-[#a855f7] font-mono mt-0.5">{weeklyCust.newCount}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-zinc-550 uppercase tracking-wider">Old</span>
                <span className="text-[14px] font-black text-zinc-400 font-mono mt-0.5">{weeklyCust.oldCount}</span>
              </div>
            </div>
          </div>

          {/* Monthly Card */}
          <div className="bg-[#121412] p-4.5 rounded-[24px] border border-zinc-900/60 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-12 h-12 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">🗓️ Monthly Segment</span>
              <span className="text-[8.5px] font-mono bg-amber-955/20 text-amber-550 px-1.5 py-0.5 rounded border border-amber-900/20 font-bold">30 Days</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 border-t border-zinc-900/40 pt-3">
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">Registered</span>
                <span className="text-[14px] font-black text-zinc-100 font-mono mt-0.5">{monthlyCust.registeredCount}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-amber-500 uppercase tracking-wider">New</span>
                <span className="text-[14px] font-black text-amber-500 font-mono mt-0.5">{monthlyCust.newCount}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-zinc-555 uppercase tracking-wider">Old</span>
                <span className="text-[14px] font-black text-zinc-400 font-mono mt-0.5">{monthlyCust.oldCount}</span>
              </div>
            </div>
          </div>

          {/* Yearly Card */}
          <div className="bg-[#121412] p-4.5 rounded-[24px] border border-zinc-900/60 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-12 h-12 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">🏛️ Yearly Segment</span>
              <span className="text-[8.5px] font-mono bg-blue-950/20 text-blue-450 px-1.5 py-0.5 rounded border border-blue-900/20 font-bold">365 Days</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 border-t border-zinc-900/40 pt-3">
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">Registered</span>
                <span className="text-[14px] font-black text-zinc-100 font-mono mt-0.5">{yearlyCust.registeredCount}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-blue-555 uppercase tracking-wider">New</span>
                <span className="text-[14px] font-black text-blue-400 font-mono mt-0.5">{yearlyCust.newCount}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-zinc-555 uppercase tracking-wider">Old</span>
                <span className="text-[14px] font-black text-zinc-400 font-mono mt-0.5">{yearlyCust.oldCount}</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* EXQUISITE STAFF CUSTOMER REGISTRATION SPREAD & SUMMARY */}
      <div className="flex flex-col gap-4 mt-6 text-left">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-zinc-900 pb-3">
          <div className="flex flex-col">
            <h2 className="text-xl md:text-2xl font-black text-zinc-100 tracking-tight flex items-center gap-2">
              <span>Staff Acquisitions & Registration Spread</span>
              <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-900/30 px-2 py-0.5 rounded-full font-mono font-bold animate-pulse">Live Dashboard</span>
            </h2>
            <p className="text-xs text-zinc-550 mt-0.5 font-medium">Breakdown of customer registrations across different periods by acquiring staff member</p>
          </div>
          
          <div className="flex items-center gap-1.5 bg-[#f1be48]/10 px-3 py-1 rounded-2xl border border-[#f1be48]/20 shrink-0 select-none">
            <span className="text-[11px] font-bold text-[#f1be48] uppercase tracking-wider font-mono">👥 Overall registered: {totalCustomersCount} Customers</span>
          </div>
        </div>

        {/* Friendly Hub Highlights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          {/* Big welcome & summary card */}
          <div className="lg:col-span-1 bg-gradient-to-br from-[#121412] to-[#0c0d0c] border border-zinc-900 p-5 rounded-[24px] flex flex-col justify-between relative overflow-hidden select-none">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#eed693]/5 rounded-full filter blur-2xl pointer-events-none" />
            
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest font-mono">💖 Growth Hub Greeting</span>
              <h3 className="text-base font-extrabold text-zinc-200">Customer Registration Portal</h3>
              <p className="text-xs text-zinc-500 leading-relaxed mt-1">
                A highly-cohesive team performance tracking board. Every single registered customer is paired directly of record with their responsible staff supervisor to maximize relationship value as well as accountability.
              </p>
            </div>

            <div className="mt-5 bg-[#090b09]/80 border border-zinc-900/60 p-3.5 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-400">Total customers base</span>
                <span className="text-lg font-black text-white font-mono bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800">{totalCustomersCount}</span>
              </div>
              <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden mt-3.5">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" style={{ width: '100%' }} />
              </div>
              <span className="text-[9px] text-emerald-500 font-bold block mt-2 text-right">✓ Active Database Synchronization</span>
            </div>
          </div>

          {/* Timeframe Totalizer Cards */}
          <div className="lg:col-span-2 bg-[#121412] border border-zinc-900/80 p-5 rounded-[24px] flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5 mb-3">
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest font-mono font-bold">📊 Totalizer summary (Combined staff registrations)</span>
              <span className="text-[9.5px] font-bold text-zinc-500 font-mono">Totals of Period Registers</span>
            </div>

            {/* Calculate combined acquisition rates */}
            {(() => {
              const staffAcquisitions = staff.map(s => {
                const sCustomers = customers.filter(c => c.assignedStaffId === s.id);
                const daily = sCustomers.filter(c => c.joinedDate && getWithinPeriod(c.joinedDate, 'daily')).length;
                const weekly = sCustomers.filter(c => c.joinedDate && getWithinPeriod(c.joinedDate, 'weekly')).length;
                const monthly = sCustomers.filter(c => c.joinedDate && getWithinPeriod(c.joinedDate, 'monthly')).length;
                const yearly = sCustomers.filter(c => c.joinedDate && getWithinPeriod(c.joinedDate, 'yearly')).length;
                return { daily, weekly, monthly, yearly };
              });

              const totalDaily = staffAcquisitions.reduce((acc, curr) => acc + curr.daily, 0);
              const totalWeekly = staffAcquisitions.reduce((acc, curr) => acc + curr.weekly, 0);
              const totalMonthly = staffAcquisitions.reduce((acc, curr) => acc + curr.monthly, 0);
              const totalYearly = staffAcquisitions.reduce((acc, curr) => acc + curr.yearly, 0);

              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 w-full">
                  {/* Daily */}
                  <div className="bg-[#090b09]/80 border border-zinc-900 p-3 rounded-2xl flex flex-col justify-between relative overflow-hidden text-left">
                    <span className="text-[9px] font-bold uppercase text-zinc-500 tracking-wider">Today Registers</span>
                    <span className="text-xl font-black text-[#14cfb4] font-mono mt-2">{totalDaily}</span>
                    <p className="text-[8.5px] text-zinc-600 mt-1">Acquired past 24 hours</p>
                  </div>
                  {/* Weekly */}
                  <div className="bg-[#090b09]/80 border border-zinc-900 p-3 rounded-2xl flex flex-col justify-between relative overflow-hidden text-left">
                    <span className="text-[9px] font-bold uppercase text-zinc-500 tracking-wider">Weekly Registers</span>
                    <span className="text-xl font-black text-[#a855f7] font-mono mt-2">{totalWeekly}</span>
                    <p className="text-[8.5px] text-zinc-600 mt-1">Acquired past 7 days</p>
                  </div>
                  {/* Monthly */}
                  <div className="bg-[#090b09]/80 border border-zinc-900 p-3 rounded-2xl flex flex-col justify-between relative overflow-hidden text-left">
                    <span className="text-[9px] font-bold uppercase text-zinc-500 tracking-wider">Monthly Registers</span>
                    <span className="text-xl font-black text-amber-500 font-mono mt-2">{totalMonthly}</span>
                    <p className="text-[8.5px] text-zinc-600 mt-1">Acquired past 30 days</p>
                  </div>
                  {/* Yearly */}
                  <div className="bg-[#090b09]/80 border border-zinc-900 p-3 rounded-2xl flex flex-col justify-between relative overflow-hidden text-left">
                    <span className="text-[9px] font-bold uppercase text-zinc-500 tracking-wider">Yearly Registers</span>
                    <span className="text-xl font-black text-blue-400 font-mono mt-2">{totalYearly}</span>
                    <p className="text-[8.5px] text-zinc-600 mt-1">Acquired past 365 days</p>
                  </div>
                </div>
              );
            })()}

            <p className="text-[10px] text-zinc-650 mt-3 font-semibold tracking-wide uppercase text-left leading-none font-mono">
              👥 Combined handled staff registered portfolio sum: {
                staff.reduce((acc, s) => acc + customers.filter(c => c.assignedStaffId === s.id).length, 0)
              }
            </p>
          </div>

        </div>

        {/* Detailed Staff-by-Staff Registration Spread Table */}
        <div className="bg-[#121412] border border-zinc-900/80 rounded-[24px] overflow-hidden">
          <div className="p-4 bg-zinc-950/20 border-b border-zinc-900 flex items-center justify-between select-none">
            <span className="text-xs font-black uppercase tracking-wider text-zinc-400">🔍 Complete Staff Performance Spread Matrix</span>
            <span className="text-[10.5px] font-mono text-zinc-550 font-bold">Acquisitions Spreadsheet</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[650px] border-collapse">
              <thead>
                <tr className="border-b border-zinc-900/80 text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest bg-zinc-950/10">
                  <th className="py-3 px-5 text-left">Staff Member</th>
                  <th className="py-3 px-4 text-center">Daily (Today)</th>
                  <th className="py-3 px-4 text-center">Weekly (7 Days)</th>
                  <th className="py-3 px-4 text-center">Monthly (30 Days)</th>
                  <th className="py-3 px-4 text-center">Yearly (365 Days)</th>
                  <th className="py-3 px-5 text-right">Total Assigned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/50 font-mono text-xs">
                {staff.map((s, index) => {
                  const sCustomers = customers.filter(c => c.assignedStaffId === s.id);
                  const daily = sCustomers.filter(c => c.joinedDate && getWithinPeriod(c.joinedDate, 'daily')).length;
                  const weekly = sCustomers.filter(c => c.joinedDate && getWithinPeriod(c.joinedDate, 'weekly')).length;
                  const monthly = sCustomers.filter(c => c.joinedDate && getWithinPeriod(c.joinedDate, 'monthly')).length;
                  const yearly = sCustomers.filter(c => c.joinedDate && getWithinPeriod(c.joinedDate, 'yearly')).length;
                  const overall = sCustomers.length;

                  return (
                    <tr key={`${s.id}-${index}`} className="hover:bg-zinc-850/25 transition-colors group/row">
                      <td className="py-3 px-5 text-left font-sans font-semibold text-zinc-200">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full overflow-hidden border border-zinc-800 select-none shrink-0">
                            {s.profileImage ? (
                              <img src={s.profileImage} className="w-full h-full object-cover" alt={s.name} referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full bg-zinc-800 text-zinc-400 text-[10px] font-extrabold flex items-center justify-center tracking-wider">
                                {s.initials}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-zinc-200 group-hover/row:text-white transition-colors">{s.name}</span>
                            <span className="text-[9px] text-zinc-550 font-mono">{s.role} &bull; {s.location}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${daily > 0 ? "bg-emerald-950/25 text-[#14cfb4] border border-[#14cfb4]/20" : "text-zinc-650"}`}>
                          {daily}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${weekly > 0 ? "bg-purple-950/25 text-[#a855f7] border border-[#a855f7]/20" : "text-zinc-650"}`}>
                          {weekly}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${monthly > 0 ? "bg-amber-955/25 text-amber-500 border border-amber-500/20" : "text-zinc-650"}`}>
                          {monthly}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${yearly > 0 ? "bg-blue-950/25 text-blue-400 border border-blue-400/20" : "text-zinc-650"}`}>
                          {yearly}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right font-bold text-zinc-100 font-mono">
                        <span className="text-[12px] text-white bg-zinc-950/50 px-2 py-0.5 rounded border border-zinc-850">
                          {overall}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {/* Combined totals row at the very bottom */}
                {(() => {
                  const staffAcquisitions = staff.map(s => {
                    const sCustomers = customers.filter(c => c.assignedStaffId === s.id);
                    const daily = sCustomers.filter(c => c.joinedDate && getWithinPeriod(c.joinedDate, 'daily')).length;
                    const weekly = sCustomers.filter(c => c.joinedDate && getWithinPeriod(c.joinedDate, 'weekly')).length;
                    const monthly = sCustomers.filter(c => c.joinedDate && getWithinPeriod(c.joinedDate, 'monthly')).length;
                    const yearly = sCustomers.filter(c => c.joinedDate && getWithinPeriod(c.joinedDate, 'yearly')).length;
                    const overall = sCustomers.length;
                    return { daily, weekly, monthly, yearly, overall };
                  });

                  const totalDaily = staffAcquisitions.reduce((acc, curr) => acc + curr.daily, 0);
                  const totalWeekly = staffAcquisitions.reduce((acc, curr) => acc + curr.weekly, 0);
                  const totalMonthly = staffAcquisitions.reduce((acc, curr) => acc + curr.monthly, 0);
                  const totalYearly = staffAcquisitions.reduce((acc, curr) => acc + curr.yearly, 0);
                  const totalOverall = staffAcquisitions.reduce((acc, curr) => acc + curr.overall, 0);

                  return (
                    <tr className="bg-zinc-950/40 border-t border-zinc-800 font-extrabold select-none">
                      <td className="py-4 px-5 text-left font-sans text-xs text-[#f1be48] uppercase tracking-wider flex items-center gap-1.5 mt-0.5">
                        <Trophy className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                        <span>Staff Cumulative Totals</span>
                      </td>
                      <td className="py-4 px-4 text-center text-[12px] text-[#14cfb4]">{totalDaily}</td>
                      <td className="py-4 px-4 text-center text-[12px] text-[#a855f7]">{totalWeekly}</td>
                      <td className="py-4 px-4 text-center text-[12px] text-amber-500">{totalMonthly}</td>
                      <td className="py-4 px-4 text-center text-[12px] text-blue-400">{totalYearly}</td>
                      <td className="py-4 px-5 text-right text-[13px] text-[#eed693] font-black">{totalOverall}</td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <CustomerStats customers={customers} />

      {/* Top Performers Section exact look and design */}
      <div className="flex flex-col gap-3 mt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-bold text-zinc-100 tracking-tight">Ranked Performers</h2>
          <span className="text-xs text-zinc-400 font-mono">Sorted by collections today</span>
        </div>

        <div className="bg-[#121412] border border-zinc-900/80 rounded-[24px] overflow-hidden">
          {sortedStaffPerformers.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">No active staff registered yet.</div>
          ) : (
            <div className="divide-y divide-zinc-900">
              {sortedStaffPerformers.map((member, index) => {
                  const colors = [
                    'bg-emerald-500/10 text-emerald-400 border-emerald-900/30',
                    'bg-cyan-500/10 text-cyan-400 border-cyan-900/30',
                    'bg-[#f1be48]/10 text-[#f1be48] border-amber-900/30',
                    'bg-zinc-800 text-zinc-300 border-zinc-700/30'
                  ];
                  const rankColor = colors[Math.min(index, 3)];
                  const collectionPercentage = Math.min((member.collectionsToday / 250000) * 100, 100);
  
                  return (
                    <div key={`${member.id}-${index}`} className="p-4 flex items-center justify-between hover:bg-zinc-850/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {/* Rank indicator */}
                      <span className={`w-6 h-6 rounded-full border text-xs font-bold flex items-center justify-center ${rankColor}`}>
                        {index + 1}
                      </span>
                      {/* Avatar circular */}
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-zinc-750 shrink-0 select-none">
                        {member.profileImage ? (
                          <img src={member.profileImage} className="w-full h-full object-cover" alt={member.name} referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full bg-zinc-800 text-zinc-300 font-semibold text-sm flex items-center justify-center tracking-wider">
                            {member.initials}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-zinc-200 text-sm md:text-base flex items-center gap-1.5">
                          {member.name}
                          {index === 0 && <span className="text-amber-500">🏆</span>}
                        </span>
                        <span className="text-xs text-zinc-500 font-mono">{member.phoneNumber}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Collection progress visualizer */}
                      <div className="hidden md:flex flex-col items-end gap-1 w-32">
                        <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-600 to-teal-400" 
                            style={{ width: `${collectionPercentage}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-zinc-500 font-mono">Goal ₦250K</span>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-sm md:text-base text-zinc-100">
                          {formatNaira(member.collectionsToday, false)}
                        </div>
                        <div className="text-[10px] font-semibold text-[#30d178] uppercase tracking-wider">
                          Collected Today
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
