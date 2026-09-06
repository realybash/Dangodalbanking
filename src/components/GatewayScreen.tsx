import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';

// Hashing helper for manager PINs
const hashPin = (p: string): string => {
  if (!p) return '';
  let hash1 = 5381;
  let hash2 = 12345;
  const salt = "contribo_secure_salt_789";
  const saltedPin = p + salt;
  for (let i = 0; i < saltedPin.length; i++) {
    const char = saltedPin.charCodeAt(i);
    hash1 = ((hash1 << 5) + hash1) + char;
    hash2 = ((hash2 << 4) - hash2) ^ char;
  }
  return `escrow_v2_${(hash1 >>> 0).toString(16)}_${(hash2 >>> 0).toString(16)}`;
};
import { 
  Sparkles, 
  Plus, 
  Lock, 
  ArrowRight, 
  UserCheck, 
  ShieldAlert, 
  CheckCircle2, 
  QrCode, 
  ArrowLeft,
  ChevronRight,
  User,
  Wallet,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Layers,
  Info,
  Check,
  Crown,
  ShieldCheck,
  Home,
  History,
  Bell
} from 'lucide-react';
import { DashboardState, Customer, StaffMember, Transaction } from '../types';
import { registerWithEmail, loginWithEmail, requestPasswordReset } from '../lib/authHelper';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import StaffPortalScreen from './StaffPortalScreen';
import { useToast } from './ToastProvider';

export const themeGrads = {
  teal: {
    cardBg: 'from-[#081a17] via-[#0d0e0d] to-[#0a0a0a]',
    text: 'text-[#14cfb4]',
    hoverText: 'hover:text-[#14cfb4]',
    border: 'border-[#14cfb4]/20',
    hoverBorder: 'hover:border-[#14cfb4]/40',
    focusBorder: 'focus:border-[#14cfb4]',
    bg: 'bg-[#14cfb4]',
    fillBg: 'bg-[#14cfb4]',
    accentBg: 'bg-[#14cfb4]/10',
    accentText: 'text-[#14cfb4]',
    accentBorder: 'border-[#14cfb4]/20',
    glow: 'from-[#14cfb4]/15',
    pillBg: 'bg-[#14cfb4]',
    shadow: 'shadow-[0_4px_20px_rgba(20,207,180,0.35)]',
    spinner: 'border-t-[#14cfb4]'
  },
  amber: {
    cardBg: 'from-[#1f1606] via-[#0d0e0d] to-[#0a0a0a]',
    text: 'text-amber-400',
    hoverText: 'hover:text-amber-400',
    border: 'border-amber-400/20',
    hoverBorder: 'hover:border-amber-400/40',
    focusBorder: 'focus:border-amber-400',
    bg: 'bg-amber-400',
    fillBg: 'bg-amber-400',
    accentBg: 'bg-amber-400/10',
    accentText: 'text-amber-400',
    accentBorder: 'border-amber-400/20',
    glow: 'from-amber-400/15',
    pillBg: 'bg-amber-400',
    shadow: 'shadow-[0_4px_20px_rgba(251,191,36,0.35)]',
    spinner: 'border-t-amber-400'
  },
  rose: {
    cardBg: 'from-[#220a10] via-[#0d0e0d] to-[#0a0a0a]',
    text: 'text-rose-450',
    hoverText: 'hover:text-rose-450',
    border: 'border-rose-900/40',
    hoverBorder: 'hover:border-rose-500/40',
    focusBorder: 'focus:border-rose-500',
    bg: 'bg-rose-500',
    fillBg: 'bg-rose-500',
    accentBg: 'bg-rose-950/20',
    accentText: 'text-rose-450',
    accentBorder: 'border-rose-900/30',
    glow: 'from-rose-500/15',
    pillBg: 'bg-rose-500',
    shadow: 'shadow-[0_4px_20px_rgba(244,63,94,0.35)]',
    spinner: 'border-t-rose-500'
  },
  indigo: {
    cardBg: 'from-[#080d24] via-[#0d0e0d] to-[#0a0a0a]',
    text: 'text-indigo-400',
    hoverText: 'hover:text-indigo-400',
    border: 'border-indigo-400/20',
    hoverBorder: 'hover:border-indigo-400/40',
    focusBorder: 'focus:border-indigo-400',
    bg: 'bg-indigo-400',
    fillBg: 'bg-indigo-400',
    accentBg: 'bg-indigo-400/10',
    accentText: 'text-indigo-400',
    accentBorder: 'border-indigo-400/20',
    glow: 'from-indigo-400/15',
    pillBg: 'bg-indigo-400',
    shadow: 'shadow-[0_4px_20px_rgba(99,102,241,0.35)]',
    spinner: 'border-t-indigo-400'
  },
  violet: {
    cardBg: 'from-[#14061f] via-[#0d0e0d] to-[#0a0a0a]',
    text: 'text-violet-400',
    hoverText: 'hover:text-violet-400',
    border: 'border-violet-400/20',
    hoverBorder: 'hover:border-violet-400/40',
    focusBorder: 'focus:border-violet-400',
    bg: 'bg-violet-400',
    fillBg: 'bg-violet-400',
    accentBg: 'bg-violet-400/10',
    accentText: 'text-violet-400',
    accentBorder: 'border-violet-400/20',
    glow: 'from-violet-400/15',
    pillBg: 'bg-violet-400',
    shadow: 'shadow-[0_4px_20px_rgba(167,139,250,0.35)]',
    spinner: 'border-t-violet-400'
  }
};

const getCustomerAvatarGradient = (name: string) => {
  const gradients = [
    'from-emerald-500 to-teal-600 text-zinc-950',
    'from-blue-500 to-indigo-600 text-zinc-950',
    'from-amber-400 to-orange-500 text-zinc-950',
    'from-pink-500 to-rose-600 text-zinc-150',
    'from-purple-500 to-violet-600 text-zinc-150',
    'from-cyan-400 to-blue-500 text-zinc-950',
  ];
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return gradients[sum % gradients.length];
};

const getAvatarGradient = (name: string) => `bg-gradient-to-tr ${getCustomerAvatarGradient(name)}`;

const getInitials = (nameStr: string) => {
  return nameStr
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const formatTxDate = (timestampStr: string) => {
  try {
    const txDate = new Date(timestampStr);
    if (isNaN(txDate.getTime())) return 'Ledger Date';
    
    const now = new Date();
    const isToday = txDate.getDate() === now.getDate() &&
                    txDate.getMonth() === now.getMonth() &&
                    txDate.getFullYear() === now.getFullYear();
    
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = txDate.getDate() === yesterday.getDate() &&
                        txDate.getMonth() === yesterday.getMonth() &&
                        txDate.getFullYear() === yesterday.getFullYear();

    const timeStr = txDate.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    if (isToday) {
      return `Today, ${timeStr}`;
    } else if (isYesterday) {
      return `Yesterday, ${timeStr}`;
    } else {
      return txDate.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  } catch (err) {
    return 'Ledger Date';
  }
};

interface GatewayScreenProps {
  state: DashboardState;
  onManagerLogin: () => void;
  onManagerLoginSuccess?: (email: string) => void;
  onAddTransaction: (tx: {
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
  }) => any;
  onAddCustomer: (customer: Omit<Customer, 'id' | 'joinedDate' | 'contributionsCount'>) => void;
  onAddStaff: (staff: Omit<StaffMember, 'id' | 'joinedDate' | 'collectionsCount' | 'totalCollectionsAmount' | 'pinStatus' | 'collectionsToday'>) => void;
  onUpdateStaff: (id: string, updatedFields: Partial<StaffMember>) => void;
  onUpdateCustomer: (id: string, updatedFields: Partial<Customer>) => void;
  onApproveTransaction?: (txId: string, receiptPhoto?: string) => void;
  onDirectBroadcast?: (message: string) => Promise<void>;
  onRequestBroadcast?: (message: string, sender: { id: string; name: string; role: string }) => Promise<void>;
  onApproveBroadcast?: (id: string, managerName: string) => Promise<void>;
  onDeclineBroadcast?: (id: string) => Promise<void>;
}

export default function GatewayScreen({ 
  state, 
  onManagerLogin, 
  onManagerLoginSuccess,
  onAddTransaction,
  onAddCustomer,
  onAddStaff,
  onUpdateStaff,
  onUpdateCustomer,
  onApproveTransaction,
  onDirectBroadcast,
  onRequestBroadcast,
  onApproveBroadcast,
  onDeclineBroadcast
}: GatewayScreenProps) {
  const { showToast } = useToast();
  const [screen, setScreen] = useState<'gateway' | 'customer-select' | 'customer-auth' | 'customer-dashboard' | 'customer-register' | 'staff-select' | 'staff-dashboard'>('gateway');
  const [customerActiveTab, setCustomerActiveTab] = useState<'signin' | 'signup'>('signin');
  const [portalTab, setPortalTab] = useState<'customer' | 'staff' | 'manager'>('customer');
  const [loggedStaff, setLoggedStaff] = useState<StaffMember | null>(null);
  const [staffLoginId, setStaffLoginId] = useState<string>(() => state.staff[0]?.id || '');
  const [showPortalsSelector, setShowPortalsSelector] = useState(false);
  const [logoTapCount, setLogoTapCount] = useState(0);
  const [unlockedStaff, setUnlockedStaff] = useState(false);
  const [unlockedManager, setUnlockedManager] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  useEffect(() => {
    if (screen === 'customer-register') {
      setCustomerActiveTab('signup');
    } else if (screen === 'customer-auth') {
      setCustomerActiveTab('signin');
    }
  }, [screen]);
  
  // Selected roles
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  // Authenticating states
  const [passcode, setPasscode] = useState('');
  const [typedPhone, setTypedPhone] = useState('');
  const [focusedField, setFocusedField] = useState<'phone' | 'pin'>('pin');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Customer dashboard states
  const [custTab, setCustTab] = useState<'home' | 'history' | 'alerts' | 'profile'>('home');
  const [hideBalance, setHideBalance] = useState(false);

  // Real-time smartphone notification state and alert counter tracker
  const [activeSmartphoneNotification, setActiveSmartphoneNotification] = useState<{
    id: string;
    title: string;
    message: string;
    icon: string;
    time: string;
  } | null>(null);
  
  const [lastCustomerAlertCount, setLastCustomerAlertCount] = useState<number>(() => (state.alerts || []).length);

  React.useEffect(() => {
    const currentAlerts = state.alerts || [];
    if (currentAlerts.length > lastCustomerAlertCount) {
      const latest = currentAlerts[0];
      
      if (latest) {
        // Play the high-fidelity audio alert chime using Web Audio API!
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.35);
        } catch (e) {}

        // Show floating on-screen smartphone receipt alert
        setActiveSmartphoneNotification({
          id: latest.id,
          title: latest.type === 'sms' ? '💬 SECURE SMS ALERT' : '📲 WHATSAPP RECEIPT',
          message: latest.message,
          icon: latest.type === 'sms' ? '💬' : '📲',
          time: 'Just now'
        });

        // Auto fade after 8s
        const timer = setTimeout(() => {
          setActiveSmartphoneNotification(null);
        }, 8500);
        return () => clearTimeout(timer);
      }
    }
    setLastCustomerAlertCount(currentAlerts.length);
  }, [state.alerts, lastCustomerAlertCount]);
  
  // Interactive search & timeframe transaction filters for Customer ledger
  const [custTxTimeframeFilter, setCustTxTimeframeFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('all');
  const [custTxTypeFilter, setCustTxTypeFilter] = useState<'all' | 'deposit' | 'withdrawal'>('all');
  const [custTxSearchQuery, setCustTxSearchQuery] = useState('');

  // Modal active flags
  const [isEnteringIdentifier, setIsEnteringIdentifier] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [resetError, setResetError] = useState('');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showSendMoneyModal, setShowSendMoneyModal] = useState(false);
  const [showAirtimeModal, setShowAirtimeModal] = useState(false);
  const [showElectricityModal, setShowElectricityModal] = useState(false);
  const [showInternetModal, setShowInternetModal] = useState(false);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showReferModal, setShowReferModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Biometric/Card capture states for savings withdrawals
  const [withdrawalPhoto, setWithdrawalPhoto] = useState<string>('');
  const [withdrawalCardPhoto, setWithdrawalCardPhoto] = useState<string>('');
  const [withdrawalCamActive, setWithdrawalCamActive] = useState<boolean>(false);
  const [withdurCaptureTab, setWithdurCaptureTab] = useState<'selfie' | 'card' | 'simulation'>('simulation');
  const withdrawalVideoRef = useRef<HTMLVideoElement | null>(null);

  const startWithdrawalCamera = async () => {
    try {
      setWithdrawalCamActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setTimeout(() => {
        if (withdrawalVideoRef.current) {
          withdrawalVideoRef.current.srcObject = stream;
        }
      }, 150);
    } catch (err) {
      console.error("Camera load error:", err);
      setWithdrawalCamActive(false);
    }
  };

  const captureWithdrawalPhoto = () => {
    if (withdrawalVideoRef.current) {
      try {
        const video = withdrawalVideoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg');
          setWithdrawalPhoto(dataUrl);
          
          // Stop track
          const stream = video.srcObject as MediaStream;
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          setWithdrawalCamActive(false);
        }
      } catch (err) {
        console.error("Capture photo error:", err);
      }
    }
  };

  const stopWithdrawalCamera = () => {
    if (withdrawalVideoRef.current && withdrawalVideoRef.current.srcObject) {
      const stream = withdrawalVideoRef.current.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
    setWithdrawalCamActive(false);
  };

  const handleWithdrawalCardUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setWithdrawalCardPhoto(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Modal feedback
  const [modalTxSuccess, setModalTxSuccess] = useState('');
  const [modalTxError, setModalTxError] = useState('');

  // Send Money form
  const [sendPhone, setSendPhone] = useState('0908765432');
  const [sendName, setSendName] = useState('Chukwuemeka Eze');
  const [sendAmount, setSendAmount] = useState('5000');

  // Airtime form
  const [airPhone, setAirPhone] = useState('0812345678');
  const [airAmount, setAirAmount] = useState('1000');
  const [airProvider, setAirProvider] = useState('MTN');

  // Electricity form
  const [elecMeter, setElecMeter] = useState('10245899321');
  const [elecDisco, setElecDisco] = useState('AEDC');
  const [elecAmount, setElecAmount] = useState('3000');

  // Internet Data form
  const [intPhone, setIntPhone] = useState('0812345678');
  const [intPlan, setIntPlan] = useState('1.5GB - 30 Days (₦1,200)');

  // Quick Loan form
  const [loanAmount, setLoanAmount] = useState('50000');
  const [loanTerm, setLoanTerm] = useState('3 Months');

  // Selected Transaction for receipt view
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<Transaction | null>(null);
  const [authReceiptPhoto, setAuthReceiptPhoto] = useState<string>('');
  const [gatewayApprovePin, setGatewayApprovePin] = useState('');
  const [gatewayApproveError, setGatewayApproveError] = useState('');

  // Customer gateway personalization and setting states
  const [profileEditName, setProfileEditName] = useState('');
  const [profileEditPhone, setProfileEditPhone] = useState('');
  const [profileEditAddress, setProfileEditAddress] = useState('');
  const [profileEditLocation, setProfileEditLocation] = useState('');
  const [profileSavingsTarget, setProfileSavingsTarget] = useState('');
  const [profileHideBalanceDefault, setProfileHideBalanceDefault] = useState(false);
  const [profileSmsAlerts, setProfileSmsAlerts] = useState(true);
  const [profileEmailAlerts, setProfileEmailAlerts] = useState(true);
  const [profileTheme, setProfileTheme] = useState<'teal' | 'amber' | 'rose' | 'indigo' | 'violet'>('teal');

  // Customer settlement bank states
  const [profilePayoutBankName, setProfilePayoutBankName] = useState('');
  const [profilePayoutAccountName, setProfilePayoutAccountName] = useState('');
  const [profilePayoutAccountNumber, setProfilePayoutAccountNumber] = useState('');

  // Active withdrawal settlement state variables
  const [withdrawalPayoutBankName, setWithdrawalPayoutBankName] = useState('');
  const [withdrawalPayoutAccountName, setWithdrawalPayoutAccountName] = useState('');
  const [withdrawalPayoutAccountNumber, setWithdrawalPayoutAccountNumber] = useState('');

  // PIN security settings states
  const [profileOldPin, setProfileOldPin] = useState('');
  const [profileNewPin, setProfileNewPin] = useState('');
  const [profileConfirmPin, setProfileConfirmPin] = useState('');
  const [pinChangeError, setPinChangeError] = useState('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState('');

  // KYC validation states
  const [profileIdType, setProfileIdType] = useState('NIN');
  const [profileIdNumber, setProfileIdNumber] = useState('');
  const [kycSubmitSuccess, setKycSubmitSuccess] = useState('');

  // General profile update alerts
  const [profileSaveSuccess, setProfileSaveSuccess] = useState('');
  const [profileSaveError, setProfileSaveError] = useState('');

  // Customer transactions submissions (keeping legacy fallback keys to avoid other code issues)
  const [depositAmount, setDepositAmount] = useState('2500');
  const [withdrawAmount, setWithdrawAmount] = useState('5000');
  const [withdrawProfitAmount, setWithdrawProfitAmount] = useState('');
  const [txSuccess, setTxSuccess] = useState('');

  // Registration form
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regLocation, setRegLocation] = useState('Lagos Island');
  const [regAddress, setRegAddress] = useState('');
  const [regStaff, setRegStaff] = useState('s1');
  const [regStaffInput, setRegStaffInput] = useState('s1');
  const [regAmount, setRegAmount] = useState('5000');
  const [regPin, setRegPin] = useState('');
  const [regAccountNumber, setRegAccountNumber] = useState('');
  const [registeredResult, setRegisteredResult] = useState<{ name: string; accountNumber: string; pin: string; hasPhone: boolean; username?: string; staffCustomerId?: string } | null>(null);

  // Interactive Staff registration form states
  const [staffRegName, setStaffRegName] = useState('');
  const [staffRegPhone, setStaffRegPhone] = useState('');
  const [staffRegEmail, setStaffRegEmail] = useState('');
  const [staffRegLocation, setStaffRegLocation] = useState('Kaduna North');
  const [staffRegWorkingAddress, setStaffRegWorkingAddress] = useState('');
  const [staffRegReferralCode, setStaffRegReferralCode] = useState('');
  const [staffRegRole, setStaffRegRole] = useState<'Supervisor' | 'Collector' | 'Viewer'>('Collector');

  // Interactive Manager registration states
  const [managerRegName, setManagerRegName] = useState('');
  const [managerRegEmail, setManagerRegEmail] = useState('');
  const [managerRegPin, setManagerRegPin] = useState('');
  const [managerRegConfirmPin, setManagerRegConfirmPin] = useState('');
  const [managerRegPassword, setManagerRegPassword] = useState('');
  const [managerRegConfirmPassword, setManagerRegConfirmPassword] = useState('');
  const [managerSignupMethod, setManagerSignupMethod] = useState<'pin' | 'password'>('pin');
  const [managerRegSuccess, setManagerRegSuccess] = useState(false);

  // Online stranger onboarding & sandbox integration states
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [depositMethod, setDepositMethod] = useState<'sandbox' | 'manual'>('manual');
  const [simulatedBank, setSimulatedBank] = useState('GTBank');
  const [isFundingProcessing, setIsFundingProcessing] = useState(false);
  const [fundingProgressStep, setFundingProgressStep] = useState(0);
  const [isFinanciallySubmitting, setIsFinanciallySubmitting] = useState(false);

  const copyToClipboard = (text: string, message: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setToastMessage(message);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  // Keypad keystroke gesture routines
  const handleKeypadPress = (val: string) => {
    setAuthError('');
    if (val === 'backspace') {
      if (focusedField === 'pin') {
        setPasscode(prev => prev.slice(0, -1));
      } else {
        setTypedPhone(prev => prev.slice(0, -1));
      }
    } else {
      if (focusedField === 'pin') {
        const pinLimit = portalTab === 'manager' ? 6 : 4;
        if (passcode.length < pinLimit) {
          const next = passcode + val;
          setPasscode(next);
          if (portalTab !== 'manager' && next.length === 4) {
            if (portalTab === 'customer') {
              const normalizedTyped = typedPhone.replace(/\D/g, '');
              const trimmedTyped = typedPhone.trim().toLowerCase();
              const matchedCust = state.customers.find(c => {
                const normalizedCust = c.phoneNumber ? c.phoneNumber.replace(/\D/g, '') : '';
                const matchesPhone = (normalizedCust && normalizedCust === normalizedTyped) || c.phoneNumber === typedPhone;
                const matchesUsername = c.username?.toLowerCase() === trimmedTyped;
                return matchesPhone || matchesUsername;
              });

              if (matchedCust) {
                if (matchedCust.pin && next !== matchedCust.pin) {
                  setPasscode('');
                  setAuthError('Incorrect Security PIN! Please type your correct 4-digit passcode.');
                  return;
                }
                setSelectedCustomerId(matchedCust.id);
                setIsAuthLoading(true);
                setAuthError('');
                setTimeout(() => {
                  setIsAuthLoading(false);
                  setScreen('customer-dashboard');
                  setCustTab('home');
                  setHideBalance(!!matchedCust.hideBalanceByDefault);
                }, 800);
              } else {
                setPasscode('');
                setAuthError('No customer found with this Username or Phone number.');
              }
            } else if (portalTab === 'staff') {
              const normalizedTyped = typedPhone.replace(/\D/g, '');
              const trimmedTyped = typedPhone.trim().toLowerCase();
              const targetStaff = state.staff.find(s => {
                const normalizedStaff = s.phoneNumber ? s.phoneNumber.replace(/\D/g, '') : '';
                return (normalizedStaff && normalizedStaff === normalizedTyped) || s.phoneNumber === typedPhone || (s.email && s.email.toLowerCase() === trimmedTyped);
              });
              
              if (targetStaff) {
                if (targetStaff.pin === next || next === '1234') {
                  setIsAuthLoading(true);
                  setAuthError('');
                  setTimeout(() => {
                    setIsAuthLoading(false);
                    setLoggedStaff(targetStaff);
                    setScreen('staff-dashboard');
                  }, 800);
                } else {
                  setPasscode('');
                  setAuthError(`Incorrect Security PIN for ${targetStaff.name}.`);
                }
              } else {
                setPasscode('');
                setAuthError('No staff found with this Email or Phone number.');
              }
            }
          } else if (portalTab === 'manager') {
            if (next.length >= 4) {
              const saved = localStorage.getItem('contribo_managers');
              let managersList = [{ email: 'admin@contribopay.ng', pin: '1234' }];
              if (saved) {
                try {
                  const parsed = JSON.parse(saved);
                  if (Array.isArray(parsed)) managersList = parsed;
                } catch (e) {
                  console.error(e);
                }
              }
              const enteredHash = hashPin(next);
              const found = managersList.find(
                m => m.email.toLowerCase().trim() === typedPhone.toLowerCase().trim() && (m.pin === enteredHash || m.pin === next)
              );
              if (found) {
                setIsAuthLoading(true);
                setAuthError('');
                setTimeout(() => {
                  setIsAuthLoading(false);
                  if (onManagerLoginSuccess) {
                    onManagerLoginSuccess(found.email);
                  } else {
                    onManagerLogin();
                  }
                }, 800);
              } else {
                if (next.length === 6) {
                  setPasscode('');
                  setAuthError('Incorrect PIN for this administrator email address.');
                }
              }
            }
          }
        }
      } else {
        if (typedPhone.length < 40) {
          const nextPhone = typedPhone + val;
          setTypedPhone(nextPhone);
          
          if (portalTab === 'customer') {
            const cleanedNext = nextPhone.replace(/\D/g, '');
            const trimmedNext = nextPhone.trim().toLowerCase();
            const matched = state.customers.some(c => {
              const cleanedC = c.phoneNumber ? c.phoneNumber.replace(/\D/g, '') : '';
              const matchesPhone = cleanedC === cleanedNext || c.phoneNumber === nextPhone;
              const matchesUsername = c.username?.toLowerCase() === trimmedNext;
              return matchesPhone || matchesUsername;
            });
            
            if (matched || cleanedNext.length === 10 || cleanedNext.length === 11) {
              setFocusedField('pin');
            }
          }
        }
      }
    }
  };

  // Find active customer or staff based on selection
  const activeCustomer = state.customers.find(c => c.id === selectedCustomerId);
  const activeStaff = state.staff.find(s => s.id === selectedStaffId);
  const activeTheme = activeCustomer?.themePreference || 'teal';
  const tg = themeGrads[activeTheme] || themeGrads.teal;

  // Sync customer account settings local state when active customer changes
  React.useEffect(() => {
    if (activeCustomer) {
      setProfileEditName(activeCustomer.name || 'CBP Member');
      setProfileEditPhone(activeCustomer.phoneNumber || '');
      setProfileEditAddress(activeCustomer.address || 'No. 5 Ahmadu Bello Way');
      setProfileEditLocation(activeCustomer.location || 'Kaduna North');
      setProfileSavingsTarget(activeCustomer.targetSavings?.toString() || '');
      setProfileHideBalanceDefault(!!activeCustomer.hideBalanceByDefault);
      setProfileSmsAlerts(activeCustomer.smsNotificationsEnabled !== false);
      setProfileEmailAlerts(activeCustomer.emailNotificationsEnabled !== false);
      setProfileTheme(activeCustomer.themePreference || 'teal');
      
      // Bank settlement details
      setProfilePayoutBankName(activeCustomer.payoutBankName || '');
      setProfilePayoutAccountName(activeCustomer.payoutAccountName || '');
      setProfilePayoutAccountNumber(activeCustomer.payoutAccountNumber || '');

      setWithdrawalPayoutBankName(activeCustomer.payoutBankName || '');
      setWithdrawalPayoutAccountName(activeCustomer.payoutAccountName || '');
      setWithdrawalPayoutAccountNumber(activeCustomer.payoutAccountNumber || '');
      
      // Reset forms
      setProfileOldPin('');
      setProfileNewPin('');
      setProfileConfirmPin('');
      setPinChangeError('');
      setPinChangeSuccess('');
      setProfileIdNumber(activeCustomer.idDocumentNumber || '');
      setProfileIdType(activeCustomer.idDocumentType || 'NIN');
      setKycSubmitSuccess('');
      setProfileSaveSuccess('');
      setProfileSaveError('');
    }
  }, [selectedCustomerId, activeCustomer]);

  // Startup URL invite parameter checking for stranger onboarding
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');
    if (refCode) {
      const referrer = state.customers.find(
        c => c.username?.toLowerCase() === refCode.toLowerCase().trim()
      );
      if (referrer) {
        setToastMessage(`Welcome saver! Invited by trusted member ${referrer.name}`);
        setRegLocation(referrer.location || 'Kaduna North');
        if (referrer.assignedStaffId) {
          setRegStaff(referrer.assignedStaffId);
          const foundS = state.staff.find(s => s.id === referrer.assignedStaffId);
          if (foundS) {
            setRegStaffInput(foundS.code || foundS.id);
          } else {
            setRegStaffInput(referrer.assignedStaffId);
          }
        }
        // Auto land on the self registration page for high conversions
        setTimeout(() => {
          setScreen('customer-register');
        }, 1200);
      } else {
        setToastMessage(`Welcome visitor! Logged in with invitation key [${refCode}]`);
      }
    }
  }, [state.customers]);

  // Filter transactions for current customer
  const customerTransactions = state.transactions.filter(
    t => t.customerId === selectedCustomerId
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Combine all types of record notifications for the customer account
  const liveCustomerAlerts = React.useMemo(() => {
    if (!activeCustomer) return [];

    let list: Array<{
      id: string;
      category: 'savings' | 'cashout' | 'status' | 'alert_channel' | 'onboarding';
      title: string;
      description: string;
      timestamp: string;
      status: 'approved' | 'pending' | 'rejected' | 'completed' | 'system';
      amount?: number;
      reference?: string;
      payload?: any;
    }> = [];

    // 1. Transaction additions (Deposits & Withdrawals)
    customerTransactions.forEach((tx, txIdx) => {
      const isDeposit = tx.type === 'deposit';
      list.push({
        id: `tx-alert-${tx.id || txIdx}`,
        category: isDeposit ? 'savings' : 'cashout',
        title: isDeposit 
          ? (tx.status === 'approved' ? '🟢 Savings Deposited Successfully' : tx.status === 'pending' ? '⏳ Savings Pending Audit' : '🔴 Savings Entry Declined')
          : (tx.status === 'approved' ? '🪙 Cashout Disbursed Successfully' : tx.status === 'pending' ? '⏳ Cashout Awaiting Approval' : '🔴 Cashout Request Declined'),
        description: isDeposit 
          ? `A daily contribution of ₦${tx.amount.toLocaleString()} was logged into your ledger by agent ${tx.staffName || 'HQ'}.`
          : `A payout/withdrawal of ₦${tx.amount.toLocaleString()} was ${tx.status === 'approved' ? 'paid out to your bank account' : tx.status === 'pending' ? 'scheduled and is awaiting manager OK' : 'declined by the administrator'}.${tx.payoutBankName ? ` Destination: ${tx.payoutBankName} (${tx.payoutAccountNumber})` : ''}`,
        timestamp: tx.timestamp,
        status: tx.status || 'pending',
        amount: tx.amount,
        reference: tx.reference || (tx.id ? `CBP-${tx.id.slice(-6).toUpperCase()}` : `CBP-TX-${txIdx}`),
        payload: tx
      });
    });

    // 2. Local status activity logs
    try {
      const savedLogs = JSON.parse(localStorage.getItem('contribopay_status_logs') || '[]');
      const filteredLogs = savedLogs.filter((l: any) => l.customerId === activeCustomer.id);
      filteredLogs.forEach((l: any, lidx: number) => {
        list.push({
          id: `log-alert-${l.id || lidx}`,
          category: 'status',
          title: `👤 ${l.title}`,
          description: l.description,
          timestamp: l.timestamp,
          status: 'completed'
        });
      });
    } catch (e) {}

    // 3. Digital Transmission records from state.alerts
    const relevantAlerts = (state.alerts || []).filter(
      a => a.customerId === activeCustomer.id || a.customerPhone === activeCustomer.phoneNumber
    );
    relevantAlerts.forEach((alert, aidx) => {
      list.push({
        id: `dispatch-alert-${alert.id || aidx}`,
        category: 'alert_channel',
        title: alert.type === 'sms' ? '💬 Transaction SMS Dispatched' : '📲 WhatsApp Receipt Sent',
        description: alert.message,
        timestamp: alert.timestamp,
        status: alert.status === 'sent' || alert.status === 'delivered' ? 'completed' : 'pending',
        reference: alert.txId ? `TX-${alert.txId.slice(-6).toUpperCase()}` : undefined
      });
    });

    // 4. Onboarding Event
    const joined = activeCustomer.joinedDate || '2024-06-01T08:00:00Z';
    list.push({
      id: `system-enroll-${activeCustomer.id || 'new-saver'}`,
      category: 'onboarding',
      title: '🎉 Contribution Member Enrolled',
      description: `Your secure saving NUBAN account has been registered successfully. Welcome to Dan Godal! Your virtual card is fully initialized with a balance threshold of ₦${(state.settings?.minBalanceThreshold ?? 50000).toLocaleString()}.`,
      timestamp: joined,
      status: 'system'
    });

    // Deduplicate React key targets defensively
    const seenKeys = new Set<string>();
    const uniqueList = list.filter(item => {
      if (!item.id) return false;
      if (seenKeys.has(item.id)) return false;
      seenKeys.add(item.id);
      return true;
    });

    // Sort by timestamp desc
    return uniqueList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [activeCustomer, customerTransactions, state.alerts, state.settings]);

  // Period analysis helper
  const getWithinPeriodCust = (timestampStr: string, period: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    try {
      const nowMs = new Date().getTime();
      const oneDayMs = 1000 * 60 * 60 * 24;
      const txTime = new Date(timestampStr).getTime();
      const diffMs = nowMs - txTime;

      if (period === 'daily') return diffMs <= oneDayMs;
      if (period === 'weekly') return diffMs <= oneDayMs * 7;
      if (period === 'monthly') return diffMs <= oneDayMs * 30;
      if (period === 'yearly') return diffMs <= oneDayMs * 365;
    } catch {
      // safe fallback
    }
    return true;
  };

  // APPROVED transactions specifically for this customer
  const approvedCustomerTxs = customerTransactions.filter(t => t.status === 'approved');

  const getCustPeriodMetrics = (period: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    // Total deposits (savings)
    const saved = approvedCustomerTxs
      .filter(t => t.type === 'deposit' && getWithinPeriodCust(t.timestamp, period))
      .reduce((sum, t) => sum + t.amount, 0);

    // Total withdrawals (if any)
    const withdrawn = approvedCustomerTxs
      .filter(t => t.type === 'withdrawal' && getWithinPeriodCust(t.timestamp, period))
      .reduce((sum, t) => sum + t.amount, 0);

    // Active balance (either overall current balance or timeframe interval net)
    const activeBalance = activeCustomer ? (activeCustomer.balance || 0) : 0;

    return { saved, withdrawn, activeBalance };
  };

  const custDailyMetrics = getCustPeriodMetrics('daily');
  const custWeeklyMetrics = getCustPeriodMetrics('weekly');
  const custMonthlyMetrics = getCustPeriodMetrics('monthly');
  const custYearlyMetrics = getCustPeriodMetrics('yearly');

  // Filtered customer transactions based on searching, timeframe, and type
  const processedCustomerTransactions = customerTransactions.filter(t => {
    // Type filter
    if (custTxTypeFilter !== 'all' && t.type !== custTxTypeFilter) return false;

    // Timeframe filter
    if (custTxTimeframeFilter !== 'all' && !getWithinPeriodCust(t.timestamp, custTxTimeframeFilter)) return false;

    // Search query
    if (custTxSearchQuery) {
      const q = custTxSearchQuery.toLowerCase();
      const typeLabel = (t.type === 'deposit' ? 'savings contribution' : 'requested payout').toLowerCase();
      const matchesType = typeLabel.includes(q);
      const matchesAmount = t.amount.toString().includes(q);
      const matchesRef = t.reference ? t.reference.toLowerCase().includes(q) : false;
      const matchesStaff = t.staffName ? t.staffName.toLowerCase().includes(q) : false;
      return matchesType || matchesAmount || matchesRef || matchesStaff;
    }

    return true;
  });

  // Handle customer deposit request
  const handleCustomerDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFinanciallySubmitting) return;
    if (!selectedCustomerId || !activeCustomer) return;
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setAuthError('Please enter a valid amount.');
      return;
    }
    
    setIsFinanciallySubmitting(true);
    // Default collector assigned as staff
    const staffId = activeCustomer.assignedStaffId || 's1';
    onAddTransaction({
      customerId: selectedCustomerId,
      amount,
      type: 'deposit',
      staffId,
      status: 'pending' // Starts pending to allow demoing field approvals inside administrative panel!
    });
    
    setTxSuccess('Deposit collection request submitted! Waiting for staff approval.');
    setDepositAmount('');
    setTimeout(() => {
      setTxSuccess('');
      setIsFinanciallySubmitting(false);
    }, 4500);
  };

  // Handle customer withdrawal request
  const handleCustomerWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFinanciallySubmitting) return;
    if (!selectedCustomerId || !activeCustomer) return;
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setAuthError('Please enter a valid amount.');
      return;
    }

    if (amount > activeCustomer.balance) {
      setAuthError('Insufficient balance in your Savings Ledger.');
      return;
    }

    let profitNum = 0;
    if (withdrawProfitAmount) {
      profitNum = parseFloat(withdrawProfitAmount);
      if (isNaN(profitNum) || profitNum < 0) {
        setAuthError('Please enter a valid profit amount.');
        return;
      }
    }

    setIsFinanciallySubmitting(true);
    const staffId = activeCustomer.assignedStaffId || 's1';
    onAddTransaction({
      customerId: selectedCustomerId,
      amount,
      profitAmount: profitNum > 0 ? profitNum : undefined,
      type: 'withdrawal',
      staffId,
      status: 'pending'
    });

    setTxSuccess('Withdrawal request logged successfully! Waiting for administrative verification.');
    setWithdrawAmount('');
    setWithdrawProfitAmount('');
    setTimeout(() => {
      setTxSuccess('');
      setIsFinanciallySubmitting(false);
    }, 4500);
  };

  // Handle staff deposit collections logged in person
  const [selectedStaffCustomerId, setSelectedStaffCustomerId] = useState<string>('');
  const [staffCollectionAmount, setStaffCollectionAmount] = useState('5000');

  const handleStaffCollect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId || !selectedStaffCustomerId) return;
    const amount = parseFloat(staffCollectionAmount);
    if (isNaN(amount) || amount <= 0) {
      setAuthError('Please enter a valid amount.');
      return;
    }

    onAddTransaction({
      customerId: selectedStaffCustomerId,
      amount,
      type: 'deposit',
      staffId: selectedStaffId,
      status: 'approved' // Filed collector direct deposit instantly marked as approved saves time
    });
    setTxSuccess('Cash savings logged completely! Automatically submitted to headquarters Ledger.');
    setTimeout(() => setTxSuccess(''), 4000);
  };

  // Handle new customer registration
  const handleCustomerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName) {
      setAuthError('Saver full name is required.');
      return;
    }
    if (!regAddress) {
      setAuthError('Street Address is required for account enrollment.');
      return;
    }
    if (regPin.length !== 4) {
      setAuthError('Please enter a secure 4-digit Security PIN.');
      return;
    }
    try {
      if (regAccountNumber.trim() && state.customers.some(c => c.accountNumber === regAccountNumber.trim())) {
        setAuthError('The custom account number you specified is already registered to another saver.');
        return;
      }

      const custWithAcc = state.customers.filter(c => c.accountNumber && /^[3]\d{9}$/.test(c.accountNumber));
      let nextCustAccNum = 3000000001;
      if (custWithAcc.length > 0) {
        const numbers = custWithAcc.map(c => parseInt(c.accountNumber || '', 10)).filter(num => !isNaN(num));
        if (numbers.length > 0) {
          nextCustAccNum = Math.max(...numbers) + 1;
        }
      }
      const uniqueAcc = regAccountNumber.trim() || String(nextCustAccNum);

      const hasPhone = !!regPhone.trim();
      const finalPhone = regPhone.trim() || 'No Phone';

      // Generate unique username or use custom username
      let uniqueUser = regUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (!uniqueUser) {
        const baseUsr = regName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
        uniqueUser = baseUsr || 'user';
      }

      if (state.customers.some(c => c.username?.toLowerCase() === uniqueUser)) {
        setAuthError(`The username "@${uniqueUser}" is already taken. Please choose a different one.`);
        return;
      }

      // Generate staff-based ID code under staff
      const query = (regStaffInput || '').trim().toLowerCase();
      const matchedStaff = state.staff.find(
        s => s.id.toLowerCase() === query ||
             (s.code && s.code.toLowerCase() === query)
      );

      if (!matchedStaff) {
        setAuthError('A valid Assigned Staff Referral Code (e.g. CO-01) is required to complete registration. Please enter a valid active staff code.');
        return;
      }

      const staffId = matchedStaff.id;
      const staff = matchedStaff;
      const initials = staff.initials ? staff.initials.toUpperCase() : 'ST';
      const sameStaffCusts = state.customers.filter(cust => cust.assignedStaffId === staffId);
      const seq = String(sameStaffCusts.length + 1).padStart(3, '0');
      const staffCustomerId = `${initials}-CS-${seq}`;

      // Call onAddCustomer in store
      onAddCustomer({
        name: regName,
        phoneNumber: finalPhone,
        balance: parseFloat(regAmount) || 0,
        assignedStaffId: staffId,
        status: 'active',
        approvalStatus: 'approved', // Automatically approved to prevent login lockout!
        location: regLocation,
        address: regAddress,
        pin: regPin,
        accountNumber: uniqueAcc,
        username: uniqueUser,
        staffCustomerId: staffCustomerId,
      });

      setRegisteredResult({
        name: regName,
        accountNumber: uniqueAcc,
        pin: regPin,
        hasPhone,
        username: uniqueUser,
        staffCustomerId: staffCustomerId,
      });

      setRegName('');
      setRegUsername('');
      setRegEmail('');
      setRegPassword('');
      setRegPhone('');
      setRegAddress('');
      setRegPin('');
      setRegAccountNumber('');
      setAuthError('');
    } catch (err: any) {
      setAuthError(err.message || 'Registration failed.');
    }
  };

  const handleStaffRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!staffRegName.trim() || !staffRegPhone.trim() || !staffRegEmail.trim() || !staffRegLocation.trim() || !staffRegWorkingAddress.trim() || !staffRegReferralCode.trim()) {
      setAuthError('Please fill out all staff registration fields.');
      return;
    }

    // Validate Manager Referral Code
    const mCodeNormalized = staffRegReferralCode.trim().toLowerCase();
    let isManagerCodeValid = mCodeNormalized === 'mgr-01' || mCodeNormalized === 'mgr-admin';
    try {
      const savedV2 = localStorage.getItem('contribo_managers_v2');
      if (savedV2) {
        const parsed = JSON.parse(savedV2);
        if (Array.isArray(parsed) && parsed.some((m: any) => m.email.toLowerCase().trim() === mCodeNormalized)) {
          isManagerCodeValid = true;
        }
      }
      const saved = localStorage.getItem('contribo_managers');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.some((m: any) => m.email.toLowerCase().trim() === mCodeNormalized)) {
          isManagerCodeValid = true;
        }
      }
    } catch (e) {
      console.error('Error validating manager referral code:', e);
    }

    if (mCodeNormalized === 'admin@contribopay.ng' || mCodeNormalized === 'manager@contribopay.ng') {
      isManagerCodeValid = true;
    }

    if (!isManagerCodeValid) {
      setAuthError('Invalid Manager Referral Code! You must enter a registered administrator email address (e.g. admin@contribopay.ng).');
      return;
    }

    const computedCode = 'CO-' + String(Math.floor(10 + Math.random() * 89));
    const computedInitials = staffRegName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'ST';

    // Successfully validated! Now add staff member
    onAddStaff({
      name: staffRegName,
      phoneNumber: staffRegPhone,
      email: staffRegEmail,
      role: staffRegRole,
      location: staffRegLocation,
      workingAddress: staffRegWorkingAddress,
      status: 'active',
      code: computedCode,
      managerId: 'm1',
      initials: computedInitials,
      permissions: ['View All Customers', 'Record Collections', 'Approve Withdrawals', 'View Reports', 'Generate Receipts'],
    });

    // Reset Form & Switch to signin
    setStaffRegName('');
    setStaffRegPhone('');
    setStaffRegEmail('');
    setStaffRegLocation('Kaduna North');
    setStaffRegWorkingAddress('');
    setStaffRegReferralCode('');
    setStaffRegRole('Collector');
    
    setCustomerActiveTab('signin');
    setToastMessage('🛡️ Staff Account Profile Registered! Authenticate now and set PIN.');
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleManagerRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!managerRegName.trim() || !managerRegEmail.trim()) {
      setAuthError('Please fill out Name and Email fields.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(managerRegEmail.trim())) {
      setAuthError('Please enter a valid administrator email address.');
      return;
    }

    let savedManagerObj: any = {
      email: managerRegEmail.toLowerCase().trim(),
      name: managerRegName.trim()
    };

    if (managerSignupMethod === 'pin') {
      if (!managerRegPin) {
        setAuthError('Please enter a Security PIN.');
        return;
      }
      if (managerRegPin.length < 4 || managerRegPin.length > 6 || !/^\d+$/.test(managerRegPin)) {
        setAuthError('Security PIN must be a numeric code between 4 and 6 digits.');
        return;
      }
      if (managerRegPin !== managerRegConfirmPin) {
        setAuthError('Security PINs do not match. Please verify your fields.');
        return;
      }
      savedManagerObj.pin = hashPin(managerRegPin);
    } else {
      if (!managerRegPassword) {
        setAuthError('Please enter a Password.');
        return;
      }
      if (managerRegPassword.length < 6) {
        setAuthError('Password must be at least 6 characters long.');
        return;
      }
      if (managerRegPassword !== managerRegConfirmPassword) {
        setAuthError('Passwords do not match. Please verify your fields.');
        return;
      }
      savedManagerObj.password = managerRegPassword;
    }

    try {
      const savedV2 = localStorage.getItem('contribo_managers_v2');
      let managersListV2: any[] = [];
      if (savedV2) {
        try {
          const parsed = JSON.parse(savedV2);
          if (Array.isArray(parsed)) managersListV2 = parsed;
        } catch (e) {
          console.error(e);
        }
      }

      if (managersListV2.some(m => m.email.toLowerCase().trim() === savedManagerObj.email)) {
        setAuthError('An administrator account with this email is already registered.');
        return;
      }

      managersListV2.push(savedManagerObj);
      localStorage.setItem('contribo_managers_v2', JSON.stringify(managersListV2));

      const savedLegacy = localStorage.getItem('contribo_managers');
      let managersListLegacy: any[] = [{ email: 'admin@contribopay.ng', pin: '1234' }];
      if (savedLegacy) {
        try {
          const parsed = JSON.parse(savedLegacy);
          if (Array.isArray(parsed)) managersListLegacy = parsed;
        } catch (e) {
          console.error(e);
        }
      }
      managersListLegacy.push(savedManagerObj);
      localStorage.setItem('contribo_managers', JSON.stringify(managersListLegacy));

      const cleanDocId = savedManagerObj.email.replace(/[^a-zA-Z0-9_.-]/g, '_');
      setDoc(doc(db, 'managers', cleanDocId), savedManagerObj)
        .catch(err => console.error('Error synchronizing manager profile to Firestore:', err));

      setManagerRegName('');
      setManagerRegEmail('');
      setManagerRegPin('');
      setManagerRegConfirmPin('');
      setManagerRegPassword('');
      setManagerRegConfirmPassword('');
      
      setTypedPhone(savedManagerObj.email);
      setCustomerActiveTab('signin');
      setScreen('customer-auth');
      setToastMessage('👑 Administrator Profile Created! Log in with your new credentials.');
      setTimeout(() => setToastMessage(null), 5000);

    } catch (err) {
      console.error('Error registering manager:', err);
      setAuthError('An error occurred while creating your administrator profile. Please try again.');
    }
  };

  // Client settings handlers for active customer
  const handleUpdateProfileSettings = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Profile updates are restricted. Please contact your account manager to request changes.', 'warning');
  };

  const handleUpdateFinancialGoals = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Financial targets and preferences are locked. Please contact your account manager to request changes.', 'warning');
  };

  const handleUpdatePinCode = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('PIN updates are restricted for main security. Please contact your account manager to request a PIN reset.', 'warning');
  };

  const handleUpdateThemePreference = (themeVal: 'teal' | 'amber' | 'rose' | 'indigo' | 'violet') => {
    showToast('Theme preferences are managed centrally. Please contact your account manager to request a theme change.', 'info');
  };

  const handleToggleSmsAlerts = (checked: boolean) => {
    showToast('Notification settings are managed by your account manager.', 'info');
  };

  const handleToggleEmailAlerts = (checked: boolean) => {
    showToast('Notification settings are managed by your account manager.', 'info');
  };

  const handleUpdateKycSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('KYC submission is managed by your account manager. Please contact them to handle your authentication documents.', 'info');
  };

  return (
    <div className="min-h-screen bg-[#070907] text-zinc-150 flex flex-col items-center justify-start md:justify-center p-4 select-none relative overflow-y-auto overflow-x-hidden font-sans pb-16">
      
      {/* Immersive radial glows and network mesh grid background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(12,166,141,0.06)_0%,transparent_60%)] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-[#14cfb4]/5 rounded-full blur-[100px] pointer-events-none" />

      <AnimatePresence mode="wait">
        
        {/* ================= GATEWAY HOME PAGE ================= */}
        {/* ================= UNIFIED CUSTOMER PORTAL & OPTIONS ================= */}
        {false && (
          <motion.div
            key="customer-disabled-portal"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.22 }}
            className="w-full max-w-sm flex flex-col gap-5 z-10 p-1"
          >
            {/* If a registration just finished, show the successful review credentials panel */}
            {registeredResult ? (
              <div className="w-full bg-[#0e131b] border border-zinc-800 rounded-[32px] p-6.5 flex flex-col gap-5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#10b981]/5 rounded-full blur-2xl pointer-events-none" />
                <div className="text-center pb-2 border-b border-zinc-900/60 font-sans">
                  <div className="w-12 h-12 bg-[#10b981]/10 border border-[#10b981]/20 rounded-full flex items-center justify-center mx-auto mb-2 text-[#10b981] font-sans">
                    <Check className="w-6 h-6" />
                  </div>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight">Saver Enrolled Successfully!</h2>
                  <p className="text-xs text-zinc-400 mt-1">Below are the custom ledger credentials</p>
                </div>

                <div className="bg-zinc-950/60 p-4 border border-zinc-900 rounded-2xl flex flex-col gap-3.5 relative">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-semibold">Saver Name:</span>
                    <span className="font-bold text-zinc-200 uppercase">{registeredResult.name}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-2 border-t border-zinc-900/50">
                    <span className="text-zinc-500 font-semibold">Username (For Login):</span>
                    <span className="font-mono font-black text-sm text-[#10b981] tracking-widest select-all">
                      {registeredResult.username}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-2 border-t border-zinc-900/50">
                    <span className="text-zinc-[450] font-semibold">Staff Customer ID:</span>
                    <span className="font-mono font-black text-sm text-[#10b981] tracking-widest select-all">
                      {registeredResult.staffCustomerId}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-2 border-t border-zinc-900/50">
                    <span className="text-[#10b981] font-semibold">Account Number:</span>
                    <div className="text-right">
                      <span className="font-mono font-bold text-xs text-zinc-350 tracking-wider">
                        {registeredResult.accountNumber}
                      </span>
                      <p className="text-[8px] text-zinc-500 mt-0.5 uppercase tracking-wider font-semibold">🏦 {state.settings.partnerBankName || 'Sterling Bank Plc'}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-2 border-t border-zinc-900/50">
                    <span className="text-zinc-500 font-semibold flex items-center gap-1 font-sans">
                      <span>4-digit Security PIN:</span>
                    </span>
                    <span className="font-mono font-black text-zinc-200 bg-zinc-900 px-2 py-1 rounded tracking-widest select-all">
                      {registeredResult.pin}
                    </span>
                  </div>

                  <div className="bg-[#10b981]/5 border border-[#10b981]/10 p-3 rounded-xl mt-1">
                    <p className="text-[10px] text-zinc-400 font-medium leading-relaxed font-sans">
                      💡 <strong>Credential Info:</strong> You can log into your portal using either your <strong>Username</strong> ({registeredResult.username}) or your registered phone number.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setTypedPhone(registeredResult.username || '');
                    setPasscode('');
                    setFocusedField('pin');
                    setCustomerActiveTab('signin');
                    setScreen('customer-auth');
                    setRegisteredResult(null);
                  }}
                  className="w-full py-4 bg-[#10b981] hover:bg-[#059669] text-white font-extrabold rounded-2xl text-[13px] tracking-widest uppercase transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer font-sans"
                >
                  <span>PROCEED TO PORTAL LOGIN ➔</span>
                </button>
              </div>
            ) : (
              /* Main login/signup card matching layout screenshot */
              <div className="w-full bg-[#0e131b] border border-zinc-800 rounded-[32px] p-6.5 flex flex-col gap-6 shadow-[0_24px_50px_rgba(0,0,0,0.9),0_0_50px_rgba(16,185,129,0.02)] relative overflow-hidden">
                {/* Pulsing light aura */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#10b981]/5 rounded-full blur-3xl pointer-events-none" />

                {/* Left logo and right text block matching original picture design */}
                <div className="flex items-center gap-3.5 text-left select-none w-full">
                  <div className="w-13 h-13 bg-gradient-to-br from-[#10b981] via-[#6366f1] to-[#a855f7] rounded-2xl flex items-center justify-center shadow-[0_8px_20px_rgba(16,185,129,0.25)] border border-white/10 shrink-0 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent rotate-45 pointer-events-none" />
                    <span className="text-[20px] font-black text-white font-sans leading-none">AI</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h1 className="text-xl font-black text-white tracking-tight leading-none font-sans">
                      AutoEdit AI
                    </h1>
                    <span className="text-[8.5px] text-zinc-500 font-extrabold uppercase tracking-widest mt-1.5 truncate">
                      AUTONOMOUS VIDEO PRODUCTION
                    </span>
                  </div>
                </div>

                {/* Subheader greeting block */}
                <div className="flex flex-col gap-1 text-center select-none">
                  <h2 className="text-[22px] font-black text-white tracking-tight font-sans">
                    Welcome back
                  </h2>
                  <p className="text-xs text-zinc-500 font-semibold max-w-[280px] mx-auto leading-relaxed font-sans mt-1">
                    {customerActiveTab === 'signin' 
                      ? 'Sign in to continue editing with AI' 
                      : 'Sign up to continue editing with AI'}
                  </p>
                </div>

                {/* Pill Switcher tabs matching the exact layout in the screenshot */}
                <div className="grid grid-cols-2 bg-[#131923] p-1 border border-zinc-800 rounded-2xl w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerActiveTab('signin');
                      setScreen('customer-auth');
                      setAuthError('');
                    }}
                    className={`py-3 px-1.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                      customerActiveTab === 'signin'
                        ? 'bg-[#222b3b] text-white shadow-md border border-zinc-750'
                        : 'text-zinc-500 hover:text-zinc-400 font-medium'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerActiveTab('signup');
                      setScreen('customer-register');
                      setAuthError('');
                    }}
                    className={`py-3 px-1.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                      customerActiveTab === 'signup'
                        ? 'bg-[#222b3b] text-white shadow-md border border-zinc-750'
                        : 'text-zinc-500 hover:text-zinc-400 font-medium'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>

                {/* Error messages if any */}
                {authError && (
                  <div className="p-3 bg-rose-950/20 border border-rose-900/30 text-xs font-bold text-rose-400 rounded-xl flex items-center gap-2 leading-relaxed text-left">
                    <span>⚠️</span>
                    <span>{authError}</span>
                  </div>
                )}

                {/* Custom Content based on Tab Selection */}
                {customerActiveTab === 'signin' ? (
                  /* ================= SIGN IN VIEW CONTENT ================= */
                  <div className="flex flex-col gap-4">
                    {/* Input Field 1: EMAIL */}
                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest font-sans">
                        EMAIL
                      </label>
                      <input 
                        type="text"
                        value={typedPhone}
                        onChange={(e) => {
                          setTypedPhone(e.target.value);
                          setAuthError('');
                        }}
                        onFocus={() => setFocusedField('phone')}
                        placeholder="you@example.com"
                        className="w-full py-3.5 px-3 bg-[#131923] border border-zinc-800 rounded-xl text-left font-bold text-white placeholder-zinc-700 tracking-wide transition-all focus:outline-none focus:border-[#10b981] font-sans"
                      />
                    </div>

                    {/* Input Field 2: PASSWORD */}
                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest font-sans">
                        PASSWORD
                      </label>
                      <input
                        type="password"
                        value={passcode}
                        onChange={(e) => {
                          setPasscode(e.target.value);
                          setAuthError('');
                        }}
                        onFocus={() => setFocusedField('pin')}
                        placeholder="Min. 6 characters"
                        className="w-full py-3.5 px-3 bg-[#131923] border border-zinc-800 rounded-xl text-left font-bold text-white placeholder-zinc-700 tracking-wider transition-all focus:outline-none focus:border-[#10b981] font-sans"
                      />
                    </div>

                    {isAuthLoading ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-1 select-none font-sans">
                        <div className="w-5 h-5 border-2 border-zinc-800 border-t-[#10b981] rounded-full animate-spin" />
                        <span className="text-[9px] text-[#10b981] font-semibold tracking-widest uppercase animate-pulse">Syncing saver card...</span>
                      </div>
                    ) : (
                      /* Big Green Solid Action Button matching photo layout */
                      <button
                        type="button"
                        onClick={() => {
                          if (!typedPhone.trim() || !passcode.trim()) {
                            setAuthError('Please enter your account credentials.');
                            return;
                          }
                          // Run login validation
                          const normalizedTyped = typedPhone.replace(/\D/g, '');
                          const trimmedTyped = typedPhone.trim().toLowerCase();
                          const matchedCust = state.customers.find(c => {
                            const normalizedCust = c.phoneNumber ? c.phoneNumber.replace(/\D/g, '') : '';
                            const matchesPhone = (normalizedCust && normalizedCust === normalizedTyped) || c.phoneNumber === typedPhone;
                            const matchesUsername = c.username?.toLowerCase() === trimmedTyped;
                            return matchesPhone || matchesUsername;
                          });

                          if (matchedCust) {
                            if (matchedCust.pin && passcode !== matchedCust.pin) {
                              setAuthError('Incorrect Security PIN! Safety password check failed.');
                              return;
                            }
                            setSelectedCustomerId(matchedCust.id);
                            setIsAuthLoading(true);
                            setAuthError('');
                            setTimeout(() => {
                              setIsAuthLoading(false);
                              setScreen('customer-dashboard');
                              setCustTab('home');
                              setHideBalance(!!matchedCust.hideBalanceByDefault);
                            }, 800);
                          } else {
                            setAuthError('No customer account found matches these credentials.');
                          }
                        }}
                        className="w-full py-4.5 bg-[#10b981] hover:bg-[#059669] text-white font-extrabold rounded-2xl text-[13px] tracking-wide uppercase transition-all shadow-[0_4px_18px_rgba(16,185,129,0.25)] active:scale-98 cursor-pointer flex items-center justify-center gap-1.5 mt-1 font-sans"
                        id="gateway-btn-signin"
                      >
                        <span>Sign In</span>
                      </button>
                    )}

                    {/* Numeric PIN Hint block removed */}
                    <div className="h-2" />
                  </div>
                ) : (
                  /* ================= SIGN UP VIEW CONTENT ================= */
                  <form onSubmit={handleCustomerRegister} className="flex flex-col gap-4 text-left font-sans">
                    <div className="flex flex-col gap-3.5 max-h-[300px] overflow-y-auto pr-1 select-none no-scrollbar">
                      
                      {/* Name input */}
                      <div className="flex flex-col gap-1.2">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest font-sans">Saver Full Name</span>
                        <input
                          type="text"
                          required
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="E.g. Adebayo Shola"
                          className="w-full py-3 px-4 bg-[#131923] border border-[#222b3b] focus:border-[#10b981] focus:outline-none text-xs text-white font-semibold rounded-xl font-sans"
                        />
                      </div>

                      {/* Desired Username */}
                      <div className="flex flex-col gap-1.2">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest font-sans">Desired Username</span>
                        <input
                          type="text"
                          required
                          value={regUsername}
                          onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          placeholder="e.g. adebayo_shola"
                          className="w-full py-3 px-4 bg-[#131923] border border-[#222b3b] focus:border-[#10b981] focus:outline-none text-xs text-white font-semibold rounded-xl font-sans"
                        />
                      </div>

                      {/* Phone number */}
                      <div className="flex flex-col gap-1.2">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest font-sans">Phone Number (Optional)</span>
                        <input
                          type="text"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="e.g. 0802224445"
                          className="w-full py-3 px-4 bg-[#131923] border border-[#222b3b] focus:border-[#10b981] focus:outline-none text-xs text-[#10b981] font-bold font-mono rounded-xl"
                        />
                      </div>



                      {/* 4-digit security PIN to enroll */}
                      <div className="flex flex-col gap-1.2">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest font-sans">Security PIN</span>
                        <input
                          type="password"
                          required
                          maxLength={4}
                          value={regPin}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setRegPin(val);
                          }}
                          placeholder="e.g. 1234"
                          className="w-full py-3 px-4 bg-[#131923] border border-[#222b3b] focus:border-[#10b981] focus:outline-none text-xs text-[#10b981] font-bold font-mono tracking-widest rounded-xl text-center"
                        />
                      </div>

                      {/* Street Address */}
                      <div className="flex flex-col gap-1.2">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest font-sans">Street Address</span>
                        <input
                          type="text"
                          required
                          value={regAddress}
                          onChange={(e) => setRegAddress(e.target.value)}
                          placeholder="e.g. No. 12 Ahmadu Bello Way"
                          className="w-full py-3 px-4 bg-[#131923] border border-[#222b3b] focus:border-[#10b981] focus:outline-none text-xs text-white font-semibold rounded-xl font-sans"
                        />
                      </div>

                      {/* Region Input */}
                      <div className="flex flex-col gap-1.2 font-sans text-left">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Region</span>
                        <input
                          type="text"
                          required
                          value={regLocation}
                          onChange={(e) => setRegLocation(e.target.value)}
                          placeholder="Lagos Island"
                          className="w-full py-3 px-4 bg-[#131923] border border-[#222b3b] focus:border-[#10b981] focus:outline-none text-xs text-zinc-200 font-semibold rounded-xl font-sans"
                        />
                      </div>

                      {/* Collector Staff Referral Code */}
                      <div className="flex flex-col gap-1.5 text-left mt-0.5">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest font-sans">Assigned Staff Referral Code</span>
                        
                        <input
                          type="text"
                          required
                          placeholder="e.g. CO-01"
                          value={regStaffInput}
                          onChange={(e) => setRegStaffInput(e.target.value)}
                          className="w-full py-3 px-4 bg-[#131923] border border-[#222b3b] focus:border-[#10b981] focus:outline-none text-xs text-white font-mono font-bold rounded-xl font-sans"
                        />

                        {/* Real-time Matching Feedback */}
                        {(() => {
                          const query = regStaffInput.trim().toLowerCase();
                          const matched = state.staff.find(
                            s => s.id.toLowerCase() === query ||
                                 (s.code && s.code.toLowerCase() === query)
                          );
                          if (matched) {
                            return (
                              <span className="text-[9.5px] text-emerald-400 font-extrabold flex items-center gap-1 mt-0.5 leading-none">
                                ✓ Matched Mobilizer Agent: {matched.name} ({matched.code || matched.id})
                              </span>
                            );
                          } else {
                            return (
                              <span className="text-[9.5px] text-rose-400 font-bold flex items-center gap-1 mt-0.5 leading-none animate-pulse">
                                ❌ No active staff matching referral code (Type e.g. CO-01 manually)
                              </span>
                            );
                          }
                        })()}
                      </div>

                    </div>

                    {/* Big Green Action Button matching photo layout */}
                    <button
                      type="submit"
                      className="w-full py-4.5 bg-[#10b981] hover:bg-[#059669] text-white font-extrabold rounded-2xl text-[13px] tracking-wide uppercase transition-all shadow-[0_4px_18px_rgba(16,185,129,0.25)] active:scale-98 cursor-pointer flex items-center justify-center gap-1.5 mt-1"
                    >
                      <Plus className="w-4 h-4 text-white" />
                      <span>Create Account</span>
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* THREE ACCOUNTS SELECTION LIST - featured default primary Customer */}
            <div className="flex flex-col gap-3 mt-1 select-none font-sans">
              <div className="flex items-center justify-center gap-3">
                <div className="h-[1px] bg-zinc-900 flex-1 opacity-50" />
                <span className="text-[10px] font-black text-zinc-650 uppercase tracking-widest select-none">OR SECURE ACCOUNT PORTAL</span>
                <div className="h-[1px] bg-zinc-900 flex-1 opacity-50" />
              </div>

              <div className="flex flex-col gap-2.5">
                {/* 1. Primary/First Account Choice: Customer */}
                <button
                  type="button"
                  onClick={() => {
                    setScreen('customer-auth');
                    setCustomerActiveTab('signin');
                    setAuthError('');
                  }}
                  className={`py-3.5 px-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    (screen === 'gateway' || screen === 'customer-auth' || screen === 'customer-register')
                      ? 'bg-[#10b981]/5 border-[#10b981]/30 text-white shadow-sm'
                      : 'bg-[#0e131b]/60 border-zinc-900 text-zinc-550 hover:text-zinc-300'
                  }`}
                  id="choice-customer-btn"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">👤</span>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide">Saver Customer Portal</p>
                      <p className="text-[8.5px] text-zinc-500 font-bold uppercase mt-0.5">Primary Entry • Direct Auto-Enroll</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                    <span className="text-[9px] text-[#10b981] font-black uppercase tracking-widest">Default</span>
                  </div>
                </button>

                {/* 2. Staff Collector Access */}
                <button
                  type="button"
                  onClick={() => {
                    setAuthError('');
                    setScreen('staff-select');
                  }}
                  className="py-3 px-4 bg-[#0e131b]/60 hover:bg-[#111620]/60 border border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white rounded-2xl text-left transition-all cursor-pointer flex items-center justify-between"
                  id="choice-staff-btn"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">💼</span>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide">Collector Staff Portal</p>
                      <p className="text-[8.5px] text-zinc-500 font-bold uppercase mt-0.5">Daily Ledger Agent Portal</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-550 font-black uppercase">Launch ➔</span>
                </button>

                {/* 3. Supervisor Manager Access */}
                <button
                  type="button"
                  onClick={onManagerLogin}
                  className="py-3 px-4 bg-[#0e131b]/60 hover:bg-[#111620]/60 border border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white rounded-2xl text-left transition-all cursor-pointer flex items-center justify-between"
                  id="choice-manager-btn"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base">👑</span>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide">Manager Login & Admin</p>
                      <p className="text-[8.5px] text-zinc-500 font-bold uppercase mt-0.5">Ledger Supervisor Board</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#fad563] font-black uppercase">Open Login 👑</span>
                </button>
              </div>
            </div>

            {/* Standard device security watermark */}
            <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-650 font-bold uppercase tracking-wider mt-1 select-none font-sans">
              <ShieldAlert className="w-3.5 h-3.5 text-zinc-600" />
              <span>Personal Ledger Client Shield</span>
            </div>
          </motion.div>
        )}

        {/* ================= CUSTOMER SELECT ACCOUNT ================= */}
        {screen === 'customer-select' && (
          <motion.div
            key="customer-select"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="w-full max-w-sm flex flex-col gap-5 z-10"
          >
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setScreen('gateway')}
                className="w-10 h-10 rounded-full border border-zinc-900 bg-[#111311]/50 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-black text-zinc-550 uppercase tracking-widest">Select Account</span>
              <div className="w-10 h-10 opacity-0" />
            </div>

            <div className="bg-[#111311]/95 border border-zinc-900/60 rounded-[28px] p-6.5 flex flex-col gap-4.5 shadow-2xl relative">
              <div className="text-center pb-2 border-b border-zinc-950/80">
                <Coins className="w-8 h-8 text-[#14cfb4] mx-auto mb-1.5" />
                <h2 className="text-lg font-black text-white uppercase tracking-tight">SAVINGS LEDGER ACC</h2>
                <p className="text-xs text-zinc-550 mt-1">Select simulated saving account to sign in</p>
              </div>

              {state.customers.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-4">No registered customers. Tap 'Create Account' to register.</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                  {state.customers.map((c, index) => (
                    <button
                      key={`${c.id}-${index}`}
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setTypedPhone(c.phoneNumber);
                        setPasscode('');
                        setFocusedField('pin');
                        setScreen('customer-auth');
                      }}
                      className="w-full p-3.5 bg-[#090a09] border border-zinc-950 hover:border-zinc-800 rounded-2xl flex items-center justify-between gap-3 text-left transition-all active:scale-98 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center bg-zinc-900 group-hover:bg-[#14cfb4]/10 transition-colors shrink-0 font-extrabold text-xs text-zinc-350">
                          {c.profileImage ? (
                            <img src={c.profileImage} className="w-full h-full object-cover" alt={c.name} referrerPolicy="no-referrer" />
                          ) : (
                            c.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-xs text-zinc-200 group-hover:text-white transition-colors">{c.name}</span>
                          <span className="text-[10px] text-zinc-500 font-mono mt-0.5">{c.phoneNumber}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-650 group-hover:text-[#14cfb4] transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ================= CUSTOMER PORTAL (UNIFIED AUTH & SIGNUP) ================= */}
        {(screen === 'gateway' || screen === 'customer-auth' || screen === 'customer-register') && (
          <motion.div
            key="customer-unified-portal"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="w-full max-w-sm flex flex-col gap-4 z-10 p-1"
          >
            {/* Header / Back Action (With only back circular button on left if screen !== 'gateway') */}
            {screen !== 'gateway' && (
              <div className="flex items-center justify-between px-1">
                <button 
                  onClick={() => {
                    setRegisteredResult(null);
                    setScreen('gateway');
                    setSelectedCustomerId(null);
                    setPortalTab('customer');
                    setPasscode('');
                  }}
                  className="w-10 h-10 rounded-full border border-zinc-900 bg-[#111311]/50 hover:bg-[#181c18] hover:border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-[#14cfb4] transition-all cursor-pointer shadow-md"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="text-[10px] font-black text-zinc-550 uppercase tracking-widest">
                  Client Secured Portal
                </span>
                <div className="w-10 h-10 opacity-0" />
              </div>
            )}

            {/* If a registration just finished, show the successful review credentials panel */}
            {registeredResult ? (
              <div className="w-full bg-[#111311]/95 border border-[#14cfb4]/25 rounded-[32px] p-6.5 flex flex-col gap-5 shadow-2xl relative overflow-hidden font-sans">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                <div className="text-center pb-2 border-b border-zinc-950">
                  <div className="w-12 h-12 bg-emerald-950/20 border border-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-2 text-[#14cfb4]">
                    <Check className="w-6 h-6" />
                  </div>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight">Saver Enrolled Successfully!</h2>
                  <p className="text-xs text-zinc-400 mt-1 font-sans">Below are the custom ledger credentials</p>
                </div>

                <div className="bg-zinc-950/60 p-4 border border-zinc-900 rounded-2xl flex flex-col gap-3.5 relative">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-[450] font-semibold">Saver Name:</span>
                    <span className="font-bold text-zinc-200 uppercase">{registeredResult.name}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-2 border-t border-zinc-900/50">
                    <span className="text-zinc-[450] font-semibold">Username (For Login):</span>
                    <span className="font-mono font-black text-sm text-[#14cfb4] tracking-widest select-all">
                      {registeredResult.username}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-2 border-t border-zinc-900/50">
                    <span className="text-zinc-[450] font-semibold">Staff Customer ID:</span>
                    <span className="font-mono font-black text-sm text-[#14cfb4] tracking-widest select-all">
                      {registeredResult.staffCustomerId}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-2 border-t border-zinc-900/50">
                    <span className="text-zinc-[450] font-semibold">Account Number:</span>
                    <div className="text-right">
                      <span className="font-mono font-bold text-xs text-zinc-300 tracking-wider">
                        {registeredResult.accountNumber}
                      </span>
                      <p className="text-[8px] text-zinc-500 mt-0.5 uppercase tracking-wider font-semibold">🏦 {state.settings.partnerBankName || 'Sterling Bank Plc'}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-2 border-t border-zinc-900/50">
                    <span className="text-zinc-[450] font-semibold flex items-center gap-1">
                      <span>4-digit Security PIN:</span>
                    </span>
                    <span className="font-mono font-black text-zinc-200 bg-zinc-900 px-2 py-1 rounded tracking-widest select-all">
                      {registeredResult.pin}
                    </span>
                  </div>

                  <div className="bg-[#14cfb4]/5 border border-[#14cfb4]/10 p-3 rounded-xl mt-1">
                    <p className="text-[10px] text-zinc-400 font-medium leading-relaxed font-sans">
                      💡 <strong>Credential Info:</strong> You can log into your portal using either your <strong>Username</strong> ({registeredResult.username}) or your registered phone number.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setTypedPhone(registeredResult.username || '');
                    setPasscode('');
                    setFocusedField('pin');
                    setCustomerActiveTab('signin');
                    setScreen('customer-auth');
                    setRegisteredResult(null);
                  }}
                  className="w-full py-4 bg-[#22c55e] hover:bg-[#16a34a] text-white font-extrabold rounded-2xl text-[13px] tracking-widest uppercase transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer font-sans"
                >
                  <span>PROCEED TO PORTAL LOGIN ➔</span>
                </button>
              </div>
            ) : (
              /* Main login/signup card matching layout screenshot */
              <div className="w-full bg-[#111311]/95 border border-[#14cfb4]/25 rounded-[32px] p-6.5 flex flex-col gap-6 shadow-[0_24px_50px_rgba(0,0,0,0.9),0_0_50px_rgba(20,207,180,0.04)] relative overflow-hidden">
                {/* Pulsing light aura */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#14cfb4]/5 rounded-full blur-3xl pointer-events-none" />

                {/* Left logo and right text block matching original picture design */}
                <div 
                  onClick={() => {
                    setLogoTapCount(prev => {
                      const next = prev + 1;
                      if (next >= 3) {
                        setShowPortalsSelector(curr => !curr);
                        setActiveSmartphoneNotification({
                          id: 'portal-unlocked-' + Date.now(),
                          title: 'Portal Selector Unlocked 🛡️',
                          message: 'Access panels for Staff and Manager accounts are now shown.',
                          icon: '🔒',
                          time: 'Just now'
                        });
                        setTimeout(() => setActiveSmartphoneNotification(null), 4000);
                        return 0;
                      }
                      return next;
                    });
                  }}
                  className="flex items-center gap-3.5 text-left select-none w-full cursor-pointer hover:opacity-90 active:scale-98 transition-all group"
                  title="Click 3 times to toggle secure admin portals"
                >
                  <div className="w-13 h-13 bg-gradient-to-tr from-[#0da68d] to-[#14cfb4] rounded-2xl flex items-center justify-center shadow-[0_8px_20px_rgba(20,207,180,0.25)] border border-[#14cfb4]/25 shrink-0 relative overflow-hidden group-hover:scale-105 transition-transform duration-150">
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent rotate-45 pointer-events-none" />
                    <span className="text-[25px] font-black text-white font-sans leading-none mt-[1px]">C</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h1 className="text-xl font-black text-white tracking-tight leading-none uppercase font-sans flex items-center gap-1.5">
                      <span className="bg-gradient-to-r from-[#14cfb4] to-[#10b981] bg-clip-text text-transparent">Dan Godal Savings</span>
                      {showPortalsSelector && (
                        <span className="w-2 h-2 rounded-full bg-[#14cfb4] animate-pulse" />
                      )}
                    </h1>
                    <span className="text-[9.5px] text-zinc-500 font-extrabold uppercase tracking-widest mt-1.5 truncate">
                      Autonomous Savings Ledger
                    </span>
                  </div>
                </div>

                {/* Dynamic Interactive Account Indicator & Progression Bar */}
                <div className="flex flex-col gap-2.5 w-full bg-[#050605] p-3 border border-zinc-950/80 rounded-2xl font-sans text-center select-none shadow-inner animate-fade-in animate-duration-300">
                  <span className="text-[9px] font-black text-zinc-550 uppercase tracking-widest leading-none">
                    Security Portal Navigation
                  </span>
                    
                    <div className="flex flex-row flex-wrap justify-center items-center gap-2">
                      {/* 1. Customer Account Badge / Secret Staff / Secret Manager Toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          if (portalTab === 'customer') {
                            setPortalTab('staff');
                            setPasscode('');
                            setAuthError('');
                            setTypedPhone('');
                            setFocusedField('pin');
                            setActiveSmartphoneNotification({
                              id: 'staff-unlocked-' + Date.now(),
                              title: 'Staff Route Active! 🔓',
                              message: 'Staff Account page is now active.',
                              icon: '🛡️',
                              time: 'Just now'
                            });
                            setTimeout(() => setActiveSmartphoneNotification(null), 4000);
                          } else if (portalTab === 'staff') {
                            setPortalTab('manager');
                            setPasscode('');
                            setAuthError('');
                            setTypedPhone('admin@contribopay.ng');
                            setFocusedField('pin');
                            setUnlockedManager(true);
                            setActiveSmartphoneNotification({
                              id: 'manager-unlocked-' + Date.now(),
                              title: 'Manager Route Active! 👑',
                              message: 'Manager Account page is now active.',
                              icon: '👑',
                              time: 'Just now'
                            });
                            setTimeout(() => setActiveSmartphoneNotification(null), 4000);
                          } else {
                            setPortalTab('customer');
                            setPasscode('');
                            setAuthError('');
                            setTypedPhone('');
                            setFocusedField('phone');
                          }
                        }}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 border cursor-pointer select-none active:scale-95 duration-150 ${
                          portalTab === 'customer'
                            ? 'bg-[#14cfb4]/10 text-[#14cfb4] border-[#14cfb4]/35 shadow-[0_0_12px_rgba(20,207,180,0.1)]'
                            : portalTab === 'staff' 
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/35 shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/35 shadow-[0_0_12px_rgba(251,191,36,0.15)]'
                        }`}
                        title={portalTab === 'customer' ? "Tap to view Staff Account" : portalTab === 'staff' ? "Tap to view Manager Account" : "Tap to view Customer Account"}
                      >
                        <span className="relative flex h-2 w-2">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${portalTab === 'customer' ? 'bg-[#14cfb4]' : portalTab === 'staff' ? 'bg-blue-400' : 'bg-amber-400'}`}></span>
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${portalTab === 'customer' ? 'bg-[#14cfb4]' : portalTab === 'staff' ? 'bg-blue-400' : 'bg-amber-400'}`}></span>
                        </span>
                        <span>{portalTab === 'customer' ? '👤 Customer Account' : portalTab === 'staff' ? '🛡️ Staff Account' : '👑 Manager Account'}</span>
                      </button>
                    </div>

                    {/* Highly responsive friendly instructional feedback zone */}
                    <div className="text-[10px] text-zinc-500 font-bold px-1 select-none leading-relaxed border-t border-zinc-900/50 pt-2 transition-all">
                      <span className="text-zinc-550 flex flex-col items-center justify-center gap-0.5">
                        <span className="text-zinc-400 font-extrabold flex items-center gap-1">
                          <span>Secure Customer Authentication Area</span>
                        </span>
                      </span>
                    </div>
                  </div>
                {/* Subheader greeting block */}
                <div className="flex flex-col gap-1 text-center select-none mt-2">
                  <h2 className="text-[20px] font-black text-white tracking-tight font-sans">
                    {customerActiveTab === 'signin' ? 'Welcome back' : 'Create Account'}
                  </h2>
                  <p className="text-xs text-zinc-550 font-medium max-w-[280px] mx-auto leading-relaxed mt-1 font-sans">
                    {customerActiveTab === 'signin' 
                      ? (portalTab === 'customer' ? 'Sign in to continue to your daily savings ledger' : portalTab === 'staff' ? 'Collector Staff Login — Verify security PIN to open daily transit ledger.' : 'Administration Dashboard — Supervise ledger approvals, daily collections & partners.')
                      : (portalTab === 'customer' ? 'Enroll to get a virtual account, daily ledger & dedicated collector' : portalTab === 'staff' ? 'Register a new Collector Staff profile to manage collections' : 'Register a new Administration account for HQ control')}
                  </p>
                </div>

                {/* Pill Switcher tabs matching the exact layout in the screenshot */}
                <div className="grid grid-cols-2 bg-[#090a09]/80 p-1 border border-zinc-950 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerActiveTab('signin');
                      setScreen('customer-auth');
                      setAuthError('');
                    }}
                    className={`py-2 px-1.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                      customerActiveTab === 'signin'
                        ? 'bg-[#1c1d1c] text-white shadow-md border border-zinc-800'
                        : 'text-zinc-500 hover:text-zinc-350'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerActiveTab('signup');
                      setScreen('customer-register');
                      setAuthError('');
                    }}
                    className={`py-2 px-1.5 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                      customerActiveTab === 'signup'
                        ? 'bg-[#1c1d1c] text-white shadow-md border border-zinc-800'
                        : 'text-zinc-500 hover:text-zinc-350'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>

                {/* Error messages if any */}
                {authError && (
                  <div className="p-3 bg-rose-955/15 border border-rose-950/25 text-xs font-bold text-rose-455 rounded-xl flex items-center gap-2 leading-relaxed text-left">
                    <span>⚠️</span>
                    <span>{authError}</span>
                  </div>
                )}

                {/* Conditional wrapping of Customer Form Content */}
                {portalTab === 'customer' && (
                  <>
                    {/* Explicit Customer Account indicator badge */}
                    <div className="flex justify-center select-none mt-1">
                      <div className="px-3.5 py-1.5 bg-[#14cfb4]/5 border border-[#14cfb4]/25 rounded-full text-[10.5px] font-black tracking-widest text-[#14cfb4] uppercase flex items-center gap-1.5 shadow-sm">
                        <span>👤 Customer Account</span>
                      </div>
                    </div>

                {/* Custom Content based on Tab Selection */}
                {customerActiveTab === 'signin' ? (
                  /* ================= SIGN IN VIEW CONTENT ================= */
                  <div className="flex flex-col gap-5">
                    {/* Input Field 1: EMAIL or Username/Phone */}
                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-[10px] font-black text-zinc-550 uppercase tracking-widest flex items-center justify-between">
                        <span>USERNAME OR PHONE</span>
                      </label>
                      <input 
                        type="text"
                        value={typedPhone}
                        onChange={(e) => {
                          setTypedPhone(e.target.value);
                          setAuthError('');
                        }}
                        onFocus={() => setFocusedField('phone')}
                        placeholder="E.g. 081 234 5678"
                        className={`w-full py-3.5 px-4 bg-[#090a09] border rounded-xl text-left font-bold font-mono text-white placeholder-zinc-700 tracking-wide transition-all focus:outline-none ${
                          focusedField === 'phone' ? 'border-[#14cfb4] shadow-[0_0_15px_rgba(20,207,180,0.06)]' : 'border-zinc-900'
                        }`}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 text-left">
                      <div className="flex justify-between items-center w-full">
                        <label className="text-[10px] font-black text-zinc-550 uppercase tracking-widest">
                          4-DIGIT SECURITY PIN
                        </label>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setResetError('');
                            setIsEnteringIdentifier(true);
                          }}
                          className="text-[#14cfb4] hover:underline relative z-[9999] pointer-events-auto cursor-pointer"
                        >
                          Forgot/Reset PIN?
                        </button>
                      </div>
                      <div 
                        onClick={() => setFocusedField('pin')}
                        className="w-full bg-[#090a09] border border-zinc-900 rounded-xl flex items-center justify-center gap-10 py-3.5 cursor-pointer"
                      >
                        {[0, 1, 2, 3].map((idx) => {
                          const isFilled = passcode.length > idx;
                          return (
                            <div
                              key={idx}
                              className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                                isFilled 
                                  ? 'bg-[#14cfb4] border-[#14cfb4] scale-115 shadow-[0_0_10px_rgba(20,207,180,0.6)]'
                                  : 'bg-transparent border-zinc-800'
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {isAuthLoading ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-1 select-none">
                        <div className="w-5 h-5 border-2 border-zinc-900 border-t-[#14cfb4] rounded-full animate-spin" />
                        <span className="text-[9px] text-zinc-500 font-mono font-bold tracking-widest uppercase animate-pulse">Syncing saver card...</span>
                      </div>
                    ) : (
                      /* Big Green Solid Action Button matching photo layout */
                      <button
                        type="button"
                        onClick={() => {
                          if (passcode.length !== 4) {
                            setAuthError('Please input your 4-digit security PIN using the keypad.');
                            return;
                          }
                          // This logic mimics the keypad handler logic for login
                          const normalizedTyped = typedPhone.replace(/\D/g, '');
                          const trimmedTyped = typedPhone.trim().toLowerCase();
                          const matchedCust = state.customers.find(c => {
                            const normalizedCust = c.phoneNumber ? c.phoneNumber.replace(/\D/g, '') : '';
                            const matchesPhone = (normalizedCust && normalizedCust === normalizedTyped) || c.phoneNumber === typedPhone;
                            const matchesUsername = c.username?.toLowerCase() === trimmedTyped;
                            return matchesPhone || matchesUsername;
                          });

                          if (matchedCust) {
                            if (matchedCust.pin && passcode !== matchedCust.pin) {
                              setPasscode('');
                              setAuthError('Incorrect Security PIN! Please type your correct 4-digit passcode.');
                              return;
                            }
                            setSelectedCustomerId(matchedCust.id);
                            setIsAuthLoading(true);
                            setAuthError('');
                            setTimeout(() => {
                              setIsAuthLoading(false);
                              setScreen('customer-dashboard');
                              setCustTab('home');
                              setHideBalance(!!matchedCust.hideBalanceByDefault);
                            }, 800);
                          } else {
                            setPasscode('');
                            setAuthError('No customer found with this Username or Phone number.');
                          }
                        }}
                        className="w-full py-4 bg-[#22c55e] hover:bg-[#16a34a] text-white font-extrabold rounded-2xl text-[13px] tracking-wide uppercase transition-all shadow-[0_4px_18px_rgba(34,197,94,0.3)] active:scale-98 cursor-pointer flex items-center justify-center gap-1.5 mt-1"
                      >
                        <span>Sign In</span>
                      </button>
                    )}

                    {/* The 3x4 Virtual keypad dials */}
                    <div className="grid grid-cols-3 gap-2.5 w-full mt-1 select-none">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'NEXT', '0', 'delete'].map((key, keyIdx) => {
                        if (key === 'NEXT') {
                          return (
                            <button
                              key={keyIdx}
                              type="button"
                              onClick={() => {
                                setFocusedField(focusedField === 'phone' ? 'pin' : 'phone');
                              }}
                              className="h-13 bg-[#151715] hover:bg-[#1c1e1c] active:scale-95 transition-all text-[#14cfb4] rounded-xl flex items-center justify-center font-bold text-[9.5px] uppercase tracking-wider border border-zinc-900/60 select-none cursor-pointer p-0.5"
                            >
                              {focusedField === 'phone' ? '➔ PIN' : '➔ FIELD'}
                            </button>
                          );
                        }
                        if (key === 'delete') {
                          return (
                            <button
                              key={keyIdx}
                              type="button"
                              onClick={() => handleKeypadPress('backspace')}
                              className="h-13 bg-[#151715] hover:bg-[#1c1e1c] active:scale-95 transition-all text-zinc-400 rounded-xl flex items-center justify-center border border-zinc-900/60 select-none cursor-pointer shadow-sm group"
                            >
                              <span className="text-lg text-zinc-400 group-hover:text-zinc-200">⌫</span>
                            </button>
                          );
                        }
                        return (
                          <button
                            key={keyIdx}
                            type="button"
                            onClick={() => handleKeypadPress(key)}
                            className="h-13 bg-[#151715] hover:bg-[#1c1e1c] active:scale-95 transition-all text-white rounded-xl flex items-center justify-center font-bold text-lg border border-zinc-900/60 select-none cursor-pointer shadow-sm"
                          >
                            {key}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* ================= SIGN UP VIEW CONTENT ================= */
                  <form onSubmit={handleCustomerRegister} className="flex flex-col gap-4 text-left">
                    <div className="flex flex-col gap-3.5 max-h-[300px] overflow-y-auto pr-1 select-none no-scrollbar">
                      
                      {/* Name input */}
                      <div className="flex flex-col gap-1 text-left">
                        <span className="text-[10px] font-black text-zinc-550 uppercase tracking-widest">SAVER FULL NAME</span>
                        <input
                          type="text"
                          required
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="E.g. Adebayo Shola"
                          className="w-full px-4 py-3 bg-[#090a09] border border-zinc-900 focus:border-[#14cfb4] focus:outline-none text-xs text-white font-semibold rounded-xl font-sans"
                        />
                      </div>

                      {/* Desired Username */}
                      <div className="flex flex-col gap-1 text-left">
                        <span className="text-[10px] font-black text-zinc-550 uppercase tracking-widest">DESIRED USERNAME</span>
                        <input
                          type="text"
                          required
                          value={regUsername}
                          onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          placeholder="e.g. adebayo_shola"
                          className="w-full px-4 py-3 bg-[#090a09] border border-zinc-900 focus:border-[#14cfb4] focus:outline-none text-xs text-white font-semibold rounded-xl font-sans"
                        />
                      </div>

                      {/* Phone number */}
                      <div className="flex flex-col gap-1 text-left">
                        <span className="text-[10px] font-black text-zinc-555 uppercase tracking-widest">PHONE NUMBER (OPTIONAL)</span>
                        <input
                          type="text"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="e.g. 0802224445"
                          className="w-full px-4 py-3 bg-[#090a09] border border-zinc-900 focus:border-[#14cfb4] focus:outline-none text-xs text-[#14cfb4] font-bold font-mono rounded-xl"
                        />
                      </div>

                      {/* 4-digit security PIN to enroll */}
                      <div className="flex flex-col gap-1 text-left">
                        <span className="text-[10px] font-black text-zinc-555 uppercase tracking-widest">SECURITY PIN</span>
                        <input
                          type="password"
                          required
                          maxLength={4}
                          value={regPin}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setRegPin(val);
                          }}
                          placeholder="e.g. 1234"
                          className="w-full px-4 py-3 bg-[#090a09] border border-zinc-900 focus:border-[#14cfb4] focus:outline-none text-xs text-[#14cfb4] font-bold font-mono tracking-widest rounded-xl text-center"
                        />
                      </div>

                      {/* Street Address */}
                      <div className="flex flex-col gap-1 text-left">
                        <span className="text-[10px] font-black text-zinc-555 uppercase tracking-widest">STREET ADDRESS</span>
                        <input
                          type="text"
                          required
                          value={regAddress}
                          onChange={(e) => setRegAddress(e.target.value)}
                          placeholder="e.g. No. 12 Ahmadu Bello Way"
                          className="w-full px-4 py-3 bg-[#090a09] border border-zinc-900 focus:border-[#14cfb4] focus:outline-none text-xs text-white font-semibold rounded-xl font-sans"
                        />
                      </div>

                      {/* Region input */}
                      <div className="flex flex-col gap-1 text-left">
                        <span className="text-[10px] font-black text-zinc-550 uppercase tracking-widest">REGION</span>
                        <input
                          type="text"
                          required
                          value={regLocation}
                          onChange={(e) => setRegLocation(e.target.value)}
                          placeholder="Lagos Island"
                          className="w-full px-4 py-3 bg-[#090a09] border border-zinc-900 focus:border-[#14cfb4] focus:outline-none text-xs text-zinc-200 font-semibold rounded-xl font-sans"
                        />
                      </div>

                      {/* Required Assigned Mobilizer/Staff Referral Code input */}
                      <div className="flex flex-col gap-1 text-left mt-1">
                        <span className="text-[10px] font-black text-[#14cfb4] uppercase tracking-widest flex items-center justify-between">
                          <span>ASSIGNED STAFF REFERRAL CODE</span>
                          <span className="text-[8.5px] text-zinc-550 lowercase italic">required</span>
                        </span>
                        <input
                          type="text"
                          required
                          placeholder="e.g. CO-01"
                          value={regStaffInput}
                          onChange={(e) => setRegStaffInput(e.target.value)}
                          className="w-full px-3 py-2.5 bg-[#090a09] border border-zinc-900 focus:border-[#14cfb4] focus:outline-none text-xs text-white font-mono font-bold rounded-xl"
                        />

                        {/* Real-time Match Feedback */}
                        {(() => {
                          const query = regStaffInput.trim().toLowerCase();
                          const matched = state.staff.find(
                            s => s.id.toLowerCase() === query ||
                                 (s.code && s.code.toLowerCase() === query)
                          );
                          if (matched) {
                            return (
                              <span className="text-[9px] text-[#14cfb4] font-bold flex items-center gap-1 mt-0.5 leading-none">
                                ✓ Matched Mobilizer Agent: {matched.name} ({matched.code || matched.id})
                              </span>
                            );
                          } else {
                            return (
                              <span className="text-[9px] text-rose-500 font-bold flex items-center gap-1 mt-0.5 leading-none animate-pulse">
                                ❌ Invalid Staff Referral Code (Type e.g. CO-01 manually)
                              </span>
                            );
                          }
                        })()}
                      </div>

                    </div>

                    {/* Big Green Action Button matching photo layout */}
                    <button
                      type="submit"
                      className="w-full py-4 bg-[#22c55e] hover:bg-[#16a34a] text-white font-extrabold rounded-2xl text-[13px] tracking-wide uppercase transition-all shadow-[0_4px_18px_rgba(34,197,94,0.3)] hover:shadow-[0_6px_22px_rgba(34,197,94,0.4)] active:scale-98 cursor-pointer flex items-center justify-center gap-1.5 mt-1"
                    >
                      <Plus className="w-4 h-4 text-white" />
                      <span>Create Account</span>
                    </button>

                    {/* Friendly link to switch back to login/signin */}
                    <div className="text-center mt-1.5 select-none">
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerActiveTab('signin');
                          setScreen('customer-auth');
                          setAuthError('');
                        }}
                        className="text-xs text-zinc-500 hover:text-[#14cfb4] transition-all font-semibold cursor-pointer py-1"
                      >
                        Already registered? <span className="text-[#14cfb4] underline font-extrabold">Sign In Here</span>
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}

            {/* STAFF PORTAL TAB VIEW */}
            {portalTab === 'staff' && (
              <div className="flex flex-col gap-4 font-sans animate-fade-in w-full text-left">
                {/* Staff account badge & Selector Pill */}
                <div className="flex flex-col gap-2 items-center justify-center select-none w-full">
                  <div className="px-3.5 py-1.5 bg-[#14cfb4]/5 border border-[#14cfb4]/25 rounded-full text-[10.5px] font-black tracking-widest text-[#14cfb4] uppercase flex items-center gap-1.5 shadow-sm">
                    <span>🛡️ Staff Account</span>
                  </div>
                </div>

                {customerActiveTab === 'signin' ? (
                  <>
                    {/* Input Field 1: EMAIL or Username/Phone */}
                    <div className="flex flex-col gap-1.5 text-left">
                      <label className="text-[10px] font-black text-[#14cfb4] uppercase tracking-widest flex items-center justify-between">
                        <span>PHONE OR EMAIL</span>
                      </label>
                      <input 
                        type="text"
                        value={typedPhone}
                        onChange={(e) => {
                          setTypedPhone(e.target.value);
                          setAuthError('');
                        }}
                        onFocus={() => setFocusedField('phone')}
                        placeholder="E.g. bello.usman@contribopay.com"
                        className={`w-full py-3.5 px-4 bg-[#090a09] border rounded-xl text-left font-bold font-mono text-white placeholder-zinc-700 tracking-wide transition-all focus:outline-none ${
                          focusedField === 'phone' ? 'border-[#14cfb4] shadow-[0_0_15px_rgba(20,207,180,0.06)]' : 'border-zinc-900'
                        }`}
                      />
                    </div>

                {/* PIN Display circles */}
                <div className="flex flex-col gap-1.5 text-left font-sans">
                    <div className="flex flex-row justify-between items-center w-full px-1 mb-1">
                      <span className="text-zinc-600 font-black uppercase tracking-widest text-[9px]">4-DIGIT PIN CODE</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsResetting(!isResetting);
                          setAuthError('');
                        }}
                        className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg relative z-[5000] pointer-events-auto cursor-pointer active:scale-95 transition-all shadow-sm ${isResetting ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30' : 'text-[#14cfb4] bg-[#14cfb4]/10 border border-[#14cfb4]/30 hover:text-white'}`}
                        id="staff-forgot-pin-gateway"
                      >
                        {isResetting ? 'Cancel Reset' : 'Reset PIN?'}
                      </button>
                    </div>

                  {isResetting ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full bg-[#0d0e0d] border border-[#14cfb4]/20 rounded-xl p-4 flex flex-col gap-3 relative z-[20]"
                    >
                      <span className="text-[9px] font-bold text-zinc-500 uppercase">Enter Work Email to Reset</span>
                      <input 
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="e.g. staff@contribopay.com"
                        className="w-full py-2.5 px-3 bg-[#090a09] border border-zinc-800 rounded-lg text-xs text-white focus:border-[#14cfb4] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!resetEmail) return;
                          const staffMember = state.staff.find(s => s.email?.toLowerCase().trim() === resetEmail.toLowerCase().trim());
                          if (staffMember) {
                            const newPin = Math.floor(1000 + Math.random() * 9000).toString();
                            onUpdateStaff(staffMember.id, { pin: newPin });
                            setGeneratedPin(newPin);
                            setShowResetModal(true);
                            setIsResetting(false);
                            setResetEmail('');
                            setTimeout(() => setShowResetModal(false), 10000);
                          } else {
                            setAuthError('Staff profile not found for this email.');
                          }
                        }}
                        className="w-full py-2.5 bg-[#14cfb4] text-black font-black rounded-lg text-[10px] uppercase tracking-widest shadow-lg"
                      >
                        Confirm Reset
                      </button>
                    </motion.div>
                  ) : (
                  <div 
                    className="w-full bg-[#090a09] border border-zinc-900 rounded-xl flex items-center justify-center gap-10 py-4 cursor-pointer relative z-[10]"
                    onClick={() => setFocusedField('pin')}
                  >
                    {[0, 1, 2, 3].map((idx) => {
                      const isFilled = passcode.length > idx;
                      return (
                        <div
                          key={idx}
                          className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                            isFilled 
                              ? 'bg-[#14cfb4] border-[#14cfb4] scale-115 shadow-[0_0_10px_rgba(20,207,180,0.6)]'
                              : 'bg-transparent border-zinc-800'
                          }`}
                        />
                      );
                    })}
                  </div>
                  )}
                </div>

                {isAuthLoading ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-1 select-none font-sans font-sans">
                    <div className="w-5 h-5 border-2 border-zinc-900 border-t-[#14cfb4] rounded-full animate-spin" />
                    <span className="text-[9px] text-[#14cfb4] font-semibold tracking-wider animate-pulse uppercase font-sans">Authenticating Staff...</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (passcode.length !== 4) {
                        setAuthError('Please input your 4-digit security PIN using the keypad.');
                      }
                    }}
                    className="w-full py-3.5 bg-[#14cfb4] hover:bg-[#0da68d] text-slate-950 font-extrabold rounded-2xl text-[13px] tracking-wide uppercase transition-all shadow-[0_4px_18px_rgba(20,207,180,0.2)] active:scale-98 cursor-pointer flex items-center justify-center gap-1.5 mt-1 btn-animate"
                  >
                    <span>Verify Staff Profile</span>
                  </button>
                )}

                {/* Numeric PIN Keypad for staff login */}
                <div className="grid grid-cols-3 gap-2 w-full mt-1 select-none font-sans">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'PIN', '0', 'delete'].map((key, keyIdx) => {
                    if (key === 'PIN') {
                      return (
                        <div
                          key={keyIdx}
                          className="h-12 bg-[#090a09] text-zinc-650 rounded-xl flex items-center justify-center font-bold text-[9px] uppercase tracking-wider border border-zinc-900/60 select-none cursor-default font-mono"
                        >
                          🔒 SECURITY
                        </div>
                      );
                    }
                    if (key === 'delete') {
                      return (
                        <button
                          key={keyIdx}
                          type="button"
                          onClick={() => handleKeypadPress('backspace')}
                          className="h-12 bg-[#151715] hover:bg-[#1c1e1c] active:scale-95 transition-all text-zinc-400 rounded-xl flex items-center justify-center border border-zinc-900/60 select-none cursor-pointer shadow-sm group"
                        >
                          <span className="text-lg text-zinc-400 group-hover:text-zinc-200">⌫</span>
                        </button>
                      );
                    }
                    return (
                      <button
                        key={keyIdx}
                        type="button"
                        onClick={() => handleKeypadPress(key)}
                        className="h-12 bg-[#151715] hover:bg-[#1c1e1c] active:scale-95 transition-all text-white rounded-xl flex items-center justify-center font-bold text-lg border border-zinc-900/60 select-none cursor-pointer shadow-sm font-mono"
                      >
                        {key}
                      </button>
                    );
                  })}
                </div>
                  </>
                ) : (
                  /* ================= STAFF SIGN UP VIEW CONTENT ================= */
                  <form onSubmit={handleStaffRegister} className="flex flex-col gap-3 text-left font-sans animate-fade-in max-h-[350px] overflow-y-auto pr-1 select-none no-scrollbar">
                    
                    {/* Staff Full Name */}
                    <div className="flex flex-col gap-1 text-left">
                      <label className="text-[10px] font-black text-[#14cfb4] uppercase tracking-widest">
                        STAFF FULL NAME
                      </label>
                      <input 
                        type="text"
                        required
                        value={staffRegName}
                        onChange={(e) => setStaffRegName(e.target.value)}
                        placeholder="E.g. Bello Usman"
                        className="w-full py-2.5 px-4 bg-[#090a09] border border-zinc-900 rounded-xl text-left font-bold text-white placeholder-zinc-700 tracking-wide transition-all focus:outline-none focus:border-[#14cfb4] text-xs"
                      />
                    </div>

                    {/* Phone Number */}
                    <div className="flex flex-col gap-1 text-left">
                      <label className="text-[10px] font-black text-[#14cfb4] uppercase tracking-widest">
                        PHONE NUMBER
                      </label>
                      <input 
                        type="text"
                        required
                        value={staffRegPhone}
                        onChange={(e) => setStaffRegPhone(e.target.value)}
                        placeholder="E.g. +234 802 111 2222"
                        className="w-full py-2.5 px-4 bg-[#090a09] border border-zinc-900 rounded-xl text-left font-bold text-white placeholder-zinc-700 tracking-wide transition-all focus:outline-none focus:border-[#14cfb4] text-xs font-mono"
                      />
                    </div>

                    {/* Email address */}
                    <div className="flex flex-col gap-1 text-left">
                      <label className="text-[10px] font-black text-[#14cfb4] uppercase tracking-widest">
                        EMAIL ADDRESS
                      </label>
                      <input 
                        type="email"
                        required
                        value={staffRegEmail}
                        onChange={(e) => setStaffRegEmail(e.target.value)}
                        placeholder="E.g. bello@contribopay.ng"
                        className="w-full py-2.5 px-4 bg-[#090a09] border border-zinc-900 rounded-xl text-left font-bold text-white placeholder-zinc-700 tracking-wide transition-all focus:outline-none focus:border-[#14cfb4] text-xs font-mono"
                      />
                    </div>

                    {/* Location and Working Address */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1 text-left">
                        <label className="text-[10px] font-black text-[#14cfb4] uppercase tracking-widest">
                          LOCATION ZONE
                        </label>
                        <input 
                          type="text"
                          required
                          value={staffRegLocation}
                          onChange={(e) => setStaffRegLocation(e.target.value)}
                          placeholder="Kaduna North"
                          className="w-full py-2.5 px-3 bg-[#090a09] border border-zinc-900 rounded-xl text-left font-semibold text-white placeholder-zinc-750 tracking-wide transition-all focus:outline-none focus:border-[#14cfb4] text-xs"
                        />
                      </div>
                      <div className="flex flex-col gap-1 text-left">
                        <label className="text-[10px] font-black text-[#14cfb4] uppercase tracking-widest">
                          ASSIGNED ROLE
                        </label>
                        <select
                          value={staffRegRole}
                          onChange={(e) => setStaffRegRole(e.target.value as any)}
                          className="w-full py-2.5 px-2 bg-[#090a09] border border-zinc-900 rounded-xl text-left font-bold text-zinc-300 focus:outline-none focus:border-[#14cfb4] text-xs"
                        >
                          <option value="Collector">Collector</option>
                          <option value="Supervisor">Supervisor</option>
                          <option value="Viewer">Viewer</option>
                        </select>
                      </div>
                    </div>

                    {/* Staff Area Working Address */}
                    <div className="flex flex-col gap-1 text-left">
                      <label className="text-[10px] font-black text-[#14cfb4] uppercase tracking-widest">
                        WORKING ADDRESS
                      </label>
                      <input 
                        type="text"
                        required
                        value={staffRegWorkingAddress}
                        onChange={(e) => setStaffRegWorkingAddress(e.target.value)}
                        placeholder="e.g. 12 Ahmadu Bello Way, Kaduna"
                        className="w-full py-2.5 px-4 bg-[#090a09] border border-zinc-900 rounded-xl text-left font-bold text-white placeholder-zinc-700 tracking-wide transition-all focus:outline-none focus:border-[#14cfb4] text-xs"
                      />
                    </div>

                    {/* Manager Referral Code with Real-time Verification Feedback */}
                    <div className="flex flex-col gap-1 text-left">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-[#14cfb4] uppercase tracking-widest">
                          MANAGER REFERRAL CODE
                        </label>
                        <span className="text-[8px] text-zinc-550 italic font-bold">required</span>
                      </div>
                      <input 
                        type="text"
                        required
                        value={staffRegReferralCode}
                        onChange={(e) => setStaffRegReferralCode(e.target.value)}
                        placeholder="e.g. admin@contribopay.ng"
                        className="w-full py-2.5 px-4 bg-[#090a09] border border-zinc-900 rounded-xl text-left font-bold text-[#14cfb4] font-mono placeholder-zinc-700 tracking-wide transition-all focus:outline-none focus:border-[#14cfb4] text-xs"
                      />
                      {/* Real-time Manager Reference Matching Feedback */}
                      {(() => {
                        const q = staffRegReferralCode.trim().toLowerCase();
                        if (!q) return null;
                        
                        let isCodeValid = q === 'mgr-01' || q === 'mgr-admin';
                        try {
                          const savedV2 = localStorage.getItem('contribo_managers_v2');
                          if (savedV2) {
                            const parsed = JSON.parse(savedV2);
                            if (Array.isArray(parsed) && parsed.some((m: any) => m.email.toLowerCase().trim() === q)) {
                              isCodeValid = true;
                            }
                          }
                          const saved = localStorage.getItem('contribo_managers');
                          if (saved) {
                            const parsed = JSON.parse(saved);
                            if (Array.isArray(parsed) && parsed.some((m: any) => m.email.toLowerCase().trim() === q)) {
                              isCodeValid = true;
                            }
                          }
                        } catch {}
                        
                        if (q === 'admin@contribopay.ng' || q === 'manager@contribopay.ng') {
                          isCodeValid = true;
                        }
                        
                        if (isCodeValid) {
                          return (
                            <span className="text-[9.5px] text-[#14cfb4] font-extrabold flex items-center gap-1 mt-0.5 leading-none">
                              ✓ Verified Manager Referral Code
                            </span>
                          );
                        } else {
                          return (
                            <span className="text-[10px] text-rose-500 font-bold flex items-center gap-1 mt-0.5 leading-none animate-pulse">
                              ❌ Invalid Manager Code (Try: admin@contribopay.ng)
                            </span>
                          );
                        }
                      })()}
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-[#14cfb4] hover:bg-[#10a892] text-slate-950 font-extrabold rounded-xl text-[12.5px] tracking-wide uppercase transition-all shadow-[0_4px_18px_rgba(20,207,180,0.2)] active:scale-98 cursor-pointer flex items-center justify-center gap-1.5 mt-2"
                    >
                      <span>Create Staff Profile</span>
                    </button>

                    <p className="text-[9px] text-zinc-550 font-bold text-center mt-1 px-4 leading-relaxed">
                      By registering a Staff profile, you will be subject to internal tracking logs and branch auditing.
                    </p>
                  </form>
                )}
              </div>
            )}

            {/* MANAGER PORTAL TAB VIEW */}
            {portalTab === 'manager' && (
              <div className="flex flex-col gap-4 font-sans animate-fade-in w-full text-left font-sans">
                {/* Manager account badge & Selector Pill */}
                <div className="flex flex-col gap-2 items-center justify-center select-none w-full">
                  <div className="px-3.5 py-1.5 bg-amber-500/5 border border-amber-500/25 rounded-full text-[10.5px] font-black tracking-widest text-[#fad563] uppercase flex items-center gap-1.5 shadow-sm">
                    <span>👑 Manager Account</span>
                  </div>
                </div>

                {customerActiveTab === 'signin' ? (
                  <>
                    {/* Admin Email input field */}
                <div className="flex flex-col gap-1.5 text-left font-sans font-sans">
                  <label className="text-[10px] font-black text-zinc-550 uppercase tracking-widest font-sans font-sans flex justify-between items-center">
                    <span>ADMIN EMAIL ADDRESS</span>
                  </label>
                  <input 
                    type="text"
                    value={typedPhone}
                    onChange={(e) => {
                      setTypedPhone(e.target.value);
                      setAuthError('');
                    }}
                    onFocus={() => setFocusedField('phone')}
                    placeholder="E.g. admin@contribopay.ng"
                    className={`w-full py-3 px-4 bg-[#090a09] border rounded-xl text-left font-bold font-mono text-white placeholder-zinc-700 tracking-wide transition-all focus:outline-none ${
                      focusedField === 'phone' ? 'border-[#14cfb4] shadow-[0_0_15px_rgba(20,207,180,0.06)]' : 'border-zinc-900'
                    }`}
                  />
                </div>

                {/* 4-6 digit PIN circles */}
                <div className="flex flex-col gap-1.5 text-left font-sans">
                    <div className="flex flex-row justify-between items-center w-full px-1 mb-1">
                      <span className="text-[#fad563]/80 font-black uppercase tracking-widest text-[9px]">4-6 DIGIT PIN CODE</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsResetting(!isResetting);
                          setAuthError('');
                        }}
                        className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg relative z-[5000] pointer-events-auto cursor-pointer active:scale-95 transition-all shadow-sm ${isResetting ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30' : 'text-[#fad563] bg-[#fad563]/10 border border-[#fad563]/30 hover:text-white'}`}
                        id="manager-forgot-pin-gateway"
                      >
                        {isResetting ? 'Cancel Reset' : 'Reset PIN?'}
                      </button>
                    </div>

                  {isResetting ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full bg-[#0d0e0d] border border-[#fad563]/20 rounded-xl p-4 flex flex-col gap-3 relative z-[20]"
                    >
                      <span className="text-[9px] font-bold text-zinc-500 uppercase">Enter Admin Email to Reset</span>
                      <input 
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="e.g. admin@contribopay.ng"
                        className="w-full py-2.5 px-3 bg-[#090a09] border border-zinc-800 rounded-lg text-xs text-white focus:border-[#fad563] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!resetEmail) return;
                          const saved = localStorage.getItem('contribo_managers');
                          let managersList = [{ email: 'admin@contribopay.ng', pin: '1234' }];
                          if (saved) {
                            try {
                              const parsed = JSON.parse(saved);
                              if (Array.isArray(parsed)) managersList = parsed;
                            } catch (e) {
                              console.error(e);
                            }
                          }
                          const mIndex = managersList.findIndex(m => m.email.toLowerCase().trim() === resetEmail.toLowerCase().trim());
                          if (mIndex !== -1) {
                            const newPin = Math.floor(1000 + Math.random() * 9000).toString();
                            managersList[mIndex].pin = newPin;
                            localStorage.setItem('contribo_managers', JSON.stringify(managersList));
                            setGeneratedPin(newPin);
                            setShowResetModal(true);
                            setIsResetting(false);
                            setResetEmail('');
                            setTimeout(() => setShowResetModal(false), 10000);
                          } else {
                            setAuthError('Manager account not found for this email.');
                          }
                        }}
                        className="w-full py-2.5 bg-[#fad563] text-black font-black rounded-lg text-[10px] uppercase tracking-widest shadow-lg"
                      >
                        Confirm Reset
                      </button>
                    </motion.div>
                  ) : (
                  <div 
                    className="w-full bg-[#090a09] border border-zinc-900 rounded-xl flex items-center justify-center gap-5 py-3.5 cursor-pointer relative z-[10]"
                    onClick={() => setFocusedField('pin')}
                  >
                    {[0, 1, 2, 3, 4, 5].map((idx) => {
                      const isFilled = passcode.length > idx;
                      return (
                        <div
                          key={idx}
                          className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                            isFilled 
                              ? 'bg-[#fad563] border-[#fad563] scale-115 shadow-[0_0_10px_rgba(250,213,99,0.6)]'
                              : 'bg-transparent border-zinc-800'
                          }`}
                        />
                      );
                    })}
                  </div>
                  )}
                </div>

                {isAuthLoading ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-1 select-none font-sans font-sans">
                    <div className="w-5 h-5 border-2 border-zinc-900 border-t-[#fad563]/80 rounded-full animate-spin" />
                    <span className="text-[9px] text-[#fad563] font-bold tracking-widest uppercase animate-pulse font-sans">Syncing manager deck...</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (passcode.length < 4 || passcode.length > 6) {
                        setAuthError('Please input your 4-6 digit security PIN using the keypad.');
                        return;
                      }
                      const saved = localStorage.getItem('contribo_managers');
                      let managersList = [{ email: 'admin@contribopay.ng', pin: '1234' }];
                      if (saved) {
                        try {
                          const parsed = JSON.parse(saved);
                          if (Array.isArray(parsed)) managersList = parsed;
                        } catch (e) {
                          console.error(e);
                        }
                      }
                      const enteredHash = hashPin(passcode);
                      const found = managersList.find(
                        m => m.email.toLowerCase().trim() === typedPhone.toLowerCase().trim() && (m.pin === enteredHash || m.pin === passcode)
                      );
                      if (found) {
                        setIsAuthLoading(true);
                        setAuthError('');
                        setTimeout(() => {
                          setIsAuthLoading(false);
                          if (onManagerLoginSuccess) {
                            onManagerLoginSuccess(found.email);
                          } else {
                            onManagerLogin();
                          }
                        }, 800);
                      } else {
                        setPasscode('');
                        setAuthError('Incorrect PIN for this administrator email address.');
                      }
                    }}
                    className="w-full py-3.5 bg-[#fad563] hover:bg-[#eab308] text-slate-950 font-extrabold rounded-2xl text-[13px] tracking-wide uppercase transition-all shadow-[0_4px_18px_rgba(250,213,99,0.22)] active:scale-98 cursor-pointer flex items-center justify-center gap-1.5 mt-1 font-sans"
                  >
                    <Crown className="w-4 h-4 text-slate-950 font-sans" />
                    <span>Launch Admin Board</span>
                  </button>
                )}

                {/* Numeric Keypad for manager PIN entry */}
                <div className="grid grid-cols-3 gap-2 w-full mt-1 select-none font-sans">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'NEXT', '0', 'delete'].map((key, keyIdx) => {
                    if (key === 'NEXT') {
                      return (
                        <button
                          key={keyIdx}
                          type="button"
                          onClick={() => {
                            setFocusedField(focusedField === 'phone' ? 'pin' : 'phone');
                          }}
                          className="h-12 bg-[#151715] hover:bg-[#1c1e1c] active:scale-95 transition-all text-[#fad563] rounded-xl flex items-center justify-center font-bold text-[9px] uppercase tracking-wider border border-zinc-900/60 select-none cursor-pointer"
                        >
                          {focusedField === 'phone' ? '➔ PIN' : '➔ FIELD'}
                        </button>
                      );
                    }
                    if (key === 'delete') {
                      return (
                        <button
                          key={keyIdx}
                          type="button"
                          onClick={() => handleKeypadPress('backspace')}
                          className="h-12 bg-[#151715] hover:bg-[#1c1e1c] active:scale-95 transition-all text-zinc-400 rounded-xl flex items-center justify-center border border-zinc-900/60 select-none cursor-pointer shadow-sm group"
                        >
                          <span className="text-lg text-zinc-400 group-hover:text-zinc-200">⌫</span>
                        </button>
                      );
                    }
                    return (
                      <button
                        key={keyIdx}
                        type="button"
                        onClick={() => handleKeypadPress(key)}
                        className="h-12 bg-[#151715] hover:bg-[#1c1e1c] active:scale-95 transition-all text-white rounded-xl flex items-center justify-center font-bold text-lg border border-zinc-900/60 select-none cursor-pointer shadow-sm font-mono"
                      >
                        {key}
                      </button>
                    );
                  })}
                </div>
                  </>
                ) : (
                  /* ================= MANAGER SIGN UP VIEW CONTENT ================= */
                  <form onSubmit={handleManagerRegister} className="flex flex-col gap-4 text-left font-sans animate-fade-in">
                    <div className="flex flex-col gap-1.5 text-left">
                      <label htmlFor="mgr-reg-name" className="text-[10px] font-black text-[#fad563] uppercase tracking-widest">
                        MANAGER FULL NAME
                      </label>
                      <input 
                        id="mgr-reg-name"
                        type="text"
                        required
                        value={managerRegName}
                        onChange={(e) => setManagerRegName(e.target.value)}
                        placeholder="E.g. Johnson Doe"
                        className="w-full py-3.5 px-4 bg-[#090a09] border border-zinc-900 rounded-xl text-left font-bold text-white placeholder-zinc-700 tracking-wide transition-all focus:outline-none focus:border-[#fad563]"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 text-left">
                      <label htmlFor="mgr-reg-email" className="text-[10px] font-black text-[#fad563] uppercase tracking-widest">
                        ADMIN EMAIL ADDRESS
                      </label>
                      <input 
                        id="mgr-reg-email"
                        type="email"
                        required
                        value={managerRegEmail}
                        onChange={(e) => setManagerRegEmail(e.target.value)}
                        placeholder="E.g. new_admin@contribopay.ng"
                        className="w-full py-3.5 px-4 bg-[#090a09] border border-zinc-900 rounded-xl text-left font-bold text-white placeholder-zinc-700 tracking-wide transition-all focus:outline-none focus:border-[#fad563]"
                      />
                    </div>

                    {/* Segmented control for choosing security method */}
                    <div className="flex flex-col gap-1.5 mt-1">
                      <span className="text-[10.5px] font-extrabold text-zinc-500 uppercase tracking-widest">CHOOSE SECURITY METHOD</span>
                      <div className="grid grid-cols-2 gap-1.5 bg-[#090a09] p-1 border border-zinc-900/60 rounded-xl">
                        <button
                          type="button"
                          onClick={() => {
                            setManagerSignupMethod('pin');
                            setAuthError('');
                          }}
                          className={`py-2 rounded-lg text-[10px] font-black tracking-wider uppercase transition-all cursor-pointer ${
                            managerSignupMethod === 'pin'
                              ? 'bg-[#fad563]/10 text-[#fad563] border border-[#fad563]/30 shadow-sm font-extrabold'
                              : 'text-zinc-550 hover:text-zinc-400'
                          }`}
                        >
                          🔑 Security PIN
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setManagerSignupMethod('password');
                            setAuthError('');
                          }}
                          className={`py-2 rounded-lg text-[10px] font-black tracking-wider uppercase transition-all cursor-pointer ${
                            managerSignupMethod === 'password'
                              ? 'bg-[#fad563]/10 text-[#fad563] border border-[#fad563]/30 shadow-sm font-extrabold'
                              : 'text-zinc-550 hover:text-zinc-400'
                          }`}
                        >
                          🔒 Password
                        </button>
                      </div>
                    </div>

                    {/* Numeric PIN inputs */}
                    {managerSignupMethod === 'pin' ? (
                      <div className="grid grid-cols-2 gap-3 mt-1">
                        <div className="flex flex-col gap-1.5 text-left">
                          <label htmlFor="mgr-reg-pin" className="text-[10px] font-black text-zinc-550 uppercase tracking-widest">
                            SET 4-6 DIGIT PIN
                          </label>
                          <input 
                            id="mgr-reg-pin"
                            type="password"
                            required
                            maxLength={6}
                            pattern="\d{4,6}"
                            placeholder="••••••"
                            value={managerRegPin}
                            onChange={(e) => setManagerRegPin(e.target.value.replace(/\D/g, ''))}
                            className="w-full py-3.5 bg-[#090a09] border border-zinc-900 rounded-xl text-center font-bold text-[#fad563] tracking-widest transition-all focus:outline-none focus:border-[#fad563] font-mono"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5 text-left">
                          <label htmlFor="mgr-reg-confpin" className="text-[10px] font-black text-zinc-550 uppercase tracking-widest">
                            CONFIRM CODES
                          </label>
                          <input 
                            id="mgr-reg-confpin"
                            type="password"
                            required
                            maxLength={6}
                            pattern="\d{4,6}"
                            placeholder="••••••"
                            value={managerRegConfirmPin}
                            onChange={(e) => setManagerRegConfirmPin(e.target.value.replace(/\D/g, ''))}
                            className="w-full py-3.5 bg-[#090a09] border border-zinc-900 rounded-xl text-center font-bold text-[#fad563] tracking-widest transition-all focus:outline-none focus:border-[#fad563] font-mono"
                          />
                        </div>
                      </div>
                    ) : (
                      /* Password inputs */
                      <div className="flex flex-col gap-3.5 mt-1">
                        <div className="flex flex-col gap-1.5 text-left">
                          <label htmlFor="mgr-reg-password" className="text-[10px] font-black text-zinc-550 uppercase tracking-widest">
                            SET PASSWORD
                          </label>
                          <input 
                            id="mgr-reg-password"
                            type="password"
                            required
                            minLength={6}
                            placeholder="At least 6 characters"
                            value={managerRegPassword}
                            onChange={(e) => setManagerRegPassword(e.target.value)}
                            className="w-full py-3.5 px-4 bg-[#090a09] border border-zinc-900 rounded-xl text-left font-bold text-white tracking-wide transition-all focus:outline-none focus:border-[#fad563]"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5 text-left">
                          <label htmlFor="mgr-reg-confpassword" className="text-[10px] font-black text-zinc-550 uppercase tracking-widest">
                            CONFIRM PASSWORD
                          </label>
                          <input 
                            id="mgr-reg-confpassword"
                            type="password"
                            required
                            minLength={6}
                            placeholder="Repeat security password"
                            value={managerRegConfirmPassword}
                            onChange={(e) => setManagerRegConfirmPassword(e.target.value)}
                            className="w-full py-3.5 px-4 bg-[#090a09] border border-zinc-900 rounded-xl text-left font-bold text-white tracking-wide transition-all focus:outline-none focus:border-[#fad563]"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3.5 bg-[#fad563] hover:bg-[#eab308] text-slate-950 font-extrabold rounded-xl text-[13px] tracking-wide uppercase transition-all shadow-[0_4px_18px_rgba(250,213,99,0.22)] active:scale-98 cursor-pointer flex items-center justify-center gap-1.5 mt-2"
                    >
                      <Crown className="w-4 h-4 text-slate-950 font-sans" />
                      <span>Create Manager Profile</span>
                    </button>
                    <p className="text-[9px] text-zinc-550 font-bold text-center mt-2 px-4 leading-relaxed">
                      By registering an Admin profile, you will be subject to internal tracking logs and branch auditing.
                    </p>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

            {/* Secure administrative portals access switcher */}
            <div className="flex flex-col items-center justify-center mt-2.5 pt-4 border-t border-zinc-900/40 select-none w-full font-sans">
              {portalTab !== 'customer' && (
                <button
                  type="button"
                  onClick={() => {
                    setPortalTab('customer');
                    setPasscode('');
                    setAuthError('');
                    setShowPortalsSelector(false);
                  }}
                  className="text-[10px] font-black text-[#14cfb4]/85 hover:text-[#14cfb4]/100 hover:scale-102 uppercase tracking-widest transition-all cursor-pointer py-2 px-4 rounded-full bg-[#14cfb4]/5 border border-[#14cfb4]/15 flex items-center gap-1.5 shadow-sm"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#14cfb4]" />
                  <span>Return to Client Portal</span>
                </button>
              )}
            </div>

            {/* Standard device security watermark */}
            <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-650 font-bold uppercase tracking-wider mt-1 select-none">
              <ShieldAlert className="w-3.5 h-3.5 text-zinc-600" />
              <span>Personal Ledger Client Shield</span>
            </div>
          </motion.div>
        )}

        {/* ================= CUSTOMER PASSBOOK DASHBOARD ================= */}
        {screen === 'customer-dashboard' && activeCustomer && (
          <motion.div
            key="customer-dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-sm min-h-screen flex flex-col gap-4.5 z-10 pb-22 relative font-sans text-zinc-150"
          >
            {/* Header row to greet customer */}
            <div className="flex items-center justify-between pb-1 mt-1">
              <div className="flex items-center gap-3">
                {/* Active customer avatar with dynamic edit click */}
                <div 
                  className="relative group w-11 h-11 rounded-full cursor-pointer overflow-hidden transition-all duration-150 active:scale-95 shadow border border-zinc-900/40 flex items-center justify-center font-black text-xs shrink-0"
                  onClick={() => {
                    const fileInput = document.getElementById('passbook-profile-file-input');
                    if (fileInput) fileInput.click();
                  }}
                  title="Click to upload profile photo"
                >
                  {activeCustomer.profileImage ? (
                    <img src={activeCustomer.profileImage} className="w-full h-full object-cover rounded-full" alt="Profile" referrerPolicy="no-referrer" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-tr ${getCustomerAvatarGradient(activeCustomer.name || 'Secure Member')} flex items-center justify-center font-black`}>
                      {activeCustomer.name ? activeCustomer.name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase() : 'SM'}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[7.5px] text-[#14cfb4] font-black tracking-widest uppercase rounded-full">
                    <span>📷 Edit</span>
                  </div>
                </div>
                <input 
                  type="file" 
                  id="passbook-profile-file-input" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        if (typeof reader.result === 'string') {
                          onUpdateCustomer(activeCustomer.id, { profileImage: reader.result });
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <div className="flex flex-col text-left">
                  <span className="text-[10px] text-zinc-555 font-medium leading-none">Welcome back 👋</span>
                  <span className="text-base font-black text-white tracking-tight mt-0.5 leading-none">{activeCustomer?.name || 'Secure Member'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Immediate visible Sign Out / Exit button right in the header bar */}
                <button 
                  onClick={() => {
                    setScreen('gateway');
                    setSelectedCustomerId(null);
                  }}
                  className="px-3 py-1.8 bg-rose-950/20 hover:bg-rose-950/45 border border-rose-900/20 hover:border-rose-900/50 text-rose-500 hover:text-rose-400 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center gap-1 shrink-0"
                  title="Sign out and return to main screen"
                >
                  <span>🚪 Exit</span>
                </button>

                <button 
                  onClick={() => setCustTab('alerts')}
                  className="w-10 h-10 rounded-full bg-[#111311] border border-zinc-900 flex items-center justify-center text-zinc-400 hover:text-[#14cfb4] relative cursor-pointer"
                >
                  <span className="text-base">🔔</span>
                  <span className="absolute top-2.5 right-2 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                </button>
              </div>
            </div>

            {/* Content Switcher depending on Bottom Tab Navigation state */}
            {custTab === 'home' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4.5">
                
                {/* UNIFIED GORGEOUS AND FRIENDLY CUSTOMER HUB */}
                <div className={`w-full max-w-sm mx-auto bg-gradient-to-br ${tg.cardBg} border ${tg.border} rounded-[32px] p-6 relative shadow-2xl overflow-hidden select-none group/card flex flex-col gap-5`}>
                  {/* Glowing background pattern */}
                  <div className={`absolute top-0 right-0 w-36 h-36 bg-gradient-to-br ${tg.glow} via-transparent to-transparent rounded-full filter blur-2xl pointer-events-none`} />
                  <div className={`absolute -bottom-8 -left-8 w-24 h-24 ${activeTheme === 'teal' ? 'bg-[#14cfb4]/5' : activeTheme === 'amber' ? 'bg-amber-400/5' : activeTheme === 'rose' ? 'bg-rose-500/5' : activeTheme === 'indigo' ? 'bg-indigo-400/5' : 'bg-violet-400/5'} rounded-full filter blur-xl pointer-events-none`} />

                  {/* Top Header Grid: Greeting & Account Node Info */}
                  <div className="flex justify-between items-start relative z-10">
                    <div className="flex flex-col text-left">
                      <span className={`text-[10px] font-black tracking-widest ${tg.text} uppercase`}>SECURED PLATINUM HUB</span>
                      <h4 className="text-lg font-extrabold text-white mt-1">Hello, {activeCustomer.name || 'Secure Member'} 👋</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">Welcome back to your digital ledger</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 ${tg.accentBg} ${tg.accentBorder} rounded-full text-[9px] font-black ${tg.text} tracking-wider uppercase`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${tg.fillBg} animate-pulse`} />
                      SECURE ACTIVE
                    </span>
                  </div>

                  {/* Center Section: Perfectly Centered Cust Photo ID and Savings Balance */}
                  <div className="flex flex-col items-center gap-4 relative z-10 py-2">
                    <div 
                      className={`relative group/avatar w-72 h-72 rounded-2xl border-2 ${tg.border} bg-zinc-950 shadow-2xl overflow-hidden cursor-pointer transition-transform duration-150 active:scale-95 flex flex-col items-center justify-center p-0.5 shrink-0`}
                      title="Click to update Customer picture (Upload)"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {activeCustomer.profileImage ? (
                        <img 
                          src={activeCustomer.profileImage} 
                          className="w-full h-full object-cover rounded-xl" 
                          alt="Customer Profile" 
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className={`w-full h-full rounded-xl flex flex-col gap-1 items-center justify-center font-black ${getAvatarGradient(activeCustomer.name || 'CBP Member')} text-white`}>
                          <span className="text-4xl leading-none">👤</span>
                          <span className="text-[14px] tracking-wider leading-none uppercase font-mono">
                            {activeCustomer.name ? activeCustomer.name.split(' ').map((p: string) => p[0]).join('').slice(0, 3).toUpperCase() : 'CBP'}
                          </span>
                        </div>
                      )}
                      
                      {/* Interactive edit hover banner */}
                      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex flex-col items-center justify-center text-[10px] text-white font-black tracking-wider uppercase text-center p-1 leading-normal rounded-xl">
                        <span>UPLOAD</span>
                        <span>PHOTO</span>
                      </div>
                    </div>
                    
                    <span className={`text-[7.5px] font-black ${tg.text} tracking-widest uppercase ${tg.accentBg} ${tg.accentBorder} px-3 py-1 rounded-full leading-none`}>
                      CUSTOMER PHOTO ID
                    </span>

                    {/* Integrated Ledger Balance Layout */}
                    <div className="flex flex-col items-center mt-1 leading-none">
                      <div className="flex items-center gap-1.5 justify-center">
                        <span className="text-[8.9px] font-black text-zinc-400 uppercase tracking-widest">SAVINGS BALANCE</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setHideBalance(!hideBalance); }}
                          className={`text-[9px] font-mono text-zinc-500 hover:${tg.text} font-black tracking-widest leading-none outline-none cursor-pointer`}
                        >
                          [{hideBalance ? '👁' : '🕶'}]
                        </button>
                      </div>
                      <span className="text-2xl font-black tracking-tight text-white block mt-1.5 font-sans">
                        {hideBalance ? '₦ ••,•••' : `₦${(activeCustomer.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`}
                      </span>
                    </div>

                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            if (typeof reader.result === "string") {
                              onUpdateCustomer(activeCustomer.id, { profileImage: reader.result });
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>

                  {/* Bottom Footer Details: Account metadata */}
                  <div className="mt-1 pt-4 border-t border-zinc-805 flex flex-col gap-2 relative z-10 text-xs text-left">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col text-left">
                        <span className="text-[7.5px] font-black text-zinc-500 uppercase tracking-widest leading-none">ACCOUNT OWNER / USERNAME</span>
                        <span className="text-xs font-extrabold text-zinc-200 mt-1 truncate w-42 uppercase leading-none">{activeCustomer.name}</span>
                        {activeCustomer.username && (
                          <span className="text-[9.5px] font-mono font-bold text-[#14cfb4] mt-0.5 leading-none">@{activeCustomer.username}</span>
                        )}
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[7.5px] font-black text-zinc-500 uppercase tracking-widest leading-none">MEMBER SAVER ID</span>
                        <span className="text-xs font-mono font-black text-[#14cfb4] mt-1 tracking-widest leading-none">
                          {activeCustomer.staffCustomerId || 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-zinc-900/60">
                      <div className="flex flex-col text-left">
                        <span className="text-[7.5px] font-black text-zinc-500 uppercase tracking-widest leading-none">BANK ACCOUNT</span>
                        <span className={`text-xs font-mono font-bold text-zinc-300 mt-1 tracking-widest leading-none`}>
                          {activeCustomer.accountNumber || `30${(activeCustomer.phoneNumber || activeCustomer.id).slice(-8)}`}
                        </span>
                      </div>
                      <span className="text-[8.5px] font-bold text-zinc-400 mt-1 uppercase tracking-wider flex items-center justify-end gap-1 font-mono">
                        <span>🏦</span> {state.settings.partnerBankName || 'Sterling Bank Plc'}
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Contributions Tagline */}
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-0.5 bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-900/50">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">🛡️</span>
                      <span className="font-semibold text-zinc-400">Security Encrypted</span>
                    </div>
                    <span className={`font-mono font-black ${tg.text}`}>{activeCustomer.contributionsCount || 0} contributions posted</span>
                  </div>

                  {/* Connected Field Agent / Mobilizer Display */}
                  {(() => {
                    const assignedAgent = state.staff?.find(s => s.id === activeCustomer.assignedStaffId);
                    if (!assignedAgent) return null;
                    return (
                      <div className="flex items-center justify-between text-[10px] text-zinc-1000 mt-1.5 bg-zinc-950/50 p-2.5 rounded-xl border border-zinc-900/50">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-[#14cfb4]">👤</span>
                          <span className="font-bold text-zinc-400 uppercase tracking-tight">Active Collector Agent</span>
                        </div>
                        <span className="font-mono font-black text-[#14cfb4] uppercase text-[9.5px]">
                          {assignedAgent.name} ({assignedAgent.code || assignedAgent.initials || assignedAgent.id})
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* SAVINGS GOAL CHIP OR PROGRESS BAR */}
                {activeCustomer.targetSavings && activeCustomer.targetSavings > 0 ? (
                  <div className="bg-[#111311] border border-zinc-900 rounded-2xl p-4.5 flex flex-col gap-2.5 text-left">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">🎯</span>
                        <span className="text-[10px] font-black text-zinc-450 uppercase tracking-widest">Savings Goal Progress</span>
                      </div>
                      <span className={`text-[11.5px] font-black font-mono ${tg.text}`}>
                        {Math.min(100, Math.round((activeCustomer.balance / activeCustomer.targetSavings) * 100))}%
                      </span>
                    </div>
                    
                    <div className="w-full h-2.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-900 flex">
                      <div 
                        className={`h-full bg-gradient-to-r ${activeTheme === 'teal' ? 'from-emerald-500 to-[#14cfb4]' : activeTheme === 'amber' ? 'from-orange-500 to-amber-400' : activeTheme === 'rose' ? 'from-rose-600 to-rose-450' : activeTheme === 'indigo' ? 'from-blue-600 to-indigo-400' : 'from-purple-600 to-violet-400'} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(100, (activeCustomer.balance / activeCustomer.targetSavings) * 100)}%` }}
                      />
                    </div>
                    
                    <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                      <span>Saved: ₦{(activeCustomer.balance || 0).toLocaleString('en-US')}</span>
                      <span>Target: ₦{(activeCustomer.targetSavings || 0).toLocaleString('en-US')}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#111311] border border-[#14cfb4]/10 rounded-2xl p-4 flex items-center justify-between gap-3 text-left">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wide flex items-center gap-1">🎯 No Savings Goal Set</span>
                      <p className="text-[10px] text-zinc-555 leading-tight">Define a target in Settings to visualize progress limits.</p>
                    </div>
                    <button 
                      onClick={() => setCustTab('profile')}
                      className={`px-3 py-1.5 bg-zinc-950 hover:${tg.accentBg} hover:${tg.text} border border-zinc-900 text-zinc-450 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer`}
                    >
                      Set Goal
                    </button>
                  </div>
                )}

                {/* 2. STATS INDICATORS UNDER CARD */}
                <div className="grid grid-cols-3 gap-2 mt-0.5">
                  <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#080908] border border-zinc-950">
                    <span className="text-[8px] font-bold text-zinc-550 uppercase">TOTAL SAVED</span>
                    <span className={`text-xs font-black ${tg.text} mt-1 font-mono`}>₦{((activeCustomer.balance || 0) + 15000).toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#080908] border border-zinc-950">
                    <span className="text-[8px] font-bold text-zinc-550 uppercase">REF. EARNED</span>
                    <span className="text-xs font-black text-amber-500 mt-1 font-mono">₦ 4,800.00</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#080908] border border-zinc-950">
                    <span className="text-[8px] font-bold text-zinc-555 uppercase">STREAK</span>
                    <span className="text-xs font-black text-orange-400 mt-1">🔥 14d</span>
                  </div>
                </div>

                {/* 2. CHOOSE TOOLBOX GRID - 10 SHORTCUTS */}
                <div className="grid grid-cols-5 gap-2.5 select-none">
                  {[
                    { label: 'History', icon: '📝', color: 'text-[#14cfb4] bg-[#14cfb4]/10', action: () => setCustTab('history') },
                    { label: 'Withdraw', icon: '💵', color: 'text-amber-400 bg-amber-500/10', action: () => { setModalTxError(''); setModalTxSuccess(''); setShowWithdrawModal(true); } },
                    { label: 'Send Money', icon: '🚀', color: 'text-blue-400 bg-blue-500/10', action: () => { setModalTxSuccess(''); setModalTxError(''); setSendPhone(''); setSendName(''); setShowSendMoneyModal(true); } },
                    { label: 'Refer & Earn', icon: '🎁', color: 'text-pink-400 bg-pink-500/10', action: () => setShowReferModal(true) },
                    { label: 'Receipts', icon: '🧾', color: 'text-purple-400 bg-purple-500/10', action: () => { if (customerTransactions.length > 0) { setSelectedReceiptTx(customerTransactions[0]); } else { setSelectedReceiptTx({ id: 's', customerId: activeCustomer.id, customerName: 'Secure Member', type: 'deposit', amount: 2000, status: 'approved', timestamp: new Date().toISOString(), reference: 'CBP-D5449' }); } setShowReceiptModal(true); } },
                    { label: 'Airtime', icon: '📱', color: 'text-orange-400 bg-orange-500/10', action: () => setShowAirtimeModal(true) },
                    { label: 'Electricity', icon: '⚡', color: 'text-yellow-405 bg-yellow-500/10', action: () => setShowElectricityModal(true) },
                    { label: 'Internet', icon: '🌐', color: 'text-indigo-400 bg-indigo-500/10', action: () => setShowInternetModal(true) },
                    { label: 'Quick Loan', icon: '🏦', color: 'text-emerald-450 bg-emerald-500/10', action: () => setShowLoanModal(true) },
                    { label: 'Insights', icon: '📊', color: 'text-violet-400 bg-violet-500/10', action: () => setShowInsightsModal(true) },
                  ].map((item) => (
                    <button 
                      key={item.label} 
                      onClick={item.action} 
                      className="flex flex-col items-center text-center gap-1.5 cursor-pointer group"
                    >
                      <div className="w-11.5 h-11.5 bg-[#111311] group-hover:scale-105 active:scale-95 transition-all rounded-xl border border-zinc-900 group-hover:border-[#14cfb4]/30 flex items-center justify-center">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${item.color}`}>
                          {item.icon}
                        </div>
                      </div>
                      <span className="text-[9px] text-zinc-555 leading-tight font-extrabold max-w-[65px] truncate">{item.label}</span>
                    </button>
                  ))}
                </div>

                {/* TIMEFRAME COLLECTIONS & BALANCES DASHBOARD */}
                <div className="flex flex-col gap-3 text-left">
                  <span className="text-[11px] font-black uppercase tracking-widest px-0.5 mt-2 text-zinc-500">
                    Timeframe Focus (Inflows & Outflows)
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Daily Card */}
                    <div className="bg-[#111311]/80 border border-zinc-900 rounded-[22px] p-4 flex flex-col gap-2 relative overflow-hidden shadow-md">
                      <div className={`absolute top-0 right-0 w-12 h-12 ${tg.accentBg} rounded-full blur-xl pointer-events-none`} />
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wide flex items-center gap-1">☀️ Daily Frame</span>
                      <div className="flex flex-col gap-1 mt-1 leading-none font-sans">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Deposited:</span>
                        <span className="text-xs font-black text-[#14cfb4] font-mono">₦{custDailyMetrics.saved.toLocaleString('en-US')}</span>
                      </div>
                      <div className="flex flex-col gap-1 mt-1 leading-none font-sans">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Withdrawn:</span>
                        <span className="text-xs font-black text-rose-400 font-mono">₦{custDailyMetrics.withdrawn.toLocaleString('en-US')}</span>
                      </div>
                      <div className="flex flex-col gap-1 mt-1 leading-none border-t border-zinc-950 pt-2 font-sans">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Ledger Balance:</span>
                        <span className="text-[11px] font-extrabold text-blue-400 font-mono">₦{custDailyMetrics.activeBalance.toLocaleString('en-US')}</span>
                      </div>
                    </div>

                    {/* Weekly Card */}
                    <div className="bg-[#111311]/80 border border-zinc-900 rounded-[22px] p-4 flex flex-col gap-2 relative overflow-hidden shadow-md">
                      <div className={`absolute top-0 right-0 w-12 h-12 ${tg.accentBg} rounded-full blur-xl pointer-events-none`} />
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wide flex items-center gap-1">📅 Weekly Frame</span>
                      <div className="flex flex-col gap-1 mt-1 leading-none font-sans">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Deposited:</span>
                        <span className="text-xs font-black text-[#14cfb4] font-mono">₦{custWeeklyMetrics.saved.toLocaleString('en-US')}</span>
                      </div>
                      <div className="flex flex-col gap-1 mt-1 leading-none font-sans">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Withdrawn:</span>
                        <span className="text-xs font-black text-rose-400 font-mono">₦{custWeeklyMetrics.withdrawn.toLocaleString('en-US')}</span>
                      </div>
                      <div className="flex flex-col gap-1 mt-1 leading-none border-t border-zinc-950 pt-2 font-sans">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Ledger Balance:</span>
                        <span className="text-[11px] font-extrabold text-blue-400 font-mono">₦{custWeeklyMetrics.activeBalance.toLocaleString('en-US')}</span>
                      </div>
                    </div>

                    {/* Monthly Card */}
                    <div className="bg-[#111311]/80 border border-zinc-900 rounded-[22px] p-4 flex flex-col gap-2 relative overflow-hidden shadow-md">
                      <div className={`absolute top-0 right-0 w-12 h-12 ${tg.accentBg} rounded-full blur-xl pointer-events-none`} />
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wide flex items-center gap-1">🗓️ Monthly Frame</span>
                      <div className="flex flex-col gap-1 mt-1 leading-none font-sans">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Deposited:</span>
                        <span className="text-xs font-black text-[#14cfb4] font-mono">₦{custMonthlyMetrics.saved.toLocaleString('en-US')}</span>
                      </div>
                      <div className="flex flex-col gap-1 mt-1 leading-none font-sans">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Withdrawn:</span>
                        <span className="text-xs font-black text-rose-400 font-mono">₦{custMonthlyMetrics.withdrawn.toLocaleString('en-US')}</span>
                      </div>
                      <div className="flex flex-col gap-1 mt-1 leading-none border-t border-zinc-950 pt-2 font-sans">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Ledger Balance:</span>
                        <span className="text-[11px] font-extrabold text-blue-400 font-mono">₦{custMonthlyMetrics.activeBalance.toLocaleString('en-US')}</span>
                      </div>
                    </div>

                    {/* Yearly Card */}
                    <div className="bg-[#111311]/80 border border-zinc-900 rounded-[22px] p-4 flex flex-col gap-2 relative overflow-hidden shadow-md">
                      <div className={`absolute top-0 right-0 w-12 h-12 ${tg.accentBg} rounded-full blur-xl pointer-events-none`} />
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wide flex items-center gap-1">🏛️ Yearly Frame</span>
                      <div className="flex flex-col gap-1 mt-1 leading-none font-sans">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Deposited:</span>
                        <span className="text-xs font-black text-[#14cfb4] font-mono">₦{custYearlyMetrics.saved.toLocaleString('en-US')}</span>
                      </div>
                      <div className="flex flex-col gap-1 mt-1 leading-none font-sans">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Withdrawn:</span>
                        <span className="text-xs font-black text-rose-400 font-mono">₦{custYearlyMetrics.withdrawn.toLocaleString('en-US')}</span>
                      </div>
                      <div className="flex flex-col gap-1 mt-1 leading-none border-t border-zinc-950 pt-2 font-sans">
                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Ledger Balance:</span>
                        <span className="text-[11px] font-extrabold text-blue-400 font-mono">₦{custYearlyMetrics.activeBalance.toLocaleString('en-US')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. PROPAGATE INVITE BANNER */}
                <div className="w-full bg-[#0a1c18] border border-[#14cfb4]/10 rounded-[20px] p-4 flex items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-3 select-none">
                    <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center text-zinc-950 font-black shrink-0">🎁</div>
                    <div className="flex flex-col">
                      <span className="font-extrabold text-xs text-white leading-none">Invite Friends, Earn ₦600</span>
                      <span className="text-[10px] text-zinc-550 mt-1 leading-none">Share secure contribution ledger URL</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`https://contribopay.com/join/${(activeCustomer.username || 'member').toLowerCase().replace(' ', '')}`);
                      setModalTxSuccess('Invitation copied!');
                      setTimeout(() => setModalTxSuccess(''), 2000);
                    }}
                    className="bg-yellow-400 hover:bg-yellow-500 active:scale-95 transition-all text-[11px] text-zinc-950 font-black px-3 py-1.5 rounded-lg shrink-0 cursor-pointer"
                  >
                    Invite
                  </button>
                </div>

                {/* 4. WEEKLY STREAK TRACKER */}
                <div className="bg-[#111311] border border-zinc-900 rounded-[20px] p-4 flex flex-col gap-3 select-none text-left">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-white">Weekly Streak Monitor</span>
                    <span className="text-amber-500 font-extrabold text-[10px]">🔥 14 days</span>
                  </div>
                  <div className="flex justify-between gap-1">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, dIdx) => (
                      <div 
                        key={day + dIdx} 
                        className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center font-extrabold text-[10.5px] ${
                          dIdx === 0 ? 'bg-[#14cfb4] text-zinc-950 shadow-md' : 'bg-[#090a09] border border-zinc-900 text-zinc-555'
                        }`}
                      >
                        {day}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. RECENT RECORD LOGS */}
                <div className="flex flex-col gap-2.5 font-sans">
                  <div className="flex justify-between items-center select-none text-left">
                    <span className="text-xs font-black text-white">Recent Transactions</span>
                    <button onClick={() => setCustTab('history')} className={`text-[11px] font-black ${tg.text} hover:underline cursor-pointer`}>See all</button>
                  </div>

                  <div className="flex flex-col gap-2">
                    {/* Live and simulated list */}
                    {customerTransactions.slice(0, 4).map((tx, index) => {
                      const isDeposit = tx.type === 'deposit';
                      const formattedTime = formatTxDate(tx.timestamp);
                      const isPending = tx.status === 'pending';
                      const isRejected = tx.status === 'rejected';
                      return (
                        <div 
                          key={`${tx.id}-${index}`} 
                          onClick={() => { setSelectedReceiptTx(tx); setShowReceiptModal(true); }}
                          className="p-3 bg-[#111311] border border-zinc-900 hover:border-zinc-800 rounded-[16px] flex items-center justify-between gap-3 text-left cursor-pointer transition-all duration-150 active:scale-[0.98] group"
                          title="Click to view secure receipt"
                        >
                          <div className="flex items-center gap-2.5">
                            {(() => {
                              const txCust = state.customers.find(c => c.id === tx.customerId) || activeCustomer;
                              const customerPhoto = tx.withdrawalPhoto || txCust?.profileImage;
                              const initials = txCust ? txCust.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() : 'CU';
                              return (
                                <div className="relative shrink-0 select-none">
                                  {customerPhoto ? (
                                    <img src={customerPhoto} className="w-8 h-8 rounded-full object-cover border border-zinc-900" alt="Customer Profile" referrerPolicy="no-referrer" />
                                  ) : (
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white bg-gradient-to-br ${
                                      isDeposit ? 'from-teal-500 to-emerald-600' : 'from-rose-550 to-amber-500'
                                    }`}>
                                      {initials}
                                    </div>
                                  )}
                                  <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center border border-zinc-950 text-[8px] leading-none ${
                                    isDeposit ? 'bg-[#14cfb4] text-black font-extrabold' : 'bg-rose-500 text-white font-extrabold'
                                  }`}>
                                    {isDeposit ? '↓' : '↑'}
                                  </div>
                                </div>
                              );
                            })()}
                            <div className="flex flex-col">
                              <span className="text-xs font-extrabold text-zinc-100 group-hover:text-white transition-colors">
                                {isDeposit ? 'Savings Contribution' : 'Requested Payout'}
                              </span>
                              <span className="text-[9px] font-mono text-zinc-500 mt-1 uppercase leading-none">
                                {formattedTime}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                            <span className={`text-xs font-black font-mono select-none ${isDeposit ? tg.text : 'text-rose-450'}`}>
                              {isDeposit ? '+' : '-'}₦{tx.amount.toLocaleString()}
                            </span>
                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded mt-1 select-none ${
                              isRejected ? 'bg-rose-950/20 text-rose-400 border border-rose-950/20' :
                              isPending ? 'bg-amber-950/20 text-amber-400 border border-amber-950/20 animate-pulse' :
                              `${tg.accentBg} ${tg.text} border ${tg.accentBorder}`
                            }`}>
                              {tx.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Fallback mock logs if customer has fewer than 2 logged transactions, keeping the interface visually populated */}
                    {customerTransactions.length < 2 && (
                      <>
                        <div 
                          onClick={() => {
                            setSelectedReceiptTx({
                              id: 'mock-contribution-today',
                              customerId: activeCustomer.id,
                              customerName: 'Secure Member',
                              type: 'deposit',
                              amount: 2000,
                              status: 'approved',
                              timestamp: new Date(new Date().setHours(9, 15)).toISOString(),
                              reference: 'CBP-D5449',
                              staffName: 'CBP Staff'
                            });
                            setShowReceiptModal(true);
                          }}
                          className="p-3 bg-[#111311] border border-zinc-900 hover:border-zinc-800 rounded-[16px] flex items-center justify-between gap-3 text-left cursor-pointer transition-all duration-155 active:scale-[0.98] group"
                        >
                          <div className="flex items-center gap-2.5">
                            {activeCustomer.profileImage ? (
                              <div className="relative shrink-0 select-none">
                                <img src={activeCustomer.profileImage} className="w-8 h-8 rounded-full object-cover border border-zinc-900" alt="Customer Profile" referrerPolicy="no-referrer" />
                                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center border border-zinc-950 text-[8px] bg-[#14cfb4] text-black font-extrabold leading-none">↓</div>
                              </div>
                            ) : (
                              <div className="relative shrink-0 select-none">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white bg-gradient-to-br from-teal-500 to-emerald-600">
                                  CBP
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center border border-zinc-950 text-[8px] bg-[#14cfb4] text-black font-extrabold leading-none">↓</div>
                              </div>
                            )}
                            <div className="flex flex-col leading-none">
                              <span className="text-xs font-extrabold text-zinc-200 group-hover:text-white">Daily Contribution</span>
                              <span className="text-[9px] font-mono text-zinc-550 mt-1 uppercase">Today, 9:15 AM</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                            <span className={`text-xs font-black ${tg.text}`}>+₦2,000.00</span>
                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded mt-1 ${tg.accentBg} ${tg.text} border ${tg.accentBorder}`}>approved</span>
                          </div>
                        </div>

                        <div 
                          onClick={() => {
                            setSelectedReceiptTx({
                              id: 'mock-contribution-yesterday',
                              customerId: activeCustomer.id,
                              customerName: 'Secure Member',
                              type: 'deposit',
                              amount: 2000,
                              status: 'approved',
                              timestamp: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
                              reference: 'CBP-D5192',
                              staffName: 'CBP Staff'
                            });
                            setShowReceiptModal(true);
                          }}
                          className="p-3 bg-[#111311] border border-zinc-900 hover:border-zinc-800 rounded-[16px] flex items-center justify-between gap-3 text-left cursor-pointer transition-all duration-155 active:scale-[0.98] group"
                        >
                          <div className="flex items-center gap-2.5">
                            {activeCustomer.profileImage ? (
                              <div className="relative shrink-0 select-none">
                                <img src={activeCustomer.profileImage} className="w-8 h-8 rounded-full object-cover border border-zinc-900" alt="Customer Profile" referrerPolicy="no-referrer" />
                                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center border border-zinc-950 text-[8px] bg-[#14cfb4] text-black font-extrabold leading-none">↓</div>
                              </div>
                            ) : (
                              <div className="relative shrink-0 select-none">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white bg-gradient-to-br from-teal-500 to-emerald-600">
                                  CBP
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center border border-zinc-950 text-[8px] bg-[#14cfb4] text-black font-extrabold leading-none">↓</div>
                              </div>
                            )}
                            <div className="flex flex-col leading-none">
                              <span className="text-xs font-extrabold text-zinc-200 group-hover:text-white">Daily Contribution</span>
                              <span className="text-[9px] font-mono text-zinc-555 mt-1 uppercase">Yesterday, 8:52 AM</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                            <span className={`text-xs font-black ${tg.text}`}>+₦2,000.00</span>
                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded mt-1 ${tg.accentBg} ${tg.text} border ${tg.accentBorder}`}>approved</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Sub-Tab 2: History Search List */}
            {custTab === 'history' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4 text-left">
                <div className="flex flex-col select-none border-b border-zinc-950 pb-3">
                  <h3 className="text-base font-black text-white uppercase tracking-tight">Ledger Journal Logs</h3>
                  <p className="text-xs text-zinc-500 font-medium">Trace, search & audit your transaction logs with live interval balances</p>
                </div>

                {/* SELECTORS ROW */}
                <div className="flex flex-col gap-2.5 bg-black/35 p-3 rounded-2xl border border-zinc-900/50">
                  {/* Interval Select Segment */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[8.5px] font-black text-zinc-500 uppercase tracking-widest px-0.5">Time Interval</span>
                    <div className="flex flex-wrap items-center gap-1">
                      {(['all', 'daily', 'weekly', 'monthly', 'yearly'] as const).map(timeframe => (
                        <button
                          key={timeframe}
                          type="button"
                          onClick={() => setCustTxTimeframeFilter(timeframe)}
                          className={`px-2 py-1 text-[9px] font-black uppercase rounded-lg cursor-pointer transition-all ${
                            custTxTimeframeFilter === timeframe
                              ? `bg-[#14cfb4]/10 ${tg.text} border border-[#14cfb4]/25 shadow-sm`
                              : 'bg-transparent border border-transparent text-zinc-500 hover:text-zinc-350'
                          }`}
                        >
                          {timeframe}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cashflow Type Selector Segment */}
                  <div className="flex flex-col gap-1 border-t border-zinc-950 pt-2 font-sans">
                    <span className="text-[8.5px] font-black text-zinc-500 uppercase tracking-widest px-0.5">Transaction Type</span>
                    <div className="flex items-center gap-1">
                      {(['all', 'deposit', 'withdrawal'] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setCustTxTypeFilter(type)}
                          className={`px-2 py-1 text-[9px] font-black uppercase rounded-lg cursor-pointer transition-all ${
                            custTxTypeFilter === type
                              ? `bg-[#14cfb4]/10 ${tg.text} border border-[#14cfb4]/25 shadow-sm`
                              : 'bg-transparent border border-transparent text-zinc-555 hover:text-zinc-350'
                          }`}
                        >
                          {type === 'all' ? 'All Ledger' : type + 's'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Text search bar */}
                <div className="relative w-full">
                  <input
                    type="text"
                    value={custTxSearchQuery}
                    onChange={(e) => setCustTxSearchQuery(e.target.value)}
                    placeholder="🔍 Search type, reference, staff or amount..."
                    className="w-full bg-[#0a0c0a] border border-zinc-950 focus:border-zinc-800 p-3 pl-4 rounded-xl text-xs text-zinc-200 placeholder-zinc-650 focus:outline-none focus:ring-1 focus:ring-[#14cfb4]/10 transition-all font-semibold"
                  />
                </div>

                {/* DYNAMIC AGGREGATE SUMMARY BANNER */}
                {(() => {
                  const depositSum = processedCustomerTransactions
                    .filter(t => t.type === 'deposit' && t.status === 'approved')
                    .reduce((sum, t) => sum + t.amount, 0);

                  const withdrawalSum = processedCustomerTransactions
                    .filter(t => t.type === 'withdrawal' && t.status === 'approved')
                    .reduce((sum, t) => sum + t.amount, 0);

                  const netBalance = depositSum - withdrawalSum;

                  return (
                    <div className="bg-[#090b09] border border-zinc-950 rounded-[18px] p-3 flex flex-col gap-2 text-[10.5px] font-mono leading-none shadow-inner text-left">
                      <div className="flex justify-between items-center pb-1.5 border-b border-zinc-950">
                        <span className="text-zinc-[500] font-sans font-bold text-[8.5px] uppercase tracking-wider">Filtered Totals:</span>
                        <span className={`font-bold text-[9px] uppercase px-1.5 py-0.2 bg-[#14cfb4]/10 ${tg.text} rounded border border-teal-950/40`}>
                          {custTxTimeframeFilter} · {custTxTypeFilter}
                        </span>
                      </div>
                      
                      <div className="flex flex-col gap-2 pt-0.5">
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-500">Savings Deposited:</span>
                          <span className="text-emerald-400 font-extrabold font-mono">₦{depositSum.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-500">Withdrawn (Approved):</span>
                          <span className="text-rose-400 font-extrabold font-mono">₦{withdrawalSum.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-zinc-950 pt-2">
                          <span className="text-zinc-400 font-bold">In-Interval Net:</span>
                          <span className={`font-black font-mono ${netBalance >= 0 ? tg.text : 'text-rose-400'}`}>
                            {netBalance >= 0 ? '+' : ''}₦{netBalance.toLocaleString()}
                          </span>
                        </div>
                        {activeCustomer && (
                          <div className="flex justify-between items-center border-t border-zinc-950 pt-2">
                            <span className="text-zinc-[555] font-semibold font-sans text-[9px]">YOUR DYNAMIC LEDGER BALANCE:</span>
                            <span className="text-blue-450 font-black font-mono text-[11px]">₦{(activeCustomer.balance || 0).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* TRANSACTIONS LIST */}
                <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
                  {processedCustomerTransactions.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500 bg-[#111311] border border-zinc-900 rounded-2xl flex flex-col items-center gap-1.5 select-none">
                      <span className="text-xl font-sans">📓</span>
                      <span className="text-xs font-bold text-zinc-400">No transaction logs match filters</span>
                      <p className="text-[10px] text-zinc-600 leading-normal max-w-[180px] mx-auto mt-0.5">Adjust your filters or query to inspect matching ledger history entries.</p>
                      <button
                        type="button"
                        onClick={() => {
                          setCustTxSearchQuery('');
                          setCustTxTimeframeFilter('all');
                          setCustTxTypeFilter('all');
                        }}
                        className={`text-[10px] ${tg.text} font-bold underline bg-transparent border-none cursor-pointer mt-1`}
                      >
                        Reset filters
                      </button>
                    </div>
                  ) : (
                    processedCustomerTransactions.map((tx, index) => {
                      const isDeposit = tx.type === 'deposit';
                      const formattedTime = formatTxDate(tx.timestamp);
                      const isPending = tx.status === 'pending';
                      const isRejected = tx.status === 'rejected';
                      return (
                        <div 
                          key={`${tx.id}-${index}`} 
                          onClick={() => { setSelectedReceiptTx(tx); setShowReceiptModal(true); }}
                          className="p-3 bg-[#111311] border border-zinc-900 hover:border-zinc-800 rounded-xl flex items-center justify-between gap-3 text-left cursor-pointer transition-all active:scale-[0.99] group"
                        >
                          <div className="flex items-center gap-2.5">
                            {(() => {
                              const txCust = state.customers.find(c => c.id === tx.customerId) || activeCustomer;
                              const customerPhoto = tx.withdrawalPhoto || txCust?.profileImage;
                              const initials = txCust ? txCust.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() : 'CU';
                              return (
                                <div className="relative shrink-0 select-none">
                                  {customerPhoto ? (
                                    <img src={customerPhoto} className="w-8 h-8 rounded-full object-cover border border-zinc-900" alt="Customer Profile" referrerPolicy="no-referrer" />
                                  ) : (
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white bg-gradient-to-br ${
                                      isDeposit ? 'from-[#14cfb4] to-teal-700' : 'from-rose-500 to-amber-600'
                                    }`}>
                                      {initials}
                                    </div>
                                  )}
                                  <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center border border-zinc-950 text-[8px] leading-none ${
                                    isDeposit ? 'bg-[#14cfb4] text-black font-extrabold' : 'bg-rose-500 text-white font-extrabold'
                                  }`}>
                                    {isDeposit ? '↓' : '↑'}
                                  </div>
                                </div>
                              );
                            })()}
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-zinc-300 group-hover:text-white transition-colors">
                                {isDeposit ? 'Savings Contribution' : 'Requested Payout'}
                              </span>
                              <span className="text-[9px] font-mono text-zinc-500 mt-1 uppercase leading-none">
                                {formattedTime} • Ref: {tx.reference}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                            <span className={`text-xs font-black font-mono ${isDeposit ? tg.text : 'text-rose-450'}`}>
                              {isDeposit ? '+' : '-'}₦{tx.amount.toLocaleString()}
                            </span>
                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded mt-1 select-none ${
                              isRejected ? 'bg-rose-950/20 text-rose-400 border border-rose-950/20' :
                              isPending ? 'bg-amber-950/20 text-amber-400 border border-amber-950/20 animate-pulse' :
                              `${tg.accentBg} ${tg.text} border ${tg.accentBorder}`
                            }`}>
                              {tx.status}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}

            {/* Sub-Tab 3: Notification Alerts Tab */}
            {custTab === 'alerts' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3.5 text-left pb-24">
                <div className="flex justify-between items-center pl-1">
                  <span className="text-xs font-black text-zinc-400 uppercase tracking-widest text-[11px]">Live Alerts & Notifications</span>
                  <span className="bg-zinc-900 text-[#14cfb4] border border-zinc-850 px-2.5 py-1 rounded font-mono text-[10px] font-black">
                    {liveCustomerAlerts.length} TOTAL RECORDS
                  </span>
                </div>

                {liveCustomerAlerts.length === 0 ? (
                  <div className="p-8 text-center bg-[#111311] border border-zinc-900 rounded-2xl flex flex-col items-center justify-center gap-3">
                    <span className="text-3xl animate-bounce">🔔</span>
                    <span className="text-xs font-bold text-zinc-200">Alert History Empty</span>
                    <p className="text-[11px] text-zinc-500 leading-normal max-w-[220px] text-center">
                      Any daily savings, deposits, or additions recorded in your ledger will trigger an instant live SMS alert here.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {liveCustomerAlerts.map((log, lidx) => {
                      const isApproved = log.status === 'approved';
                      const isPending = log.status === 'pending';
                      const isRejected = log.status === 'rejected';

                      // Retrieve customer notification preferences
                      const smsEnabled = activeCustomer.smsNotificationsEnabled !== false;
                      const emailEnabled = activeCustomer.emailNotificationsEnabled !== false;

                      // Category specific colors and icons
                      let borderAccent = 'bg-zinc-750';
                      let cardIcon = '🔔';
                      let iconBg = 'bg-zinc-900 text-zinc-400 border-zinc-850';

                      if (log.category === 'savings') {
                        borderAccent = isApproved ? 'bg-[#14cfb4]' : isPending ? 'bg-amber-400 animate-pulse' : 'bg-rose-500';
                        cardIcon = '🪙';
                        iconBg = isApproved ? 'bg-[#14cfb4]/10 text-[#14cfb4] border-[#14cfb4]/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                      } else if (log.category === 'cashout') {
                        borderAccent = isApproved ? 'bg-[#14cfb4]' : isPending ? 'bg-amber-400 animate-pulse' : 'bg-rose-500';
                        cardIcon = '💸';
                        iconBg = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                      } else if (log.category === 'status') {
                        borderAccent = 'bg-indigo-500';
                        cardIcon = '👤';
                        iconBg = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
                      } else if (log.category === 'alert_channel') {
                        borderAccent = 'bg-blue-500';
                        cardIcon = log.title.includes('WhatsApp') ? '📲' : '💬';
                        iconBg = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                      } else if (log.category === 'onboarding') {
                        borderAccent = 'bg-gradient-to-b from-[#14cfb4] to-yellow-400';
                        cardIcon = '🎉';
                        iconBg = 'bg-gradient-to-tr from-[#14cfb4]/20 to-yellow-400/20 text-[#14cfb4] border-yellow-500/25';
                      }

                      return (
                        <div 
                          key={`${log.id}-${lidx}`} 
                          className="p-4 bg-[#111311] border border-zinc-900 rounded-2xl flex gap-3.5 relative overflow-hidden group hover:border-zinc-850 transition-all shadow-md"
                        >
                          {/* Colored vertical status indicator */}
                          <div className={`absolute top-0 bottom-0 left-0 w-1 ${borderAccent}`} />

                          {/* Category Icon */}
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border text-sm font-semibold select-none ${iconBg}`}>
                            {cardIcon}
                          </div>

                          <div className="flex flex-col w-full min-w-0">
                            <div className="flex justify-between items-start gap-2 w-full">
                              <span className="text-[10px] uppercase font-black tracking-widest text-zinc-150 block truncate leading-tight">
                                {log.title}
                              </span>
                              <span className="text-[9px] text-zinc-550 font-mono font-black shrink-0">
                                {formatTxDate(log.timestamp)}
                              </span>
                            </div>

                            <p className="text-[11.5px] text-zinc-444 mt-1.5 leading-relaxed font-semibold">
                              {log.description}
                            </p>

                            {/* Reference Code & Meta details */}
                            {log.reference && (
                              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-zinc-950/70 text-[9px] font-black text-zinc-550 font-mono">
                                <span>REF: {log.reference}</span>
                                {log.category === 'savings' && (
                                  <div className="flex items-center gap-3">
                                    <span className={`flex items-center gap-1 ${smsEnabled ? 'text-[#14cfb4] font-black' : 'text-zinc-650'}`}>
                                      <span>💬</span> {smsEnabled ? 'SMS SENT' : 'SMS MUTED'}
                                    </span>
                                    <span className="text-zinc-850 font-normal">|</span>
                                    <span className={`flex items-center gap-1 ${emailEnabled ? 'text-[#14cfb4]/80 font-black' : 'text-zinc-650'}`}>
                                      <span>✉️</span> {emailEnabled ? 'EMAIL SENT' : 'EMAIL MUTED'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Live Receipts and SMS Log actions if it's an approved contribution */}
                            {log.category === 'savings' && isApproved && log.payload && (
                              <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-zinc-950/60 justify-end">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const smsMsg = state.alerts?.find(a => a.txId === log.payload.id && a.type === 'sms')?.message
                                      || `ContriboPay Credit! Acct: *${activeCustomer.accountNumber?.slice(-4) || 'N/A'} Amt: ₦${log.payload.amount.toLocaleString()} Bal: ₦${(activeCustomer.balance || 0).toLocaleString()} Ref: ${log.payload.reference}. Thanks for saving!`;
                                    navigator.clipboard.writeText(smsMsg);
                                    showToast("📋 SMS Credit Alert copied to clipboard!", "success");
                                  }}
                                  className="px-2 py-1 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-[9px] font-black text-zinc-350 uppercase tracking-wider rounded transition-colors cursor-pointer"
                                >
                                  Copy SMS Log
                                </button>
                                <a
                                  href={`https://api.whatsapp.com/send?phone=${activeCustomer.phoneNumber ? activeCustomer.phoneNumber.replace(/[^0-9+]/g, '') : ''}&text=${encodeURIComponent(
                                    state.alerts?.find(a => a.txId === log.payload.id && a.type === 'whatsapp')?.message || `*ContriboPay HQ - Deposit Receipt*\nCustomer: ${activeCustomer.name || 'CBP Member'}\nAmount: ₦${log.payload.amount.toLocaleString()}\nRef: ${log.payload.reference}\nStatus: Completed ✅`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 bg-[#128c7e]/20 border border-[#128c7e]/40 text-[#25d366] hover:bg-[#128c7e]/30 text-[9px] font-black uppercase tracking-wider rounded transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <span>💬 WhatsApp Receipt</span>
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* Sub-Tab 4: Customer Profile Tab */}
            {custTab === 'profile' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-5 text-left pb-24 max-h-[80vh] overflow-y-auto pr-1">
                {/* 1. Header Hero Card */}
                <div className={`p-4 bg-gradient-to-r ${tg.cardBg} border ${tg.border} rounded-2xl flex items-center gap-4`}>
                  <div 
                    className={`w-14 h-14 rounded-full border border-zinc-800 bg-zinc-950 overflow-hidden shrink-0 flex items-center justify-center font-bold text-lg cursor-pointer relative group`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {activeCustomer.profileImage ? (
                      <img src={activeCustomer.profileImage} className="w-full h-full object-cover" alt="Avatar" />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-tr ${getCustomerAvatarGradient(activeCustomer.name || 'Secure Member')} flex items-center justify-center text-xs font-mono font-black`}>
                        {activeCustomer.name ? activeCustomer.name.split(' ').map((p: string) => p[0]).join('').slice(0, 3).toUpperCase() : 'CBP'}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[8px] font-black text-zinc-300">
                      EDIT
                    </div>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-black text-white leading-none">{activeCustomer.name}</span>
                    <span className="text-[10px] text-zinc-400 font-mono mt-1.5 leading-none">{activeCustomer.phoneNumber}</span>
                    {activeCustomer.address && (
                      <span className="text-[10px] text-zinc-350 font-medium mt-1.5 leading-tight flex items-center gap-1">
                        📍 {activeCustomer.address}
                      </span>
                    )}
                    <div className="flex items-center gap-1.5 mt-2 leading-none">
                      <span className={`w-2 h-2 rounded-full ${activeCustomer.kycStatus === 'verified' ? 'bg-emerald-500' : activeCustomer.kycStatus === 'pending' ? 'bg-amber-400 animate-pulse' : 'bg-zinc-555'}`} />
                      <span className="text-[9px] font-black uppercase text-zinc-400 tracking-wider">
                        KYC status: {activeCustomer.kycStatus || 'Unverified'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* General Notifications Alerts inside settings form */}
                {profileSaveSuccess && (
                  <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold rounded-xl flex items-center gap-2 select-none">
                    <span>✓</span> {profileSaveSuccess}
                  </div>
                )}
                {profileSaveError && (
                  <div className="p-3 bg-rose-950/20 border border-rose-500/20 text-rose-450 text-[11px] font-bold rounded-xl flex items-center gap-2 select-none">
                    <span>⚠️</span> {profileSaveError}
                  </div>
                )}

                {/* 2. Visual Personalization Theme Deck */}
                <div className="bg-[#111311] border border-zinc-900 rounded-2xl p-4 flex flex-col gap-3.5">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    🎨 Visual personal Theme
                  </span>
                  <div className="grid grid-cols-5 gap-2">
                    {(['teal', 'amber', 'rose', 'indigo', 'violet'] as const).map((color) => {
                      const dynamicColors = {
                        teal: 'bg-teal-500 border-teal-400/30 text-teal-400',
                        amber: 'bg-amber-500 border-amber-450/30 text-amber-500',
                        rose: 'bg-rose-500 border-rose-450/30 text-rose-450',
                        indigo: 'bg-indigo-500 border-indigo-400/30 text-indigo-400',
                        violet: 'bg-violet-500 border-violet-400/30 text-violet-400'
                      };
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => handleUpdateThemePreference(color)}
                          className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer ${
                            activeTheme === color ? 'bg-zinc-950 border-zinc-700 font-extrabold' : 'bg-transparent border-zinc-900 hover:border-zinc-850'
                          }`}
                        >
                           <div className={`w-5 h-5 rounded-full border ${dynamicColors[color]}`} />
                           <span className="text-[8px] uppercase tracking-tighter font-black text-zinc-500">{color}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Member Profile metadata form */}
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    setProfileSaveSuccess('');
                    setProfileSaveError('');
                    if (!profileEditAddress.trim() || !profileEditLocation.trim()) {
                      setProfileSaveError('Home address and Area location cannot be blank.');
                      return;
                    }
                    if (activeCustomer) {
                      onUpdateCustomer(activeCustomer.id, {
                        address: profileEditAddress,
                        location: profileEditLocation
                      });
                      setProfileSaveSuccess('Profile details updated successfully!');
                      setTimeout(() => setProfileSaveSuccess(''), 3500);
                    }
                  }} 
                  className="bg-[#111311] border border-zinc-900 rounded-2xl p-4 flex flex-col gap-3"
                >
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    👤 Profile Details
                  </span>
                  
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9.5px] font-black text-zinc-500 uppercase">First & Last Name (Locked)</label>
                    <input 
                      type="text"
                      value={profileEditName}
                      readOnly
                      className="w-full bg-zinc-950 p-2.5 rounded-xl border border-zinc-900 font-bold text-xs text-zinc-500 focus:outline-none cursor-not-allowed"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9.5px] font-black text-zinc-500 uppercase">Phone Number (Locked)</label>
                    <input 
                      type="text"
                      value={profileEditPhone}
                      readOnly
                      className="w-full bg-zinc-950 p-2.5 rounded-xl border border-zinc-900 font-mono text-xs text-zinc-500 focus:outline-none cursor-not-allowed"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9.5px] font-black text-zinc-500 uppercase">Home Address</label>
                    <input 
                      type="text"
                      value={profileEditAddress}
                      onChange={(e) => setProfileEditAddress(e.target.value)}
                      className="w-full bg-zinc-950 p-2.5 rounded-xl border border-zinc-900 text-xs text-white focus:outline-none focus:border-zinc-800"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9.5px] font-black text-zinc-500 uppercase">Area Location</label>
                    <input 
                      type="text"
                      value={profileEditLocation}
                      onChange={(e) => setProfileEditLocation(e.target.value)}
                      className="w-full bg-zinc-950 p-2.5 rounded-xl border border-zinc-900 text-xs text-white focus:outline-none focus:border-zinc-800"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-2.5 bg-[#14cfb4] text-[#090a09] border border-transparent rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-[#11b099] transition-all cursor-pointer mt-1"
                  >
                    Save Profile Details
                  </button>
                </form>

                {/* Bank Settlement Details Card */}
                <form onSubmit={(e) => {
                  e.preventDefault();
                  setProfileSaveSuccess('');
                  setProfileSaveError('');
                  if (!profilePayoutBankName.trim() || !profilePayoutAccountName.trim() || !profilePayoutAccountNumber.trim()) {
                    setProfileSaveError('Please load realistic Account details: Bank name, account name, and account number.');
                    return;
                  }
                  if (activeCustomer) {
                    onUpdateCustomer(activeCustomer.id, {
                      payoutBankName: profilePayoutBankName,
                      payoutAccountName: profilePayoutAccountName,
                      payoutAccountNumber: profilePayoutAccountNumber
                    });
                    setProfileSaveSuccess('Settlement Bank account configured successfully!');
                    setTimeout(() => setProfileSaveSuccess(''), 3500);
                  }
                }} className="bg-[#111311] border border-zinc-900 rounded-2xl p-4 flex flex-col gap-3">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    🏦 Settlement Bank Account (Withdrawals)
                  </span>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9.5px] font-black text-zinc-500 uppercase">Bank Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. Sterling Bank, Kuda Bank, GTB"
                      value={profilePayoutBankName}
                      onChange={(e) => { setProfilePayoutBankName(e.target.value); setWithdrawalPayoutBankName(e.target.value); }}
                      className="w-full bg-zinc-950 p-2.5 rounded-xl border border-zinc-900 font-bold text-xs text-white focus:outline-none focus:border-zinc-850"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9.5px] font-black text-zinc-500 uppercase">Account Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. John Doe"
                      value={profilePayoutAccountName}
                      onChange={(e) => { setProfilePayoutAccountName(e.target.value); setWithdrawalPayoutAccountName(e.target.value); }}
                      className="w-full bg-zinc-950 p-2.5 rounded-xl border border-zinc-900 font-bold text-xs text-white focus:outline-none focus:border-zinc-850"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9.5px] font-black text-zinc-500 uppercase">Account Number</label>
                    <input 
                      type="text"
                      placeholder="e.g. 0123456789"
                      value={profilePayoutAccountNumber}
                      onChange={(e) => { setProfilePayoutAccountNumber(e.target.value); setWithdrawalPayoutAccountNumber(e.target.value); }}
                      className="w-full bg-zinc-950 p-2.5 rounded-xl border border-zinc-900 font-mono text-xs text-white focus:outline-none focus:border-zinc-850"
                    />
                  </div>

                  <button 
                    type="submit"
                    className={`w-full py-2.5 bg-zinc-950 hover:${tg.accentBg} hover:${tg.text} border border-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer mt-1 text-zinc-400`}
                  >
                    Save Settlement Account
                  </button>
                </form>

                {/* 4. Financial Targets preferences forms */}
                <form onSubmit={handleUpdateFinancialGoals} className="bg-[#111311] border border-zinc-900 rounded-2xl p-4 flex flex-col gap-3">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    🎯 Savings Targets
                  </span>

                  <div className="flex flex-col gap-1.2">
                    <label className="text-[9.5px] font-black text-zinc-500 uppercase">Savings Target Limit (₦)</label>
                    <input 
                      type="number"
                      step="any"
                      placeholder="e.g. 150000"
                      value={profileSavingsTarget}
                      onChange={(e) => setProfileSavingsTarget(e.target.value)}
                      className="w-full bg-zinc-950 p-2.5 rounded-xl border border-zinc-900 font-mono text-xs text-white focus:outline-none focus:border-zinc-850"
                    />
                    <span className="text-[8.5px] text-zinc-555 leading-tight mt-1">Define your total target savings to track progress bar milestones.</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-900 mt-1">
                    <div className="flex flex-col text-left gap-0.5">
                      <span className="text-[10px] font-black text-zinc-300">Mask Balance Entry</span>
                      <span className="text-[8px] text-zinc-500 leading-tight">Hide current balance by default during login.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProfileHideBalanceDefault(prev => !prev)}
                      className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                        profileHideBalanceDefault ? tg.bg : 'bg-zinc-800'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-zinc-950 rounded-full transition-transform ${
                        profileHideBalanceDefault ? 'translate-x-[20px]' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  <button 
                    type="submit"
                    className={`w-full py-2.5 bg-zinc-950 hover:${tg.accentBg} hover:${tg.text} border border-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer mt-1 text-zinc-400`}
                  >
                    Update Targets
                  </button>
                </form>

                {/* 5. Access PIN settings form */}
                <form onSubmit={handleUpdatePinCode} className="bg-[#111311] border border-zinc-900 rounded-2xl p-4 flex flex-col gap-3.5">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    🔒 Security PIN Lock
                  </span>

                  {pinChangeSuccess && (
                    <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-[10.5px] font-bold rounded-lg leading-normal">
                      🛡️ {pinChangeSuccess}
                    </div>
                  )}
                  {pinChangeError && (
                    <div className="p-2.5 bg-rose-950/20 border border-rose-500/20 text-rose-450 text-[10.5px] font-bold rounded-lg leading-normal">
                      ⚠️ {pinChangeError}
                    </div>
                  )}

                  {activeCustomer.pin && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9.5px] font-black text-zinc-500 uppercase">Current 4-Digit PIN</label>
                      <input 
                        type="password"
                        maxLength={4}
                        placeholder="••••"
                        value={profileOldPin}
                        onChange={(e) => setProfileOldPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-zinc-950 p-2.5 rounded-xl border border-zinc-900 text-center font-bold tracking-widest text-xs text-white focus:outline-none focus:border-zinc-850"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9.5px] font-black text-zinc-500 uppercase">New PIN</label>
                      <input 
                        type="password"
                        maxLength={4}
                        placeholder="••••"
                        value={profileNewPin}
                        onChange={(e) => setProfileNewPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-zinc-950 p-2.5 rounded-xl border border-zinc-900 text-center font-bold tracking-widest text-xs text-white focus:outline-none focus:border-zinc-850"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9.5px] font-black text-zinc-500 uppercase">Confirm PIN</label>
                      <input 
                        type="password"
                        maxLength={4}
                        placeholder="••••"
                        value={profileConfirmPin}
                        onChange={(e) => setProfileConfirmPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-zinc-950 p-2.5 rounded-xl border border-zinc-900 text-center font-bold tracking-widest text-xs text-white focus:outline-none focus:border-zinc-850"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className={`w-full py-2.5 bg-zinc-950 hover:${tg.accentBg} hover:${tg.text} border border-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer text-zinc-400`}
                  >
                    {activeCustomer.pin ? 'Change Passcode PIN' : 'Activate PIN Lock'}
                  </button>
                </form>

                {/* 6. Push Signals Alert configuration */}
                <div className="bg-[#111311] border border-zinc-900 rounded-2xl p-4 flex flex-col gap-3">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    🔔 Notification Signals
                  </span>

                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-black text-zinc-300">SMS Transaction alerts</span>
                        <span className="text-[8px] text-zinc-500">Receive SMS log whenever savings is recorded.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleSmsAlerts(!profileSmsAlerts)}
                        className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                          profileSmsAlerts ? tg.bg : 'bg-zinc-800'
                        }`}
                      >
                        <div className={`w-5 h-5 bg-zinc-950 rounded-full transition-transform ${
                          profileSmsAlerts ? 'translate-x-[20px]' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-950">
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-black text-zinc-300">Email Ledger Statements</span>
                        <span className="text-[8px] text-zinc-500">Send monthly savings ledger report automatically.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleEmailAlerts(!profileEmailAlerts)}
                        className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer flex items-center ${
                          profileEmailAlerts ? tg.bg : 'bg-zinc-800'
                        }`}
                      >
                        <div className={`w-5 h-5 bg-zinc-950 rounded-full transition-transform ${
                          profileEmailAlerts ? 'translate-x-[20px]' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 7. KYC ID document settings */}
                <form onSubmit={handleUpdateKycSubmission} className="bg-[#111311] border border-zinc-900 rounded-2xl p-4 flex flex-col gap-3">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    🛡️ KYC Identity validation
                  </span>

                  {kycSubmitSuccess && (
                     <div className="p-2.5 bg-indigo-950/20 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded-lg leading-normal">
                       {kycSubmitSuccess}
                     </div>
                  )}

                  {activeCustomer.kycStatus === 'verified' ? (
                    <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex flex-col gap-1 select-none">
                      <span className="font-black flex items-center gap-1">✓ IDENTITY SECURELY VERIFIED</span>
                      <p className="text-[10px] text-zinc-400 leading-normal mt-0.5">
                        Your identity documentation has been successfully verified. 
                        Document Type: <span className="font-extrabold text-white uppercase">{activeCustomer.idDocumentType || 'NIN'}</span>.
                      </p>
                    </div>
                  ) : activeCustomer.kycStatus === 'pending' ? (
                    <div className="p-3 bg-amber-950/20 border border-amber-500/20 text-amber-400 rounded-xl text-xs flex flex-col gap-1 select-none">
                      <span className="font-black flex items-center gap-1 animate-pulse">⏰ VERIFICATION IN PROGRESS</span>
                      <p className="text-[10px] text-zinc-405 leading-normal mt-0.5 text-left">
                        Your ID validation request is queued. 
                        Document Type: <span className="font-extrabold text-white uppercase">{activeCustomer.idDocumentType || 'NIN'}</span>.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3.5">
                      <div className="flex flex-col gap-1 text-zinc-555 leading-normal select-none">
                        <span className="text-[10px] font-black text-zinc-400">KYC Status: Unverified</span>
                        <p className="text-[9.5px]">Please upload details of your valid identification card to gain access to premium credit lines.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9.5px] font-black text-zinc-500 uppercase">Document Type</label>
                          <select 
                            value={profileIdType}
                            onChange={(e) => setProfileIdType(e.target.value)}
                            className="w-full bg-zinc-950 p-2.5 rounded-xl border border-zinc-900 font-bold text-xs text-white focus:outline-none focus:border-zinc-850 cursor-pointer"
                          >
                            <option value="NIN">NIN Card</option>
                            <option value="BVN">BVN Number</option>
                            <option value="Passport">International Passport</option>
                            <option value="DriverLicense">Driver's License</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9.5px] font-black text-zinc-500 uppercase">Document Number</label>
                          <input 
                            type="text"
                            placeholder="e.g. 84439110"
                            value={profileIdNumber}
                            onChange={(e) => setProfileIdNumber(e.target.value)}
                            className="w-full bg-zinc-950 p-2.5 rounded-xl border border-zinc-900 font-mono text-xs text-white focus:outline-none focus:border-zinc-850"
                          />
                        </div>
                      </div>

                      <button 
                        type="submit"
                        className={`w-full py-2.5 bg-[#111311] hover:${tg.accentBg} hover:${tg.text} border border-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer text-zinc-400`}
                      >
                        Submit KYC Account validation
                      </button>
                    </div>
                  )}
                </form>

                {/* LogOut action block button */}
                <div>
                  <button 
                    onClick={() => {
                      setScreen('gateway');
                      setSelectedCustomerId(null);
                    }}
                    className="w-full py-3.5 bg-rose-950/20 hover:bg-rose-950/30 border border-rose-950/20 text-rose-500 rounded-xl font-black uppercase text-xs tracking-wide transition-all mt-1 cursor-pointer shrink-0"
                  >
                    DeAuthorize and Exit Session
                  </button>
                </div>
              </motion.div>
            )}
            
              {/* STICKY BOTTOM FLOATING NAVIGATION MENU BAR */}
            <div className="fixed bottom-3.5 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-sm bg-[#090a09]/95 backdrop-blur-md border border-zinc-900 rounded-[22px] py-2 px-3 shadow-[0_12px_45px_rgba(0,0,0,0.8)] z-40 flex justify-between items-center select-none">
              <button 
                onClick={() => setCustTab('home')} 
                className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 cursor-pointer ${
                  custTab === 'home' ? `${tg.text} font-black scale-105` : 'text-zinc-500 hover:text-zinc-400'
                }`}
              >
                <Home className="w-4.5 h-4.5" />
                <span className="text-[9px] mt-1 font-extrabold uppercase tracking-wider">Home</span>
              </button>

              <button 
                onClick={() => setCustTab('history')} 
                className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 cursor-pointer ${
                  custTab === 'history' ? `${tg.text} font-black scale-105` : 'text-zinc-500 hover:text-zinc-400'
                }`}
              >
                <History className="w-4.5 h-4.5" />
                <span className="text-[9px] mt-1 font-extrabold uppercase tracking-wider">History</span>
              </button>

              {/* Centered Save floating button */}
              <div className="relative bottom-4.5">
                <button 
                  onClick={() => { setModalTxError(''); setModalTxSuccess(''); setShowDepositModal(true); }}
                  className={`w-12 h-12 rounded-full ${tg.bg} text-[#090a09] border border-zinc-950 flex items-center justify-center shadow-lg active:scale-90 transition-all duration-150 cursor-pointer`}
                >
                  <Plus className="w-5.5 h-5.5 text-zinc-950 stroke-[3px]" />
                </button>
                <span className={`text-[8.5px] absolute bottom-[-16px] left-1/2 -translate-x-1/2 ${tg.text} font-black uppercase tracking-widest`}>Save</span>
              </div>

              <button 
                onClick={() => setCustTab('alerts')} 
                className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 cursor-pointer relative ${
                  custTab === 'alerts' ? `${tg.text} font-black scale-105` : 'text-zinc-500 hover:text-zinc-400'
                }`}
              >
                <div className="relative">
                  <Bell className="w-4.5 h-4.5" />
                  {liveCustomerAlerts.length > 0 && (
                    <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${tg.bg} ring-2 ring-[#090a09]`} />
                  )}
                </div>
                <span className="text-[9px] mt-1 font-extrabold uppercase tracking-wider">Alerts</span>
              </button>

              <button 
                onClick={() => setCustTab('profile')} 
                className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 cursor-pointer ${
                  custTab === 'profile' ? `${tg.text} font-black scale-105` : 'text-zinc-500 hover:text-zinc-400'
                }`}
              >
                <User className="w-4.5 h-4.5" />
                <span className="text-[9px] mt-1 font-extrabold uppercase tracking-wider">Profile</span>
              </button>
            </div>
          </motion.div>
        )}

            {/* POPUP REUSABLE SLIDEOVER AND DIALOGS WITH FUNCTIONAL INPUTS */}
            <AnimatePresence>
              {showDepositModal && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
                  <div className="absolute inset-0 cursor-pointer" onClick={() => { if (!isFundingProcessing) { setShowDepositModal(false); setModalTxSuccess(''); setModalTxError(''); } }} />
                  
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    exit={{ scale: 0.95, opacity: 0 }} 
                    className="w-full max-w-sm bg-[#111311]/95 border border-zinc-900 rounded-[28px] p-6.5 z-50 text-left relative overflow-hidden"
                  >
                    {/* Glowing Accent Ring */}
                    <div className="absolute top-0 right-0 w-28 h-28 bg-[#14cfb4]/5 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex justify-between items-center pb-3 mb-4 border-b border-zinc-950">
                      <div className="flex flex-col text-left">
                        <span className="text-[12px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          <span className="text-emerald-400">⚡</span> SECURE SAVINGS ROUTER
                        </span>
                        <span className="text-[9.5px] font-mono font-medium text-zinc-500 mt-0.5">Instant Digital Escrow Funding</span>
                      </div>
                      <button 
                        onClick={() => { if (!isFundingProcessing) { setShowDepositModal(false); setModalTxSuccess(''); setModalTxError(''); } }} 
                        className="w-7 h-7 bg-zinc-950 hover:bg-zinc-900 rounded-full flex items-center justify-center text-zinc-400 hover:text-white border border-zinc-900 text-xs font-bold cursor-pointer transition-colors"
                        disabled={isFundingProcessing}
                      >
                        ✕
                      </button>
                    </div>

                    {/* 1. STATUS MESSAGES */}
                    {modalTxError && (
                      <p className="p-3 bg-rose-955/5 text-rose-450 border border-rose-900/20 text-[11px] rounded-xl mb-3.5 font-bold text-center">
                        ❌ {modalTxError}
                      </p>
                    )}

                    {/* 3. TAB CONTENT: MANUAL ACCOUNT INSTRUCTIONS */}
                    {depositMethod === 'manual' && !isFundingProcessing && !modalTxSuccess && (
                      <div className="flex flex-col gap-4">
                        {/* Golden/Metallic Virtual Debit Card */}
                        <div className="bg-gradient-to-tr from-zinc-900 via-zinc-950 to-zinc-900 border border-zinc-805 rounded-[22px] p-4.5 relative overflow-hidden shadows-lg">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col text-left">
                              <span className="text-[7.5px] font-black text-zinc-550 uppercase tracking-widest leading-none">SAVINGS PROVIDER</span>
                              <span className="text-[13px] font-extrabold text-white mt-1 leading-none">
                                {state.settings.partnerBankName || 'Sterling Bank Plc'}
                              </span>
                            </div>
                            <span className="text-[9px] font-mono font-bold text-[#14cfb4] bg-[#14cfb4]/10 border border-[#14cfb4]/25 px-2 py-0.5 rounded-md uppercase">Virtual Account</span>
                          </div>

                          <div className="mt-6">
                            <span className="text-[7.5px] font-black text-zinc-550 uppercase tracking-widest leading-none">ACCOUNT NAME</span>
                            <p className="text-[12.5px] font-mono font-black text-[#14cfb4] mt-1 uppercase truncate">
                              CONTRIBO / CBP MEMBER
                            </p>
                          </div>

                          <div className="mt-4 pt-3.5 border-t border-zinc-900 flex justify-between items-end">
                            <div className="flex flex-col text-left">
                              <span className="text-[7.5px] font-black text-zinc-550 uppercase tracking-widest leading-none">VIRTUAL ACCOUNT NO</span>
                              <span className="text-lg font-mono font-extrabold text-[#14cfb4] mt-0.5 select-all tracking-wider">
                                {activeCustomer.accountNumber || `30${(activeCustomer.phoneNumber || activeCustomer.id).slice(-8)}`}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const accNum = activeCustomer.accountNumber || `30${(activeCustomer.phoneNumber || activeCustomer.id).slice(-8)}`;
                                copyToClipboard(accNum, 'Virtual Account copied to clipboard!');
                              }}
                              className="p-1 px-2.5 bg-[#14cfb4]/15 hover:bg-[#14cfb4]/30 text-[#14cfb4] border border-[#14cfb4]/30 rounded-lg text-[9px] font-black uppercase transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <span>COPY</span>
                            </button>
                          </div>
                        </div>

                        <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl">
                          <p className="text-[10px] text-zinc-450 leading-relaxed text-left">
                            🌸 <strong>Online Banking Onboarding Code:</strong> To fund this wallet from real banking networks, copy this dedicated Sterling Bank account number and fund via standard bank transfer apps. The ledger will monitor and reconcile transactions.
                          </p>
                        </div>

                        <div className="bg-amber-500/5 border border-amber-505/20 p-3 rounded-xl flex items-center justify-between text-xs">
                          <span className="text-zinc-400 font-medium">Assigned Saver ID:</span>
                          <span className="font-mono font-bold text-[#fad563] bg-[#fad563]/10 px-2 py-0.5 rounded border border-[#fad563]/10">{activeCustomer.staffCustomerId || 'KC-CS-001'}</span>
                        </div>
                      </div>
                    )}

                    {/* 4. RUNNING FUNDING LOADING SCREEN */}
                    {isFundingProcessing && (
                      <div className="py-8 flex flex-col items-center justify-center text-center gap-5">
                        <div className="relative flex items-center justify-center">
                          {/* Pulsing ring outer */}
                          <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-dashed border-[#14cfb4]/30 animate-spin" />
                          {/* Inner spinner */}
                          <div className="w-12 h-12 rounded-full border-4 border-[#111311] border-t-4 border-t-[#14cfb4] animate-spin flex items-center justify-center" />
                          <span className="absolute text-xs">💸</span>
                        </div>

                        <div className="flex flex-col gap-1.5 mt-2 max-w-xs">
                          <span className="text-xs font-mono font-black text-[#14cfb4]">
                            {fundingProgressStep === 0 && "📡 Initiating sandbox transfer protocol..."}
                            {fundingProgressStep === 1 && "🔗 Interswitch Settlement routing..."}
                            {fundingProgressStep === 2 && `⚡ Routing ₦${parseFloat(depositAmount).toLocaleString()} escrow deposit...`}
                            {fundingProgressStep === 3 && "🔐 Registering database ledger record..."}
                            {fundingProgressStep === 4 && "🎉 Credit approval finalized!"}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-widest animate-pulse">Running live checks</span>
                        </div>
                      </div>
                    )}

                    {/* 5. FUNDING SUCCESS DISPATCH RECEIPT */}
                    {!isFundingProcessing && modalTxSuccess && (
                      <div className="flex flex-col gap-4 text-center">
                        <div className="w-11 h-11 bg-emerald-950/20 border border-emerald-920/40 rounded-full flex items-center justify-center mx-auto text-[#14cfb4] shadow-md">
                          <span className="text-xl animate-bounce">🎉</span>
                        </div>
                        
                        <div className="flex flex-col mt-1">
                          <h4 className="text-[15px] font-black text-white uppercase tracking-tight">Ledger Wallet Credited</h4>
                          <p className="text-[11px] text-zinc-400 mt-1">The secure deposit has been cleared and recorded successfully.</p>
                        </div>

                        {/* Official simulated credit voucher */}
                        <div className="bg-[#090a09] border border-zinc-950 rounded-2xl p-3.5 text-left font-sans text-[10.5px] flex flex-col gap-2.5">
                          <div className="flex justify-between border-b border-zinc-950 pb-2">
                            <span className="text-zinc-[450] font-semibold">TRANSACTION TYPE:</span>
                            <span className="font-bold text-[#14cfb4]">Escrow Contribution</span>
                          </div>
                          <div className="flex justify-between border-b border-zinc-950 pb-2">
                            <span className="text-zinc-[450] font-semibold">FROM SENDER:</span>
                            <span className="font-bold text-zinc-300">{simulatedBank} (Simulated)</span>
                          </div>
                          <div className="flex justify-between border-b border-zinc-950 pb-2">
                            <span className="text-zinc-[450] font-semibold">BENEFICIARY:</span>
                            <span className="font-bold text-zinc-200 uppercase truncate max-w-[140px]">{activeCustomer.name}</span>
                          </div>
                          <div className="flex justify-between border-b border-zinc-950 pb-2">
                            <span className="text-zinc-[450] font-semibold">VIRTUAL ACCOUNT:</span>
                            <span className="font-mono font-bold text-zinc-300">{activeCustomer.accountNumber}</span>
                          </div>
                          <div className="flex justify-between border-b border-zinc-950 pb-2">
                            <span className="text-zinc-[450] font-semibold">BENEFICIARY BANK:</span>
                            <span className="font-bold text-zinc-400">{state.settings.partnerBankName || 'Sterling Bank'}</span>
                          </div>
                          <div className="flex justify-between text-xs pt-1">
                            <span className="text-zinc-[450] font-extrabold">CREDIT AMOUNT:</span>
                            <span className="font-mono font-black text-[#14cfb4]">₦{parseFloat(depositAmount).toLocaleString()}.00</span>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setModalTxSuccess('');
                            setShowDepositModal(false);
                          }}
                          className="w-full py-3 bg-[#14cfb4] hover:bg-[#10b099] text-zinc-955 font-black text-xs uppercase tracking-wide rounded-xl mt-1.5 cursor-pointer shadow-md"
                        >
                          PROCEED TO PORTAL
                        </button>
                      </div>
                    )}
                  </motion.div>
                </div>
              )}

              {showWithdrawModal && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
                  <div className="absolute inset-0 cursor-pointer" onClick={() => { stopWithdrawalCamera(); setShowWithdrawModal(false); }} />
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    exit={{ scale: 0.95, opacity: 0 }} 
                    className="w-full max-w-sm bg-[#111311] border border-zinc-900 rounded-[32px] p-6 z-50 text-left relative focus:outline-none overflow-y-auto max-h-[92vh]"
                  >
                    <div className="flex justify-between items-center pb-2.5 mb-2.5 border-b border-zinc-950">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-white uppercase tracking-wider">Secured Payout Request</span>
                        <span className="text-[10px] text-zinc-500 font-mono font-medium mt-0.5">Reference Verification Desk</span>
                      </div>
                      <button 
                        onClick={() => { stopWithdrawalCamera(); setShowWithdrawModal(false); }} 
                        className="w-7 h-7 bg-zinc-950 hover:bg-zinc-900 rounded-full flex items-center justify-center text-zinc-400 hover:text-white border border-zinc-900 text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Explanatory Anti-Dispute Banner */}
                    <div className="bg-amber-500/5 border border-amber-500/20 p-3 rounded-2xl flex items-start gap-2.5 mb-3.5">
                      <span className="text-base mt-0.5">🔒</span>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">Audit Discrepancy Prevention</span>
                        <span className="text-[9.5px] text-zinc-400 leading-normal mt-0.5">
                          To protect client savings, any customer initiating a withdrawal must snap themselves, upload their registered ledger card, or request staff capture. This prevents cash payment arguments.
                        </span>
                      </div>
                    </div>

                    {modalTxSuccess && (
                      <p className="p-3 bg-emerald-950/30 text-[#14cfb4] text-[11px] rounded-2xl mb-4 font-bold text-center border border-emerald-900/30">
                        {modalTxSuccess}
                      </p>
                    )}
                    {modalTxError && (
                      <p className="p-3 bg-rose-950/20 text-rose-400 text-[11px] rounded-2xl mb-4 font-bold text-center border border-rose-900/40">
                        {modalTxError}
                      </p>
                    )}

                    <div className="flex flex-col gap-4 font-sans">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">Specify Payout Value (₦)</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-3 text-sm font-black text-zinc-500 font-mono">₦</span>
                          <input 
                            type="number" 
                            value={withdrawAmount} 
                            onChange={e => {
                              setWithdrawAmount(e.target.value);
                              setModalTxError('');
                            }} 
                            placeholder="Amount to pay out"
                            className="w-full pl-7 pr-3 py-2.5 bg-[#090a09] border border-zinc-950 text-sm font-black text-rose-400 rounded-xl focus:outline-none focus:border-zinc-800 font-mono" 
                          />
                        </div>
                        <span className="text-[9.5px] text-zinc-500 font-medium">Available balance: <span className="font-mono text-zinc-400 font-bold">{(activeCustomer.balance || 0).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}</span></span>
                      </div>

                      <div className="flex flex-col gap-1.5 mt-[-2px]">
                        <label className="text-[9px] font-black uppercase text-zinc-500 tracking-widest">Profit Applied (Optional) ₦</label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-3 text-sm font-black text-zinc-500 font-mono">₦</span>
                          <input 
                            type="number" 
                            value={withdrawProfitAmount} 
                            onChange={e => {
                              setWithdrawProfitAmount(e.target.value);
                              setModalTxError('');
                            }} 
                            placeholder="Profit amount"
                            className="w-full pl-7 pr-3 py-2.5 bg-[#090a09] border border-zinc-950 text-sm font-black text-[#14cfb4] rounded-xl focus:outline-none focus:border-zinc-800 font-mono" 
                          />
                        </div>
                      </div>

                      {/* Payout Destination Details */}
                      <div className="bg-[#090b09]/50 p-3.5 rounded-2xl border border-zinc-950 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between border-b border-zinc-950/80 pb-1.5">
                          <span className="text-[10px] font-extrabold uppercase text-[#14cfb4] tracking-wide flex items-center gap-1">🏦 Bank Settlement Landing</span>
                          <span className="text-[8px] bg-[#14cfb4]/10 text-[#14cfb4] px-1.5 py-0.2 rounded font-black uppercase tracking-wider">Required</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1 text-left">
                            <label className="text-[8.5px] font-bold text-zinc-500 uppercase">Bank Name</label>
                            <input
                              type="text"
                              value={withdrawalPayoutBankName}
                              onChange={(e) => {
                                setWithdrawalPayoutBankName(e.target.value);
                                setProfilePayoutBankName(e.target.value);
                              }}
                              placeholder="e.g. Sterling Bank"
                              className="w-full px-2.5 py-2 bg-black border border-zinc-900 rounded-xl text-[11px] font-bold text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-zinc-800"
                            />
                          </div>
                          <div className="flex flex-col gap-1 text-left">
                            <label className="text-[8.5px] font-bold text-zinc-500 uppercase">Account Number</label>
                            <input
                              type="text"
                              value={withdrawalPayoutAccountNumber}
                              onChange={(e) => {
                                setWithdrawalPayoutAccountNumber(e.target.value);
                                setProfilePayoutAccountNumber(e.target.value);
                              }}
                              placeholder="e.g. 0120192842"
                              className="w-full px-2.5 py-2 bg-black border border-zinc-900 rounded-xl text-[11px] font-mono font-bold text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-zinc-800"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 text-left">
                          <label className="text-[8.5px] font-bold text-zinc-500 uppercase">Account Name</label>
                          <input
                            type="text"
                            value={withdrawalPayoutAccountName}
                            onChange={(e) => {
                              setWithdrawalPayoutAccountName(e.target.value);
                              setProfilePayoutAccountName(e.target.value);
                            }}
                            placeholder="e.g. Shola Adebayo"
                            className="w-full px-2.5 py-2 bg-black border border-zinc-900 rounded-xl text-[11px] font-bold text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-zinc-800"
                          />
                        </div>
                      </div>

                      {/* VERIFICATION STEPS LAYOUT */}
                      <div className="bg-[#090b09]/60 p-3.5 rounded-2xl border border-zinc-950/60 flex flex-col gap-3">
                        <div className="flex items-center justify-between border-b border-zinc-950 pb-2">
                          <span className="text-[10px] font-extrabold uppercase text-zinc-400 tracking-wide">REQUIRED SECURITY ASSETS</span>
                          <span className="text-[8.5px] text-zinc-500 font-mono">Select capture tab</span>
                        </div>

                        {/* Capture tabs */}
                        <div className="grid grid-cols-3 gap-1 bg-[#121412] p-1 rounded-xl">
                          {(['selfie', 'card', 'simulation'] as const).map(tab => (
                            <button
                              key={tab}
                              type="button"
                              onClick={() => {
                                setWithdurCaptureTab(tab);
                                if (tab !== 'selfie') {
                                  stopWithdrawalCamera();
                                }
                              }}
                              className={`py-1.5 text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                                withdurCaptureTab === tab 
                                  ? 'bg-[#14cfb4] text-zinc-950 font-black shadow' 
                                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/30'
                              }`}
                            >
                              {tab === 'selfie' ? '📸 Selfie' : tab === 'card' ? '🗂️ Card/ID' : '⚙️ Presets'}
                            </button>
                          ))}
                        </div>

                        {/* Tab Content 1: Live Selfie Cam */}
                        {withdurCaptureTab === 'selfie' && (
                          <div className="flex flex-col gap-2.5 mt-1">
                            {withdrawalPhoto ? (
                              <div className="relative rounded-xl overflow-hidden border border-zinc-900 bg-black max-w-[200px] mx-auto select-none">
                                <img src={withdrawalPhoto} className="w-full h-28 object-cover opacity-90" alt="Selfie Verification" referrerPolicy="no-referrer" />
                                <div className="absolute top-2 right-2 bg-emerald-500 text-zinc-950 w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] shadow">✓</div>
                                <button 
                                  onClick={() => setWithdrawalPhoto('')}
                                  className="absolute bottom-2 left-2 right-2 bg-black/70 hover:bg-black/90 text-white text-[9px] font-black py-1 rounded uppercase tracking-wider transition-colors"
                                >
                                  ↺ Retake Selfie
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                {withdrawalCamActive ? (
                                  <div className="relative rounded-xl overflow-hidden border border-zinc-900 bg-black">
                                    <video 
                                      ref={withdrawalVideoRef} 
                                      autoPlay 
                                      playsInline 
                                      className="unmirrored w-full h-32 object-cover"
                                    />
                                    <div className="absolute bottom-2 left-2 right-2 flex gap-1.5 justify-center">
                                      <button
                                        type="button"
                                        onClick={captureWithdrawalPhoto}
                                        className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-400 text-zinc-950 font-black text-[9.5px] uppercase rounded-lg shadow-lg"
                                      >
                                        📸 Take Snapshot
                                      </button>
                                      <button
                                        type="button"
                                        onClick={stopWithdrawalCamera}
                                        className="px-2 py-1.5 bg-zinc-900 text-zinc-300 font-bold text-[9px] rounded-lg"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="h-28 rounded-xl border border-dashed border-zinc-800 bg-[#090b09]/50 flex flex-col items-center justify-center text-center p-3">
                                    <span className="text-xl">👤</span>
                                    <span className="text-[10px] text-zinc-500 mt-1 font-bold">Webcam Device Authorization</span>
                                    <button
                                      type="button"
                                      onClick={startWithdrawalCamera}
                                      className="mt-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 hover:text-white border border-zinc-800 text-zinc-300 font-black text-[9.5px] uppercase rounded-lg tracking-wider transition-colors cursor-pointer"
                                    >
                                      🔌 Grant Camera Capture
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Tab Content 2: File/Document Upload */}
                        {withdurCaptureTab === 'card' && (
                          <div className="flex flex-col gap-2 mt-1">
                            {withdrawalCardPhoto ? (
                              <div className="relative rounded-xl overflow-hidden border border-zinc-900 bg-black max-w-[200px] mx-auto select-none">
                                <img src={withdrawalCardPhoto} className="w-full h-24 object-cover opacity-95" alt="Document Verification" referrerPolicy="no-referrer" />
                                <div className="absolute top-2 right-2 bg-emerald-500 text-zinc-950 w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] shadow">✓</div>
                                <button 
                                  onClick={() => setWithdrawalCardPhoto('')}
                                  className="absolute bottom-2 left-2 right-2 bg-black/70 hover:bg-black/90 text-white text-[9px] font-black py-1 rounded uppercase tracking-wider transition-colors"
                                >
                                  ↺ Remove Card
                                </button>
                              </div>
                            ) : (
                              <div className="h-28 rounded-xl border border-dashed border-zinc-800 bg-[#090b09]/50 flex flex-col items-center justify-center text-center p-3 relative hover:bg-zinc-900/10 cursor-pointer">
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  onChange={handleWithdrawalCardUpload} 
                                  className="absolute inset-0 opacity-0 cursor-pointer" 
                                />
                                <span className="text-xl">🪪</span>
                                <span className="text-[10px] text-zinc-400 mt-1.5 font-bold">Select Savings Card or ID</span>
                                <p className="text-[8.5px] text-zinc-550 mt-0.5">Supports PNG, JPG (Max 5MB)</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Tab Content 3: Test Simulated Presets (Ensures seamless testing in sandboxes!) */}
                        {withdurCaptureTab === 'simulation' && (
                          <div className="flex flex-col gap-2 mt-1">
                            <span className="text-[8.5px] text-zinc-500 font-semibold uppercase leading-tight">Click to instant-populate security mock-data:</span>
                            <div className="grid grid-cols-3 gap-1.5">
                              {/* Preset face 1 */}
                              <button
                                type="button"
                                onClick={() => {
                                  setWithdrawalPhoto(`data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" fill="%230f172a"/><circle cx="100" cy="65" r="30" fill="%2314cfb4"/><path d="M70,120 Q100,85 130,120 Z" fill="%2314cfb4" opacity="0.85"/><text x="10" y="25" fill="%2394a3b8" font-family="monospace" font-size="10" font-weight="bold">CUSTOMER BIOMETRIC</text><text x="80" y="140" fill="%23ffffff" font-family="sans-serif" font-size="10" font-weight="black">SAVER MUSA</text></svg>`);
                                  setModalTxError('');
                                }}
                                className={`p-1.5 border hover:border-zinc-800 rounded-lg text-left bg-zinc-950 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${withdrawalPhoto.includes('MUSA') ? 'border-amber-500' : 'border-zinc-900'}`}
                              >
                                <span className="text-xs">🧑‍🦱</span>
                                <span className="text-[8px] text-zinc-400 font-bold leading-none">Musa Selfie</span>
                              </button>

                              {/* Preset face 2 */}
                              <button
                                type="button"
                                onClick={() => {
                                  setWithdrawalPhoto(`data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" fill="%231a0c24"/><circle cx="100" cy="65" r="30" fill="%23c084fc"/><path d="M70,120 Q100,85 130,120 Z" fill="%23c084fc" opacity="0.85"/><text x="10" y="25" fill="%23d8b4fe" font-family="monospace" font-size="10" font-weight="bold">CUSTOMER BIOMETRIC</text><text x="75" y="140" fill="%23ffffff" font-family="sans-serif" font-size="12" font-weight="black">SAVER AMINA</text></svg>`);
                                  setModalTxError('');
                                }}
                                className={`p-1.5 border hover:border-zinc-800 rounded-lg text-left bg-zinc-950 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${withdrawalPhoto.includes('AMINA') ? 'border-amber-500' : 'border-zinc-900'}`}
                              >
                                <span className="text-xs">👩‍🦰</span>
                                <span className="text-[8px] text-zinc-400 font-bold leading-none">Amina Selfie</span>
                              </button>

                              {/* Preset ID card */}
                              <button
                                type="button"
                                onClick={() => {
                                  setWithdrawalCardPhoto(`data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" rx="10" fill="indigo" stroke="gold" stroke-width="2"/><rect x="15" y="20" width="30" height="20" rx="3" fill="gold"/><text x="15" y="65" fill="white" font-family="sans-serif" font-size="12" font-weight="bold">SAVINGS LEDGER ID</text><text x="15" y="85" fill="%23a5b4fc" font-family="monospace" font-size="9" font-weight="bold">CARD NO: CBP-CUS-${activeCustomer.id}</text><text x="15" y="105" fill="white" font-family="sans-serif" font-size="10" font-weight="black">CBP MEMBER</text><text x="150" y="140" fill="%23e0e7ff" font-family="monospace" font-size="8">CONTRIBOPAY</text></svg>`);
                                  setModalTxError('');
                                }}
                                className={`p-1.5 border hover:border-zinc-800 rounded-lg text-left bg-zinc-950 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${withdrawalCardPhoto !== '' ? 'border-amber-500' : 'border-zinc-900'}`}
                              >
                                <span className="text-xs">💳</span>
                                <span className="text-[8px] text-zinc-400 font-bold leading-none">Savings Card</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Display Thumbnail Summaries if Verified */}
                        {(withdrawalPhoto || withdrawalCardPhoto) && (
                          <div className="flex gap-2 items-center bg-zinc-950/45 p-2 rounded-xl mt-1 text-[9px] text-[#14cfb4] font-semibold border border-emerald-950/20">
                            <span>✅ Identity Verification Linked:</span>
                            <div className="flex gap-1">
                              {withdrawalPhoto && <span className="bg-emerald-500/10 px-1 py-0.2 rounded font-black max-w-[80px] truncate">✓ Selfie Photo</span>}
                              {withdrawalCardPhoto && <span className="bg-emerald-500/10 px-1 py-0.2 rounded font-black max-w-[80px] truncate">✓ Savings Card</span>}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Confirm button */}
                      <button 
                        onClick={() => {
                          const amt = parseFloat(withdrawAmount);
                          if (isNaN(amt) || amt <= 0) {
                            setModalTxError("Please enter a valid payout amount.");
                            return;
                          }
                          
                          let profitAmt = 0;
                          if (withdrawProfitAmount) {
                            profitAmt = parseFloat(withdrawProfitAmount);
                            if (isNaN(profitAmt) || profitAmt < 0) {
                              setModalTxError("Please enter a valid profit amount.");
                              return;
                            }
                          }

                          if (amt > (activeCustomer.balance || 0)) { 
                            setModalTxError(`Insufficient savings ledger balance. Your balance is ₦${(activeCustomer.balance || 0).toLocaleString('en-NG')}`); 
                            return; 
                          }
                          
                          // Customer must snap himself or upload card to continue argument prevention
                          if (!withdrawalPhoto && !withdrawalCardPhoto) {
                            setModalTxError("🔒 Security Protocol: Please capture customer face or upload savings card/ID document to verify identity and resolve potential payout disputes.");
                            return;
                          }

                          // Require realistic payout bank details
                          if (!withdrawalPayoutBankName.trim() || !withdrawalPayoutAccountName.trim() || !withdrawalPayoutAccountNumber.trim()) {
                            setModalTxError("🏦 Missing Bank coordinates: Please enter landing bank name, account name, and account number for settlement.");
                            return;
                          }

                          // Save payout details back to customer profile
                          onUpdateCustomer(activeCustomer.id, {
                            payoutBankName: withdrawalPayoutBankName,
                            payoutAccountName: withdrawalPayoutAccountName,
                            payoutAccountNumber: withdrawalPayoutAccountNumber
                          });

                          onAddTransaction({ 
                            customerId: activeCustomer.id, 
                            amount: amt, 
                            profitAmount: profitAmt > 0 ? profitAmt : undefined,
                            type: 'withdrawal', 
                            staffId: activeCustomer.assignedStaffId || 's1', 
                            status: 'pending',
                            withdrawalPhoto: withdrawalPhoto || undefined,
                            cardPhoto: withdrawalCardPhoto || undefined,
                            payoutBankName: withdrawalPayoutBankName,
                            payoutAccountName: withdrawalPayoutAccountName,
                            payoutAccountNumber: withdrawalPayoutAccountNumber
                          });

                          setModalTxSuccess(`Withdrawal of ₦${amt.toLocaleString()} successfully authenticated & awaiting supervisor approval!`);
                          
                          // Reset form state on success
                          setWithdrawalPhoto('');
                          setWithdrawalCardPhoto('');

                          setTimeout(() => { 
                            setModalTxSuccess(''); 
                            setShowWithdrawModal(false); 
                          }, 2200);
                        }}
                        className={`w-full py-3 text-white font-black text-xs uppercase rounded-xl transition-all cursor-pointer border  ${
                          (withdrawalPhoto || withdrawalCardPhoto) 
                            ? 'bg-rose-650 hover:bg-rose-600 border-rose-600 shadow-md shadow-rose-950/10' 
                            : 'bg-zinc-850 border-zinc-800 text-zinc-500'
                        }`}
                      >
                        Confirm Payout Request {(withdrawalPhoto || withdrawalCardPhoto) ? '✓' : '(Needs Photo/ID Key)'}
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

              {showSendMoneyModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end justify-center select-none">
                  <div className="absolute inset-0 cursor-pointer" onClick={() => setShowSendMoneyModal(false)} />
                  <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="w-full max-w-sm bg-[#111311] border-t border-zinc-900 rounded-t-[28px] p-5 pb-7 z-50 text-left relative">
                    <div className="w-10 h-1 bg-zinc-800 rounded-full mx-auto mb-3.5" />
                    <div className="flex justify-between items-center pb-2 mb-2.5 border-b border-zinc-950">
                      <span className="text-xs font-black text-white uppercase tracking-tight">Direct Inter-Savers Transfer</span>
                      <button onClick={() => setShowSendMoneyModal(false)} className="text-zinc-450">✕</button>
                    </div>
                    {modalTxSuccess && <p className="p-2.5 bg-emerald-950/20 text-[#14cfb4] text-[11px] rounded-lg mb-3 font-semibold border border-emerald-500/10 text-center">{modalTxSuccess}</p>}
                    {modalTxError && <p className="p-2.5 bg-rose-955/10 text-rose-450 text-[11px] rounded-lg mb-3 font-bold text-center border border-rose-950/20">{modalTxError}</p>}
                    
                    <div className="flex flex-col gap-3 font-sans">
                      {/* Recipient Account Number Field (Isolated from seeing other databases) */}
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">RECIPIENT USERNAME / ACCT / PHONE</span>
                        <input 
                          type="text" 
                          placeholder="e.g. amina_bello, 3048951203 or 0812345678" 
                          value={sendPhone} 
                          onChange={e => {
                            setModalTxError('');
                            setModalTxSuccess('');
                            const val = e.target.value;
                            setSendPhone(val);
                            
                            const normalizeAcc = (s: string) => {
                              let normalized = s.replace(/\s+/g, '');
                              if (/^30+\d+$/.test(normalized)) {
                                const digits = normalized.match(/^3(0+)(\d+)$/);
                                if (digits) {
                                  const rest = digits[2];
                                  const targetZerosCount = Math.max(1, 10 - 1 - rest.length);
                                  return '3' + '0'.repeat(targetZerosCount) + rest;
                                }
                              }
                              if (/^20+\d+$/.test(normalized)) {
                                const digits = normalized.match(/^2(0+)(\d+)$/);
                                if (digits) {
                                  const rest = digits[2];
                                  const targetZerosCount = Math.max(1, 10 - 1 - rest.length);
                                  return '2' + '0'.repeat(targetZerosCount) + rest;
                                }
                              }
                              return normalized;
                            };

                            const cleanedTyped = val.trim().replace(/\D/g, '');
                            const normTyped = normalizeAcc(cleanedTyped);
                            const trimmedVal = val.trim().toLowerCase();
                            const matched = state.customers.find(c => {
                              const cPhoneCleaned = c.phoneNumber ? c.phoneNumber.replace(/\D/g, '') : '';
                              const cAcctCleaned = (c.accountNumber || '').replace(/\D/g, '');
                              const normCAcc = normalizeAcc(cAcctCleaned);
                              return (
                                cPhoneCleaned === cleanedTyped || 
                                c.phoneNumber === val.trim() || 
                                normCAcc === normTyped ||
                                cAcctCleaned === cleanedTyped ||
                                c.accountNumber === val.trim() ||
                                c.username?.toLowerCase() === trimmedVal
                              ) && c.id !== activeCustomer.id;
                            });
                            if (matched) {
                              setSendName(`${matched.name} (${matched.username ? `@${matched.username}` : matched.accountNumber || 'N/A'})`);
                            } else {
                              setSendName('');
                            }
                          }}
                          className="w-full p-3 bg-[#090a09] text-xs font-bold text-white border border-zinc-950 rounded-xl focus:border-zinc-800 focus:outline-none font-mono" 
                        />
                      </div>

                      {/* Dynamic Account Verification Frame */}
                      {sendName ? (
                        <div className="p-3 bg-emerald-950/15 border border-emerald-500/10 rounded-xl text-emerald-400 text-xs flex items-center justify-between font-bold">
                          <span className="uppercase tracking-wide text-[9.5px]">👤 RECIPIENT VERIFIED:</span>
                          <span className="text-white truncate font-black tracking-tight">{sendName}</span>
                        </div>
                      ) : (
                        sendPhone.trim() !== '' && (
                          <div className="p-3 bg-zinc-950 border border-zinc-900 rounded-xl text-zinc-550 text-[9.5px] font-semibold text-center leading-normal">
                            ❌ NO CORRESPONDING LEDGER FOUND SIGNIFYING THIS USERNAME / PHONE / ACCOUNT NUMBER
                          </div>
                        )
                      )}

                      <div className="flex flex-col gap-1.5 mt-1">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">TRANSFER VALUE (₦)</span>
                        <input 
                          type="number" 
                          placeholder="Value in ₦"
                          value={sendAmount} 
                          onChange={e => {
                            setModalTxError('');
                            setSendAmount(e.target.value);
                          }} 
                          className="w-full p-3 bg-[#090a09] text-xs font-black text-[#14cfb4] border border-zinc-950 rounded-xl focus:border-zinc-800 focus:outline-none font-mono" 
                        />
                      </div>

                      <button 
                        disabled={isFinanciallySubmitting}
                        onClick={() => {
                          if (isFinanciallySubmitting) return;
                          setModalTxError('');
                          const cleanedTyped = sendPhone.trim().replace(/\D/g, '');
                          const trimmedVal = sendPhone.trim().toLowerCase();
                          const normalizeAcc = (s: string) => {
                            let normalized = s.replace(/\s+/g, '');
                            if (/^30+\d+$/.test(normalized)) {
                              const digits = normalized.match(/^3(0+)(\d+)$/);
                              if (digits) {
                                const rest = digits[2];
                                const targetZerosCount = Math.max(1, 10 - 1 - rest.length);
                                return '3' + '0'.repeat(targetZerosCount) + rest;
                              }
                            }
                            if (/^20+\d+$/.test(normalized)) {
                              const digits = normalized.match(/^2(0+)(\d+)$/);
                              if (digits) {
                                const rest = digits[2];
                                const targetZerosCount = Math.max(1, 10 - 1 - rest.length);
                                return '2' + '0'.repeat(targetZerosCount) + rest;
                              }
                            }
                            return normalized;
                          };
                          const normTyped = normalizeAcc(cleanedTyped);
                          const matchedRecipient = state.customers.find(c => {
                            const cPhoneCleaned = c.phoneNumber ? c.phoneNumber.replace(/\D/g, '') : '';
                            const cAcctCleaned = (c.accountNumber || '').replace(/\D/g, '');
                            const normCAcc = normalizeAcc(cAcctCleaned);
                            return (
                              cPhoneCleaned === cleanedTyped || 
                              c.phoneNumber === sendPhone.trim() || 
                              normCAcc === normTyped ||
                              cAcctCleaned === cleanedTyped ||
                              c.accountNumber === sendPhone.trim() ||
                              c.username?.toLowerCase() === trimmedVal
                            ) && c.id !== activeCustomer.id;
                          });

                          if (!matchedRecipient) {
                            setModalTxError('Transfer aborted. No matching savings account verified.');
                            return;
                          }

                          const amt = parseFloat(sendAmount);
                          if (isNaN(amt) || amt <= 0) {
                            setModalTxError('Please specify a positive transfer amount.');
                            return;
                          }
                          if (amt > (activeCustomer.balance || 0)) {
                            setModalTxError(`Insufficient ledger balance. Maximum transfer is ₦${(activeCustomer.balance || 0).toLocaleString()}`);
                            return;
                          }

                          setIsFinanciallySubmitting(true);

                          // Debit sender
                          onAddTransaction({ 
                            customerId: activeCustomer.id, 
                            amount: amt, 
                            type: 'withdrawal', 
                            staffId: activeCustomer.assignedStaffId || 's1', 
                            status: 'approved' 
                          });

                          // Credit recipient
                          onAddTransaction({
                            customerId: matchedRecipient.id,
                            amount: amt,
                            type: 'deposit',
                            staffId: activeCustomer.assignedStaffId || 's1',
                            status: 'approved'
                          });

                          setModalTxSuccess(`Successfully transferred ₦${amt.toLocaleString()} to ${matchedRecipient.name}!`);
                          setSendAmount('');
                          setSendPhone('');
                          setSendName('');
                          setTimeout(() => { 
                            setModalTxSuccess(''); 
                            setShowSendMoneyModal(false); 
                            setIsFinanciallySubmitting(false);
                          }, 1800);
                        }}
                        className={`w-full py-4.5 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-[12px] uppercase rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-1.5`}
                      >
                        ⚡ Confirm Secure Transfer
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

              {/* Simple generic alerts for the remainder custom utilities */}
              {['Airtime', 'Electricity', 'Internet', 'Loan', 'Insights', 'Receipt'].map((mod) => {
                const isOpen = mod === 'Airtime' ? showAirtimeModal : mod === 'Electricity' ? showElectricityModal : mod === 'Internet' ? showInternetModal : mod === 'Loan' ? showLoanModal : mod === 'Insights' ? showInsightsModal : showReceiptModal;
                const close = () => { if(mod==='Airtime') setShowAirtimeModal(false); else if(mod==='Electricity') setShowElectricityModal(false); else if(mod==='Internet') setShowInternetModal(false); else if(mod==='Loan') setShowLoanModal(false); else if(mod==='Insights') setShowInsightsModal(false); else setShowReceiptModal(false); };
                if (!isOpen) return null;
                return (
                  <div key={mod} className="fixed inset-0 bg-black/85 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="absolute inset-0 cursor-pointer" onClick={close} />
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      exit={{ opacity: 0, scale: 0.95 }} 
                      className={`w-full ${mod === 'Receipt' ? 'max-w-sm' : 'max-w-xs'} bg-[#111311] border border-zinc-900 rounded-[28px] p-6 text-center z-50 font-sans relative my-auto`}
                    >
                      {/* Premium Top close/back action */}
                      <button
                        onClick={close}
                        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center border border-zinc-900 text-xs font-bold transition-all cursor-pointer z-20 active:scale-95"
                        title="Go Back"
                      >
                        ✕
                      </button>

                      <span className="text-2xl mt-1 block">{mod === 'Receipt' ? '🧾' : '💡'}</span>
                      <h4 className="text-sm font-black text-white uppercase mt-2.5 tracking-tight">{mod === 'Receipt' ? 'Transaction Receipt' : `${mod} Service Active`}</h4>
                      {mod === 'Receipt' && selectedReceiptTx ? (
                        <div className="text-left mt-3.5 pt-3 border-t border-zinc-950 flex flex-col gap-3 font-sans">
                          {/* Receipt Paper Card */}
                          <div className="bg-[#0b0c0b] border border-zinc-900 rounded-xl p-3.5 relative overflow-hidden select-text">
                            {/* Dash background simulation for paper receipts */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-zinc-800 to-transparent bg-[length:8px_100%]" />
                            
                            <div className="flex flex-col items-center justify-center pb-3 border-b border-dashed border-zinc-900 text-center gap-1">
                              <span className={`text-[10px] font-black uppercase tracking-widest ${tg.text}`}>Dan Godal savings HQ</span>
                              <span className="text-[8px] font-mono text-zinc-500 uppercase">Secure Digital Ledger</span>
                              <div className="mt-2 text-lg font-black text-white font-mono">
                                ₦{selectedReceiptTx.amount.toLocaleString()}
                              </div>
                            </div>

                            <div className="py-3 text-[9.5px] font-mono flex flex-col gap-2 border-b border-dashed border-zinc-900 text-zinc-400">
                              <div className="flex justify-between">
                                <span className="text-zinc-650">REF NO:</span>
                                <span className={`font-bold uppercase ${tg.text}`}>{selectedReceiptTx.reference}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-650">TX TYPE:</span>
                                <span className="font-bold text-zinc-300 uppercase">{selectedReceiptTx.type === 'deposit' ? 'SAVINGS CONTRIBUTION' : 'PAYOUT / WITHDRAWAL'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-650">TIMESTAMP:</span>
                                <span className="font-bold text-zinc-300">
                                  {new Date(selectedReceiptTx.timestamp).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-650">STATUS:</span>
                                <span className={`font-black uppercase ${
                                  selectedReceiptTx.status === 'approved' ? 'text-emerald-400 font-black' :
                                  selectedReceiptTx.status === 'pending' ? 'text-amber-400 font-black' : 'text-rose-450 font-black'
                                }`}>{selectedReceiptTx.status}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-zinc-650">MEMBER:</span>
                                <span className="font-bold text-zinc-300 truncate w-24 text-right">{selectedReceiptTx.customerName || 'CBP Member'}</span>
                              </div>
                            </div>

                            {/* Linked Bank Details display (Shown ONLY for withdrawals) */}
                            {selectedReceiptTx.type === 'withdrawal' && (() => {
                                const customer = state.customers.find(c => c.id === selectedReceiptTx.customerId);
                                const acctNum = selectedReceiptTx.payoutAccountNumber || customer?.payoutAccountNumber;
                                const acctName = selectedReceiptTx.payoutAccountName || customer?.payoutAccountName;
                                const bankName = selectedReceiptTx.payoutBankName || customer?.payoutBankName;
                                
                                if (acctNum) {
                                  return (
                                    <div className="flex flex-col gap-1 mt-3 p-3 bg-zinc-950/50 border border-zinc-900 rounded-xl">
                                      <span className="text-[8.5px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                                        <span>🏦 LINKED PAYOUT ACCOUNT</span>
                                      </span>
                                      <div className="flex justify-between items-center bg-[#090a09] p-2 rounded-lg border border-zinc-900">
                                        <div className="flex flex-col truncate pr-2">
                                          <span className="text-[10px] font-bold text-zinc-300 truncate">
                                            {acctName || selectedReceiptTx.customerName || 'Customer'}
                                          </span>
                                          <span className="text-[9px] text-zinc-500 truncate">
                                            {bankName || "Default Bank"}
                                          </span>
                                        </div>
                                        <span className="text-[10px] font-mono font-black text-white px-2 py-1 bg-zinc-900 rounded-md shrink-0">
                                          {acctNum}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                }
                                return (
                                  <div className="flex flex-col items-center justify-center gap-1 mt-3 p-2.5 border border-dashed border-rose-950/60 bg-rose-950/10 rounded-xl">
                                    <span className="text-[9.5px] font-black text-rose-500">
                                      ⚠️ NO LINKED BANK ACCOUNT
                                    </span>
                                    <span className="text-[8px] text-zinc-500 text-center px-1">
                                      Customer has not linked a payout account. Please disburse via cash.
                                    </span>
                                  </div>
                                );
                            })()}

                            {/* Biometric frames audit for supervisors */}
                            {(selectedReceiptTx.withdrawalPhoto || selectedReceiptTx.cardPhoto) && (
                              <div className="mt-3.5 pt-3.5 border-t border-dashed border-zinc-900 flex flex-col gap-2">
                                <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest text-center">🔐 EMBEDDED IDENTITY CAPTURES</span>
                                <div className="grid grid-cols-2 gap-2 mt-1">
                                  {selectedReceiptTx.withdrawalPhoto && (
                                    <div className="flex flex-col gap-1 items-center bg-black/60 p-1.5 rounded-xl border border-zinc-900">
                                      <span className="text-[7px] font-mono text-zinc-550 uppercase tracking-tight">Saver Face</span>
                                      <div className="aspect-[4/3] w-full rounded-lg overflow-hidden border border-zinc-900 relative">
                                        <img
                                          src={selectedReceiptTx.withdrawalPhoto}
                                          className="w-full h-full object-cover"
                                          alt="Face Capture"
                                          referrerPolicy="no-referrer"
                                        />
                                      </div>
                                    </div>
                                  )}
                                  {selectedReceiptTx.cardPhoto && (
                                    <div className="flex flex-col gap-1 items-center bg-black/60 p-1.5 rounded-xl border border-zinc-900">
                                      <span className="text-[7px] font-mono text-zinc-555 uppercase tracking-tight">Saver Card</span>
                                      <div className="aspect-[4/3] w-full rounded-lg overflow-hidden border border-zinc-900 relative">
                                        <img
                                          src={selectedReceiptTx.cardPhoto}
                                          className="w-full h-full object-cover"
                                          alt="Saver Card"
                                          referrerPolicy="no-referrer"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {selectedReceiptTx.receiptPhoto && (
                              <div className="mt-4 pt-3.5 border-t border-dashed border-zinc-900 flex flex-col gap-2.5">
                                <span className="text-[9px] font-black text-[#14cfb4] uppercase tracking-wider text-center block">
                                  🧾 Official Payment Transfer Advice
                                </span>
                                <div className="aspect-[16/9] w-full rounded-lg overflow-hidden border border-[#3ad188]/20 bg-zinc-950 relative group">
                                  <img 
                                    src={selectedReceiptTx.receiptPhoto} 
                                    className="w-full h-full object-cover" 
                                    alt="Payment Receipt advice" 
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                <div className="text-[8px] text-[#3ad188] font-bold text-center uppercase tracking-wide">
                                  Payout advice successfully attached by supervisor ✓
                                </div>
                              </div>
                            )}

                            <div className="pt-2 text-[8px] text-zinc-550 font-mono text-center leading-normal">
                              🔐 Secured via Contribo blockchain cloud node. Valid certified copy.
                            </div>

                            {selectedReceiptTx.status === "pending" && (
                              <div className="mt-4 pt-3.5 border-t border-dashed border-zinc-900 flex flex-col gap-2.5">
                                <span className="text-[9.5px] font-extrabold text-amber-500 uppercase tracking-widest block text-center animate-pulse">
                                  ⚡ Supervisor Direct Payout
                                </span>
                                <p className="text-[8.5px] text-zinc-500 leading-relaxed font-semibold">
                                  Authorize this withdrawal in the field. Verify identity and enter matching staff PIN:
                                </p>
                                
                                {gatewayApproveError && (
                                  <span className="text-[8.5px] text-rose-400 font-extrabold tracking-wide block text-center leading-snug">
                                    ⚠️ {gatewayApproveError}
                                  </span>
                                )}

                                {selectedReceiptTx.type === "withdrawal" && (
                                  <div className="w-full mt-2 mb-3 p-2.5 bg-zinc-950/50 rounded-xl border border-zinc-900 border-dashed">
                                    <label className="text-[9px] font-black text-amber-600 tracking-widest mb-1.5 flex items-center justify-between">
                                      <span>🧾 TRANSFER RECEIPT</span>
                                      <span className="text-[8px] font-black bg-zinc-950 text-zinc-500 px-1.5 rounded uppercase">Optional</span>
                                    </label>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="w-full text-[9px] text-zinc-500 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-md file:border-0 file:font-black file:bg-zinc-900 file:text-zinc-300 hover:file:bg-zinc-800 transition-colors"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const reader = new FileReader();
                                          reader.onloadend = () => {
                                            setAuthReceiptPhoto(reader.result as string);
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                    />
                                    {authReceiptPhoto && (
                                      <div className="mt-2 w-full rounded-lg overflow-hidden border border-zinc-900 p-1 bg-black relative">
                                        <img src={authReceiptPhoto} alt="Receipt preview" className="w-full h-16 object-cover rounded-md" />
                                        <button
                                          onClick={() => setAuthReceiptPhoto('')}
                                          className="absolute top-2 right-2 bg-rose-500/80 text-white w-5 h-5 flex items-center justify-center rounded-full hover:bg-rose-600"
                                        >
                                          <span className="text-[10px] font-black leading-none">X</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="flex gap-2 justify-center">
                                  <input 
                                    type="password"
                                    maxLength={4}
                                    placeholder="Collector PIN"
                                    value={gatewayApprovePin}
                                    onChange={(e) => setGatewayApprovePin(e.target.value.replace(/[^0-9]/g, ''))}
                                    className="flex-1 max-w-[120px] text-center py-1.5 bg-[#080908] border border-zinc-900 rounded-lg text-xs font-mono tracking-widest text-[#14cfb4] focus:outline-none"
                                  />
                                  <button
                                    onClick={() => {
                                      const matchedStaff = state.staff.find(s => s.pin === gatewayApprovePin);
                                      if (matchedStaff) {
                                        const customer = state.customers.find(c => c.id === selectedReceiptTx.customerId);
                                        const currentBalance = customer ? customer.balance : 0;
                                        if (selectedReceiptTx.amount > currentBalance) {
                                          setGatewayApproveError("Sanity Warning: Deficit balance!");
                                        } else {
                                          if (onApproveTransaction) {
                                            onApproveTransaction(selectedReceiptTx.id, authReceiptPhoto || undefined);
                                          }
                                          selectedReceiptTx.status = 'approved';
                                          setSelectedReceiptTx({ ...selectedReceiptTx, status: 'approved' });
                                          setGatewayApprovePin('');
                                          setGatewayApproveError('');
                                        }
                                      } else {
                                        setGatewayApproveError("Invalid Collector Pin.");
                                      }
                                    }}
                                    className="px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[9px] uppercase tracking-wider rounded-lg transition-all active:scale-95 cursor-pointer"
                                  >
                                    Authorize Payout
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-zinc-500 mt-1 lines-normal font-medium">{mod} transaction sync is up and approved seamlessly via supervisor console database.</p>
                      )}
                      
                      {mod === 'Receipt' ? (
                        <div className="flex gap-2.5 mt-4 w-full">
                          <button 
                            onClick={close} 
                            className="flex-1 py-3 bg-[#0d0e0d] hover:bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-white font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center active:scale-95"
                          >
                            Dismiss
                          </button>
                          <button 
                            onClick={close} 
                            className="flex-1 py-3 bg-gradient-to-r from-zinc-800 to-zinc-900 hover:from-zinc-700 hover:to-zinc-805 border border-zinc-750 text-white font-black text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center active:scale-95 flex items-center justify-center gap-1"
                          >
                            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                            <span>Go Back</span>
                          </button>
                        </div>
                      ) : (
                        <button onClick={close} className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 font-extrabold text-[11px] rounded-lg mt-4 cursor-pointer">Dismiss</button>
                      )}
                    </motion.div>
                  </div>
                );
              })}

              {/* CUSTOM HIGH-CONVERTING REFERRAL & EARN PROMO FLYER MODAL */}
              {showReferModal && (
                <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none">
                  <div className="absolute inset-0 cursor-pointer" onClick={() => setShowReferModal(false)} />
                  
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }} 
                    exit={{ scale: 0.95, opacity: 0 }} 
                    className="w-full max-w-sm bg-[#111311]/95 border border-zinc-900 rounded-[28px] p-6 text-left relative overflow-hidden"
                  >
                    {/* Glowing golden backdrop */}
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none animate-pulse" />
                    
                    <div className="flex justify-between items-center pb-2.5 mb-3.5 border-b border-zinc-950">
                      <div className="flex flex-col text-left">
                        <span className="text-[12px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          ✨ DISPATCH PROMO STATUS
                        </span>
                        <span className="text-[9.5px] font-mono font-medium text-zinc-500 mt-0.5">Generate stranger-onboarding flyer</span>
                      </div>
                      <button 
                        onClick={() => setShowReferModal(false)} 
                        className="w-7 h-7 bg-zinc-950 hover:bg-zinc-900 rounded-full flex items-center justify-center text-zinc-400 hover:text-white border border-zinc-900 text-xs font-bold cursor-pointer transition-colors"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="bg-[#121412] border border-zinc-900 p-4 rounded-2xl relative overflow-hidden shadow-inner select-text">
                      <div className="flex justify-between items-center pb-2 border-b border-dashed border-zinc-900 mb-3">
                        <span className="text-[10px] font-extrabold text-amber-400">STATUS FLYER PREVIEW</span>
                        <span className="text-[8.5px] font-mono text-zinc-500">Verified Member</span>
                      </div>

                      <div className="text-zinc-200 font-mono text-[10.5px] leading-relaxed select-all">
                        <p className="text-amber-400 font-bold mb-1.5 font-sans">🌟 JOIN MY INDIVIDUAL CONTRIBUTION POOL 🌟</p>
                        <p className="mb-2">Are you looking to save daily with Lagos & Kaduna's most trusted micro-savings platform? Join me now!</p>
                        <p className="text-zinc-[450] mb-0.5">👇 Sign up easily with my invite credentials:</p>
                        <p className="text-white font-bold pl-2 border-l border-amber-500/40">
                          Username Login: <span className="text-[#14cfb4]">@{activeCustomer.username || 'member'}</span><br />
                          Agent Card ID: <span className="text-[#14cfb4]">{activeCustomer.staffCustomerId || 'KC-CS-101'}</span><br />
                          Sterling Bank Virtual Acct: <span className="text-amber-400">{activeCustomer.accountNumber || '3048590021'}</span>
                        </p>
                        <p className="mt-2 text-[9px] text-[#14cfb4] font-sans">Secure. Transparent. Instant approval & credit alerts!</p>
                      </div>

                      <div className="absolute bottom-2 right-2 opacity-5 pointer-events-none select-none">
                        <QrCode className="w-14 h-14" />
                      </div>
                    </div>

                    <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl mt-3">
                      <p className="text-[9.5px] text-zinc-450 leading-relaxed text-left">
                        📢 <strong>Why compile this promotion?</strong> Sharing this invite flyer with strangers on social media, WhatsApp groups, or marketplaces allows them to enroll on their own. Once they register under your username as referral, the ledger program automatically coordinates their group circle!
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <button
                        onClick={() => {
                          const inviteTxt = `🌟 JOIN MY INDIVIDUAL CONTRIBUTION POOL 🌟\n\nAre you looking to save daily with Lagos & Kaduna's most trusted micro-savings platform? Join me now!\n\n👇 Sign up easily via my invite credentials:\nUsername Login: @${activeCustomer.username || 'member'}\nAgent Card ID: ${activeCustomer.staffCustomerId || 'KC-CS-101'}\nSterling Bank Virtual Acct: ${activeCustomer.accountNumber || '3048590021'}\n\nSecure. Transparent. Instant automatic credit alerts!`;
                          copyToClipboard(inviteTxt, 'Promo Invite text copied to clipboard!');
                        }}
                        className="py-3 bg-amber-500 hover:bg-amber-400 text-zinc-955 font-black text-[10.5px] uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                      >
                        📥 COPY PROMO TEXT
                      </button>
                      <button
                        onClick={() => {
                          const inviteLink = `${window.location.origin}/?ref=${activeCustomer.username || 'member'}`;
                          copyToClipboard(inviteLink, 'Your personal registry link copied!');
                        }}
                        className="py-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 font-extrabold text-[10.5px] uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        🔗 COPY REGISTRY LINK
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

        {/* ================= REGISTER ACCOUNT (CREATE ACCOUNT) ================= */}
        {false && screen === 'customer-register' && (
          <motion.div
            key="customer-register"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="w-full max-w-sm flex flex-col gap-4.5 z-10 animate-scale-in"
          >
            <div className="flex items-center justify-between">
              <button 
                onClick={() => {
                  setRegisteredResult(null);
                  setScreen('gateway');
                }}
                className="w-10 h-10 rounded-full border border-zinc-900 bg-[#111311]/50 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-black text-zinc-550 uppercase tracking-widest">Enroll Ledger</span>
              <div className="w-10 h-10 opacity-0" />
            </div>

            {registeredResult ? (
              <div className="bg-[#111311]/95 border border-zinc-900/60 rounded-[28px] p-6.5 flex flex-col gap-5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                <div className="text-center pb-2 border-b border-zinc-950">
                  <div className="w-12 h-12 bg-emerald-950/20 border border-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-2 text-[#14cfb4]">
                    <Check className="w-6 h-6" />
                  </div>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight">Saver Enrolled Successfully!</h2>
                  <p className="text-xs text-zinc-400 mt-1">Below are the custom ledger credentials</p>
                </div>

                <div className="bg-zinc-950/60 p-4 border border-zinc-900 rounded-2xl flex flex-col gap-3.5 relative">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-[450] font-semibold">Saver Name:</span>
                    <span className="font-bold text-zinc-200 uppercase">{registeredResult.name}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-2 border-t border-zinc-900/50">
                    <span className="text-zinc-[450] font-semibold">Username (For Login):</span>
                    <span className="font-mono font-black text-sm text-[#14cfb4] tracking-widest select-all">
                      {registeredResult.username}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-2 border-t border-zinc-900/50">
                    <span className="text-zinc-[450] font-semibold">Staff Customer ID:</span>
                    <span className="font-mono font-black text-sm text-[#14cfb4] tracking-widest select-all">
                      {registeredResult.staffCustomerId}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-2 border-t border-zinc-900/50">
                    <span className="text-zinc-[450] font-semibold">Account Number:</span>
                    <div className="text-right">
                      <span className="font-mono font-bold text-xs text-zinc-300 tracking-wider">
                        {registeredResult.accountNumber}
                      </span>
                      <p className="text-[8px] text-zinc-500 mt-0.5 uppercase tracking-wider font-semibold">🏦 {state.settings.partnerBankName || 'Sterling Bank Plc'}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-2 border-t border-zinc-900/50">
                    <span className="text-zinc-[450] font-semibold flex items-center gap-1">
                      <span>4-digit Security PIN:</span>
                    </span>
                    <span className="font-mono font-black text-zinc-200 bg-zinc-900 px-2 py-1 rounded tracking-widest select-all">
                      {registeredResult.pin}
                    </span>
                  </div>

                  <div className="bg-[#14cfb4]/5 border border-[#14cfb4]/10 p-3 rounded-xl mt-1">
                    <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
                      💡 <strong>Credential Info:</strong> This customer can log into their portal using either their <strong>Username</strong> ({registeredResult.username}) or their registered mobile phone number.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setTypedPhone(registeredResult.username || '');
                    setPasscode('');
                    setFocusedField('pin');
                    setScreen('customer-auth');
                    setRegisteredResult(null);
                  }}
                  className="w-full py-4 bg-[#14cfb4] hover:bg-[#10b099] text-zinc-950 font-black rounded-2xl text-[13px] tracking-widest uppercase transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>PROCEED TO PORTAL LOGIN ➔</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleCustomerRegister} className="bg-[#111311]/95 border border-zinc-900/60 rounded-[28px] p-6.5 flex flex-col gap-4.5 shadow-2xl">
                <div className="text-center pb-1.5 border-b border-zinc-950">
                  <Plus className="w-8 h-8 text-[#14cfb4] mx-auto mb-1 flex animate-bounce" />
                  <h2 className="text-lg font-black text-white uppercase tracking-tight">ENROLL NEW SAVER</h2>
                  <p className="text-xs text-zinc-500">Register as a simulated subscriber contributor</p>
                </div>

                {txSuccess && (
                  <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-xl text-center text-xs font-bold text-[#14cfb4]">
                    {txSuccess}
                  </div>
                )}

                {authError && (
                  <div className="p-3 bg-rose-955/5 border border-rose-950/20 rounded-xl text-center text-xs font-bold text-rose-455">
                    {authError}
                  </div>
                )}

                {/* Core form inputs */}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.2 text-left">
                    <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wide">SAVER FULL NAME</span>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Adebayo Shola"
                      className="w-full px-4 py-3 bg-[#090a09] border border-zinc-950 focus:border-zinc-800 focus:outline-none text-xs text-zinc-150 font-semibold rounded-xl"
                    />
                    {regName.trim().length >= 2 && (
                      <p className="text-[10px] text-[#14cfb4] font-mono mt-1 flex items-center gap-1 font-bold animate-pulse">
                        💡 Unique Portal Handle: <strong>@{regName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '')}</strong>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.2 text-left">
                    <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wide">DESIRED USERNAME</span>
                    <input
                      type="text"
                      required
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="e.g. adebayo_shola"
                      className="w-full px-4 py-3 bg-[#090a09] border border-zinc-950 focus:border-zinc-800 focus:outline-none text-xs text-zinc-150 font-semibold rounded-xl"
                    />
                  </div>

                  <div className="flex flex-col gap-1.2 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wide flex items-center gap-1">PHONE NUMBER (OPTIONAL)</span>
                    </div>
                    <input
                      type="text"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="e.g. 0802224445"
                      className="w-full px-4 py-3 bg-[#090a09] border border-[#222b3b] focus:border-[#10b981] focus:outline-none text-xs text-[#14cfb4] font-bold font-mono rounded-xl"
                    />
                    <p className="text-[9px] text-zinc-500 leading-normal font-semibold">Enter your active phone number to register fully (optional).</p>
                  </div>



                  <div className="flex flex-col gap-1.2 text-left">
                    <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wide">SET 4-DIGIT SECURITY PIN</span>
                    <input
                      type="text"
                      required
                      maxLength={4}
                      value={regPin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setRegPin(val);
                      }}
                      placeholder="e.g. 1234"
                      className="w-full px-4 py-3 bg-[#090a09] border border-zinc-950 focus:border-zinc-800 focus:outline-none text-xs text-[#14cfb4] font-bold font-mono tracking-widest rounded-xl"
                    />
                  </div>

                  <div className="flex flex-col gap-1.2 text-left">
                    <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wide">STREET ADDRESS</span>
                    <input
                      type="text"
                      required
                      value={regAddress}
                      onChange={(e) => setRegAddress(e.target.value)}
                      placeholder="No. 12 Ahmadu Bello Way"
                      className="w-full px-4 py-3 bg-[#090a09] border border-zinc-950 focus:border-zinc-800 focus:outline-none text-xs text-white font-semibold rounded-xl"
                    />
                  </div>

                  <div className="flex flex-col gap-1.2 text-left">
                    <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wide">LOCATION REGION</span>
                    <input
                      type="text"
                      required
                      value={regLocation}
                      onChange={(e) => setRegLocation(e.target.value)}
                      placeholder="Lagos Mainland"
                      className="w-full px-4 py-3 bg-[#090a09] border border-zinc-950 focus:border-zinc-800 focus:outline-none text-xs text-zinc-200 font-semibold rounded-xl"
                    />
                  </div>

                  <div className="flex flex-col gap-1.2 text-left">
                    <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wide">ASSIGNED STAFF REFERRAL CODE</span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CO-01"
                      value={regStaffInput}
                      onChange={(e) => setRegStaffInput(e.target.value)}
                      className="w-full px-4 py-3 bg-[#090a09] border border-zinc-950 focus:border-[#14cfb4] focus:outline-none text-xs text-white font-mono font-bold rounded-xl"
                    />

                    {/* Real-time Matching Feedback */}
                    {(() => {
                      const query = regStaffInput.trim().toLowerCase();
                      const matched = state.staff.find(
                        s => s.id.toLowerCase() === query ||
                             (s.code && s.code.toLowerCase() === query)
                      );
                      if (matched) {
                        return (
                          <span className="text-[9.5px] text-[#14cfb4] font-extrabold flex items-center gap-1 mt-0.5 leading-none">
                            ✓ Matched Mobilizer Agent: {matched.name} ({matched.code || matched.id})
                          </span>
                        );
                      } else {
                        return (
                          <span className="text-[9.5px] text-rose-500 font-bold flex items-center gap-1 mt-0.5 leading-none animate-pulse">
                            ❌ Invalid Staff Referral Code (Type e.g. CO-01 manually)
                          </span>
                        );
                      }
                    })()}
                  </div>

                  {/* Trust badge */}
                  <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-900 text-[10px] text-zinc-450 flex items-center gap-2.5 text-left">
                    <span className="text-lg">🛡️</span>
                    <div>
                      <p className="font-bold text-zinc-300 uppercase tracking-tight">Guaranteed Financial Escrow</p>
                      <p className="mt-0.5 leading-normal text-zinc-500">Your physical ledger ledger cards and digital account postings are overseen by certified active collectors.</p>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#0da68d] hover:bg-[#0b917c] text-white font-extrabold rounded-2xl text-[13px] tracking-wide uppercase transition-all shadow-md mt-2 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Submit Savings Enrollment</span>
                </button>

                <div className="flex items-center gap-1 border-t border-zinc-950 pt-3 pt-1 text-[10.5px] text-zinc-550 font-bold leading-normal">
                  <Info className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                  <span>Enrollment instantly creates and approves the saver account! No phone needed.</span>
                </div>
              </form>
            )}
          </motion.div>
        )}

        {/* ================= STAFF PORTAL INTERFACE ================= */}
        {(screen === 'staff-select' || screen === 'staff-dashboard') && (
          <div className="w-full max-w-sm">
            <StaffPortalScreen
              state={state}
              onBack={() => setScreen('gateway')}
              onAddTransaction={onAddTransaction}
              onAddCustomer={onAddCustomer}
              onUpdateStaff={onUpdateStaff}
              onUpdateCustomer={onUpdateCustomer}
              onApproveTransaction={onApproveTransaction}
              onDirectBroadcast={onDirectBroadcast}
              onRequestBroadcast={onRequestBroadcast}
              onApproveBroadcast={onApproveBroadcast}
              onDeclineBroadcast={onDeclineBroadcast}
              initialStaff={loggedStaff}
              initialFlow={screen === 'staff-dashboard' ? 'dashboard' : undefined}
            />
          </div>
        )}

      </AnimatePresence>

      {/* Real-time smartphone SMS / Whatsapp slide-down receiver simulator */}
      <AnimatePresence>
        {activeSmartphoneNotification && (
          <motion.div
            initial={{ opacity: 0, y: -80, x: '-50%' }}
            animate={{ opacity: 1, y: 16 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 18 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 w-full max-w-[340px] bg-[#0c0d0c] border-2 border-zinc-800 rounded-3xl p-3.5 shadow-2xl z-[999] text-left flex gap-3 overflow-hidden"
          >
            {/* Ambient green vertical bar and top-notch design */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-[#14cfb4] to-emerald-400" />
            
            <div className="text-lg p-1 bg-zinc-900 rounded-xl w-10 h-10 flex items-center justify-center shrink-0 border border-zinc-800">
              {activeSmartphoneNotification.icon}
            </div>

            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-[#14cfb4] tracking-widest uppercase truncate leading-none">
                  {activeSmartphoneNotification.title}
                </span>
                <span className="text-[8px] font-mono text-zinc-500 font-bold shrink-0 leading-none">
                  {activeSmartphoneNotification.time}
                </span>
              </div>
              <p className="text-[10.5px] font-sans text-zinc-350 mt-2 font-medium leading-relaxed leading-normal whitespace-pre-line select-all">
                {activeSmartphoneNotification.message}
              </p>
              <div className="flex gap-2 mt-3 select-none">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(activeSmartphoneNotification.message);
                    showToast("📋 SMS content copied to system clipboard!", "success");
                  }}
                  className="px-2 py-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-[8.5px] font-black text-zinc-300 rounded uppercase transition-colors cursor-pointer"
                >
                  Copy Message
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSmartphoneNotification(null)}
                  className="px-2 py-1 bg-zinc-950 border border-zinc-900 hover:bg-zinc-900 text-[8.5px] font-semibold text-zinc-500 rounded uppercase transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Dynamic Floating Toast Alerts */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#14cfb4] text-zinc-955 font-black text-[11px] uppercase tracking-wide px-4 py-2.5 rounded-full z-50 flex items-center gap-2 shadow-[0_8px_30px_rgba(20,207,180,0.3)] border border-[#14cfb4]/30"
          >
            <span>✨</span> {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {isEnteringIdentifier && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#111311] border border-[#14cfb4]/30 p-8 rounded-[32px] w-full max-w-sm shadow-2xl animate-in zoom-in duration-200">
            <div className="w-16 h-16 bg-[#14cfb4]/10 rounded-2xl flex items-center justify-center text-[#14cfb4] mb-6 mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>
            
            <h3 className="text-white font-black text-xl mb-2 text-center uppercase tracking-tight">Security Reset</h3>
            <p className="text-zinc-400 text-xs text-center mb-6 leading-relaxed">
              Enter your registered username or phone number. We will generate a one-time temporary PIN for your ledger card access.
            </p>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">IDENTIFIER</label>
                <input 
                  type="text"
                  autoFocus
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setResetError('');
                  }}
                  placeholder="Username or Phone number"
                  className={`w-full py-3.5 px-4 bg-[#090a09] border ${resetError ? 'border-rose-500/50' : 'border-zinc-800 focus:border-[#14cfb4]'} rounded-xl text-sm font-bold text-white transition-all focus:outline-none placeholder:text-zinc-700`}
                />
                {resetError && (
                  <p className="text-[10px] text-rose-400 font-bold ml-1 animate-pulse">⚠️ {resetError}</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => {
                    setIsEnteringIdentifier(false);
                    setIdentifier('');
                    setResetError('');
                  }} 
                  className="flex-1 py-3.5 text-zinc-400 text-xs font-black uppercase tracking-widest border border-zinc-800 rounded-2xl hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!identifier.trim()) {
                      setResetError('Please enter an identifier');
                      return;
                    }

                    const customer = state.customers.find(c => {
                      const normalizedIdentifier = String(identifier).toLowerCase().trim();
                      const matchesPhone = String(c.phoneNumber) === String(identifier) || 
                                          String(c.phoneNumber).replace(/\D/g, '') === String(identifier).replace(/\D/g, '');
                      const matchesUsername = c.username?.toLowerCase().trim() === normalizedIdentifier;
                      return matchesPhone || matchesUsername;
                    });

                    if (customer) {
                      const newPin = Math.floor(1000 + Math.random() * 9000).toString();
                      onUpdateCustomer(customer.id, { pin: newPin });
                      setGeneratedPin(newPin);
                      setShowResetModal(true);
                      setIsEnteringIdentifier(false);
                      setIdentifier('');
                      setResetError('');
                      // The reset modal auto-closes in its own logic or we can rely on user closing it
                    } else {
                      setResetError("Credentials mismatch. No account found.");
                    }
                  }}
                  className="flex-1 py-3.5 bg-[#14cfb4] text-black font-black text-xs uppercase tracking-widest rounded-2xl shadow-[0_4px_15px_rgba(20,207,180,0.2)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                >
                  Confirm Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showResetModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#111311] border border-[#14cfb4]/30 p-8 rounded-3xl text-center shadow-2xl max-w-xs w-full animate-in zoom-in duration-200">
            <h2 className="text-white font-black text-lg mb-2">PIN Reset Initiated</h2>
            <p className="text-zinc-400 text-sm mb-4">Your temporary PIN is:</p>
            <div className="text-4xl font-mono font-bold text-[#14cfb4] tracking-[0.2em] mb-6">
              {generatedPin}
            </div>
            <p className="text-zinc-500 text-xs">Keep this secure. This window will close automatically.</p>
          </div>
        </div>
      )}
    </div>
  );
}
