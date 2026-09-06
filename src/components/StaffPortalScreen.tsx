import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "motion/react";
import {
  Copy,
  Share2,
  LogOut,
  Home,
  Users,
  Coins,
  UserPlus,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  BellRing,
  Briefcase,
  Lock,
  MapPin,
  TrendingUp,
  Target,
  FileText,
  MessageSquare,
  Check,
  Smartphone,
  Printer,
  ShieldAlert,
  Search,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Upload,
  Plus,
  PlusSquare,
  ArrowDownLeft,
  Wallet,
  DollarSign,
  Send,
  Loader2,
  Megaphone
} from "lucide-react";
import { Breadcrumb } from './Breadcrumb';
import { DashboardState, Customer, StaffMember, Transaction } from "../types";
import { requestPasswordReset } from '../lib/authHelper';
import BroadcastTab from './BroadcastTab';
import { useToast } from './ToastProvider';
import { CustomerStats } from './CustomerStats';

const UnsavedChangesConfirmationModal = ({
  isOpen,
  pendingAction,
  onClose,
}: {
  isOpen: boolean;
  pendingAction: (() => void) | null;
  onClose: () => void;
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
      <div className="bg-[#111311] border border-zinc-900 rounded-[32px] p-6 max-w-sm w-full shadow-[0_24px_50px_rgba(0,0,0,0.95)]">
        <h3 className="text-white font-black text-xl mb-2">Unsaved Changes</h3>
        <p className="text-zinc-400 text-sm mb-6">You have unsaved changes. Are you sure you want to discard them?</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-zinc-800 text-white rounded-xl font-bold cursor-pointer">Cancel</button>
          <button onClick={() => { pendingAction?.(); onClose(); }} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold cursor-pointer">Discard</button>
        </div>
      </div>
    </div>
  );
};

interface StaffPortalScreenProps {
  state: DashboardState;
  onBack: () => void;
  onAddTransaction: (tx: {
    customerId: string;
    type: "deposit" | "withdrawal";
    amount: number;
    profitAmount?: number;
    staffId: string;
    status?: "pending" | "approved";
    withdrawalPhoto?: string;
    cardPhoto?: string;
  }) => any;
  onAddCustomer: (
    customer: Omit<Customer, "id" | "joinedDate" | "contributionsCount"> & {
      id?: string;
    },
  ) => void;
  onUpdateStaff: (id: string, updatedFields: Partial<StaffMember>) => void;
  onUpdateCustomer?: (id: string, updatedFields: Partial<Customer>) => void;
  onApproveTransaction?: (id: string, receiptPhoto?: string) => void;
  onDirectBroadcast?: (message: string) => Promise<void>;
  onRequestBroadcast?: (message: string, sender: { id: string; name: string; role: string }) => Promise<void>;
  onApproveBroadcast?: (id: string, managerName: string) => Promise<void>;
  onDeclineBroadcast?: (id: string) => Promise<void>;
  initialStaff?: StaffMember | null;
  initialFlow?: "login-id" | "login-pin" | "set-pin" | "dashboard";
}

const getCustomerAvatarGradient = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes("amina"))
    return "from-[#14cfb4] to-[#facc15] text-[#090a09] font-black";
  if (lower.includes("chukwu") || lower.includes("eze"))
    return "from-[#c084fc] via-[#f472b6] to-[#fb7185] text-zinc-950";
  if (lower.includes("fatima") || lower.includes("musa"))
    return "from-[#f97316] via-[#facc15] to-[#f59e0b] text-[#090a09]";
  return "from-blue-400 to-indigo-500 text-white";
};

export default function StaffPortalScreen({
  state,
  onBack,
  onAddTransaction,
  onAddCustomer,
  onUpdateStaff,
  onUpdateCustomer,
  onApproveTransaction,
  onDirectBroadcast,
  onRequestBroadcast,
  onApproveBroadcast,
  onDeclineBroadcast,
  initialStaff = null,
  initialFlow = "login-id",
}: StaffPortalScreenProps) {
  const { showToast } = useToast();
  // Navigation Flow States
  // 'login-id' -> 'login-pin' -> 'set-pin' -> 'dashboard'
  const [flow, setFlow] = useState<
    "login-id" | "login-pin" | "set-pin" | "dashboard"
  >(initialFlow);

  // Authentication Data
  const [staffIdInput, setStaffIdInput] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(initialStaff);
  const [pinDigits, setPinDigits] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // For Set PIN sequence
  const [setPinStep, setSetPinStep] = useState<1 | 2>(1);
  const [newPinMatch, setNewPinMatch] = useState("");

  // Active Tab inside Staff Dashboard
  const [activeTab, setActiveTab] = useState<
    "home" | "members" | "collect" | "customers" | "transfer" | "announcements"
  >("home");

  // Copy/Share Tooltips
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [shareStatus, setShareStatus] = useState(false);

  // Extra Interactive Features Modals
  const [receiptModalTx, setReceiptModalTx] = useState<Transaction | null>(
    null,
  );
  const [authReceiptPhoto, setAuthReceiptPhoto] = useState<string>('');
  const [showReceiptSelector, setShowReceiptSelector] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState(-1); // -1: idle, 0..100: values

  // Collect tab states
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [collectAmount, setCollectAmount] = useState("2000");
  const [collectProfitAmount, setCollectProfitAmount] = useState("");
  const [successCollectToast, setSuccessCollectToast] = useState("");
  const [isCollectSubmitting, setIsCollectSubmitting] = useState(false);

  // Customer registration form states
  const [newCustName, setNewCustName] = useState("");
  const [newCustUsername, setNewCustUsername] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustAccountNumber, setNewCustAccountNumber] = useState("");
  const [newCustLocation, setNewCustLocation] = useState("Kaduna North");
  const [newCustAddress, setNewCustAddress] = useState("");
  const [newCustInitialAmount, setNewCustInitialAmount] = useState("2000");

  // Members search term
  const [searchMemberQuery, setSearchMemberQuery] = useState("");

  // Custom states to match high-fidelity screenshots 2 & 3
  const [searchCollectQuery, setSearchCollectQuery] = useState("");
  const [searchCustomerQuery, setSearchCustomerQuery] = useState("");
  const [collectingCustomer, setCollectingCustomer] = useState<Customer | null>(
    null,
  );
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [staffPinResetValue, setStaffPinResetValue] = useState("");
  const [staffLastResetPin, setStaffLastResetPin] = useState<string | null>(null);

  // Transfer form states
  const [trfRecipientAcc, setTrfRecipientAcc] = useState("");
  const [trfAmount, setTrfAmount] = useState("");
  const [trfPin, setTrfPin] = useState("");
  const [isTrfSubmitting, setIsTrfSubmitting] = useState(false);
  const [trfError, setTrfError] = useState("");
  const [trfSuccess, setTrfSuccess] = useState("");

  const trfMatchedRecipient = React.useMemo(() => {
    const acc = trfRecipientAcc.trim();
    if (acc.length < 3) return null;

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

    const normAcc = normalizeAcc(acc);

    // Search customers
    const cust = state.customers.find(c => {
      const normCAcc = c.accountNumber ? normalizeAcc(c.accountNumber) : '';
      const normCContrib = c.contributionAccountNumber ? normalizeAcc(c.contributionAccountNumber) : '';
      return normCAcc === normAcc || normCContrib === normAcc || (c.accountNumber && c.accountNumber.replace(/\s+/g, '') === acc);
    });
    if (cust) {
      return {
        id: cust.id,
        name: cust.name,
        type: 'Customer Account',
        original: cust,
        status: cust.status
      };
    }

    // Search staff members
    const stf = state.staff.find(s => {
      const normSAcc = s.accountNumber ? normalizeAcc(s.accountNumber) : '';
      return normSAcc === normAcc || (s.accountNumber && s.accountNumber.replace(/\s+/g, '') === acc) ||
             (s.code && s.code.replace(/\s+/g, '').toLowerCase() === acc.toLowerCase());
    });
    if (stf) {
      return {
        id: stf.id,
        name: stf.name,
        type: 'Staff Wallet',
        original: stf,
        status: stf.status
      };
    }

    // Search Manager / Treasury
    if (acc.toLowerCase() === 'treasury' || acc === '1000000001' || acc === (state.settings.treasuryAccountNumber || '1000000001').replace(/\s+/g, '')) {
      return {
        id: 'treasury',
        name: 'Central Contribution Treasury',
        type: 'HQ Treasury',
        original: state.settings,
        status: 'active' as const
      };
    }

    return null;
  }, [trfRecipientAcc, state.customers, state.staff, state.settings]);

  useEffect(() => {
    setStaffPinResetValue("");
    setStaffLastResetPin(null);
  }, [viewingCustomer]);

  const viewingCustomerFileRef = React.useRef<HTMLInputElement>(null);
  
  // State for unsaved changes confirmation
  const [isDirty, setIsDirty] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);

  // Staff Biometric Capture States for client withdrawals in field
  const [collectTxType, setCollectTxType] = useState<"deposit" | "withdrawal">(
    "deposit",
  );
  const [staffWithdrawalPhoto, setStaffWithdrawalPhoto] = useState<string>("");
  const [staffWithdrawalCard, setStaffWithdrawalCard] = useState<string>("");
  const [staffCamActive, setStaffCamActive] = useState<boolean>(false);
  const [staffCaptureTab, setStaffCaptureTab] = useState<
    "selfie" | "card" | "simulation"
  >("simulation");
  const staffVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);

  const startStaffCamera = async () => {
    try {
      setStaffCamActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      setTimeout(() => {
        if (staffVideoRef.current) {
          staffVideoRef.current.srcObject = stream;
        }
      }, 150);
    } catch (err) {
      console.error("Staff Camera load error:", err);
      setStaffCamActive(false);
    }
  };

  const captureStaffPhoto = () => {
    if (staffVideoRef.current) {
      try {
        const video = staffVideoRef.current;
        const canvas = document.createElement("canvas");
        canvas.width = 400;
        canvas.height = 300;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL("image/jpeg");
          setStaffWithdrawalPhoto(dataUrl);

          // Stop track
          const stream = video.srcObject as MediaStream;
          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
          }
          setStaffCamActive(false);
        }
      } catch (err) {
        console.error("Staff Capture error:", err);
      }
    }
  };

  const stopStaffCamera = () => {
    if (staffVideoRef.current && staffVideoRef.current.srcObject) {
      const stream = staffVideoRef.current.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    }
    setStaffCamActive(false);
  };

  const handleStaffCardUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setStaffWithdrawalCard(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Transactions log filters specifically for staff account
  const [txTimeframeFilter, setTxTimeframeFilter] = useState<
    "all" | "daily" | "weekly" | "monthly" | "yearly"
  >("all");
  const [txTypeFilter, setTxTypeFilter] = useState<
    "all" | "deposit" | "withdrawal"
  >("all");
  const [txSearchQuery, setTxSearchQuery] = useState("");
  const [pulseScope, setPulseScope] = useState<"personal" | "system">("personal");
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);

  // Auto-fill S001 if Bello Usman is clicked in the list or standard user typing
  const handleSelectPreloadStaff = (staff: StaffMember) => {
    setStaffIdInput(staff.code);
    setSelectedStaff(staff);
    setErrorMessage("");
    setPinDigits("");
  };

  // Perform login checks
  const verifyPinAndLogin = (
    enteredCode: string,
    targetStaff?: StaffMember | null,
  ) => {
    const activeObj = targetStaff || selectedStaff;
    if (!activeObj) return;

    // Strict match against the registered staff member's specific 4-digit PIN
    const storedPin = activeObj.pin;
    const isValid = enteredCode === storedPin;

    if (isValid) {
      setSuccessMessage(`Welcome, Authorized ${activeObj.name}!`);
      setTimeout(() => {
        setSuccessMessage("");
        setFlow("dashboard");
        setActiveTab("home");
      }, 800);
    } else {
      setErrorMessage("Incorrect security PIN. Please try again.");
      setPinDigits("");
    }
  };

  // Resolution of staff during on-the-fly PIN keypad entry
  const resolveStaffOnTheFly = (inputId: string): StaffMember | null => {
    const cleanInput = inputId.trim().toLowerCase();
    if (!cleanInput) return null;

    return (
      state.staff.find((s) => {
        const lid = s.id.toLowerCase();
        const lcode = s.code.toLowerCase();
        const lemail = s.email.toLowerCase();
        const lname = s.name.toLowerCase();

        return (
          lid === cleanInput ||
          lid === `s_${cleanInput}` ||
          lcode === cleanInput ||
          lcode.includes(cleanInput) ||
          lemail === cleanInput ||
          lemail.startsWith(cleanInput) ||
          lname.includes(cleanInput)
        );
      }) || null
    );
  };

  // Tap keyboard input wrapper
  const handleKeypadPress = (val: string) => {
    setErrorMessage("");

    // If typing set-pin stage
    if (flow === "set-pin") {
      if (val === "backspace") {
        if (setPinStep === 1) {
          setPinDigits((prev) => prev.slice(0, -1));
        } else {
          setNewPinMatch((prev) => prev.slice(0, -1));
        }
        return;
      }

      if (setPinStep === 1) {
        if (pinDigits.length >= 4) return;
        const nextPin = pinDigits + val;
        setPinDigits(nextPin);

        if (nextPin.length === 4) {
          setTimeout(() => {
            setSetPinStep(2);
          }, 300);
        }
      } else {
        if (newPinMatch.length >= 4) return;
        const nextConfirm = newPinMatch + val;
        setNewPinMatch(nextConfirm);

        if (nextConfirm.length === 4) {
          if (pinDigits === nextConfirm) {
            saveNewStaffPin(pinDigits);
          } else {
            setErrorMessage("PINs do not match. Please restart pin creation.");
            setPinDigits("");
            setNewPinMatch("");
            setSetPinStep(1);
          }
        }
      }
      return;
    }

    // Otherwise, we are in active login page (both id and pin showing concurrently)
    if (val === "backspace") {
      setPinDigits((prev) => prev.slice(0, -1));
      return;
    }

    // Try to auto-resolve active staff on the fly if input is set
    let activeUser = selectedStaff;
    if (!activeUser && staffIdInput) {
      activeUser = resolveStaffOnTheFly(staffIdInput);
      if (activeUser) setSelectedStaff(activeUser);
    }

    // Fallback default: if user types PIN but didn't select/type staff, auto-select Bello (S051) as the default simulation!
    if (!staffIdInput) {
      const defaultBello =
        state.staff.find((s) => s.id === "s1") || state.staff[0];
      if (defaultBello) {
        setStaffIdInput(defaultBello.code);
        setSelectedStaff(defaultBello);
        activeUser = defaultBello;
      }
    }

    if (pinDigits.length >= 4) return;
    const nextPin = pinDigits + val;
    setPinDigits(nextPin);

    if (nextPin.length === 4) {
      // Re-verify resolved staff
      const verifiedUser = activeUser || resolveStaffOnTheFly(staffIdInput);
      if (!verifiedUser) {
        setErrorMessage(
          "Staff ID not found. Enter a valid ID (e.g. S001) to unlock.",
        );
        setPinDigits("");
        return;
      }

      setSelectedStaff(verifiedUser);

      // Check if they need to set a PIN
      if (verifiedUser.pinStatus === "pending" && !verifiedUser.pin) {
        setFlow("set-pin");
        setSetPinStep(1);
      } else {
        verifyPinAndLogin(nextPin, verifiedUser);
      }
    }
  };

  // Complete set PIN procedure
  const saveNewStaffPin = (createdPin: string) => {
    if (!selectedStaff) return;

    // Update local state and global database store
    onUpdateStaff(selectedStaff.id, {
      pin: createdPin,
      pinStatus: "set",
    });

    setSuccessMessage("PIN configured successfully!");

    // Automatically login Bello after configuring PIN
    setTimeout(() => {
      setSuccessMessage("");
      // Update selected staff context
      setSelectedStaff({
        ...selectedStaff,
        pin: createdPin,
        pinStatus: "set",
      });
      setFlow("dashboard");
      setActiveTab("home");
    }, 1200);
  };

  // Handle local staff transactions from field
  const handleLocalCollectCash = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !selectedCustomerId) return;

    const amountNum = parseFloat(collectAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setErrorMessage("Please specify logical contribution amount.");
      return;
    }

    // Call store modifier to inject transaction to general ledger
    onAddTransaction({
      customerId: selectedCustomerId,
      amount: amountNum,
      type: "deposit",
      staffId: selectedStaff.id,
      status: "approved", // Automatically auto-approved as logged by field collector physically
    });

    setSuccessCollectToast(
      `₦${amountNum.toLocaleString()} savings logged and approved instantly!`,
    );
    setCollectAmount("2000");

    // Find customer for success alerts
    const customer = state.customers.find((c) => c.id === selectedCustomerId);

    setTimeout(() => {
      setSuccessCollectToast("");
      // Also automatically open receipt view for immediate user delight
      const simulatedTx: Transaction = {
        id: "t_sim_" + Date.now(),
        customerId: selectedCustomerId,
        customerName: customer ? customer.name : "Valued Subscriber",
        type: "deposit",
        amount: amountNum,
        status: "approved",
        timestamp: new Date().toISOString(),
        reference: `CBP-D${Math.floor(1000 + Math.random() * 9000)}`,
        staffId: selectedStaff.id,
        staffName: selectedStaff.name,
      };
      setReceiptModalTx(simulatedTx);
    }, 1500);
  };

  // Handle staff registering a customer
  const handleLocalRegisterCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustAddress || !selectedStaff) return;

    if (newCustAccountNumber.trim() && state.customers.some(c => c.accountNumber === newCustAccountNumber.trim())) {
      setErrorMessage("The custom account number you specified is already registered to another saver.");
      return;
    }

    let uniqueUser = newCustUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!uniqueUser) {
      const baseUsr = newCustName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
      uniqueUser = baseUsr || 'user';
    }

    if (state.customers.some(c => c.username?.toLowerCase() === uniqueUser)) {
      setErrorMessage(`The username "@${uniqueUser}" is already taken. Please choose a different one.`);
      return;
    }

    const initialContribution = parseFloat(newCustInitialAmount) || 0;

    const freshCustId = "c_" + Date.now();

    const custWithAcc = state.customers.filter(c => c.accountNumber && /^[3]\d{9}$/.test(c.accountNumber));
    let nextCustAccNum = 3000000001;
    if (custWithAcc.length > 0) {
      const numbers = custWithAcc.map(c => parseInt(c.accountNumber || '', 10)).filter(num => !isNaN(num));
      if (numbers.length > 0) {
        nextCustAccNum = Math.max(...numbers) + 1;
      }
    }
    const uniqueAcc = newCustAccountNumber.trim() || String(nextCustAccNum);

    onAddCustomer({
      id: freshCustId,
      name: newCustName,
      username: uniqueUser,
      phoneNumber: newCustPhone.trim() || 'No Phone',
      balance: initialContribution,
      assignedStaffId: selectedStaff.id,
      status: "active",
      approvalStatus: "approved", // Live field collection automatically starts active/approved
      location: newCustLocation,
      address: newCustAddress,
      accountNumber: uniqueAcc,
    });

    // We align with the safe atomic single-update core store;
    // We only update the local view state to keep visual indicators current.
    if (initialContribution > 0) {
      setSelectedStaff((prev) =>
        prev
          ? {
              ...prev,
              collectionsToday:
                (prev.collectionsToday || 0) + initialContribution,
              collectionsCount: (prev.collectionsCount || 0) + 1,
              totalCollectionsAmount:
                (prev.totalCollectionsAmount || 0) + initialContribution,
            }
          : null,
      );
    }

    setSuccessCollectToast(
      `Saver "${newCustName}" registered and enrolled comprehensively!`,
    );
    setNewCustName("");
    setNewCustUsername("");
    setNewCustPhone("");
    setNewCustAccountNumber("");
    setNewCustAddress("");

    setTimeout(() => {
      setSuccessCollectToast("");
      setActiveTab("home");
    }, 2000);
  };

  // Copy code utility
  const handleCopyCode = (codeTxt: string) => {
    navigator.clipboard.writeText(codeTxt);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Simulate network sharing
  const handleShareButton = (codeTxt: string) => {
    setShareStatus(true);
    setTimeout(() => setShareStatus(false), 2000);
  };

  // Secure transfer submit handler
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    setTrfError("");
    setTrfSuccess("");

    const amountNum = parseFloat(trfAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setTrfError("Please specify a valid amount greater than 0.");
      return;
    }

    if ((selectedStaff.walletBalance || 0) < amountNum) {
      setTrfError("Insufficient wallet balance.");
      return;
    }

    if (!trfMatchedRecipient) {
      setTrfError("Invalid or unknown Recipient Account Number.");
      return;
    }

    if (trfMatchedRecipient.status !== 'active') {
      setTrfError("The account number is not active.");
      return;
    }

    if (trfPin !== selectedStaff.pin) {
      setTrfError("Incorrect 4-digit security PIN.");
      return;
    }

    setIsTrfSubmitting(true);

    try {
      // 1. Debit the sender (staff)
      const newSenderBalance = (selectedStaff.walletBalance || 0) - amountNum;
      await onUpdateStaff(selectedStaff.id, { walletBalance: newSenderBalance });

      // 2. Credit the recipient
      if (trfMatchedRecipient.type === 'Customer Account') {
        const cust = trfMatchedRecipient.original as Customer;
        const newRecipientBalance = (cust.balance || 0) + amountNum;
        if (onUpdateCustomer) {
          await onUpdateCustomer(cust.id, { balance: newRecipientBalance });
        }
        // Log transaction as an approved transfer deposit
        await onAddTransaction({
          customerId: cust.id,
          type: "deposit",
          amount: amountNum,
          staffId: selectedStaff.id,
          status: "approved"
        });
      } else if (trfMatchedRecipient.type === 'Staff Wallet') {
        const stf = trfMatchedRecipient.original as StaffMember;
        const newRecipientBalance = (stf.walletBalance || 0) + amountNum;
        await onUpdateStaff(stf.id, { walletBalance: newRecipientBalance });
      }

      setTrfSuccess(`Successfully transferred ₦${amountNum.toLocaleString()} to ${trfMatchedRecipient.name}!`);
      showToast(`Transfer successful: ₦${amountNum.toLocaleString()} sent.`, "success");
      
      // Clear fields
      setTrfAmount("");
      setTrfRecipientAcc("");
      setTrfPin("");
    } catch (err: any) {
      setTrfError("Transfer failed. Please try again.");
    } finally {
      setIsTrfSubmitting(false);
    }
  };

  // WhatsApp reminder broadcast trigger
  const runSimulatedBroadcast = () => {
    setBroadcastProgress(0);
  };

  // Synchronize logged in staff member metrics details with master database when modified
  useEffect(() => {
    if (selectedStaff) {
      const updated = state.staff.find((s) => s.id === selectedStaff.id);
      if (updated) {
        if (JSON.stringify(updated) !== JSON.stringify(selectedStaff)) {
          setSelectedStaff(updated);
        }
      }
    }
  }, [state.staff, selectedStaff]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (broadcastProgress >= 0 && broadcastProgress < 100) {
      interval = setInterval(() => {
        setBroadcastProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval!);
            return 100;
          }
          return prev + 10;
        });
      }, 250);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [broadcastProgress]);

  // Logged staff collections today (fallback to photo ₦4,000 if brand new, else reflect changes)
  const displayCollectionsToday = selectedStaff
    ? selectedStaff.collectionsToday === 312000
      ? 4000
      : selectedStaff.collectionsToday
    : 4000;

  // Real or assigned customers
  const assignedCustomers = state.customers.filter(
    (c) => !selectedStaff || c.assignedStaffId === selectedStaff.id,
  );

  // Filter pending withdrawals for active staff's assigned customer base
  const pendingCustomerWithdrawals = state.transactions.filter(
    (tx) => 
      tx.type === "withdrawal" && 
      tx.status === "pending" && 
      selectedStaff &&
      state.customers.some(
        (c) => c.id === tx.customerId && c.assignedStaffId === selectedStaff.id
      )
  );

  // Filter customers matching query in tab
  const filteredCustomersList = assignedCustomers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchMemberQuery.toLowerCase()) ||
      c.phoneNumber.includes(searchMemberQuery) ||
      (c.location &&
        c.location.toLowerCase().includes(searchMemberQuery.toLowerCase())),
  );

  // Filter global transactions representing Bello's logs or any pending withdrawals for their assigned customers
  const selectedStaffTransactions = state.transactions
    .filter((t) => {
      if (!selectedStaff) return true;
      const isOwned = t.staffId === selectedStaff.id;
      // Also show pending withdrawals for assigned customers of this staff member
      const isPendingForMyCustomer = t.type === "withdrawal" && t.status === "pending" && state.customers.some(
        (c) => c.id === t.customerId && c.assignedStaffId === selectedStaff.id
      );
      return isOwned || isPendingForMyCustomer;
    })
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

  // Currency formatter helper
  const formatNaira = (amt: number) => {
    return "₦" + amt.toLocaleString("en-US", { minimumFractionDigits: 0 });
  };

  // Period analysis helper
  const getWithinPeriod = (
    timestampStr: string,
    period: "daily" | "weekly" | "monthly" | "yearly",
  ) => {
    const nowMs = new Date().getTime();
    const oneDayMs = 1000 * 60 * 60 * 24;
    const txTime = new Date(timestampStr).getTime();
    const diffMs = nowMs - txTime;

    if (period === "daily") return diffMs <= oneDayMs;
    if (period === "weekly") return diffMs <= oneDayMs * 7;
    if (period === "monthly") return diffMs <= oneDayMs * 30;
    if (period === "yearly") return diffMs <= oneDayMs * 365;
    return true;
  };

  // Memo for Financial Pulse data in Staff Home/Overview Tab
  const pulseMetrics = React.useMemo(() => {
    const calculateForPeriod = (
      period: "daily" | "weekly" | "monthly" | "yearly",
      scope: "personal" | "system"
    ) => {
      const txsInPeriod = state.transactions.filter(
        (t) => t.timestamp && getWithinPeriod(t.timestamp, period)
      );
      const approvedTxs = txsInPeriod.filter(
        (t) =>
          t.status === "approved" &&
          (scope === "system" || (selectedStaff && t.staffId === selectedStaff.id))
      );

      const deposits = approvedTxs
        .filter((t) => t.type === "deposit")
        .reduce((sum, t) => sum + t.amount, 0);

      const withdrawals = approvedTxs
        .filter((t) => t.type === "withdrawal")
        .reduce((sum, t) => sum + t.amount, 0);

      const profit = approvedTxs
        .filter((t) => t.type === "withdrawal" && t.profitAmount)
        .reduce((sum, t) => sum + (t.profitAmount || 0), 0);

      const netMargin = deposits - withdrawals;

      const depCount = approvedTxs.filter((t) => t.type === "deposit").length;
      const wdCount = approvedTxs.filter((t) => t.type === "withdrawal").length;

      return {
        deposits,
        withdrawals,
        profit,
        netMargin,
        depCount,
        wdCount,
      };
    };

    return {
      personal: {
        daily: calculateForPeriod("daily", "personal"),
        weekly: calculateForPeriod("weekly", "personal"),
        monthly: calculateForPeriod("monthly", "personal"),
        yearly: calculateForPeriod("yearly", "personal"),
      },
      system: {
        daily: calculateForPeriod("daily", "system"),
        weekly: calculateForPeriod("weekly", "system"),
        monthly: calculateForPeriod("monthly", "system"),
        yearly: calculateForPeriod("yearly", "system"),
      },
    };
  }, [state.transactions, selectedStaff]);

  // APPROVED transactions initiated specifically by this logged-in staff member
  const approvedStaffTxs = selectedStaff
    ? state.transactions.filter(
        (t) => t.staffId === selectedStaff.id && t.status === "approved",
      )
    : [];

  const getPeriodMetrics = (
    period: "daily" | "weekly" | "monthly" | "yearly",
  ) => {
    // Total deposits (savings)
    const saved = approvedStaffTxs
      .filter(
        (t) => t.type === "deposit" && getWithinPeriod(t.timestamp, period),
      )
      .reduce((sum, t) => sum + t.amount, 0);

    // Total withdrawals (if any)
    const withdrawn = approvedStaffTxs
      .filter(
        (t) => t.type === "withdrawal" && getWithinPeriod(t.timestamp, period),
      )
      .reduce((sum, t) => sum + t.amount, 0);

    // Total profit generated by staff in this period
    const profit = approvedStaffTxs
      .filter(
        (t) => t.type === "withdrawal" && t.profitAmount && getWithinPeriod(t.timestamp, period),
      )
      .reduce((sum, t) => sum + (t.profitAmount || 0), 0);

    // Total active balance of customers who saved or initiated transactions in this period
    const activeCustIds = new Set(
      approvedStaffTxs
        .filter((t) => getWithinPeriod(t.timestamp, period))
        .map((t) => t.customerId),
    );
    const activeBalance = state.customers
      .filter((c) => activeCustIds.has(c.id))
      .reduce((sum, c) => sum + c.balance, 0);

    // APPROVED transactions system-wide
    const systemApprovedTxs = state.transactions.filter(
      (t) => t.status === "approved",
    );

    // Total system-wide savings
    const systemSaved = systemApprovedTxs
      .filter(
        (t) => t.type === "deposit" && getWithinPeriod(t.timestamp, period),
      )
      .reduce((sum, t) => sum + t.amount, 0);

    // Total system-wide withdrawals
    const systemWithdrawn = systemApprovedTxs
      .filter(
        (t) => t.type === "withdrawal" && getWithinPeriod(t.timestamp, period),
      )
      .reduce((sum, t) => sum + t.amount, 0);

    // Total system profit
    const systemProfit = systemApprovedTxs
      .filter(
        (t) => t.type === "withdrawal" && t.profitAmount && getWithinPeriod(t.timestamp, period),
      )
      .reduce((sum, t) => sum + (t.profitAmount || 0), 0);

    // Total system-wide active balance
    const systemActiveCustIds = new Set(
      systemApprovedTxs
        .filter((t) => getWithinPeriod(t.timestamp, period))
        .map((t) => t.customerId),
    );
    const systemActiveBalance = state.customers
      .filter((c) => systemActiveCustIds.has(c.id))
      .reduce((sum, c) => sum + c.balance, 0);

    // Customer registrations this period
    const registeredCustomersInPeriod = state.customers.filter(
      (c) => c.joinedDate && getWithinPeriod(c.joinedDate, period),
    );
    const registeredCount = registeredCustomersInPeriod.length;

    // "New Customer" (registered in period) vs "Old Customer" (registered before period)
    const newCustomersCount = registeredCount;
    const oldCustomersCount = state.customers.length - registeredCount;

    // Logged-in staff member's acquired customers in this period
    const myCustomers = selectedStaff
      ? state.customers.filter((c) => c.assignedStaffId === selectedStaff.id)
      : [];
    const myRegisteredInPeriod = myCustomers.filter(
      (c) => c.joinedDate && getWithinPeriod(c.joinedDate, period),
    );
    const myRegisteredCount = myRegisteredInPeriod.length;
    const myNewCustomersCount = myRegisteredCount;
    const myOldCustomersCount = myCustomers.length - myRegisteredCount;

    return {
      saved,
      withdrawn,
      profit,
      activeBalance,
      systemSaved,
      systemWithdrawn,
      systemProfit,
      systemActiveBalance,
      registeredCount,
      newCustomersCount,
      oldCustomersCount,
      myRegisteredCount,
      myNewCustomersCount,
      myOldCustomersCount,
    };
  };

  const dailyMetrics = getPeriodMetrics("daily");
  const weeklyMetrics = getPeriodMetrics("weekly");
  const monthlyMetrics = getPeriodMetrics("monthly");
  const yearlyMetrics = getPeriodMetrics("yearly");

  // Filter staff transactions based on timeframe, type, and search queries (Interactive search)
  const processedTransactions = selectedStaffTransactions.filter((t) => {
    // Type filter
    if (txTypeFilter !== "all" && t.type !== txTypeFilter) return false;

    // Timeframe filter
    if (
      txTimeframeFilter !== "all" &&
      !getWithinPeriod(t.timestamp, txTimeframeFilter)
    )
      return false;

    // Search query
    if (txSearchQuery) {
      const q = txSearchQuery.toLowerCase();
      const matchesName = t.customerName
        ? t.customerName.toLowerCase().includes(q)
        : false;
      const matchesAmount = t.amount.toString().includes(q);
      const matchesRef = t.reference
        ? t.reference.toLowerCase().includes(q)
        : false;
      return matchesName || matchesAmount || matchesRef;
    }

    return true;
  });

  // Recent transactions to show specifically (Today, Yesterday)
  // Mirroring feed "Collected ₦2,000 from Amina Bello / Musa Ibrahim"
  const mockupRecentLogs = [
    { name: "Amina Bello", amount: 2000, date: "Today, 9:15 AM" },
    { name: "Musa Ibrahim", amount: 2000, date: "Yesterday, 9:05 AM" },
  ];

  return (
    <div className="min-h-screen bg-[#070907] text-zinc-150 flex flex-col items-center justify-start md:justify-center p-4 select-none relative overflow-y-auto overflow-x-hidden font-sans pb-16">
      {/* Immersive radial glowing gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.05)_0%,transparent_60%)] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-[#8b5cf6]/5 rounded-full blur-[100px] pointer-events-none" />

      {/* SUCCESS TOAST FLYOUT */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 z-50 bg-[#8b5cf6] text-white px-6 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-[0_12px_36px_rgba(139,92,246,0.4)] flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-white animate-bounce" />
            <span>{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* ================= COMBINED LOGIN GATEWAY: ID + PIN KEYPAD (MATCHES PHOTOS 1 & 2) ================= */}
        {flow === "login-id" && (
          <motion.div
            key="combined-login"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.22 }}
            className="w-full max-w-sm flex flex-col items-center gap-5 z-10"
          >
            {/* Top Back Action */}
            <div className="w-full flex items-center justify-between px-2">
              <button
                onClick={onBack}
                className="w-10 h-10 rounded-full border border-zinc-900 bg-[#111311]/50 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#151715] transition-all cursor-pointer shadow-md"
              >
                <ArrowLeft className="w-4.5 h-4.5" />
              </button>
              <span className="text-[10px] font-black text-zinc-550 uppercase tracking-widest">
                Staff Secured Companion
              </span>
              <div className="w-10 h-10 opacity-0" />
            </div>

            {/* Main violet card matching screenshots */}
            <div className="w-full bg-[#111311]/95 border border-[#8b5cf6]/25 rounded-[32px] p-6.5 flex flex-col gap-5.5 shadow-[0_24px_50px_rgba(0,0,0,0.9),0_0_50px_rgba(139,92,246,0.04)] relative overflow-hidden text-center items-center">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#8b5cf6]/4 rounded-full blur-3xl pointer-events-none" />

              <div className="pb-1 text-center flex flex-col items-center gap-2">
                {/* Logo: Violet rounded square background with a tan colored briefcase inside */}
                <div className="w-15 h-15 bg-gradient-to-tr from-[#7c3aed]/20 to-[#8b5cf6]/30 bg-[#8b5cf6] rounded-2xl flex items-center justify-center shadow-[0_8px_24px_rgba(139,92,246,0.25)] border border-violet-400/20 active:scale-95 transition-transform select-none">
                  <span className="text-3xl">💼</span>
                </div>

                <h2 className="text-xl font-black text-white tracking-tight mt-1 uppercase">
                  Staff Workspace
                </h2>
                <p className="text-xs text-zinc-500 font-semibold leading-relaxed max-w-[210px] mx-auto">
                  Provide your Collector credentials & passcode to synchronize ledger entries
                </p>
              </div>

              {errorMessage && (
                <div className="w-full p-3 bg-rose-955/15 border border-rose-950/25 rounded-xl text-center text-xs font-bold text-rose-450 leading-relaxed flex items-center justify-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="w-full flex flex-col gap-4 text-left">
                {/* Input 1: STAFF ID OR EMAIL */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black text-zinc-520 uppercase tracking-widest">
                    STAFF COLLECTOR ID
                  </label>
                  <input
                    type="text"
                    value={staffIdInput}
                    onChange={(e) => {
                      setStaffIdInput(e.target.value);
                      setErrorMessage("");
                      // Resolve real-time if matches
                      const resolved = resolveStaffOnTheFly(e.target.value);
                      if (resolved) {
                        setSelectedStaff(resolved);
                      } else {
                        setSelectedStaff(null);
                      }
                    }}
                    placeholder="e.g. S001 or bello@contribopay.ng"
                    className="w-full px-4 py-3.5 bg-[#121412] border border-zinc-900 focus:border-violet-500/50 focus:outline-none text-xs text-white font-extrabold rounded-xl transition-all font-mono"
                  />
                </div>

                {/* Input 2: STAFF PIN dots representation */}
                <div className="flex flex-col gap-1.5 mt-0.5">
                  <div className="flex justify-between items-center w-full px-2">
                    <label className="text-[9px] font-black text-zinc-520 uppercase tracking-widest">
                      4-DIGIT SECURITY PIN
                    </label>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsResetting(!isResetting);
                        setErrorMessage("");
                      }}
                      className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg relative z-[9999] pointer-events-auto cursor-pointer transition-all active:scale-95 shadow-sm ${isResetting ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30' : 'text-[#14cfb4] bg-[#14cfb4]/10 border border-[#14cfb4]/30 hover:text-white'}`}
                    >
                      {isResetting ? 'Cancel Reset' : 'Reset PIN?'}
                    </button>
                  </div>

                  {isResetting ? (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full bg-[#121412] border border-[#14cfb4]/20 rounded-xl p-4 flex flex-col gap-3"
                    >
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Verification Email</span>
                      <input 
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="Work email address"
                        className="w-full py-2.5 px-3 bg-[#080908] border border-zinc-800 rounded-lg text-xs text-white focus:border-[#14cfb4] focus:outline-none"
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
                            setErrorMessage("Staff profile not found for this email address.");
                          }
                        }}
                        className="w-full py-2.5 bg-[#14cfb4] text-black font-black rounded-lg text-[10px] uppercase tracking-widest shadow-lg"
                      >
                        Verify & Reset
                      </button>
                    </motion.div>
                  ) : (
                  /* Beautiful 4 Passcode circles */
                  <div className="flex justify-center items-center gap-10 py-3.5 bg-[#121412] border border-zinc-900 rounded-xl">
                    {[0, 1, 2, 3].map((idx) => {
                      const active = pinDigits.length > idx;
                      return (
                        <motion.div
                          key={idx}
                          animate={
                            active
                              ? {
                                  scale: [1, 1.2, 1],
                                  backgroundColor: "#14cfb4",
                                }
                              : { scale: 1, backgroundColor: "transparent" }
                          }
                          className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${active ? "border-[#14cfb4] shadow-[0_0_8px_#14cfb4]" : "border-zinc-805"}`}
                        />
                      );
                    })}
                  </div>
                  )}
                </div>
              </div>

              {/* CUSTOM NUMERIC DIALPAD KEYPAD IN 3x4 GRID */}
              <div className="w-full flex flex-col gap-2 pt-1.5 max-w-[280px] mx-auto select-none">
                <div className="grid grid-cols-3 gap-2">
                  {["1", "2", "3"].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleKeypadPress(num)}
                      className="h-14 bg-[#121412] hover:bg-[#161a16] border border-zinc-900 hover:border-zinc-800 text-white font-black text-base rounded-xl flex items-center justify-center active:scale-90 transition-all cursor-pointer shadow-sm select-none"
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {["4", "5", "6"].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleKeypadPress(num)}
                      className="h-14 bg-[#121412] hover:bg-[#161a16] border border-zinc-900 hover:border-zinc-800 text-white font-black text-base rounded-xl flex items-center justify-center active:scale-90 transition-all cursor-pointer shadow-sm select-none"
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {["7", "8", "9"].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleKeypadPress(num)}
                      className="h-14 bg-[#121412] hover:bg-[#161a16] border border-zinc-900 hover:border-zinc-800 text-white font-black text-base rounded-xl flex items-center justify-center active:scale-90 transition-all cursor-pointer shadow-sm select-none"
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="w-full h-14" />
                  <button
                    type="button"
                    onClick={() => handleKeypadPress("0")}
                    className="h-14 bg-[#121412] hover:bg-[#161a16] border border-zinc-900 hover:border-zinc-800 text-white font-black text-base rounded-xl flex items-center justify-center active:scale-90 transition-all cursor-pointer shadow-sm select-none"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress("backspace")}
                    className="h-14 bg-[#121412] hover:bg-[#1b1c1b]/80 border border-zinc-900 text-zinc-300 font-extrabold text-[15px] rounded-xl flex items-center justify-center active:scale-90 transition-all cursor-pointer shadow-sm select-none"
                    title="Delete last digit"
                  >
                    ⌫
                  </button>
                </div>
              </div>

              <div className="h-4" />

              <div className="h-6" />
            </div>
          </motion.div>
        )}

        {/* ================= STAGE 3: "SET YOUR PIN" CONFIGURATION SCREEN ================= */}
        {flow === "set-pin" && selectedStaff && (
          <motion.div
            key="set-pin"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full max-w-sm flex flex-col items-center gap-6 z-10"
          >
            {/* Top nav */}
            <div className="w-full flex items-center justify-between px-2">
              <button
                onClick={() => {
                  setFlow("login-id");
                  setPinDigits("");
                  setNewPinMatch("");
                  setSetPinStep(1);
                }}
                className="w-11 h-11 rounded-full border border-zinc-900 bg-[#111311]/50 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-black text-zinc-550 uppercase tracking-widest">
                Enforce Shield
              </span>
              <div className="w-11 h-11 opacity-0" />
            </div>

            {/* Step-by-step yellow/amber badge graphic */}
            <div className="w-full bg-[#111311]/95 border border-zinc-900/60 rounded-[32px] p-6 flex flex-col items-center gap-5 shadow-[0_24px_50px_rgba(0,0,0,0.8)] text-center relative">
              <div className="pb-1.5 flex flex-col items-center gap-2">
                <div className="w-15 h-15 bg-amber-955/20 border border-amber-500/30 text-amber-500 rounded-3xl flex items-center justify-center shadow-lg animate-bounce">
                  <Lock className="w-7 h-7" />
                </div>

                <h2 className="text-xl font-black text-white uppercase tracking-tight">
                  Set Your PIN
                </h2>
                <div className="text-[11px] font-semibold text-zinc-455 mt-1">
                  Welcome,{" "}
                  <span className="text-white font-bold">
                    {selectedStaff.name}
                  </span>
                  ! Set a permanent 4-digit PIN.
                </div>
                <div className="text-[10.5px] text-rose-500 font-extrabold uppercase mt-1 tracking-wide animate-pulse">
                  Cannot be changed later.
                </div>
              </div>

              {/* Simple horizontal steps visualizer line dots */}
              <div className="flex items-center gap-3 py-1">
                <div
                  className={`h-1.5 w-12 rounded-full transition-colors duration-300 ${setPinStep === 1 ? "bg-[#8b5cf6]" : "bg-emerald-500"}`}
                />
                <div
                  className={`h-1.5 w-12 rounded-full transition-colors duration-300 ${setPinStep === 2 ? "bg-[#8b5cf6]" : "bg-zinc-850"}`}
                />
              </div>

              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide">
                {setPinStep === 1
                  ? "Create your 4-digit PIN"
                  : "Confirm your PIN by re-entering"}
              </div>

              {/* Dots representation */}
              <div className="flex items-center gap-4 py-1.5">
                {[0, 1, 2, 3].map((idx) => {
                  const checkVal = setPinStep === 1 ? pinDigits : newPinMatch;
                  const active = checkVal.length > idx;
                  return (
                    <motion.div
                      key={idx}
                      animate={
                        active
                          ? { scale: [1, 1.25, 1], backgroundColor: "#8b5cf6" }
                          : { scale: 1, backgroundColor: "#0c0f0c" }
                      }
                      className={`w-4 h-4 rounded-full border ${active ? "border-[#8b5cf6]" : "border-zinc-800"}`}
                    />
                  );
                })}
              </div>

              {errorMessage && (
                <div className="w-full p-2 bg-rose-955/15 border border-rose-950/25 text-rose-455 rounded-xl text-xs font-bold leading-relaxed">
                  {errorMessage}
                </div>
              )}

              {/* VERTICAL keypad dialer */}
              <div className="w-full flex flex-col gap-2 max-w-[280px] mx-auto pt-2">
                <div className="grid grid-cols-3 gap-2">
                  {["1", "2", "3"].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleKeypadPress(num)}
                      className="h-14 bg-[#121412] hover:bg-[#161a16] border border-zinc-900 text-white font-black text-lg rounded-xl flex items-center justify-center active:scale-93 transition-all cursor-pointer"
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {["4", "5", "6"].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleKeypadPress(num)}
                      className="h-14 bg-[#121412] hover:bg-[#161a16] border border-zinc-900 text-white font-black text-lg rounded-xl flex items-center justify-center active:scale-93 transition-all cursor-pointer"
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {["7", "8", "9"].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleKeypadPress(num)}
                      className="h-14 bg-[#121412] hover:bg-[#161a16] border border-zinc-900 text-white font-black text-lg rounded-xl flex items-center justify-center active:scale-93 transition-all cursor-pointer"
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="w-full h-14" />
                  <button
                    type="button"
                    onClick={() => handleKeypadPress("0")}
                    className="h-14 bg-[#121412] hover:bg-[#161a16] border border-zinc-900 text-white font-black text-lg rounded-xl flex items-center justify-center active:scale-93 transition-all cursor-pointer"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress("backspace")}
                    className="h-14 bg-[#121412] hover:bg-rose-955/20 border border-zinc-900 text-rose-500 font-bold rounded-xl flex items-center justify-center active:scale-93 transition-all cursor-pointer"
                  >
                    ⌫
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ================= STAGE 4: AUTHORIZED HIGH FIDELITY STAFFER DASHBOARD ================= */}
        {flow === "dashboard" && selectedStaff && (
          <motion.div
            key="staff-dashboard-main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-sm flex flex-col gap-4.5 z-10"
          >
            {/* Top Header Station Panel */}
            <div className="w-full bg-[#111311] border border-zinc-900 rounded-3xl p-4 flex items-center justify-between shadow-2xl">
              <div className="flex items-center gap-3">
                {/* Mint/Teal initials badge BU - Click to upload custom profile photo */}
                <div
                  className="relative group w-11 h-11 rounded-full cursor-pointer overflow-hidden transition-all duration-150 active:scale-95 shadow-md flex items-center justify-center shrink-0"
                  onClick={() => {
                    const fileInput = document.getElementById(
                      "staff-portal-profile-input",
                    );
                    if (fileInput) fileInput.click();
                  }}
                  title="Click to upload profile photo"
                >
                  {selectedStaff.profileImage ? (
                    <img
                      src={selectedStaff.profileImage}
                      className="w-full h-full object-cover rounded-full border border-[#14b8a6]"
                      alt="Staff Profile"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#14b8a6] text-[#090a09] font-black text-sm flex items-center justify-center shadow-[0_4px_16px_rgba(20,207,180,0.35)]">
                      {selectedStaff.initials}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[7.5px] text-[#14cfb4] font-black tracking-widest uppercase rounded-full">
                    <span>📷 Edit</span>
                  </div>
                </div>
                <input
                  type="file"
                  id="staff-portal-profile-input"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        if (typeof reader.result === "string") {
                          onUpdateStaff(selectedStaff.id, {
                            profileImage: reader.result,
                          });
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />

                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[15px] font-black text-white hover:text-[#b592ff] transition-colors leading-none">
                      {selectedStaff.name.split(" ")[0]}
                    </span>

                    {/* Mint business badge */}
                    <span className="px-1.5 py-0.5 rounded bg-[rgba(20,207,180,0.08)] border border-[#14b8a6]/25 text-[9.5px] font-black text-[#14cfb4] flex items-center gap-1 uppercase tracking-wide">
                      💼 {selectedStaff.role}
                    </span>
                  </div>

                  {/* Location Pin */}
                  <span className="text-[10.5px] text-zinc-450 font-bold mt-1.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{selectedStaff.location}</span>
                  </span>
                </div>
              </div>

              {/* Exit out button */}
              <button
                onClick={() => {
                  setFlow("login-id");
                  setSelectedStaff(null);
                  setPinDigits("");
                  onBack();
                }}
                className="px-4.5 py-2 hover:bg-rose-955/10 border border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-rose-450 text-[10.5px] font-black tracking-wider uppercase rounded-2xl active:scale-90 transition-all cursor-pointer shadow-sm"
              >
                Exit
              </button>
            </div>

            {/* Navigation Custom Tabs Row representing Home, Members, Collect, Customers, Transfer */}
            <div className="w-full bg-[#0d0f0d] border border-zinc-900 rounded-[24px] p-1.5 flex gap-1 md:gap-2 items-center justify-between overflow-x-auto no-scrollbar select-none shadow-lg mt-4">
              {([
                { id: "home", label: "Home", icon: Home },
                { id: "members", label: "Members", icon: Users },
                { id: "collect", label: "Collect", icon: Coins },
                { id: "customers", label: "Customers", icon: UserPlus },
                { id: "transfer", label: "Transfer", icon: Send },
                { id: "announcements", label: "Broadcast", icon: Megaphone }
              ] as const).map(({ id, label, icon: TabIcon }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`relative flex items-center justify-center gap-1.5 px-2.5 py-2 md:px-4 md:py-2.5 rounded-xl text-[10px] md:text-[11px] font-black tracking-widest uppercase transition-all duration-200 cursor-pointer flex-1 ${
                      isActive
                        ? "bg-[#14cfb4]/10 text-[#14cfb4] border border-[#14cfb4]/20 shadow-[0_4px_12px_rgba(20,207,180,0.12)]"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/40 border border-transparent"
                    }`}
                  >
                    <TabIcon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isActive ? "text-[#14cfb4]" : "text-zinc-500"}`} />
                    <span className="hidden sm:inline">{label}</span>

                    {/* Active highlight background layer */}
                    {isActive && (
                      <motion.div
                        layoutId="activeStaffTabUnderline"
                        className="absolute inset-0 border border-[#14cfb4]/10 rounded-xl pointer-events-none"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* TAB CONTENTS CONTAINER */}
            <Breadcrumb items={[
              { label: 'Dashboard', onClick: () => { setActiveTab('home'); setViewingCustomer(null); setCollectingCustomer(null); } },
              ...(activeTab !== 'home' ? [{ label: activeTab.charAt(0).toUpperCase() + activeTab.slice(1), onClick: (viewingCustomer || collectingCustomer) ? () => { setViewingCustomer(null); setCollectingCustomer(null); } : undefined }] : []),
              ...((viewingCustomer || collectingCustomer) ? [{ label: (viewingCustomer || collectingCustomer)!.name }] : [])
            ]} />
            <div className="w-full min-h-[460px]">
              {/* ================= MEMBERS TAB ================= */}
              {activeTab === "members" && (
                <div className="flex flex-col gap-5 animate-fade-in text-left">
                  {/* Matching Title & Subtitle from Screenshot 1 */}
                  <div className="flex flex-col px-1">
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      My Members
                    </h2>
                    <p className="text-xs text-zinc-500 mt-1">
                      Customers registered with your staff code
                    </p>
                  </div>

                  {/* STAFF CODE GLOW CARD WITH DASHED BORDER MATCHING SCREENSHOT 1 */}
                  <div className="w-full bg-[#111311]/95 border border-[#14cfb4]/20 rounded-[28px] p-5.5 flex flex-col gap-4 shadow-xl relative overflow-hidden">
                    <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 font-sans leading-none">
                      💳 STAFF CODE
                    </span>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 bg-[#090a09] border border-dashed border-[#14cfb4]/30 rounded-2xl py-3 px-4 flex items-center justify-center font-mono text-[14px] md:text-[15px] font-black tracking-widest text-[#14cfb4] uppercase shadow-inner leading-none">
                        {selectedStaff.code}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleCopyCode(selectedStaff.code)}
                          className="px-3.5 py-2.2 bg-[#14cfb4] hover:bg-[#0da68d] text-[#090a09] text-[10.5px] font-black uppercase tracking-wider rounded-xl transition-all active:scale-90 cursor-pointer shadow-md text-center shrink-0"
                        >
                          {copiedCode ? "Copied" : "Copy"}
                        </button>

                        <button
                          onClick={() => handleShareButton(selectedStaff.code)}
                          className="px-3.5 py-2.2 bg-amber-500 hover:bg-amber-600 text-[#090a09] text-[10.5px] font-black uppercase tracking-wider rounded-xl transition-all active:scale-90 cursor-pointer shadow-md text-center shrink-0"
                        >
                          {shareStatus ? "Shared" : "Share"}
                        </button>
                      </div>
                    </div>

                    {/* Stats columns beneath exactly matching screenshot 1 */}
                    <div className="grid grid-cols-3 gap-2.5 mt-2.5">
                      <div className="flex flex-col items-center text-center bg-[#090a09] border border-zinc-900 rounded-2xl py-3 px-1 shadow-sm">
                        <span className="text-xl font-black text-[#14cfb4] tracking-tight">
                          {assignedCustomers.length}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-bold mt-1 uppercase tracking-wider leading-none">
                          Total
                        </span>
                      </div>
                      <div className="flex flex-col items-center text-center bg-[#090a09] border border-zinc-900 rounded-2xl py-3 px-1 shadow-sm">
                        <span className="text-xl font-black text-[#14cfb4] tracking-tight">
                          {
                            assignedCustomers.filter(
                              (c) => c.approvalStatus === "pending",
                            ).length
                          }
                        </span>
                        <span className="text-[10px] text-zinc-500 font-bold mt-1 uppercase tracking-wider leading-none">
                          Pending
                        </span>
                      </div>
                      <div className="flex flex-col items-center text-center bg-[#090a09] border border-zinc-900 rounded-2xl py-3 px-1 shadow-sm">
                        <span className="text-xl font-black text-[#14cfb4] tracking-tight">
                          {
                            assignedCustomers.filter(
                              (c) =>
                                c.status === "active" ||
                                c.approvalStatus === "approved",
                            ).length
                          }
                        </span>
                        <span className="text-[10px] text-zinc-500 font-bold mt-1 uppercase tracking-wider leading-none">
                          Active
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Search & list filters underneath for full interactivity */}
                  <div className="flex flex-col gap-3">
                    <div className="w-full relative">
                      <input
                        type="text"
                        value={searchMemberQuery}
                        onChange={(e) => setSearchMemberQuery(e.target.value)}
                        placeholder="Search assigned customer files..."
                        className="w-full bg-[#111311] border border-zinc-900 focus:border-zinc-800 p-3 pl-9 rounded-2xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none"
                      />
                      <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                    </div>

                    <div className="bg-[#111311] border border-zinc-900 rounded-[24px] p-4 flex flex-col gap-3 shadow-xl">
                      <span className="text-[10px] font-black text-zinc-550 uppercase tracking-widest pb-1 border-b border-zinc-900">
                        Assigned Savers List ({filteredCustomersList.length})
                      </span>

                      <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                        {filteredCustomersList.length === 0 ? (
                          <p className="text-xs text-zinc-500 text-center py-6">
                            No match resolved inside region list.
                          </p>
                        ) : (
                          filteredCustomersList.map((c, index) => (
                            <div
                              key={`${c.id}-${index}`}
                              className="p-3 bg-[#080908] border border-zinc-950 hover:border-zinc-900 rounded-xl flex items-center justify-between gap-3 text-left transition-all"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-full overflow-hidden border border-zinc-900/40 shrink-0">
                                  {c.profileImage ? (
                                    <img
                                      src={c.profileImage}
                                      className="w-full h-full object-cover"
                                      alt={c.name}
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div
                                      className={`w-full h-full bg-gradient-to-br ${getCustomerAvatarGradient(c.name)} flex items-center justify-center font-black text-xs shadow-inner`}
                                    >
                                      {c.name.slice(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-zinc-200">
                                    {c.name}
                                  </span>
                                  <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                                    {c.phoneNumber} · {c.location || "Kaduna"}
                                  </span>
                                </div>
                              </div>
                              <span className="text-xs font-black text-white">
                                ₦
                                {(c.balance || 0).toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= COLLECT TAB (RECORD COLLECTION MATCHING SCREENSHOT 2) ================= */}
              {activeTab === "collect" && (
                <div className="flex flex-col gap-4 animate-fade-in text-left">
                  {/* Success indicator if payment is processed */}
                  {successCollectToast && (
                    <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 text-[#14cfb4] text-xs font-bold rounded-2xl flex items-start gap-2 animate-bounce">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-extrabold uppercase text-[10px]">
                          Instant Receipt Generated!
                        </p>
                        <p className="text-[11px] font-medium text-emerald-300/80 mt-0.5">
                          {successCollectToast}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Title */}
                  <div className="flex flex-col px-1 mb-0.5">
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      Record Collection
                    </h2>
                  </div>

                  {/* Styled Search box with emoji as in Screenshot 2 */}
                  <div className="w-full relative">
                    <input
                      type="text"
                      value={searchCollectQuery}
                      onChange={(e) => setSearchCollectQuery(e.target.value)}
                      placeholder="🔍 Search by name, acct, or phone..."
                      className="w-full bg-[#111311] border border-zinc-900 focus:border-zinc-800 p-3.5 pl-4.5 rounded-2xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#14cfb4]/20 transition-all font-semibold"
                    />
                  </div>

                  {/* Customer items lists */}
                  <div className="flex flex-col gap-2.5">
                    {assignedCustomers
                      .filter(
                        (c) =>
                          c.name
                            .toLowerCase()
                            .includes(searchCollectQuery.toLowerCase()) ||
                          c.phoneNumber.includes(searchCollectQuery) ||
                          (c.accountNumber &&
                            c.accountNumber.includes(searchCollectQuery)) ||
                          (c.username &&
                            c.username
                              .toLowerCase()
                              .includes(searchCollectQuery.toLowerCase())) ||
                          (c.staffCustomerId &&
                            c.staffCustomerId
                              .toLowerCase()
                              .includes(searchCollectQuery.toLowerCase())),
                      )
                      .map((c, index) => (
                        <div
                          key={`${c.id}-${index}`}
                          onClick={() => {
                            setCollectingCustomer(c);
                            setCollectAmount("2000"); // default amount slot on selection
                          }}
                          className="p-3.5 bg-[#0a0c0a]/90 hover:bg-[#0e110e] border border-emerald-950/30 hover:border-[#14cfb4]/20 rounded-[20px] flex items-center justify-between gap-3 text-left transition-all active:scale-[0.98] cursor-pointer shadow-sm group"
                        >
                          <div className="flex items-center gap-3">
                            {/* Colorful Gradient or Custom avatar clickable for zoom profile check */}
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setViewingCustomer(c);
                              }}
                              className="w-11 h-11 rounded-full overflow-hidden border border-zinc-900 hover:border-[#14cfb4] shrink-0 shadow-md transition-all cursor-zoom-in"
                              title="Click to verify Member Passport Photo"
                            >
                              {c.profileImage ? (
                                <img
                                  src={c.profileImage}
                                  className="w-full h-full object-cover"
                                  alt={c.name}
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div
                                  className={`w-full h-full bg-gradient-to-br ${getCustomerAvatarGradient(c.name)} flex items-center justify-center font-black text-[13px]`}
                                >
                                  {c.name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col">
                              {/* Customer name */}
                              <div className="flex items-center gap-2">
                                <span className="text-[15px] font-black text-white group-hover:text-[#14cfb4] transition-colors leading-none">
                                  {c.name}
                                </span>
                                {c.staffCustomerId && (
                                  <span className="text-[9.5px] font-mono font-black text-zinc-450 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-900 shadow-sm uppercase shrink-0">
                                    {c.staffCustomerId}
                                  </span>
                                )}
                              </div>
                              {/* Subtext with balance */}
                              <span className="text-[11px] text-zinc-450 font-bold mt-2 leading-none flex items-center gap-1.5 flex-wrap font-sans">
                                {c.username && (
                                  <>
                                    <span className="text-emerald-400 font-bold font-sans">
                                      @{c.username}
                                    </span>
                                    <span className="text-zinc-[700]">•</span>
                                  </>
                                )}
                                <span className="text-[#14cfb4] font-black font-mono">
                                  {c.accountNumber ||
                                    `30${(c.phoneNumber || c.id).slice(-8)}`}
                                </span>
                                <span className="text-zinc-[700]">•</span>
                                <span className="font-mono text-zinc-350">
                                  ₦
                                  {(c.balance || 0).toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                  })}
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* Green active badge on the right clickable to show ledger card */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingCustomer(c);
                            }}
                            className="px-2.5 py-1 rounded bg-[rgba(20,207,180,0.06)] hover:bg-[rgba(20,207,180,0.12)] border border-[#14cfb4]/10 hover:border-[#14cfb4]/30 text-[9.5px] font-black text-[#14cfb4] uppercase tracking-wider transition-all cursor-pointer"
                            title="Verify Member ID Card"
                          >
                            👁️ ID CARD
                          </button>
                        </div>
                      ))}
                  </div>

                  {/* Bottom Interactive Modal sheet when recording cash collections */}
                  <AnimatePresence>
                    {collectingCustomer && (
                      <div className="fixed inset-0 bg-black/85 z-55 flex items-center justify-center p-4">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.94, y: 15 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.94, y: 15 }}
                          className="bg-[#111311] border border-zinc-900 rounded-[32px] p-6 max-h-[90vh] max-w-sm w-full flex flex-col text-left relative shadow-[0_24px_50px_rgba(0,0,0,0.9)] animate-fade-in overflow-hidden"
                        >
              {/* Back & Exit Buttons */}
              <div className="absolute top-5 left-5 right-5 flex justify-between items-center z-10">
                <button
                  onClick={() => {
                    if (isDirty) {
                      setPendingAction(() => () => { setCollectingCustomer(null); setErrorMessage(""); setIsDirty(false); });
                      setShowUnsavedChangesModal(true);
                    } else {
                      setCollectingCustomer(null);
                      setErrorMessage("");
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#0a0c0a] flex items-center justify-center text-zinc-300 hover:text-white border border-zinc-700 text-[10px] cursor-pointer font-bold transition-transform hover:scale-105 active:scale-95 uppercase tracking-wider"
                >
                  ← Back
                </button>
                <button
                  onClick={() => {
                    if (isDirty) {
                      setPendingAction(() => () => { setCollectingCustomer(null); setErrorMessage(""); setIsDirty(false); });
                      setShowUnsavedChangesModal(true);
                    } else {
                      setCollectingCustomer(null);
                      setErrorMessage("");
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-orange-950/20 flex items-center justify-center text-orange-500 hover:text-white border border-orange-900/50 text-[10px] cursor-pointer font-bold transition-transform hover:scale-105 active:scale-95 uppercase tracking-wider"
                >
                  ✕ Exit
                </button>
              </div>

              {/* Scrollable Modal Body Container to prevent overflow on mobile screens */}
              <div className="flex-1 overflow-y-auto pr-1 mt-12 flex flex-col gap-5 text-left scrollbar-thin scrollbar-thumb-zinc-850 scrollbar-track-transparent">
                          {/* Beautiful ID badge header constraint */}
                          <div className="flex flex-col items-center gap-1 text-center">
                            <span className="px-2.5 py-0.5 bg-[#14cfb4]/10 border border-[#14cfb4]/20 text-[#14cfb4] font-sans font-black text-[9px] uppercase tracking-widest rounded-full">
                              🛡️ DEPOSIT PORTRAIT ID VERIFICATION
                            </span>
                            <span className="text-[9px] font-mono text-zinc-550 uppercase tracking-wider mt-1 block font-bold">
                              Please verify saver's visual passport photo
                            </span>
                          </div>

                          {/* THE BIG SIZE MIDDLE PHOTO CENTERSTAGE FOR RECOGNITION */}
                          <div className="my-2 flex flex-col items-center">
                            <div className="relative group">
                              <div className="w-72 h-72 bg-zinc-950 border-2 border-[#14cfb4]/35 p-1.5 rounded-[28px] flex items-center justify-center shadow-[0_0_30px_rgba(20,207,180,0.2)] overflow-hidden">
                                {collectingCustomer.profileImage ? (
                                  <img
                                    src={collectingCustomer.profileImage}
                                    className="w-full h-full object-cover rounded-[22px]"
                                    alt="Saver Identity Portrait"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div
                                    className={`w-full h-full rounded-[22px] bg-gradient-to-tr ${getCustomerAvatarGradient(collectingCustomer.name)} flex items-center justify-center font-black text-4xl tracking-wide shadow-inner`}
                                  >
                                    {collectingCustomer.name
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </div>
                                )}
                              </div>

                              {/* Micro chip indicator simulation like credit card standard to look professional */}
                              <div className="absolute bottom-3.5 right-3.5 bg-[#d4af37] border border-amber-600/50 w-6 h-5 rounded-md flex flex-col gap-0.5 p-0.5 shadow-md justify-between">
                                <div className="flex justify-between w-full h-[2px]">
                                  <div className="bg-zinc-800/15 w-[5px] h-[2px]" />
                                  <div className="bg-zinc-800/15 w-[5px] h-[2px]" />
                                </div>
                                <div className="bg-zinc-850/15 w-full h-[1.5px]" />
                                <div className="flex justify-between w-full h-[2px]">
                                  <div className="bg-zinc-800/15 w-[5px] h-[2px]" />
                                  <div className="bg-zinc-800/15 w-[5px] h-[2px]" />
                                </div>
                              </div>
                            </div>

                            {/* Secure Badge label exactly matching screenshot */}
                            <div className="mt-3.5 px-3 py-1 bg-[#13372f]/35 border border-[#14cfb4]/25 text-[#14cfb4] font-sans font-black text-[9.5px] uppercase tracking-widest rounded-full leading-none flex items-center gap-1.5 shadow-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#14cfb4] animate-pulse" />
                              CUSTOMER PHOTO ID
                            </div>
                          </div>

                          {/* Strict/Necessary customer information display */}
                          <div className="text-center pb-3 border-b border-zinc-950 flex flex-col items-center">
                            <h3 className="text-base font-black text-white leading-tight uppercase tracking-tight">
                              {collectingCustomer.name}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap justify-center">
                              <span className="font-mono text-[11px] font-black text-[#14cfb4] tracking-wide">
                                {collectingCustomer.accountNumber ||
                                  `30${(collectingCustomer.phoneNumber || collectingCustomer.id).slice(-8)}`}
                              </span>
                              <span className="text-zinc-[700] text-xs">•</span>
                              <span className="font-mono text-[10px] font-bold text-zinc-400">
                                {collectingCustomer.phoneNumber}
                              </span>
                              <span className="h-1.5 w-1.5 rounded-full bg-[#14cfb4] shrink-0" />
                              <span className="text-[9px] text-[#14cfb4] font-black uppercase tracking-wider shrink-0">
                                {collectingCustomer.location || "Kaduna North"}
                              </span>
                            </div>
                          </div>

                          <form
                            onSubmit={async (e) => {
                              e.preventDefault();
                              if (isCollectSubmitting) return;
                              const amountNum = parseFloat(collectAmount);
                              if (isNaN(amountNum) || amountNum <= 0) {
                                setErrorMessage(
                                  "Provide a valid numeric amount.",
                                );
                                return;
                              }
                              
                              let profitAmountNum = 0;
                              if (collectTxType === "withdrawal" && collectProfitAmount) {
                                profitAmountNum = parseFloat(collectProfitAmount);
                                if (isNaN(profitAmountNum) || profitAmountNum < 0) {
                                  setErrorMessage("Provide a valid profit amount or leave it empty.");
                                  return;
                                }
                              }

                              if (collectTxType === "withdrawal") {
                                if (amountNum > (collectingCustomer.balance || 0)) {
                                  setErrorMessage(
                                    `Insufficient balance. Saver balance is ₦${(collectingCustomer.balance || 0).toLocaleString()}`,
                                  );
                                  return;
                                }

                                if (
                                  !staffWithdrawalPhoto &&
                                  !staffWithdrawalCard
                                ) {
                                  setErrorMessage(
                                    "🔒 Required: Please capture the customer's face, or upload their customer card/document to proceed with withdrawals! This avoids payout arguments.",
                                  );
                                  return;
                                }

                                 setIsCollectSubmitting(true);
                                 // Submit withdrawal request
                                 const loggedTx = await onAddTransaction({
                                   customerId: collectingCustomer.id,
                                   amount: amountNum,
                                   profitAmount: profitAmountNum > 0 ? profitAmountNum : undefined,
                                   type: "withdrawal",
                                   staffId: selectedStaff.id,
                                   status: "pending",
                                   withdrawalPhoto:
                                     staffWithdrawalPhoto || undefined,
                                   cardPhoto: staffWithdrawalCard || undefined,
                                 });

                                 setSuccessCollectToast(
                                   `Withdrawal of ₦${amountNum.toLocaleString()} logged as pending approval!`,
                                 );

                                 // Reset states
                                 setStaffWithdrawalPhoto("");
                                 setStaffWithdrawalCard("");
                                 stopStaffCamera();
                                 const customerSnapshot = { ...collectingCustomer };
                                 setCollectingCustomer(null);

                                 setTimeout(() => {
                                   setSuccessCollectToast("");
                                   setIsCollectSubmitting(false);
                                   // Print immediate premium digital receipt screen for withdrawal
                                   if (loggedTx) {
                                     setReceiptModalTx(loggedTx);
                                   } else {
                                     const simulatedTx: Transaction = {
                                       id: "t_sim_" + Date.now(),
                                       customerId: customerSnapshot.id,
                                       customerName: customerSnapshot.name,
                                       type: "withdrawal",
                                       amount: amountNum,
                                       status: "pending",
                                       timestamp: new Date().toISOString(),
                                       reference: `CBP-W${Math.floor(1000 + Math.random() * 9000)}`,
                                       staffId: selectedStaff.id,
                                       staffName: selectedStaff.name,
                                     };
                                     setReceiptModalTx(simulatedTx);
                                   }
                                 }, 1100);
                              } else {
                                 setIsCollectSubmitting(true);
                                 // Deposit flow
                                 const loggedTx = await onAddTransaction({
                                   customerId: collectingCustomer.id,
                                   amount: amountNum,
                                   type: "deposit",
                                   staffId: selectedStaff.id,
                                   status: "approved",
                                 });

                                 setSuccessCollectToast(
                                   `₦${amountNum.toLocaleString()} log processed successfully!`,
                                 );
                                 const customerSnapshot = { ...collectingCustomer };
                                 setCollectingCustomer(null);

                                 setTimeout(() => {
                                   setSuccessCollectToast("");
                                   setIsCollectSubmitting(false);
                                   // Print immediate premium digital receipt screen
                                   if (loggedTx) {
                                     setReceiptModalTx(loggedTx);
                                   } else {
                                     const simulatedTx: Transaction = {
                                       id: "t_sim_" + Date.now(),
                                       customerId: customerSnapshot.id,
                                       customerName: customerSnapshot.name,
                                       type: "deposit",
                                       amount: amountNum,
                                       status: "approved",
                                       timestamp: new Date().toISOString(),
                                       reference: `CBP-D${Math.floor(1000 + Math.random() * 9000)}`,
                                       staffId: selectedStaff.id,
                                       staffName: selectedStaff.name,
                                     };
                                     setReceiptModalTx(simulatedTx);
                                   }
                                 }, 1100);
                              }
                            }}
                            className="flex flex-col gap-4 text-zinc-250 font-sans"
                          >
                            {/* Transaction Type tab selector inside staff list */}
                            <div className="flex bg-[#090a09] p-1 rounded-xl border border-zinc-950">
                              <button
                                type="button"
                                onClick={() => {
                                  setCollectTxType("deposit");
                                  setErrorMessage("");
                                }}
                                className={`flex-1 py-1.8 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                                  collectTxType === "deposit"
                                    ? "bg-[#14cfb4] text-[#090a09]"
                                    : "text-zinc-500 hover:text-zinc-300"
                                }`}
                              >
                                📥 Contribution Deposit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setCollectTxType("withdrawal");
                                  setErrorMessage("");
                                }}
                                className={`flex-1 py-1.8 text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                                  collectTxType === "withdrawal"
                                    ? "bg-rose-600 text-white"
                                    : "text-zinc-500 hover:text-zinc-300"
                                }`}
                              >
                                📤 Payout Withdrawal
                              </button>
                            </div>

                            {/* Section for security anti-controversy alerts */}
                            {collectTxType === "withdrawal" && (
                              <div className="bg-amber-500/5 p-2.5 rounded-xl border border-amber-500/10 text-[9.5px] text-zinc-400 leading-relaxed font-sans">
                                🛡️{" "}
                                <span className="font-bold text-amber-400">
                                  DISPUTE REDUCTION PROTOCOL:
                                </span>{" "}
                                Real-time client snapshots or savings card
                                upload is required for server audits to clear
                                future pay-out objections.
                              </div>
                            )}

                            <div className="flex flex-col gap-2">
                              <span className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">
                                {collectTxType === "deposit"
                                  ? "CONTRIBUTION VALUE"
                                  : "PAYOUT WITHDRAWAL AMOUNT"}
                              </span>
                              <div className="relative">
                                <span className="absolute left-3.5 top-3.5 text-zinc-400 font-black text-xs">
                                  ₦
                                </span>
                                <input
                                  type="number"
                                  required
                                  value={collectAmount}
                                  onChange={(e) => {
                                    setCollectAmount(e.target.value);
                                    setErrorMessage("");
                                    setIsDirty(true);
                                  }}
                                  placeholder="2000"
                                  className={`w-full pl-7 pr-4 py-3 bg-[#090a09] border border-zinc-950 focus:border-zinc-800 focus:outline-none text-xs font-mono font-bold rounded-xl text-center text-base ${
                                    collectTxType === "deposit"
                                      ? "text-[#14cfb4]"
                                      : "text-rose-400"
                                  }`}
                                />
                              </div>

                              {/* quick presets buttons */}
                              <div className="grid grid-cols-4 gap-1.5 mt-1">
                                {["1000", "2000", "5000", "10000"].map(
                                  (val) => (
                                    <button
                                      key={val}
                                      type="button"
                                      onClick={() => setCollectAmount(val)}
                                      className={`py-1.8 text-[10px] font-black font-mono border rounded-lg transition-all cursor-pointer ${
                                        collectAmount === val
                                          ? collectTxType === "deposit"
                                            ? "bg-[#14cfb4] border-[#14cfb4] text-[#090a09] shadow-md"
                                            : "bg-rose-600 border-rose-600 text-white shadow-md"
                                          : "bg-[#090a09] border-zinc-950 text-zinc-400"
                                      }`}
                                    >
                                      ₦
                                      {parseInt(val) >= 1000
                                        ? `${parseInt(val) / 1000}k`
                                        : val}
                                    </button>
                                  ),
                                )}
                              </div>
                            </div>

                            {collectTxType === "withdrawal" && (
                              <div className="flex flex-col gap-2 mt-4">
                                <span className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">
                                  PROFIT EARNED (OPTIONAL)
                                </span>
                                <div className="relative">
                                  <span className="absolute left-3.5 top-3.5 text-zinc-400 font-black text-xs">
                                    ₦
                                  </span>
                                  <input
                                    type="number"
                                    value={collectProfitAmount}
                                    onChange={(e) => {
                                      setCollectProfitAmount(e.target.value);
                                      setErrorMessage("");
                                    }}
                                    placeholder="0"
                                    className={`w-full pl-7 pr-4 py-3 bg-[#090a09] border border-zinc-950 focus:border-zinc-800 focus:outline-none text-xs font-mono font-bold rounded-xl text-center text-base text-[#14cfb4]`}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Linked Bank Details display (Shown ONLY for withdrawals) */}
                            {collectTxType === "withdrawal" && collectingCustomer.payoutAccountNumber && (
                              <div className="flex flex-col gap-1 mt-4 p-3 bg-zinc-950/50 border border-zinc-900 rounded-xl">
                                <span className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                                  <span>🏦 LINKED PAYOUT ACCOUNT</span>
                                  <span className="bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded text-[8px]">VERIFIED</span>
                                </span>
                                <div className="flex justify-between items-center bg-[#090a09] p-2 rounded-lg border border-zinc-900">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-zinc-300">
                                      {collectingCustomer.payoutAccountName || collectingCustomer.name}
                                    </span>
                                    <span className="text-[9px] text-zinc-500">
                                      {collectingCustomer.payoutBankName || "Default Bank"}
                                    </span>
                                  </div>
                                  <span className="text-xs font-mono font-black text-white px-2 py-1 bg-zinc-900 rounded-md">
                                    {collectingCustomer.payoutAccountNumber}
                                  </span>
                                </div>
                                <span className="text-[8px] text-zinc-500 mt-1 leading-normal text-center">
                                  Please verify this account belongs to the customer before disbursing funds.
                                </span>
                              </div>
                            )}

                            {collectTxType === "withdrawal" && !collectingCustomer.payoutAccountNumber && (
                              <div className="flex flex-col items-center justify-center gap-1 mt-4 p-3 border border-dashed border-rose-950/60 bg-rose-950/10 rounded-xl">
                                <span className="text-[10px] font-black text-rose-500">
                                  ⚠️ NO LINKED BANK ACCOUNT
                                </span>
                                <span className="text-[8.5px] text-zinc-500 text-center px-2">
                                  Customer has not linked a payout account. Please collect cash or ask customer to link an account from their dashboard.
                                </span>
                              </div>
                            )}

                            {/* BIOMETRIC & DOCUMENT WORKSPACE (Shown ONLY for withdrawals) */}
                            {collectTxType === "withdrawal" && (
                              <div className="bg-[#090b09]/80 p-3 rounded-2xl border border-zinc-950 flex flex-col gap-2.5">
                                <div className="flex items-center justify-between border-b border-zinc-950 pb-1.5">
                                  <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider">
                                    SECURE LINK CAPTURES
                                  </span>
                                  <span className="text-[8px] font-mono text-zinc-500">
                                    Pick verification method
                                  </span>
                                </div>

                                <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-lg">
                                  {(
                                    ["selfie", "card", "simulation"] as const
                                  ).map((tab) => (
                                    <button
                                      key={tab}
                                      type="button"
                                      onClick={() => {
                                        setStaffCaptureTab(tab);
                                        if (tab !== "selfie") {
                                          stopStaffCamera();
                                        }
                                      }}
                                      className={`py-1 text-[8.5px] font-black uppercase rounded transition-all cursor-pointer ${
                                        staffCaptureTab === tab
                                          ? "bg-rose-600 text-white shadow"
                                          : "text-zinc-500 hover:text-white"
                                      }`}
                                    >
                                      {tab === "selfie"
                                        ? "📸 Selfie"
                                        : tab === "card"
                                          ? "🗂️ Card/ID"
                                          : "⚙️ Presets"}
                                    </button>
                                  ))}
                                </div>

                                {/* Live staff camera snap */}
                                {staffCaptureTab === "selfie" && (
                                  <div className="flex flex-col gap-2 mt-0.5">
                                    {staffWithdrawalPhoto ? (
                                      <div className="relative rounded-xl overflow-hidden border border-zinc-90 w-44 mx-auto bg-black select-none">
                                        <img
                                          src={staffWithdrawalPhoto}
                                          className="w-full h-24 object-cover"
                                          alt="Staff snap"
                                          referrerPolicy="no-referrer"
                                        />
                                        <div className="absolute top-1 right-1 bg-emerald-500 text-zinc-950 w-4 h-4 rounded-full flex items-center justify-center font-black text-[9px]">
                                          ✓
                                        </div>
                                        <button
                                          onClick={() =>
                                            setStaffWithdrawalPhoto("")
                                          }
                                          className="absolute bottom-1.5 left-1.5 right-1.5 bg-black/80 hover:bg-black text-white text-[8px] font-black py-0.5 rounded uppercase"
                                        >
                                          ↺ Retake
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col gap-2">
                                        {staffCamActive ? (
                                          <div className="relative rounded-xl overflow-hidden border border-zinc-900 bg-black">
                                            <video
                                              ref={staffVideoRef}
                                              autoPlay
                                              playsInline
                                              className="w-full h-28 object-cover"
                                            />
                                            <div className="absolute bottom-1.5 left-0 right-0 flex gap-1 justify-center">
                                              <button
                                                type="button"
                                                onClick={captureStaffPhoto}
                                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-black text-[8.5px] uppercase rounded-md shadow"
                                              >
                                                📸 Capture Patient
                                              </button>
                                              <button
                                                type="button"
                                                onClick={stopStaffCamera}
                                                className="px-1.5 py-1 bg-zinc-900 text-zinc-400 font-bold text-[8.5px] rounded-md"
                                              >
                                                Off
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={startStaffCamera}
                                            className="w-full py-3 border border-dashed border-zinc-800 bg-[#070807] hover:bg-[#0c0d0c] text-zinc-400 text-[9.5px] font-black uppercase rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                          >
                                            🔌 Activate Customer Face Camera
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Card upload option */}
                                {staffCaptureTab === "card" && (
                                  <div className="flex flex-col gap-2 mt-0.5">
                                    {staffWithdrawalCard ? (
                                      <div className="relative rounded-xl overflow-hidden border border-zinc-900 w-44 mx-auto bg-black select-none">
                                        <img
                                          src={staffWithdrawalCard}
                                          className="w-full h-20 object-cover"
                                          alt="Card doc"
                                          referrerPolicy="no-referrer"
                                        />
                                        <div className="absolute top-1 right-1 bg-emerald-500 text-zinc-950 w-4 h-4 rounded-full flex items-center justify-center font-black text-[9px]">
                                          ✓
                                        </div>
                                        <button
                                          onClick={() =>
                                            setStaffWithdrawalCard("")
                                          }
                                          className="absolute bottom-1.5 left-1.5 right-1.5 bg-black/80 hover:bg-black text-white text-[8px] font-black py-0.5 rounded uppercase"
                                        >
                                          ↺ Clear card
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="border border-dashed border-zinc-800 rounded-xl bg-[#070807] p-4 text-center relative hover:bg-[#0a0b0a] cursor-pointer">
                                        <input
                                          type="file"
                                          accept="image/*"
                                          onChange={handleStaffCardUpload}
                                          className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                        <span className="text-sm block">
                                          🗂️
                                        </span>
                                        <span className="text-[9px] text-zinc-400 font-black uppercase mt-1 block">
                                          Upload card/savings book
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Simulation presets option for quick validation */}
                                {staffCaptureTab === "simulation" && (
                                  <div className="flex flex-col gap-1 mt-0.5">
                                    <div className="grid grid-cols-3 gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setStaffWithdrawalPhoto(
                                            `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" fill="%231e293b"/><circle cx="100" cy="65" r="30" fill="%2338bdf8"/><path d="M70,120 Q100,85 130,120 Z" fill="%2338bdf8" opacity="0.85"/><text x="15" y="25" fill="%23cbd5e1" font-family="monospace" font-size="9" font-weight="extrabold">STAFF VERIFIED PORTRAIT</text><text x="65" y="140" fill="white" font-family="sans-serif" font-size="11" font-weight="black">SAVER PORTRAIT</text></svg>`,
                                          );
                                          setErrorMessage("");
                                        }}
                                        className={`p-1 border rounded-md text-[7.5px] font-bold text-center bg-zinc-950 transition-colors cursor-pointer ${staffWithdrawalPhoto !== "" ? "border-rose-500" : "border-zinc-850"}`}
                                      >
                                        🧑‍⚕️ Cap Face
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setStaffWithdrawalCard(
                                            `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" rx="8" fill="%230f172a" stroke="teal" stroke-width="2"/><text x="15" y="55" fill="white" font-family="sans-serif" font-weight="black" font-size="12">SAVER CARD</text><text x="15" y="75" fill="teal" font-family="monospace" font-size="9">CBP-SUBSCRIBER-${collectingCustomer.id}</text><text x="15" y="95" fill="white" font-size="10">${collectingCustomer.name.toUpperCase()}</text></svg>`,
                                          );
                                          setErrorMessage("");
                                        }}
                                        className={`p-1 border rounded-md text-[7.5px] font-bold text-center bg-zinc-950 transition-colors cursor-pointer ${staffWithdrawalCard !== "" ? "border-rose-500" : "border-zinc-850"}`}
                                      >
                                        💳 Cap ID
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setStaffWithdrawalPhoto("");
                                          setStaffWithdrawalCard("");
                                          setErrorMessage("");
                                        }}
                                        className="p-1 border border-zinc-850 rounded-md text-[7.5px] text-zinc-500 font-bold text-center bg-zinc-950 hover:text-white cursor-pointer"
                                      >
                                        Reset All
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Mini confirmation tags */}
                                {(staffWithdrawalPhoto ||
                                  staffWithdrawalCard) && (
                                  <div className="p-1 text-[8px] text-emerald-400 font-bold bg-emerald-950/20 rounded flex items-center gap-1">
                                    <span>✓ Assets Registered:</span>
                                    {staffWithdrawalPhoto && (
                                      <span className="bg-emerald-500/10 px-1 py-0.2 rounded font-black">
                                        Face photo
                                      </span>
                                    )}
                                    {staffWithdrawalCard && (
                                      <span className="bg-emerald-500/10 px-1 py-0.2 rounded font-black">
                                        Card ID
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {errorMessage && (
                              <span className="text-[10px] p-2 bg-rose-955/10 border border-rose-900/30 text-rose-500 font-bold leading-normal text-center rounded-xl block">
                                {errorMessage}
                              </span>
                            )}

                            <button
                              type="submit"
                              disabled={isCollectSubmitting}
                              className={`w-full py-4.5 text-[#090a09] rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer ${
                                isCollectSubmitting
                                  ? "bg-zinc-850 text-zinc-550 border border-zinc-900 cursor-not-allowed"
                                  : collectTxType === "deposit"
                                    ? "bg-gradient-to-r from-emerald-500 to-[#14cfb4] hover:from-emerald-400 hover:to-[#14cfb4]"
                                    : staffWithdrawalPhoto || staffWithdrawalCard
                                      ? "bg-rose-500 hover:bg-rose-400 text-white font-extrabold shadow-lg shadow-rose-950/15"
                                      : "bg-zinc-850 hover:bg-zinc-800 text-zinc-500"
                              }`}
                            >
                              {isCollectSubmitting
                                ? "Processing entry..."
                                : collectTxType === "deposit"
                                  ? "Confirm Contribution"
                                  : staffWithdrawalPhoto || staffWithdrawalCard
                                    ? "Log Secure Payout Request ✓"
                                    : "Lock: Captures Required 🔒"}
                            </button>

                            {/* Explicit return/exit button at the bottom of the ledger collect workspace modal */}
                            <button
                              type="button"
                              onClick={() => {
                                setCollectingCustomer(null);
                                setErrorMessage("");
                              }}
                              className="w-full py-3.5 bg-transparent hover:bg-zinc-950 border border-zinc-900 hover:border-zinc-850 text-zinc-400 hover:text-zinc-200 font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center"
                            >
                              Cancel & Return
                            </button>
                          </form>
              </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* ================= CUSTOMERS TAB (ALL CUSTOMERS VIEW MATCHING SCREENSHOT 3) ================= */}
              {activeTab === "customers" && (
                <div className="flex flex-col gap-4 animate-fade-in text-left">
                  {/* Enroll result banner */}
                  {successCollectToast && (
                    <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 text-[#14cfb4] text-xs font-bold text-center rounded-xl animate-pulse">
                      {successCollectToast}
                    </div>
                  )}

                  {/* Title and Enroll Trigger */}
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      My Customers
                    </h2>

                    <button
                      onClick={() => setShowEnrollModal(true)}
                      className="px-3 py-1.8 bg-[#14cfb4]/10 hover:bg-[#14cfb4]/20 border border-[#14cfb4]/25 text-[#14cfb4] text-[10.5px] font-black rounded-xl uppercase tracking-wider transition-all active:scale-90 cursor-pointer"
                    >
                      ➕ Enroll Saver
                    </button>
                  </div>

                  {/* Styled Search box matching Screenshot 3 */}
                  <div className="w-full relative">
                    <input
                      type="text"
                      value={searchCustomerQuery}
                      onChange={(e) => setSearchCustomerQuery(e.target.value)}
                      placeholder="🔍 Search..."
                      className="w-full bg-[#111311] border border-zinc-900 focus:border-zinc-800 p-3.5 pl-4.5 rounded-2xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#14cfb4]/25 transition-all font-semibold"
                    />
                  </div>

                  {/* Customer records view */}
                  <div className="flex flex-col gap-2.5">
                    {assignedCustomers
                      .filter(
                        (c) =>
                          c.name
                            .toLowerCase()
                            .includes(searchCustomerQuery.toLowerCase()) ||
                          c.phoneNumber.includes(searchCustomerQuery) ||
                          (c.location &&
                            c.location
                              .toLowerCase()
                              .includes(searchCustomerQuery.toLowerCase())) ||
                          (c.username &&
                            c.username
                              .toLowerCase()
                              .includes(searchCustomerQuery.toLowerCase())) ||
                          (c.staffCustomerId &&
                            c.staffCustomerId
                              .toLowerCase()
                              .includes(searchCustomerQuery.toLowerCase())),
                      )
                      .map((c, index) => (
                        <div
                          key={`${c.id}-${index}`}
                          onClick={() => setViewingCustomer(c)}
                          className="p-3.5 bg-[#0a0c0a]/90 hover:bg-[#0f110f] border border-emerald-950/30 hover:border-[#14cfb4]/25 rounded-[20px] flex items-center justify-between gap-3 text-left transition-all duration-150 cursor-pointer active:scale-[0.99] shadow-sm group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full overflow-hidden border border-zinc-900 shrink-0 shadow-sm group-hover:border-[#14cfb4]/40 transition-all">
                              {c.profileImage ? (
                                <img
                                  src={c.profileImage}
                                  className="w-full h-full object-cover"
                                  alt={c.name}
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div
                                  className={`w-full h-full bg-gradient-to-br ${getCustomerAvatarGradient(c.name)} flex items-center justify-center font-black text-[13px]`}
                                >
                                  {c.name.slice(0, 2).toUpperCase()}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col">
                              {/* Customer name */}
                              <div className="flex items-center gap-2">
                                <span className="text-[15px] font-black text-white group-hover:text-[#14cfb4] transition-colors leading-none">
                                  {c.name}
                                </span>
                                {c.staffCustomerId && (
                                  <span className="text-[9.5px] font-mono font-black text-zinc-450 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-900 shadow-sm uppercase shrink-0">
                                    {c.staffCustomerId}
                                  </span>
                                )}
                              </div>
                              {/* Phone and Region Location */}
                              <span className="text-[11px] text-zinc-450 font-bold mt-1.5 leading-none flex items-center gap-1.5 flex-wrap font-sans">
                                {c.username && (
                                  <>
                                    <span className="text-emerald-400 font-bold">
                                      @{c.username}
                                    </span>
                                    <span className="text-zinc-[700]">•</span>
                                  </>
                                )}
                                <span>{c.phoneNumber}</span>
                                <span className="text-zinc-[700]">•</span>
                                <span className="text-zinc-500 font-semibold">
                                  {c.location || "Kaduna North"}
                                </span>
                              </span>
                            </div>
                          </div>

                          {/* Float right: cyan balance & status badge underneath */}
                          <div className="flex flex-col items-end text-right">
                            <span className="text-[14px] font-black font-mono text-[#14cfb4] tracking-tight group-hover:scale-105 transition-transform origin-right">
                              ₦
                              {(c.balance || 0).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                              })}
                            </span>

                            <span className="px-1.5 py-0.2 rounded bg-[rgba(20,207,180,0.06)] border border-[#14cfb4]/10 text-[8.5px] font-black text-[#14cfb4] uppercase tracking-wider mt-1.5">
                              active
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Slide up screen/modal for Enrollment Form Sheet */}
                  <AnimatePresence>
                    {showEnrollModal && (
                      <div className="fixed inset-0 bg-black/85 z-55 flex items-center justify-center p-4">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.94, y: 15 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.94, y: 15 }}
                          className="bg-[#111311] border border-zinc-900 rounded-[32px] p-6 max-w-sm w-full flex flex-col gap-4 text-left relative shadow-[0_24px_50px_rgba(0,0,0,0.9)] max-h-[90vh] overflow-y-auto"
                        >
                          <button
                            onClick={() => setShowEnrollModal(false)}
                            className="absolute top-4.5 right-4.5 w-7 h-7 rounded-full bg-[#0a0c0a] flex items-center justify-center text-zinc-400 hover:text-white border border-zinc-900 text-xs cursor-pointer font-bold"
                          >
                            ✕
                          </button>

                          <div className="text-center pb-2 border-b border-zinc-950">
                            <h2 className="text-[15px] font-black text-white uppercase tracking-tight">
                              ENROLL NEW SAVER
                            </h2>
                            <p className="text-[11px] text-zinc-500 mt-1">
                              Register contributor in {selectedStaff.location}{" "}
                              division
                            </p>
                          </div>

                          <form
                            onSubmit={(e) => {
                              handleSubmitEnroll: {
                                e.preventDefault();
                                if (!newCustName || !newCustAddress) return;

                                if (newCustAccountNumber.trim() && state.customers.some(c => c.accountNumber === newCustAccountNumber.trim())) {
                                  showToast("This custom account number is already assigned to another customer.", "error");
                                  return;
                                }

                                let uniqueUser = newCustUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
                                if (!uniqueUser) {
                                  const baseUsr = newCustName.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
                                  uniqueUser = baseUsr || 'user';
                                }

                                if (state.customers.some(c => c.username?.toLowerCase() === uniqueUser)) {
                                  showToast(`The username "@${uniqueUser}" is already taken. Please choose a different one.`, "error");
                                  return;
                                }

                                const initialVal =
                                  parseFloat(newCustInitialAmount) || 0;

                                const custWithAcc = state.customers.filter(c => c.accountNumber && /^[3]\d{9}$/.test(c.accountNumber));
                                let nextCustAccNum = 3000000001;
                                if (custWithAcc.length > 0) {
                                  const numbers = custWithAcc.map(c => parseInt(c.accountNumber || '', 10)).filter(num => !isNaN(num));
                                  if (numbers.length > 0) {
                                    nextCustAccNum = Math.max(...numbers) + 1;
                                  }
                                }
                                const uniqueAcc = newCustAccountNumber.trim() || String(nextCustAccNum);

                                onAddCustomer({
                                  name: newCustName,
                                  username: uniqueUser,
                                  phoneNumber: newCustPhone.trim() || 'No Phone',
                                  balance: initialVal,
                                  assignedStaffId: selectedStaff.id,
                                  status: "active",
                                  approvalStatus: "approved",
                                  location: newCustLocation,
                                  address: newCustAddress,
                                  accountNumber: uniqueAcc,
                                });

                                setSuccessCollectToast(
                                  `Saver "${newCustName}" registered and enrolled!`,
                                );
                                setNewCustName("");
                                setNewCustUsername("");
                                setNewCustPhone("");
                                setNewCustAccountNumber("");
                                setNewCustAddress("");
                                setShowEnrollModal(false);

                                setTimeout(() => {
                                  setSuccessCollectToast("");
                                }, 2000);
                              }
                            }}
                            className="flex flex-col gap-3.5"
                          >
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">
                                SAVER NAME
                              </span>
                              <input
                                type="text"
                                required
                                value={newCustName}
                                onChange={(e) => setNewCustName(e.target.value)}
                                placeholder="e.g. Amina Bello"
                                className="w-full px-3.5 py-2.8 bg-[#090a09] border border-zinc-950 focus:border-zinc-800 text-xs text-zinc-200 font-bold rounded-xl focus:outline-none"
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <span className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">
                                USERNAME
                              </span>
                              <input
                                type="text"
                                required
                                value={newCustUsername}
                                onChange={(e) => setNewCustUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                placeholder="e.g. amina_bello"
                                className="w-full px-3.5 py-2.8 bg-[#090a09] border border-zinc-950 focus:border-zinc-800 text-xs text-zinc-200 font-bold rounded-xl focus:outline-none"
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <span className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">
                                PHONE NUMBER (OPTIONAL)
                              </span>
                              <input
                                type="tel"
                                value={newCustPhone}
                                onChange={(e) =>
                                  setNewCustPhone(e.target.value)
                                }
                                placeholder="081 234 5678"
                                className="w-full px-3.5 py-2.8 bg-[#090a09] border border-zinc-950 focus:border-zinc-800 text-xs text-[#14cfb4] font-black font-mono rounded-xl focus:outline-none"
                              />
                            </div>



                            <div className="flex flex-col gap-1.5">
                              <span className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">
                                ZONE REGION
                              </span>
                              <input
                                type="text"
                                required
                                value={newCustLocation}
                                onChange={(e) =>
                                  setNewCustLocation(e.target.value)
                                }
                                placeholder="Kaduna North"
                                className="w-full px-3.5 py-2.8 bg-[#090a09] border border-zinc-950 text-xs text-zinc-200 font-bold rounded-xl focus:outline-none"
                              />
                            </div>

                            <div className="flex flex-col gap-1.5">
                              <span className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">
                                STREET ADDRESS
                              </span>
                              <input
                                type="text"
                                required
                                value={newCustAddress}
                                onChange={(e) =>
                                  setNewCustAddress(e.target.value)
                                }
                                placeholder="e.g. No. 12 Ahmadu Bello Way"
                                className="w-full px-3.5 py-2.8 bg-[#090a09] border border-zinc-950 text-xs text-zinc-305 rounded-xl focus:outline-none"
                              />
                            </div>

                            <button
                              type="submit"
                              className="w-full py-4.5 bg-[#14cfb4] text-[#090a09] font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md mt-2 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                            >
                              <UserPlus className="w-4 h-4" />
                              <span>Submit Registration</span>
                            </button>
                          </form>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* ================= HOME TAB (CHAIRMAN PERFORMANCE SCREEN) ================= */}
              {activeTab === "home" && (
                <div className="flex flex-col gap-4.5 animate-fade-in text-left">
                  {/* FINANCIAL PULSE SUMMARY CARD */}
                  <div id="financial-pulse-summary-section" className="bg-[#121312] border border-zinc-900 rounded-[28px] p-5 flex flex-col gap-4 text-left relative shadow-2xl">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#14cfb4]/5 via-transparent to-transparent rounded-full filter blur-2xl pointer-events-none" />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900/60 pb-3">
                      <div className="flex flex-col gap-0.5">
                        <h2 className="text-sm font-black text-white flex items-center gap-2">
                          <Activity className="w-4.5 h-4.5 text-[#14cfb4] animate-pulse shrink-0" />
                          <span>Financial Pulse Overview</span>
                        </h2>
                        <p className="text-[10px] text-zinc-500 font-medium font-sans">
                          Real-time cash flow and settled deposits/withdrawals tracking across intervals
                        </p>
                      </div>
                      
                      {/* Pulse Scope Switch Selector */}
                      <div className="flex items-center bg-[#0d0f0d] p-0.5 rounded-lg border border-zinc-900/50 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPulseScope("personal")}
                          className={`px-2.5 py-1 text-[8.5px] font-black uppercase tracking-wider rounded-md transition-all ${
                            pulseScope === "personal"
                              ? "bg-[#14cfb4] text-[#090a09]"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          My Field Ledger
                        </button>
                        <button
                          type="button"
                          onClick={() => setPulseScope("system")}
                          className={`px-2.5 py-1 text-[8.5px] font-black uppercase tracking-wider rounded-md transition-all ${
                            pulseScope === "system"
                              ? "bg-[#14cfb4] text-[#090a09]"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`}
                        >
                          Cooperative-Wide
                        </button>
                      </div>
                    </div>

                    {/* 4-Scale Pulse Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                      {/* Daily Pulse */}
                      {(() => {
                        const data = pulseScope === "personal" ? pulseMetrics.personal.daily : pulseMetrics.system.daily;
                        const mathRatio = data.deposits > 0 ? Math.round(((data.deposits - data.withdrawals) / data.deposits) * 100) : 0;
                        return (
                          <div className="bg-black/45 border border-zinc-900/75 hover:border-zinc-800 transition-all duration-300 rounded-2xl p-3.5 flex flex-col gap-2.5 group relative overflow-hidden">
                            <div className="flex items-center justify-between">
                              <span className="text-[10.5px] font-bold text-zinc-300 uppercase tracking-wide">Daily Pulse</span>
                              <span className="text-[7.5px] font-black text-zinc-500 uppercase tracking-widest font-mono bg-zinc-950 border border-zinc-900 px-1.5 py-0.5 rounded">TODAY</span>
                            </div>

                            <div className="flex flex-col gap-1.5 mt-0.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1 leading-none">
                                  <ArrowUpRight className="w-3 h-3 text-emerald-400 shrink-0" /> Deposits
                                </span>
                                <span className="text-[11px] font-mono font-black text-emerald-400 leading-none">
                                  {data.deposits >= 0 ? '+' : ''}{formatNaira(data.deposits)}
                                </span>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1 leading-none">
                                  <ArrowDownRight className="w-3 h-3 text-amber-500 shrink-0" /> Withdraws
                                </span>
                                <span className="text-[11px] font-mono font-black text-amber-500 leading-none">
                                  -{formatNaira(data.withdrawals)}
                                </span>
                              </div>
                            </div>

                            <div className="border-t border-zinc-900/40 my-0.5" />

                            <div className="flex flex-col gap-0.5 text-left">
                              <span className="text-[8px] font-black text-zinc-550 uppercase tracking-widest">Net Surplus</span>
                              <div className="flex items-center justify-between">
                                <span className={`text-[11px] font-mono font-black leading-none ${data.netMargin >= 0 ? 'text-[#14cfb4]' : 'text-rose-500'}`}>
                                  {data.netMargin >= 0 ? '+' : ''}{formatNaira(data.netMargin)}
                                </span>

                                {data.deposits > 0 ? (
                                  <span className={`text-[7px] font-mono font-black px-1.2 py-0.2 rounded ${mathRatio >= 0 ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' : 'bg-amber-955/20 text-[#f1be48] border border-amber-900/30'}`}>
                                    {mathRatio}%
                                  </span>
                                ) : (
                                  <span className="text-[7px] font-semibold text-zinc-650 uppercase font-mono">No Flow</span>
                                )}
                              </div>
                            </div>

                            <div className="w-full bg-zinc-950 h-1 rounded-full overflow-hidden border border-zinc-900/40">
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
                        const data = pulseScope === "personal" ? pulseMetrics.personal.weekly : pulseMetrics.system.weekly;
                        const mathRatio = data.deposits > 0 ? Math.round(((data.deposits - data.withdrawals) / data.deposits) * 100) : 0;
                        return (
                          <div className="bg-black/45 border border-zinc-900/75 hover:border-zinc-800 transition-all duration-300 rounded-2xl p-3.5 flex flex-col gap-2.5 group relative overflow-hidden">
                            <div className="flex items-center justify-between">
                              <span className="text-[10.5px] font-bold text-zinc-300 uppercase tracking-wide">Weekly Pulse</span>
                              <span className="text-[7.5px] font-black text-zinc-550 uppercase tracking-widest font-mono bg-zinc-950 border border-zinc-900 px-1.5 py-0.5 rounded">7 DAYS</span>
                            </div>

                            <div className="flex flex-col gap-1.5 mt-0.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1 leading-none">
                                  <ArrowUpRight className="w-3 h-3 text-emerald-400 shrink-0" /> Deposits
                                </span>
                                <span className="text-[11px] font-mono font-black text-emerald-400 leading-none">
                                  {data.deposits >= 0 ? '+' : ''}{formatNaira(data.deposits)}
                                </span>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1 leading-none">
                                  <ArrowDownRight className="w-3 h-3 text-amber-500 shrink-0" /> Withdraws
                                </span>
                                <span className="text-[11px] font-mono font-black text-amber-500 leading-none">
                                  -{formatNaira(data.withdrawals)}
                                </span>
                              </div>
                            </div>

                            <div className="border-t border-zinc-900/40 my-0.5" />

                            <div className="flex flex-col gap-0.5 text-left">
                              <span className="text-[8px] font-black text-zinc-550 uppercase tracking-widest">Net Surplus</span>
                              <div className="flex items-center justify-between">
                                <span className={`text-[11px] font-mono font-black leading-none ${data.netMargin >= 0 ? 'text-[#14cfb4]' : 'text-rose-500'}`}>
                                  {data.netMargin >= 0 ? '+' : ''}{formatNaira(data.netMargin)}
                                </span>

                                {data.deposits > 0 ? (
                                  <span className={`text-[7px] font-mono font-black px-1.2 py-0.2 rounded ${mathRatio >= 0 ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' : 'bg-amber-955/20 text-[#f1be48] border border-amber-900/30'}`}>
                                    {mathRatio}%
                                  </span>
                                ) : (
                                  <span className="text-[7px] font-semibold text-zinc-650 uppercase font-mono">No Flow</span>
                                )}
                              </div>
                            </div>

                            <div className="w-full bg-zinc-950 h-1 rounded-full overflow-hidden border border-zinc-900/40">
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
                        const data = pulseScope === "personal" ? pulseMetrics.personal.monthly : pulseMetrics.system.monthly;
                        const mathRatio = data.deposits > 0 ? Math.round(((data.deposits - data.withdrawals) / data.deposits) * 100) : 0;
                        return (
                          <div className="bg-black/45 border border-zinc-900/75 hover:border-zinc-800 transition-all duration-300 rounded-2xl p-3.5 flex flex-col gap-2.5 group relative overflow-hidden">
                            <div className="flex items-center justify-between">
                              <span className="text-[10.5px] font-bold text-zinc-300 uppercase tracking-wide">Monthly Pulse</span>
                              <span className="text-[7.5px] font-black text-zinc-550 uppercase tracking-widest font-mono bg-zinc-950 border border-zinc-900 px-1.5 py-0.5 rounded">30 DAYS</span>
                            </div>

                            <div className="flex flex-col gap-1.5 mt-0.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1 leading-none">
                                  <ArrowUpRight className="w-3 h-3 text-emerald-400 shrink-0" /> Deposits
                                </span>
                                <span className="text-[11px] font-mono font-black text-emerald-400 leading-none">
                                  {data.deposits >= 0 ? '+' : ''}{formatNaira(data.deposits)}
                                </span>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1 leading-none">
                                  <ArrowDownRight className="w-3 h-3 text-amber-500 shrink-0" /> Withdraws
                                </span>
                                <span className="text-[11px] font-mono font-black text-amber-500 leading-none">
                                  -{formatNaira(data.withdrawals)}
                                </span>
                              </div>
                            </div>

                            <div className="border-t border-zinc-900/40 my-0.5" />

                            <div className="flex flex-col gap-0.5 text-left">
                              <span className="text-[8px] font-black text-zinc-550 uppercase tracking-widest">Net Surplus</span>
                              <div className="flex items-center justify-between">
                                <span className={`text-[11px] font-mono font-black leading-none ${data.netMargin >= 0 ? 'text-[#14cfb4]' : 'text-rose-500'}`}>
                                  {data.netMargin >= 0 ? '+' : ''}{formatNaira(data.netMargin)}
                                </span>

                                {data.deposits > 0 ? (
                                  <span className={`text-[7px] font-mono font-black px-1.2 py-0.2 rounded ${mathRatio >= 0 ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' : 'bg-amber-955/20 text-[#f1be48] border border-amber-900/30'}`}>
                                    {mathRatio}%
                                  </span>
                                ) : (
                                  <span className="text-[7px] font-semibold text-zinc-650 uppercase font-mono">No Flow</span>
                                )}
                              </div>
                            </div>

                            <div className="w-full bg-zinc-950 h-1 rounded-full overflow-hidden border border-zinc-900/40">
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
                        const data = pulseScope === "personal" ? pulseMetrics.personal.yearly : pulseMetrics.system.yearly;
                        const mathRatio = data.deposits > 0 ? Math.round(((data.deposits - data.withdrawals) / data.deposits) * 100) : 0;
                        return (
                          <div className="bg-black/45 border border-zinc-900/75 hover:border-zinc-800 transition-all duration-300 rounded-2xl p-3.5 flex flex-col gap-2.5 group relative overflow-hidden">
                            <div className="flex items-center justify-between">
                              <span className="text-[10.5px] font-bold text-zinc-300 uppercase tracking-wide">Yearly Pulse</span>
                              <span className="text-[7.5px] font-black text-zinc-550 uppercase tracking-widest font-mono bg-zinc-950 border border-zinc-900 px-1.5 py-0.5 rounded">365 DAYS</span>
                            </div>

                            <div className="flex flex-col gap-1.5 mt-0.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1 leading-none">
                                  <ArrowUpRight className="w-3 h-3 text-emerald-400 shrink-0" /> Deposits
                                </span>
                                <span className="text-[11px] font-mono font-black text-emerald-400 leading-none">
                                  {data.deposits >= 0 ? '+' : ''}{formatNaira(data.deposits)}
                                </span>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1 leading-none">
                                  <ArrowDownRight className="w-3 h-3 text-amber-500 shrink-0" /> Withdraws
                                </span>
                                <span className="text-[11px] font-mono font-black text-amber-500 leading-none">
                                  -{formatNaira(data.withdrawals)}
                                </span>
                              </div>
                            </div>

                            <div className="border-t border-zinc-900/40 my-0.5" />

                            <div className="flex flex-col gap-0.5 text-left">
                              <span className="text-[8px] font-black text-zinc-550 uppercase tracking-widest">Net Surplus</span>
                              <div className="flex items-center justify-between">
                                <span className={`text-[11px] font-mono font-black leading-none ${data.netMargin >= 0 ? 'text-[#14cfb4]' : 'text-rose-500'}`}>
                                  {data.netMargin >= 0 ? '+' : ''}{formatNaira(data.netMargin)}
                                </span>

                                {data.deposits > 0 ? (
                                  <span className={`text-[7px] font-mono font-black px-1.2 py-0.2 rounded ${mathRatio >= 0 ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' : 'bg-amber-955/20 text-[#f1be48] border border-amber-900/30'}`}>
                                    {mathRatio}%
                                  </span>
                                ) : (
                                  <span className="text-[7px] font-semibold text-zinc-650 uppercase font-mono">No Flow</span>
                                )}
                              </div>
                            </div>

                            <div className="w-full bg-zinc-950 h-1 rounded-full overflow-hidden border border-zinc-900/40">
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

                  <CustomerStats customers={state.customers} />

                  {/* STAFF CORPORATE PASSPORT ID / SECURITY SMART CARD */}
                  <div className="w-full bg-gradient-to-br from-[#10121a] via-[#0b0c13] to-[#040406] border border-blue-900/30 rounded-[30px] p-5.5 relative shadow-2xl overflow-hidden select-none">
                    {/* Glowing circular overlays */}
                    <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent rounded-full filter blur-xl pointer-events-none" />
                    <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-blue-500/5 rounded-full pointer-events-none" />

                    {/* Hologram secure badge */}
                    <div className="absolute right-3.5 top-14 w-15 h-15 bg-gradient-to-br from-blue-500/10 to-[#3b82f6]/20 border border-blue-500/20 rounded-full flex flex-col items-center justify-center opacity-80 pointer-events-none select-none">
                      <span className="text-[6.5px] text-[#3b82f6] font-black uppercase tracking-widest leading-none">
                        AUTHORIZED
                      </span>
                      <span className="text-[13px] leading-none mt-1">👔</span>
                      <span className="text-[6px] text-zinc-500 font-mono mt-0.5">
                        STAFF
                      </span>
                    </div>

                    {/* Card Header */}
                    <div className="flex justify-between items-start pb-2.5 border-b border-blue-900/20 relative z-10">
                      <div className="flex flex-col text-left">
                        <span className="text-[10px] font-black tracking-widest text-[#3b82f6] uppercase">
                          CONTRIBOPAY OPERATIONS
                        </span>
                        <span className="text-[8px] font-medium text-zinc-500 tracking-wider">
                          OFFICIAL REVENUE PASSPORT
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-[#3b82f6]/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                        <span className="text-[8px] font-extrabold text-[#3b82f6] tracking-wider font-mono">
                          CODE: {selectedStaff.initials || "BO"}
                        </span>
                      </div>
                    </div>

                    {/* Body: Chip, credentials and Passport photograph */}
                    <div className="flex items-start justify-between gap-4 mt-4 relative z-10">
                      <div className="flex flex-col text-left justify-between h-24 flex-1">
                        {/* Gold EMV Chip */}
                        <div className="w-7 h-5.5 rounded bg-gradient-to-r from-[#eed693] via-[#f1be48] to-[#eed693] border border-stone-100/10 relative shadow-inner overflow-hidden shrink-0">
                          <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 border-zinc-950/20 scale-[0.9]" />
                        </div>

                        {/* Masked Staff Identity and Designation */}
                        <div className="flex flex-col mt-3 select-none">
                          <span className="text-[10px] text-zinc-400 font-bold font-mono tracking-wider">
                            SECURE ID &bull; STAFF &bull;{" "}
                            {selectedStaff.id.toUpperCase()}
                          </span>
                          <span className="text-[8px] text-zinc-550 font-semibold tracking-wide uppercase mt-0.5">
                            Assigned Location &bull;{" "}
                            {selectedStaff.location || "Lagos Central"}
                          </span>
                        </div>
                      </div>

                      {/* Wide Profile Face recognition photo space */}
                      <div className="flex flex-col items-center gap-1.5 shrink-0 select-none">
                        <div
                          className="relative group/staff-photo w-30 h-24 rounded-2xl border-2 border-[#3b82f6]/35 bg-zinc-950/90 shadow-2xl overflow-hidden cursor-pointer transition-transform duration-100 active:scale-95 flex flex-col items-center justify-center p-0.5 shrink-0"
                          title="Click to change Staff photograph"
                          onClick={() => {
                            const fileInput = document.getElementById(
                              "staff-portal-card-photo-input",
                            );
                            if (fileInput) fileInput.click();
                          }}
                        >
                          {selectedStaff.profileImage ? (
                            <img
                              src={selectedStaff.profileImage}
                              className="w-full h-full object-cover rounded-xl"
                              alt="Staff Photo"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full rounded-xl bg-[#14b8a6] text-[#090a09] font-black text-xl flex flex-col items-center justify-center gap-1">
                              <span>👔</span>
                              <span className="text-[10px] font-mono leading-none font-bold select-none">
                                {selectedStaff.initials}
                              </span>
                            </div>
                          )}

                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-black/75 opacity-0 group-hover/staff-photo:opacity-100 transition-opacity flex flex-col items-center justify-center text-[8px] text-[#3b82f6] font-black tracking-wider uppercase text-center p-1 leading-normal rounded-xl">
                            <span>REPLACE</span>
                            <span>PHOTO</span>
                          </div>
                        </div>

                        <span className="text-[7px] font-black text-[#3b82f6] tracking-widest uppercase bg-[#3b82f6]/10 border border-[#3b82f6]/20 px-2 py-0.5 rounded-full leading-none">
                          STAFF PHOTO ID
                        </span>

                        <input
                          type="file"
                          id="staff-portal-card-photo-input"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                if (typeof reader.result === "string") {
                                  onUpdateStaff(selectedStaff.id, {
                                    profileImage: reader.result,
                                  });
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Card Footer Credentials */}
                    <div className="mt-4 pt-2.5 border-t border-blue-900/10 flex flex-col gap-3 relative z-10">
                      <div className="flex items-end justify-between">
                        <div className="flex flex-col text-left gap-1 min-w-0 flex-1">
                          <span className="text-[6.5px] font-black text-zinc-550 uppercase tracking-widest">
                            OFFICIAL FULL NAME
                          </span>
                          <span className="text-[11px] font-black tracking-wider font-mono text-zinc-200 truncate leading-none uppercase">
                            {selectedStaff.name}
                          </span>
                        </div>
                        <div className="flex flex-col text-right gap-1 select-none">
                          <span className="text-[6.5px] font-black text-zinc-550 uppercase tracking-widest">
                            ROLE DEFINITION
                          </span>
                          <span className="text-[11px] font-bold font-mono text-[#3b82f6] leading-none uppercase">
                            {selectedStaff.role}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col text-left gap-1">
                        <span className="text-[6.5px] font-black text-zinc-550 uppercase tracking-widest">
                          COLLECTION ACCOUNT NUMBER
                        </span>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black tracking-[0.15em] font-mono text-white leading-none uppercase">
                            {selectedStaff.accountNumber || '--- --- ---'}
                          </span>
                          <button 
                            onClick={() => {
                              if (selectedStaff.accountNumber) {
                                navigator.clipboard.writeText(selectedStaff.accountNumber);
                                showToast("Account number copied to clipboard", "success");
                              }
                            }}
                            className="text-[8px] font-black text-[#3b82f6] uppercase tracking-widest hover:text-white transition-colors"
                          >
                            COPY
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Barcode representation */}
                    <div className="mt-3 flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-1.5 text-[8px] text-zinc-500 font-bold uppercase leading-none">
                        <span>🛡️ BIOMETRIC APPROVED CHANNELS</span>
                      </div>
                      <div className="flex items-center gap-0.5 h-3 opacity-30 select-none">
                        <div className="w-1.5 h-full bg-white" />
                        <div className="w-0.5 h-full bg-white" />
                        <div className="w-1 h-full bg-white" />
                        <div className="w-0.5 h-full bg-white" />
                        <div className="w-2.5 h-full bg-white" />
                        <div className="w-0.5 h-full bg-white" />
                        <div className="w-1.5 h-full bg-white" />
                      </div>
                    </div>
                  </div>

                  {/* Performance section title */}
                  <span className="text-[12px] font-extrabold text-zinc-400 select-none px-1 tracking-wide uppercase mt-1">
                    Today's Performance
                  </span>

                  {/* 2x2 Bento performance grid */}
                  <div className="grid grid-cols-2 gap-3.5">
                    {/* Collected Today card */}
                    <div className="bg-[#111311] border border-zinc-900 rounded-[28px] p-4.5 flex flex-col gap-3 shadow-xl relative overflow-hidden">
                      <div className="w-9 h-9 bg-emerald-950/30 border border-emerald-800/10 text-emerald-400 rounded-xl flex items-center justify-center">
                        <Coins className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                          Collected Today
                        </span>
                        <span className="text-[16px] font-black text-[#14cfb4] tracking-tight mt-1">
                          ₦
                          {displayCollectionsToday.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-semibold mt-1.5">
                          +
                          {selectedStaffTransactions.filter((t) =>
                            t.timestamp.startsWith(
                              new Date().toISOString().split("T")[0],
                            ),
                          ).length + 2}{" "}
                          transactions
                        </span>
                      </div>
                    </div>

                    {/* All Customers card */}
                    <div className="bg-[#111311] border border-zinc-900 rounded-[28px] p-4.5 flex flex-col gap-3 shadow-xl relative overflow-hidden">
                      <div className="w-9 h-9 bg-blue-950/20 border border-blue-900/10 text-blue-400 rounded-xl flex items-center justify-center">
                        <Users className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                          All Customers
                        </span>
                        <span className="text-[18px] font-black text-[#3b82f6] mt-1">
                          {state.customers.length}
                        </span>
                        <span className="text-[10px] text-emerald-500 font-bold mt-1.5">
                          {assignedCustomers.length} assigned
                        </span>
                      </div>
                    </div>

                    {/* This Month card */}
                    <div className="bg-[#111311] border border-zinc-900 rounded-[28px] p-4.5 flex flex-col gap-3 shadow-xl relative overflow-hidden">
                      <div className="w-9 h-9 bg-amber-955/20 border border-amber-900/10 text-amber-500 rounded-xl flex items-center justify-center animate-pulse">
                        <TrendingUp className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                          This Month
                        </span>
                        <span className="text-[16px] font-black text-amber-400 tracking-tight mt-1">
                          ₦
                          {(
                            selectedStaff.totalCollectionsAmount || 312000
                          ).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                        <span className="text-[10px] text-emerald-500 font-bold mt-1.5">
                          {selectedStaff.collectionsCount || 156} collections
                        </span>
                      </div>
                    </div>

                    {/* Daily Target card */}
                    <div className="bg-[#111311] border border-zinc-900 rounded-[28px] p-4.5 flex flex-col gap-3 shadow-xl relative overflow-hidden">
                      <div className="w-9 h-9 bg-violet-955/20 border border-violet-900/10 text-violet-400 rounded-xl flex items-center justify-center">
                        <Target className="w-4.5 h-4.5 animate-spin duration-[4000ms]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                          Daily Target
                        </span>
                        <span className="text-[18px] font-black text-[#a855f7] mt-1">
                          84%
                        </span>
                        <span className="text-[10px] text-emerald-400 font-semibold mt-1.5 flex items-center gap-1">
                          ↑3%{" "}
                          <span className="text-zinc-550 font-medium">
                            vs yesterday
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* PENDING CUSTOMER WITHDRAWALS REQUIRING APPROVAL */}
                  {pendingCustomerWithdrawals.length > 0 && (
                    <div className="flex flex-col gap-3 text-left">
                      <div className="flex items-center justify-between px-0.5 mt-2">
                        <span className="text-[11px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                          <span>⚠️</span> PENDING BIOMETRIC APPROVALS ({pendingCustomerWithdrawals.length})
                        </span>
                        <span className="text-[8px] font-mono text-zinc-500 uppercase font-black">Verify image proof</span>
                      </div>

                      <div className="flex flex-col gap-2.5">
                        {pendingCustomerWithdrawals.map((tx, index) => {
                          const customer = state.customers.find((c) => c.id === tx.customerId);
                          const customerBalance = customer ? customer.balance : 0;
                          return (
                            <div 
                              key={`${tx.id}-${index}`}
                              onClick={() => {
                                setReceiptModalTx(tx);
                              }}
                              className="p-3.5 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/15 hover:border-amber-500/30 rounded-2xl cursor-pointer transition-all flex flex-col gap-3 shadow-md"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {/* Face thumbnail */}
                                  <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-950 border border-zinc-900 shrink-0">
                                    {(() => {
                                      const txPhoto = tx.withdrawalPhoto || customer?.profileImage;
                                      const initials = customer ? customer.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() : tx.customerName.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
                                      return txPhoto ? (
                                        <img 
                                          src={txPhoto} 
                                          className="w-full h-full object-cover animate-fade-in" 
                                          alt="Face proof" 
                                          referrerPolicy="no-referrer"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[10px] bg-gradient-to-br from-amber-500 to-orange-600 text-white font-black font-mono">
                                          {initials}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                  <div className="flex flex-col min-w-0 text-left">
                                    <span className="text-[12px] font-black text-[#facc15] tracking-tight leading-none uppercase truncate">
                                      {tx.customerName}
                                    </span>
                                    <span className="text-[9px] text-zinc-500 font-bold mt-0.5 font-mono">
                                      Ref: {tx.reference}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right flex flex-col items-end shrink-0 leading-none mt-0.5">
                                  <span className="text-[12px] font-black text-white font-mono">
                                    ₦{tx.amount.toLocaleString()}
                                  </span>
                                  <span className="text-[8.5px] text-zinc-500 font-bold font-mono mt-1">
                                    Bal: ₦{customerBalance.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between pt-2.5 text-[9px] font-bold border-t border-dashed border-zinc-900/60 leading-normal">
                                <span className="text-zinc-[400] flex items-center gap-1 font-sans">
                                  <span className="text-amber-500">📷 selfie captured</span>
                                </span>
                                <span className="text-amber-400 font-black tracking-widest uppercase text-[8px] border border-amber-500/20 bg-amber-500/5 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  Awaiting approval
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* TIMEFRAME COLLECTIONS & BALANCES DASHBOARD */}
                  <div className="flex flex-col gap-3 text-left">
                    <span className="text-[11px] font-black text-zinc-550 uppercase tracking-widest px-0.5 mt-2">
                      TIMEFRAME ANALYSIS (SAVED & BALANCE)
                    </span>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Daily Card */}
                      <div className="bg-[#111311]/80 border border-zinc-900 rounded-[22px] p-3.5 flex flex-col gap-2 relative overflow-hidden shadow-md">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                          ☀️ Daily Focus
                        </span>
                        <div className="flex flex-col gap-1 mt-1 leading-none">
                          <span className="text-[8.5px] text-zinc-500 font-bold uppercase tracking-wider">
                            Saved (Deposited):
                          </span>
                          <span className="text-xs font-black text-[#14cfb4] font-mono">
                            {formatNaira(dailyMetrics.systemSaved)}
                          </span>
                          <span className="text-[8px] text-zinc-600 font-medium pb-1 leading-normal block">
                            My ledger: {formatNaira(dailyMetrics.saved)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 mt-1 leading-none border-t border-zinc-950 pt-2">
                          <span className="text-[8.5px] text-zinc-500 font-bold uppercase tracking-wider">
                            Withdrawn (Payouts):
                          </span>
                          <span className="text-xs font-black text-rose-450 font-mono">
                            {formatNaira(dailyMetrics.systemWithdrawn || 0)}
                          </span>
                          <span className="text-[8px] text-zinc-650 font-medium pb-1 leading-normal block">
                            My ledger: {formatNaira(dailyMetrics.withdrawn)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 mt-1 leading-none border-t border-zinc-950 pt-2">
                          <span className="text-[8.5px] text-zinc-500 font-bold uppercase tracking-wider">
                            Total Balance:
                          </span>
                          <span className="text-[10.5px] font-extrabold text-blue-400 font-mono">
                            {formatNaira(dailyMetrics.systemActiveBalance)}
                          </span>
                          <span className="text-[8px] text-zinc-600 font-medium mt-0.5 leading-normal block">
                            My handled:{" "}
                            {formatNaira(dailyMetrics.activeBalance)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 mt-1 leading-none border-t border-zinc-950 pt-2">
                          <span className="text-[8.5px] text-zinc-500 font-bold uppercase tracking-wider">
                            Realized Profit:
                          </span>
                          <span className="text-[10.5px] font-extrabold text-amber-500 font-mono">
                            {formatNaira(dailyMetrics.systemProfit)}
                          </span>
                          <span className="text-[8px] text-zinc-600 font-medium mt-0.5 leading-normal block">
                            My processed:{" "}
                            {formatNaira(dailyMetrics.profit)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2 mt-1.5 border-t border-zinc-950 pt-2">
                          {/* Inner Subcard - My Acquisitions */}
                          <div className="flex flex-col gap-1.5 bg-[#090b09]/50 p-2 rounded-xl border border-zinc-950/40">
                            <div className="flex justify-between items-center text-[7.5px] text-[#14cfb4] font-bold uppercase tracking-wider">
                              <span>My Acquisitions</span>
                              <span className="font-mono bg-[#14cfb4]/10 px-1 py-0.2 rounded font-black">
                                {dailyMetrics.myRegisteredCount} Total
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1 font-mono text-[8.5px]">
                              <div className="flex flex-col">
                                <span className="text-[7px] text-zinc-600 uppercase">
                                  Reg:
                                </span>
                                <span className="font-bold text-white">
                                  {dailyMetrics.myRegisteredCount}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[7px] text-zinc-650 uppercase">
                                  New:
                                </span>
                                <span className="font-extrabold text-emerald-400">
                                  {dailyMetrics.myNewCustomersCount}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[7px] text-zinc-650 uppercase">
                                  Old:
                                </span>
                                <span className="font-bold text-zinc-500">
                                  {dailyMetrics.myOldCustomersCount}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Inner Subcard - System Wide */}
                          <div className="flex flex-col gap-1.5 p-1 bg-[#090b09]/10 rounded-xl">
                            <div className="flex justify-between items-center text-[7.5px] text-zinc-500 font-bold uppercase tracking-wider">
                              <span>System Wide</span>
                              <span className="font-mono">
                                {dailyMetrics.registeredCount} Total
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1 font-mono text-[8.5px]">
                              <div className="flex flex-col">
                                <span className="text-[7px] text-zinc-600 uppercase">
                                  Reg:
                                </span>
                                <span className="font-bold text-zinc-400">
                                  {dailyMetrics.registeredCount}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[7px] text-zinc-600 uppercase">
                                  New:
                                </span>
                                <span className="font-bold text-emerald-550">
                                  {dailyMetrics.newCustomersCount}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[7px] text-zinc-600 uppercase">
                                  Old:
                                </span>
                                <span className="font-bold text-zinc-500">
                                  {dailyMetrics.oldCustomersCount}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Weekly Card */}
                      <div className="bg-[#111311]/80 border border-zinc-900 rounded-[22px] p-3.5 flex flex-col gap-2 relative overflow-hidden shadow-md">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-[#8b5cf6]/5 rounded-full blur-xl pointer-events-none" />
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                          📅 Weekly Focus
                        </span>
                        <div className="flex flex-col gap-1 mt-1 leading-none">
                          <span className="text-[8.5px] text-zinc-500 font-bold uppercase tracking-wider">
                            Saved (Deposited):
                          </span>
                          <span className="text-xs font-black text-[#14cfb4] font-mono">
                            {formatNaira(weeklyMetrics.systemSaved)}
                          </span>
                          <span className="text-[8px] text-zinc-600 font-medium pb-1 leading-normal block">
                            My ledger: {formatNaira(weeklyMetrics.saved)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 mt-1 leading-none border-t border-zinc-950 pt-2">
                          <span className="text-[8.5px] text-zinc-500 font-bold uppercase tracking-wider">
                            Withdrawn (Payouts):
                          </span>
                          <span className="text-xs font-black text-rose-455 font-mono">
                            {formatNaira(weeklyMetrics.systemWithdrawn || 0)}
                          </span>
                          <span className="text-[8px] text-zinc-650 font-medium pb-1 leading-normal block">
                            My ledger: {formatNaira(weeklyMetrics.withdrawn)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 mt-1 leading-none border-t border-zinc-950 pt-2">
                          <span className="text-[8.5px] text-zinc-500 font-bold uppercase tracking-wider">
                            Total Balance:
                          </span>
                          <span className="text-[10.5px] font-extrabold text-[#a855f7] font-mono">
                            {formatNaira(weeklyMetrics.systemActiveBalance)}
                          </span>
                          <span className="text-[8px] text-zinc-600 font-medium mt-0.5 leading-normal block">
                            My handled:{" "}
                            {formatNaira(weeklyMetrics.activeBalance)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 mt-1 leading-none border-t border-zinc-950 pt-2">
                          <span className="text-[8.5px] text-zinc-500 font-bold uppercase tracking-wider">
                            Realized Profit:
                          </span>
                          <span className="text-[10.5px] font-extrabold text-amber-500 font-mono">
                            {formatNaira(weeklyMetrics.systemProfit)}
                          </span>
                          <span className="text-[8px] text-zinc-600 font-medium mt-0.5 leading-normal block">
                            My processed:{" "}
                            {formatNaira(weeklyMetrics.profit)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2 mt-1.5 border-t border-zinc-950 pt-2">
                          {/* Inner Subcard - My Acquisitions */}
                          <div className="flex flex-col gap-1.5 bg-[#090b09]/50 p-2 rounded-xl border border-zinc-950/40">
                            <div className="flex justify-between items-center text-[7.5px] text-[#a855f7] font-bold uppercase tracking-wider">
                              <span>My Acquisitions</span>
                              <span className="font-mono bg-[#a855f7]/10 px-1 py-0.2 rounded font-black">
                                {weeklyMetrics.myRegisteredCount} Total
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1 font-mono text-[8.5px]">
                              <div className="flex flex-col">
                                <span className="text-[7px] text-zinc-600 uppercase">
                                  Reg:
                                </span>
                                <span className="font-bold text-white">
                                  {weeklyMetrics.myRegisteredCount}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[7px] text-zinc-650 uppercase">
                                  New:
                                </span>
                                <span className="font-extrabold text-[#a855f7]">
                                  {weeklyMetrics.myNewCustomersCount}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[7px] text-zinc-650 uppercase">
                                  Old:
                                </span>
                                <span className="font-bold text-zinc-500">
                                  {weeklyMetrics.myOldCustomersCount}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Inner Subcard - System Wide */}
                          <div className="flex flex-col gap-1.5 p-1 bg-[#090b09]/10 rounded-xl">
                            <div className="flex justify-between items-center text-[7.5px] text-zinc-500 font-bold uppercase tracking-wider">
                              <span>System Wide</span>
                              <span className="font-mono">
                                {weeklyMetrics.registeredCount} Total
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1 font-mono text-[8.5px]">
                              <div className="flex flex-col">
                                <span className="text-[7px] text-zinc-600 uppercase">
                                  Reg:
                                </span>
                                <span className="font-bold text-zinc-400">
                                  {weeklyMetrics.registeredCount}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[7px] text-zinc-600 uppercase">
                                  New:
                                </span>
                                <span className="font-bold text-emerald-550">
                                  {weeklyMetrics.newCustomersCount}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[7px] text-zinc-600 uppercase">
                                  Old:
                                </span>
                                <span className="font-bold text-zinc-500">
                                  {weeklyMetrics.oldCustomersCount}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Monthly Card */}
                      <div className="bg-[#111311]/80 border border-zinc-900 rounded-[22px] p-3.5 flex flex-col gap-2 relative overflow-hidden shadow-md">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                          🗓️ Monthly Focus
                        </span>
                        <div className="flex flex-col gap-1 mt-1 leading-none">
                          <span className="text-[8.5px] text-zinc-500 font-bold uppercase tracking-wider">
                            Saved (Deposited):
                          </span>
                          <span className="text-xs font-black text-[#14cfb4] font-mono">
                            {formatNaira(monthlyMetrics.systemSaved)}
                          </span>
                          <span className="text-[8px] text-zinc-600 font-medium pb-1 leading-normal block">
                            My ledger: {formatNaira(monthlyMetrics.saved)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 mt-1 leading-none border-t border-zinc-950 pt-2">
                          <span className="text-[8.5px] text-zinc-500 font-bold uppercase tracking-wider">
                            Withdrawn (Payouts):
                          </span>
                          <span className="text-xs font-black text-rose-455 font-mono">
                            {formatNaira(monthlyMetrics.systemWithdrawn || 0)}
                          </span>
                          <span className="text-[8px] text-zinc-650 font-medium pb-1 leading-normal block">
                            My ledger: {formatNaira(monthlyMetrics.withdrawn)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 mt-1 leading-none border-t border-zinc-950 pt-2">
                          <span className="text-[8.5px] text-zinc-500 font-bold uppercase tracking-wider">
                            Total Balance:
                          </span>
                          <span className="text-[10.5px] font-extrabold text-amber-550 font-mono">
                            {formatNaira(monthlyMetrics.systemActiveBalance)}
                          </span>
                          <span className="text-[8px] text-zinc-650 font-medium mt-0.5 leading-normal block">
                            My handled:{" "}
                            {formatNaira(monthlyMetrics.activeBalance)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 mt-1 leading-none border-t border-zinc-950 pt-2">
                          <span className="text-[8.5px] text-zinc-500 font-bold uppercase tracking-wider">
                            Realized Profit:
                          </span>
                          <span className="text-[10.5px] font-extrabold text-amber-500 font-mono">
                            {formatNaira(monthlyMetrics.systemProfit)}
                          </span>
                          <span className="text-[8px] text-zinc-600 font-medium mt-0.5 leading-normal block">
                            My processed:{" "}
                            {formatNaira(monthlyMetrics.profit)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2 mt-1.5 border-t border-zinc-950 pt-2">
                          {/* Inner Subcard - My Acquisitions */}
                          <div className="flex flex-col gap-1.5 bg-[#090b09]/50 p-2 rounded-xl border border-zinc-950/40">
                            <div className="flex justify-between items-center text-[7.5px] text-amber-500 font-bold uppercase tracking-wider">
                              <span>My Acquisitions</span>
                              <span className="font-mono bg-amber-500/10 px-1 py-0.2 rounded font-black">
                                {monthlyMetrics.myRegisteredCount} Total
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1 font-mono text-[8.5px]">
                              <div className="flex flex-col">
                                <span className="text-[7px] text-zinc-600 uppercase">
                                  Reg:
                                </span>
                                <span className="font-bold text-white">
                                  {monthlyMetrics.myRegisteredCount}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[7px] text-zinc-650 uppercase">
                                  New:
                                </span>
                                <span className="font-extrabold text-amber-400">
                                  {monthlyMetrics.myNewCustomersCount}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[7px] text-zinc-650 uppercase">
                                  Old:
                                </span>
                                <span className="font-bold text-zinc-500">
                                  {monthlyMetrics.myOldCustomersCount}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Inner Subcard - System Wide */}
                          <div className="flex flex-col gap-1.5 p-1 bg-[#090b09]/10 rounded-xl">
                            <div className="flex justify-between items-center text-[7.5px] text-zinc-500 font-bold uppercase tracking-wider">
                              <span>System Wide</span>
                              <span className="font-mono">
                                {monthlyMetrics.registeredCount} Total
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1 font-mono text-[8.5px]">
                              <div className="flex flex-col">
                                <span className="text-[7px] text-zinc-600 uppercase">
                                  Reg:
                                </span>
                                <span className="font-bold text-zinc-400">
                                  {monthlyMetrics.registeredCount}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[7px] text-zinc-600 uppercase">
                                  New:
                                </span>
                                <span className="font-bold text-emerald-555">
                                  {monthlyMetrics.newCustomersCount}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[7px] text-zinc-600 uppercase">
                                  Old:
                                </span>
                                <span className="font-bold text-zinc-500">
                                  {monthlyMetrics.oldCustomersCount}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Yearly Card */}
                      <div className="bg-[#111311]/80 border border-zinc-900 rounded-[22px] p-3.5 flex flex-col gap-2 relative overflow-hidden shadow-md">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-[#3b82f6]/5 rounded-full blur-xl pointer-events-none" />
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                          🏛️ Yearly Focus
                        </span>
                        <div className="flex flex-col gap-1 mt-1 leading-none">
                          <span className="text-[8.5px] text-zinc-500 font-bold uppercase tracking-wider">
                            Saved (Deposited):
                          </span>
                          <span className="text-xs font-black text-[#14cfb4] font-mono">
                            {formatNaira(yearlyMetrics.systemSaved)}
                          </span>
                          <span className="text-[8px] text-zinc-600 font-medium pb-1 leading-normal block">
                            My ledger: {formatNaira(yearlyMetrics.saved)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 mt-1 leading-none border-t border-zinc-950 pt-2">
                          <span className="text-[8.5px] text-zinc-500 font-bold uppercase tracking-wider">
                            Withdrawn (Payouts):
                          </span>
                          <span className="text-xs font-black text-rose-455 font-mono">
                            {formatNaira(yearlyMetrics.systemWithdrawn || 0)}
                          </span>
                          <span className="text-[8px] text-zinc-650 font-medium pb-1 leading-normal block">
                            My ledger: {formatNaira(yearlyMetrics.withdrawn)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 mt-1 leading-none border-t border-zinc-950 pt-2">
                          <span className="text-[8.5px] text-zinc-550 font-bold uppercase tracking-wider">
                            Total Balance:
                          </span>
                          <span className="text-[10.5px] font-extrabold text-blue-400 font-mono">
                            {formatNaira(yearlyMetrics.systemActiveBalance)}
                          </span>
                          <span className="text-[8px] text-zinc-650 font-medium mt-0.5 leading-normal block">
                            My handled:{" "}
                            {formatNaira(yearlyMetrics.activeBalance)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 mt-1 leading-none border-t border-zinc-950 pt-2">
                          <span className="text-[8.5px] text-zinc-500 font-bold uppercase tracking-wider">
                            Realized Profit:
                          </span>
                          <span className="text-[10.5px] font-extrabold text-amber-500 font-mono">
                            {formatNaira(yearlyMetrics.systemProfit)}
                          </span>
                          <span className="text-[8px] text-zinc-600 font-medium mt-0.5 leading-normal block">
                            My processed:{" "}
                            {formatNaira(yearlyMetrics.profit)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-2 mt-1.5 border-t border-zinc-950 pt-2">
                          {/* Inner Subcard - My Acquisitions */}
                          <div className="flex flex-col gap-1.5 bg-[#090b09]/50 p-2 rounded-xl border border-zinc-950/40">
                            <div className="flex justify-between items-center text-[7.5px] text-blue-400 font-bold uppercase tracking-wider">
                              <span>My Acquisitions</span>
                              <span className="font-mono bg-blue-400/10 px-1 py-0.2 rounded font-black">
                                {yearlyMetrics.myRegisteredCount} Total
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1 font-mono text-[8.5px]">
                              <div className="flex flex-col">
                                <span className="text-[7px] text-zinc-600 uppercase">
                                  Reg:
                                </span>
                                <span className="font-bold text-white">
                                  {yearlyMetrics.myRegisteredCount}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[7px] text-zinc-650 uppercase">
                                  New:
                                </span>
                                <span className="font-extrabold text-blue-400">
                                  {yearlyMetrics.myNewCustomersCount}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[7px] text-zinc-650 uppercase">
                                  Old:
                                </span>
                                <span className="font-bold text-zinc-500">
                                  {yearlyMetrics.myOldCustomersCount}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Inner Subcard - System Wide */}
                          <div className="flex flex-col gap-1.5 p-1 bg-[#090b09]/10 rounded-xl">
                            <div className="flex justify-between items-center text-[7.5px] text-zinc-500 font-bold uppercase tracking-wider">
                              <span>System Wide</span>
                              <span className="font-mono">
                                {yearlyMetrics.registeredCount} Total
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1 font-mono text-[8.5px]">
                              <div className="flex flex-col">
                                <span className="text-[7px] text-zinc-600 uppercase">
                                  Reg:
                                </span>
                                <span className="font-bold text-zinc-400">
                                  {yearlyMetrics.registeredCount}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[7px] text-zinc-600 uppercase">
                                  New:
                                </span>
                                <span className="font-bold text-emerald-555">
                                  {yearlyMetrics.newCustomersCount}
                                </span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-[7px] text-zinc-600 uppercase">
                                  Old:
                                </span>
                                <span className="font-bold text-zinc-500">
                                  {yearlyMetrics.oldCustomersCount}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* STAFF CODE GLOW CARD WITH DASHED BORDER */}
                  <div className="w-full bg-[#111311]/95 border border-[#14cfb4]/20 rounded-[28px] p-5.5 flex flex-col gap-3.5 shadow-xl relative overflow-hidden">
                    <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                      💳 Your Staff Code
                    </span>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 bg-[#090a09] border border-dashed border-[#14cfb4]/30 rounded-2xl py-3.5 px-4 flex items-center justify-center font-mono text-[14px] md:text-[15px] font-black tracking-widest text-[#14cfb4] uppercase shadow-inner">
                        {selectedStaff.code}
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => handleCopyCode(selectedStaff.code)}
                          className="px-3.5 py-1.8 bg-[#14cfb4] hover:bg-[#0da68d] text-[#090a09] text-[10.5px] font-black uppercase tracking-wider rounded-xl transition-all active:scale-90 cursor-pointer shadow-md text-center"
                        >
                          {copiedCode ? "Copied" : "Copy"}
                        </button>

                        <button
                          onClick={() => handleShareButton(selectedStaff.code)}
                          className="px-3.5 py-1.8 bg-amber-500 hover:bg-amber-600 text-[#090a09] text-[10.5px] font-black uppercase tracking-wider rounded-xl transition-all active:scale-90 cursor-pointer shadow-md text-center"
                        >
                          {shareStatus ? "Shared" : "Share"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* QUICK ACTIONS SECTION (Row of 4 cards) */}
                  <div className="flex flex-col gap-3">
                    <span className="text-[11px] font-black text-zinc-550 uppercase tracking-widest select-none mt-1">
                      Quick Actions
                    </span>

                    <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                      {/* Collect Quick Action */}
                      <button
                        onClick={() => setActiveTab("collect")}
                        className="p-3 bg-[#111311] border border-zinc-950 hover:border-[#8b5cf6]/20 rounded-2xl flex flex-col items-center gap-2 group cursor-pointer transition-all active:scale-95"
                      >
                        <div className="w-10 h-10 rounded-xl bg-emerald-950/25 border border-emerald-990 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                          <Coins className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-zinc-300">Collect</span>
                      </button>

                      {/* Receipt Quick Action */}
                      <button
                        onClick={() => {
                          if (selectedStaffTransactions.length > 0) {
                            setReceiptModalTx(selectedStaffTransactions[0]);
                          } else {
                            setShowReceiptSelector(true);
                          }
                        }}
                        className="p-3 bg-[#111311] border border-zinc-950 hover:border-[#8b5cf6]/20 rounded-2xl flex flex-col items-center gap-2 group cursor-pointer transition-all active:scale-95"
                      >
                        <div className="w-10 h-10 rounded-xl bg-amber-955/20 border border-amber-990 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                          <FileText className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-zinc-300">Receipt</span>
                      </button>

                      {/* Add Cust. Quick Action */}
                      <button
                        onClick={() => setActiveTab("customers")}
                        className="p-3 bg-[#111311] border border-zinc-950 hover:border-[#8b5cf6]/20 rounded-2xl flex flex-col items-center gap-2 group cursor-pointer transition-all active:scale-95"
                      >
                        <div className="w-10 h-10 rounded-xl bg-violet-955/20 border border-violet-990 flex items-center justify-center text-violet-400 group-hover:scale-110 transition-transform">
                          <UserPlus className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-zinc-300">
                          Add Cust.
                        </span>
                      </button>

                      {/* Reminder Quick Action */}
                      <button
                        onClick={() => setShowBroadcastModal(true)}
                        className="p-3 bg-[#111311] border border-zinc-950 hover:border-[#8b5cf6]/20 rounded-2xl flex flex-col items-center gap-2 group cursor-pointer transition-all active:scale-95"
                      >
                        <div className="w-10 h-10 rounded-xl bg-[#8b5cf6]/10 border border-violet-990 flex items-center justify-center text-[#b592ff] group-hover:scale-110 transition-transform">
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-zinc-300">
                          Reminder
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* RECENT ACTIVITY LOG LIST WITH ADVANCED SEARCH, FILTERING & BALANCE DYNAMIC CALCULATIONS */}
                  <div className="bg-[#111311] border border-zinc-900 rounded-[28px] p-5 flex flex-col gap-4 shadow-xl mt-1.5 text-left">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-950 pb-3">
                      <div className="flex flex-col">
                        <h2 className="text-sm font-black text-[#eed693] tracking-tight flex items-center gap-2">
                          <span>Recent Transactions Ledger</span>
                          <span className="text-[9px] bg-[#14cfb4]/10 text-[#14cfb4] border border-[#14cfb4]/30 px-2 py-0.5 rounded-full font-mono font-bold">
                            {processedTransactions.length} of {selectedStaffTransactions.length} Records
                          </span>
                        </h2>
                        <p className="text-[10px] text-zinc-500 mt-1 font-bold">
                          Filter with client's full details or unique digital system receipt reference numbers
                        </p>
                      </div>
                    </div>

                    {/* SELECTORS ROW */}
                    <div className="flex flex-col gap-2.5 bg-black/35 p-3 rounded-2xl border border-zinc-950/80">
                      {/* Interval Select Segment */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[8.5px] font-black text-zinc-500 uppercase tracking-widest px-0.5">
                          Time Interval
                        </span>
                        <div className="flex flex-wrap items-center gap-1">
                          {(
                            [
                              "all",
                              "daily",
                              "weekly",
                              "monthly",
                              "yearly",
                            ] as const
                          ).map((timeframe) => (
                            <button
                              key={timeframe}
                              type="button"
                              onClick={() => setTxTimeframeFilter(timeframe)}
                              className={`px-2 py-1 text-[9px] font-black uppercase rounded-lg cursor-pointer transition-all ${
                                txTimeframeFilter === timeframe
                                  ? "bg-[#14cfb4]/10 text-[#14cfb4] border border-[#14cfb4]/25 shadow-sm"
                                  : "bg-transparent border border-transparent text-zinc-500 hover:text-zinc-350"
                              }`}
                            >
                              {timeframe}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Cashflow Type Selector Segment */}
                      <div className="flex flex-col gap-1 border-t border-zinc-950 pt-2">
                        <span className="text-[8.5px] font-black text-zinc-500 uppercase tracking-widest px-0.5">
                          Transaction Type
                        </span>
                        <div className="flex items-center gap-1">
                          {(["all", "deposit", "withdrawal"] as const).map(
                            (type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setTxTypeFilter(type)}
                                className={`px-2 py-1 text-[9px] font-black uppercase rounded-lg cursor-pointer transition-all ${
                                  txTypeFilter === type
                                    ? "bg-[#14cfb4]/10 text-[#14cfb4] border border-[#14cfb4]/25 shadow-sm"
                                    : "bg-transparent border border-transparent text-zinc-500 hover:text-zinc-350"
                                }`}
                              >
                                {type === "all" ? "All Ledger" : type + "s"}
                              </button>
                            ),
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Text search bar matching the manager view style precisely */}
                    <div className="relative w-full select-text">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-500">
                        <Search className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        value={txSearchQuery}
                        onChange={(e) => setTxSearchQuery(e.target.value)}
                        placeholder="Search by customer name or reference..."
                        className="w-full pl-10 pr-4 py-2.5 bg-black border border-zinc-850 hover:border-zinc-750 focus:border-[#14cfb4] text-xs text-zinc-100 font-bold placeholder-zinc-650 rounded-xl focus:outline-none transition-all font-sans"
                      />
                      {txSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setTxSearchQuery('')}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-500 hover:text-zinc-300 transition-colors text-[10px] font-bold uppercase tracking-wider cursor-pointer bg-transparent border-none"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* DYNAMIC AGGREGATE SUMMARY BANNER */}
                    {(() => {
                      const depositSum = processedTransactions
                        .filter((t) => t.type === "deposit")
                        .reduce((sum, t) => sum + t.amount, 0);

                      const withdrawalSum = processedTransactions
                        .filter((t) => t.type === "withdrawal")
                        .reduce((sum, t) => sum + t.amount, 0);

                      const netBalance = depositSum - withdrawalSum;

                      const uniqueCustomerIds = Array.from(
                        new Set(processedTransactions.map((t) => t.customerId)),
                      );
                      const matchingCustomersBalance = state.customers
                        .filter((c) => uniqueCustomerIds.includes(c.id))
                        .reduce((sum, c) => sum + c.balance, 0);

                      return (
                        <div className="bg-[#090b09] border border-zinc-950 rounded-[18px] p-3 flex flex-col gap-2 text-[10.5px] font-mono leading-none">
                          <div className="flex justify-between items-center pb-1.5 border-b border-zinc-950">
                            <span className="text-zinc-[500] font-sans font-bold text-[8.5px] uppercase tracking-wider">
                              Filtered Totals:
                            </span>
                            <span className="text-[#14cfb4] font-bold text-[9px] uppercase px-1.5 py-0.2 bg-[#14cfb4]/10 rounded border border-[#14cfb4]/15">
                              {txTimeframeFilter} · {txTypeFilter}
                            </span>
                          </div>

                          <div className="flex flex-col gap-2 pt-0.5">
                            <div className="flex justify-between items-center">
                              <span className="text-zinc-500">
                                Collected (Saved):
                              </span>
                              <span className="text-emerald-400 font-extrabold font-mono">
                                {formatNaira(depositSum)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-zinc-500">Withdrawn:</span>
                              <span className="text-rose-400 font-extrabold font-mono">
                                {formatNaira(withdrawalSum)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center border-t border-zinc-950 pt-2">
                              <span className="text-zinc-400 font-bold">
                                Net Balance Handled:
                              </span>
                              <span
                                className={`font-black font-mono ${netBalance >= 0 ? "text-[#14cfb4]" : "text-rose-400"}`}
                              >
                                {netBalance >= 0 ? "+" : ""}
                                {formatNaira(netBalance)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center border-t border-dashed border-zinc-950 pt-2 pb-0.5">
                              <span className="text-zinc-400 font-sans font-bold text-[9px] uppercase tracking-wider">
                                Total Customer Ledger Balances:
                              </span>
                              <span className="text-blue-400 font-black font-mono text-xs">
                                {formatNaira(matchingCustomersBalance)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Ledger Columns Header Row resembling user layout perfectly */}
                    <div className="grid grid-cols-3 text-[9.5px] font-black text-zinc-500 uppercase tracking-widest bg-black/25 border-b border-zinc-900/60 pb-2.5 px-3">
                      <span className="text-left font-sans">Tx Reference</span>
                      <span className="text-left font-sans">Customer Name</span>
                      <span className="text-right font-sans">Type</span>
                    </div>

                    {/* TRANSACTIONS RENDER LOOP */}
                    <div className="flex flex-col max-h-80 overflow-y-auto pr-1">
                      {processedTransactions.length === 0 ? (
                        <div className="text-center py-8 flex flex-col items-center gap-2">
                          <span className="text-xl">📭</span>
                          <p className="text-xs text-zinc-500 font-semibold">
                            No records matched active search filter.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setTxSearchQuery("");
                              setTxTimeframeFilter("all");
                              setTxTypeFilter("all");
                            }}
                            className="text-[10px] text-[#14cfb4] font-bold underline bg-transparent border-none cursor-pointer"
                          >
                            Reset filters
                          </button>
                        </div>
                      ) : (
                        processedTransactions.map((tx, index) => {
                          const matchedCustomer = state.customers.find(
                            (c) => c.id === tx.customerId,
                          );
                          const customerBalance = matchedCustomer
                            ? matchedCustomer.balance
                            : 0;
                          const isDep = tx.type === "deposit";
                          return (
                            <div
                              key={`${tx.id}-${index}`}
                              onClick={() => setReceiptModalTx(tx)}
                              className="grid grid-cols-3 items-center py-3.5 px-3 border-b border-zinc-900/25 hover:bg-zinc-900/10 cursor-pointer transition-all group text-xs text-left"
                            >
                              {/* Reference */}
                              <span className="text-zinc-500 font-bold font-mono tracking-wider truncate">
                                {tx.reference || 'N/A'}
                              </span>

                              {/* Customer Name */}
                              <div className="flex flex-col min-w-0">
                                <span className="font-sans font-extrabold text-zinc-250 truncate group-hover:text-white transition-colors">
                                  {tx.customerName || 'CBP Member'}
                                </span>
                                <span className="text-[9px] text-[#14cfb4]/70 font-mono mt-0.5 truncate pr-0.5">
                                  ₦{tx.amount.toLocaleString()} • Bal: {formatNaira(customerBalance)}
                                </span>
                              </div>

                              {/* Type Badge */}
                              <div className="text-right overflow-hidden shrink-0">
                                {isDep ? (
                                  <span className="inline-flex items-center text-[8.5px] font-black uppercase tracking-wider text-[#14cfb4] bg-[#14cfb4]/10 border border-[#14cfb4]/20 px-2.5 py-0.5 rounded-md">
                                    DEPOSIT
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-[8.5px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-md">
                                    WITHDRAWAL
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ================= TRANSFER TAB (SECURE FUNDS TRANSFER) ================= */}
              {activeTab === "transfer" && (
                <div className="flex flex-col gap-6 animate-fade-in text-left">
                  {/* HEADER BANNER */}
                  <div className="bg-zinc-950 border border-zinc-900 rounded-[28px] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <Send className="w-5 h-5 text-[#14cfb4]" />
                        <span>Secure Transfer Hub</span>
                      </h2>
                      <p className="text-[11px] text-zinc-500 font-medium mt-1">
                        Instantly send money from your staff wallet balance to other staff accounts, customer savings, or central treasury.
                      </p>
                    </div>

                    {/* Quick Account Info */}
                    <div className="flex items-center gap-3 bg-[#0d0f0d] border border-zinc-900 px-4 py-2.5 rounded-2xl shrink-0">
                      <div className="w-8 h-8 rounded-lg bg-[#14cfb4]/10 border border-[#14cfb4]/20 flex items-center justify-center text-[#14cfb4]">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div className="text-left font-mono">
                        <span className="text-[9px] text-zinc-600 block uppercase font-bold tracking-wider leading-none">Your Wallet</span>
                        <span className="text-[14px] text-white font-black block leading-none mt-1">
                          {formatNaira(selectedStaff.walletBalance || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* MAIN CONTENT GRID */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* LEFT COLUMN: TRANSFER FORM (8 cols on desktop) */}
                    <div className="lg:col-span-7 flex flex-col gap-4">
                      <form onSubmit={handleTransferSubmit} className="bg-[#111311] border border-zinc-900 rounded-[28px] p-6 flex flex-col gap-5 relative overflow-hidden shadow-2xl font-sans">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#14cfb4]/5 rounded-full filter blur-xl pointer-events-none" />

                        {trfError && (
                          <div className="p-3.5 bg-rose-950/20 border border-rose-500/20 text-rose-500 text-xs font-bold rounded-2xl flex items-center gap-2">
                            <span className="shrink-0">⚠️</span>
                            <span>{trfError}</span>
                          </div>
                        )}

                        {trfSuccess && (
                          <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/20 text-[#2ecc71] text-xs font-bold rounded-2xl flex items-center gap-2">
                            <span className="shrink-0">✔️</span>
                            <span>{trfSuccess}</span>
                          </div>
                        )}

                        {/* Recipient Account Input */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                            Recipient Account Number / Referral Code
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              value={trfRecipientAcc}
                              onChange={(e) => setTrfRecipientAcc(e.target.value.replace(/\s+/g, ""))}
                              placeholder="e.g. 2000000001 (Staff) or 3000000001 (Customer)"
                              className="w-full bg-[#090a09] border border-zinc-900 hover:border-zinc-800 focus:border-[#14cfb4] text-white rounded-2xl px-4 py-3 text-[13px] font-bold outline-none font-mono transition-colors"
                            />
                            {trfRecipientAcc.trim().length >= 3 && (
                              <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                                {trfMatchedRecipient ? (
                                  <span className="text-[10px] uppercase font-black px-2 py-1 bg-emerald-950 text-[#14cfb4] border border-emerald-900 rounded-lg font-sans">
                                    Valid Account
                                  </span>
                                ) : (
                                  <span className="text-[10px] uppercase font-black px-2 py-1 bg-rose-955/20 text-rose-500 border border-rose-900 rounded-lg font-sans">
                                    Searching...
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Dynamic Matched Recipient Card */}
                          <AnimatePresence>
                            {trfMatchedRecipient && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="mt-2 p-4 bg-[#090a09] border border-zinc-900 rounded-2xl flex flex-col gap-4 shadow-inner text-left"
                              >
                                {/* Header line with badge */}
                                <div className="flex items-center justify-between border-b border-zinc-950 pb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                                      Recipient Verification Details
                                    </span>
                                  </div>
                                  <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                    trfMatchedRecipient.type === 'Customer Account' 
                                      ? 'text-[#14cfb4] bg-[#14cfb4]/10 border border-[#14cfb4]/20' 
                                      : 'text-indigo-400 bg-indigo-950/40 border border-indigo-900/30'
                                  }`}>
                                    {trfMatchedRecipient.type}
                                  </span>
                                </div>

                                {/* STAFF TARGET DETAILS */}
                                {trfMatchedRecipient.type === 'Staff Wallet' && (() => {
                                  const stf = trfMatchedRecipient.original as StaffMember;
                                  return (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                                      <div className="flex flex-col gap-1">
                                        <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-wider">Full Name of Staff</span>
                                        <span className="text-white font-extrabold text-[13px]">{stf.name}</span>
                                      </div>
                                      
                                      <div className="flex flex-col gap-1">
                                        <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-wider">Bank Name</span>
                                        <span className="text-[#14cfb4] font-bold text-[12px] flex items-center gap-1">
                                          🏦 {state.settings.partnerBankName || "Contribo Microfinance Bank"}
                                        </span>
                                      </div>

                                      <div className="flex flex-col gap-1">
                                        <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-wider">Bank Account Number</span>
                                        <span className="text-zinc-200 font-mono font-bold tracking-wider text-[12px]">
                                          {stf.accountNumber || "N/A"}
                                        </span>
                                      </div>

                                      <div className="flex flex-col gap-1">
                                        <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-wider">Role & Region</span>
                                        <span className="text-zinc-400 font-medium text-[11px]">
                                          {stf.role} • {stf.location || "HQ Core Zone"}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* CUSTOMER TARGET DETAILS */}
                                {trfMatchedRecipient.type === 'Customer Account' && (() => {
                                  const cust = trfMatchedRecipient.original as Customer;
                                  return (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                                      <div className="flex flex-col gap-1">
                                        <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-wider">Customer Full Name</span>
                                        <span className="text-white font-extrabold text-[13px]">{cust.name}</span>
                                      </div>

                                      <div className="flex flex-col gap-1">
                                        <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-wider">Current Savings Balance</span>
                                        <span className="text-[#14cfb4] font-black text-[13px] font-mono">
                                          {formatNaira(cust.balance || 0)}
                                        </span>
                                      </div>

                                      <div className="flex flex-col gap-1">
                                        <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-wider">Savings Account Number</span>
                                        <span className="text-zinc-200 font-mono font-bold tracking-wider text-[12px]">
                                          {cust.accountNumber || "N/A"}
                                        </span>
                                      </div>

                                      {cust.contributionAccountNumber && (
                                        <div className="flex flex-col gap-1">
                                          <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-wider">Contribution Acc No</span>
                                          <span className="text-zinc-400 font-mono text-[11px]">
                                            {cust.contributionAccountNumber}
                                          </span>
                                        </div>
                                      )}

                                      <div className="flex flex-col gap-1">
                                        <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-wider">Phone Contact</span>
                                        <span className="text-zinc-300 font-medium text-[11px] font-mono">
                                          {cust.phoneNumber || "N/A"}
                                        </span>
                                      </div>

                                      <div className="flex flex-col gap-1">
                                        <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-wider">Status & Zone</span>
                                        <span className="text-zinc-400 font-medium text-[11px] flex items-center gap-1.5">
                                          <span className={`w-1.5 h-1.5 rounded-full ${cust.status === 'active' ? 'bg-[#14cfb4]' : 'bg-zinc-600'}`} />
                                          <span className="uppercase text-[10px] font-bold">{cust.status}</span>
                                          <span>• {cust.location || "Lagos West"}</span>
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Amount & Presets */}
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                              Amount to Send (NGN)
                            </label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-zinc-500 text-[13px] font-bold">
                                ₦
                              </span>
                              <input
                                type="number"
                                required
                                value={trfAmount}
                                onChange={(e) => setTrfAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full bg-[#090a09] border border-zinc-900 hover:border-zinc-800 focus:border-[#14cfb4] text-white rounded-2xl pl-8 pr-4 py-3 text-[13px] font-black outline-none font-mono transition-colors"
                              />
                            </div>
                          </div>

                          {/* Quick Amount Presets */}
                          <div className="flex gap-2 flex-wrap">
                            {["1000", "2000", "5000", "10000", "20000"].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setTrfAmount(preset)}
                                className="px-3 py-1.5 bg-[#0d0f0d] hover:bg-zinc-900 border border-zinc-900 text-zinc-400 hover:text-white text-[10.5px] font-bold font-mono rounded-xl cursor-pointer active:scale-95 transition-all"
                              >
                                ₦{parseInt(preset).toLocaleString()}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Security PIN */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                            Enter 4-Digit Security PIN
                          </label>
                          <input
                            type="password"
                            required
                            maxLength={4}
                            value={trfPin}
                            onChange={(e) => setTrfPin(e.target.value.replace(/[^0-9]/g, ""))}
                            placeholder="••••"
                            className="w-full bg-[#090a09] border border-zinc-900 hover:border-zinc-800 focus:border-[#14cfb4] text-white rounded-2xl px-4 py-3 text-[13px] tracking-[6px] text-center font-bold outline-none font-mono transition-colors"
                          />
                        </div>

                        {/* Submit Button */}
                        <button
                          type="submit"
                          disabled={isTrfSubmitting || !trfMatchedRecipient}
                          className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest cursor-pointer transition-all active:scale-[0.98] ${
                            isTrfSubmitting 
                              ? "bg-zinc-800 text-zinc-650"
                              : trfMatchedRecipient
                                ? "bg-[#14cfb4] hover:bg-[#0da68d] text-[#090a09] shadow-lg shadow-[#14cfb4]/10"
                                : "bg-zinc-900 text-zinc-650 cursor-not-allowed border border-zinc-950"
                          }`}
                        >
                          {isTrfSubmitting ? (
                            <span className="flex items-center justify-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Authorizing Transfer...</span>
                            </span>
                          ) : (
                            <span>Initiate Instant Transfer</span>
                          )}
                        </button>
                      </form>
                    </div>

                    {/* RIGHT COLUMN: WALLET INFO & TRANSFER POLICY (5 cols) */}
                    <div className="lg:col-span-5 flex flex-col gap-4">
                      {/* Detailed Balance Breakdowns */}
                      <div className="bg-[#111311] border border-zinc-900 rounded-[28px] p-5 flex flex-col gap-4">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block border-b border-zinc-900 pb-2">
                          📋 Financial Details
                        </span>

                        <div className="flex flex-col gap-3 font-mono">
                          <div className="flex items-center justify-between py-1 border-b border-zinc-900/40">
                            <span className="text-xs text-zinc-500">Staff Account ID</span>
                            <span className="text-xs text-zinc-300 font-bold">{selectedStaff.id}</span>
                          </div>

                          <div className="flex items-center justify-between py-1 border-b border-zinc-900/40">
                            <span className="text-xs text-zinc-500">NUBAN Account</span>
                            <span className="text-xs text-zinc-300 font-bold">{selectedStaff.accountNumber || "N/A"}</span>
                          </div>

                          <div className="flex items-center justify-between py-1 border-b border-zinc-900/40">
                            <span className="text-xs text-zinc-500">Direct Referral Code</span>
                            <span className="text-xs text-[#14cfb4] font-black uppercase">{selectedStaff.code}</span>
                          </div>

                          <div className="flex items-center justify-between py-1">
                            <span className="text-xs text-zinc-500">Maximum Single Limit</span>
                            <span className="text-xs text-amber-500 font-bold">₦1,000,000.00</span>
                          </div>
                        </div>
                      </div>

                      {/* Policy and instructions */}
                      <div className="bg-[#111311] border border-zinc-900 rounded-[28px] p-5 flex flex-col gap-3 font-sans">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block border-b border-zinc-900 pb-2 font-sans">
                          💡 Transfer Directions
                        </span>
                        <ul className="text-[10px] text-zinc-400 flex flex-col gap-2 list-disc pl-4 leading-relaxed">
                          <li>To transfer funds, type the correct 10-digit NUBAN bank account number of the recipient.</li>
                          <li>The system will automatically find and match the account name and show a <span className="text-[#14cfb4] font-bold">Matched Recipient</span> card below the input.</li>
                          <li>Ensure the matched name corresponds to who you intend to credit.</li>
                          <li>Your 4-digit security PIN is required to authorize and finalize the ledger entry instantly.</li>
                          <li>All transfers are final, immutable, and logged into the secure audit ledger for manager review.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= ANNOUNCEMENTS TAB (BROADCAST REQUESTS) ================= */}
              {activeTab === "announcements" && (
                <div className="animate-fade-in">
                  <BroadcastTab
                    state={state}
                    userRole={selectedStaff.role as any || 'Collector'}
                    onDirectBroadcast={onDirectBroadcast || (async () => {})}
                    onRequestBroadcast={onRequestBroadcast || (async () => {})}
                    onApproveBroadcast={onApproveBroadcast || (async () => {})}
                    onDeclineBroadcast={onDeclineBroadcast || (async () => {})}
                  />
                </div>
              )}
            </div>

            {/* FAB Component for Staff Portal Quick Actions matching screenshot exactly */}
            <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50 flex flex-col items-end gap-3 select-none">
              <AnimatePresence>
                {isQuickActionsOpen && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 15 }}
                    className="flex flex-col items-end gap-2.5"
                  >
                    <button
                      onClick={() => {
                        setActiveTab("collect");
                        setIsQuickActionsOpen(false);
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#14cfb4] text-slate-950 font-black text-xs uppercase tracking-wide shadow-lg hover:opacity-90 active:scale-95 transition-all border border-white/20 whitespace-nowrap cursor-pointer"
                    >
                      <Coins className="w-4 h-4" />
                      ⚡ Quick Collect / Post
                    </button>
                    
                    <button
                      onClick={() => {
                        setActiveTab("customers");
                        setShowEnrollModal(true);
                        setIsQuickActionsOpen(false);
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#b592ff] text-slate-950 font-black text-xs uppercase tracking-wide shadow-lg hover:opacity-90 active:scale-95 transition-all border border-white/20 whitespace-nowrap cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      👤 Enroll New Customer
                    </button>

                    <button
                      onClick={() => {
                        setShowBroadcastModal(true);
                        setIsQuickActionsOpen(false);
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#eed693] text-slate-950 font-black text-xs uppercase tracking-wide shadow-lg hover:opacity-90 active:scale-95 transition-all border border-white/20 whitespace-nowrap cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      📢 Send Broadcast Reminder
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-all outline-none border-2 border-white/10 cursor-pointer ${
                  isQuickActionsOpen 
                    ? 'bg-rose-500 hover:bg-rose-600 text-white' 
                    : 'bg-[#14cfb4] text-slate-950 hover:bg-[#14cfb4]/90 shadow-[#14cfb4]/20 shadow-lg'
                }`}
                title="Toggle Quick Actions Menu"
              >
                <Plus className={`w-7 h-7 font-black transition-transform duration-300 ${isQuickActionsOpen ? 'rotate-45' : ''}`} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= EXTRA HIGH QUALITY INTERACTIVE PRINT THERMAL RECEIPT DRAWER MODAL ================= */}
      <AnimatePresence>
        {receiptModalTx && (
          <div 
            className="fixed inset-0 bg-black/85 backdrop-blur-xs z-50 overflow-y-auto flex justify-center items-start p-4 py-8 md:py-16 cursor-pointer"
            onClick={() => setReceiptModalTx(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white text-zinc-900 max-w-sm w-full rounded-[28px] p-6.5 flex flex-col items-center shadow-[0_25px_65px_rgba(0,0,0,0.85)] border border-zinc-200 relative mt-4 md:mt-8 select-text"
            >
              {/* Premium Top Close/Back Action Button */}
              <button
                onClick={() => setReceiptModalTx(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-705 hover:text-zinc-950 flex items-center justify-center border border-zinc-200 text-sm font-black transition-all cursor-pointer z-20 shadow-xs active:scale-90"
                title="Back to Dashboard"
              >
                ✕
              </button>

              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 mt-1 shadow-inner">
                <Printer className="w-6 h-6 animate-pulse" />
              </div>

              {/* Thermal paper envelope */}
              <div className="w-full flex flex-col text-center border-b border-dashed border-zinc-300 pb-3">
                <h3 className="text-sm font-black tracking-wider uppercase font-sans text-zinc-800">
                  CONTRIBOPAY RECEIPT
                </h3>
                <p className="text-[10px] text-zinc-550 font-black uppercase mt-0.5">
                  Northern Division Office
                </p>
                <div className="mt-1.5 inline-flex self-center items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[8.5px] font-mono text-zinc-600 font-bold uppercase tracking-wider">SECURE DIGITAL LEDGER</span>
                </div>
              </div>

              <div className="w-full flex flex-col gap-2.5 py-4 text-xs font-mono text-zinc-700">
                <div className="flex justify-between">
                  <span className="text-zinc-500 uppercase">Ref No:</span>
                  <span className="font-extrabold text-zinc-900">
                    {receiptModalTx.reference || "CBP-D3849"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 uppercase">Timestamp:</span>
                  <span className="font-semibold text-zinc-800">
                    {new Date(receiptModalTx.timestamp).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </div>
                <div className="flex justify-between border-t border-zinc-100 pt-2.5">
                  <span className="text-zinc-500 uppercase">Saver Name:</span>
                  <span className="font-black uppercase text-zinc-900">
                    {receiptModalTx.customerName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 uppercase">Tx Mode:</span>
                  <span className="font-bold text-zinc-855">CASH PAYMENT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 uppercase font-mono">Status:</span>
                  {receiptModalTx.status === "pending" ? (
                    <span className="bg-amber-100 text-amber-850 font-black px-2 py-0.5 text-[9px] rounded-full uppercase flex items-center gap-1.5 animate-pulse border border-amber-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Pending Approval
                    </span>
                  ) : receiptModalTx.status === "rejected" ? (
                    <span className="bg-rose-150 text-rose-800 font-black px-2 py-0.5 text-[9px] rounded-full uppercase border border-rose-200">
                      ❌ Rejected
                    </span>
                  ) : (
                    <span className="bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 text-[9px] rounded-full uppercase border border-emerald-200 inline-flex items-center gap-1">
                      ✓ Approved
                    </span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500 uppercase">Collector:</span>
                  <span className="font-semibold text-zinc-850">{selectedStaff.name} ({selectedStaff.code})</span>
                </div>

                <div className="flex justify-between border-t border-dashed border-zinc-300 pt-3 text-xs mt-1">
                  <span className="font-black text-zinc-650 uppercase">
                    {receiptModalTx.type === "deposit" ? "SAVINGS CONTRIBUTION" : "PAYOUT DISBURSED"}
                  </span>
                  <div className="flex flex-col items-end">
                    <span className="font-black text-[#14cfb4] text-lg">
                      ₦{receiptModalTx.amount.toLocaleString()}
                    </span>
                    {receiptModalTx.profitAmount && (
                      <span className="text-[9px] font-black text-amber-500 uppercase font-mono tracking-widest mt-0.5">
                        +{receiptModalTx.profitAmount.toLocaleString()} PROFIT APPLIED
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Linked Bank Details display (Shown ONLY for withdrawals) */}
              {receiptModalTx.type === "withdrawal" && (() => {
                  const customer = state.customers.find(c => c.id === receiptModalTx.customerId);
                  const acctNum = receiptModalTx.payoutAccountNumber || customer?.payoutAccountNumber;
                  const acctName = receiptModalTx.payoutAccountName || customer?.payoutAccountName;
                  const bankName = receiptModalTx.payoutBankName || customer?.payoutBankName;
                  
                  if (acctNum) {
                    return (
                      <div className="w-full mt-3 flex flex-col gap-1 p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-left">
                        <span className="text-[8.5px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                          <span>🏦 LINKED PAYOUT ACCOUNT</span>
                        </span>
                        <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-zinc-200/80">
                          <div className="flex flex-col truncate pr-2">
                            <span className="text-[10px] font-bold text-zinc-800 truncate">
                              {acctName || receiptModalTx.customerName || 'Customer'}
                            </span>
                            <span className="text-[9px] text-zinc-500 truncate">
                              {bankName || "Default Bank"}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono font-black text-zinc-800 px-2.5 py-1.5 bg-zinc-100 rounded-md border border-zinc-200 shrink-0">
                            {acctNum}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div className="w-full mt-3 flex flex-col items-center justify-center gap-1 p-2.5 border border-dashed border-rose-200 bg-rose-50/50 rounded-xl text-left">
                      <span className="text-[9.5px] font-black text-rose-500 w-full mb-0.5">
                        ⚠️ NO LINKED BANK ACCOUNT
                      </span>
                      <span className="text-[8.5px] text-zinc-500 text-left w-full leading-normal">
                        Customer has not linked an account. Payout must be disbursed as cash.
                      </span>
                    </div>
                  );
              })()}

              {/* Barcode representation */}
              <div className="w-full mt-3.5 bg-zinc-50 py-2 rounded-xl border border-zinc-150 flex flex-col items-center gap-1 select-none">
                <div className="flex gap-[1.5px] h-6 opacity-65">
                  {[...Array(28)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-zinc-800"
                      style={{ width: i % 4 === 0 ? "3px" : i % 3 === 0 ? "2px" : "1px" }}
                    />
                  ))}
                </div>
                <span className="text-[8.5px] font-mono text-zinc-450 font-bold tracking-widest uppercase">
                  CBP-TX-{receiptModalTx.id.toUpperCase().slice(0, 10)}
                </span>
              </div>

              {/* Client Face & ID verification photos for staff audit */}
              {(receiptModalTx.withdrawalPhoto || receiptModalTx.cardPhoto) && (
                <div className="w-full mt-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl p-3 flex flex-col items-center gap-2">
                  <div className="flex items-center gap-1.5 self-start text-[10px] font-black text-zinc-500 uppercase tracking-wider pl-0.5">
                    <span>🔐 IDENTITY PROOF CAPTURES</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 w-full">
                    {receiptModalTx.withdrawalPhoto && (
                      <div className="flex flex-col gap-1 items-center bg-white p-1.5 rounded-xl border border-zinc-200">
                        <span className="text-[7.5px] font-black text-zinc-500 uppercase tracking-wider">SAVER FACE</span>
                        <div className="aspect-[4/3] w-full max-h-[85px] rounded-lg overflow-hidden border border-zinc-100 relative bg-zinc-950">
                          <img
                            src={receiptModalTx.withdrawalPhoto}
                            className="w-full h-full object-cover"
                            alt="Face Capture"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>
                    )}
                    {receiptModalTx.cardPhoto && (
                      <div className="flex flex-col gap-1 items-center bg-white p-1.5 rounded-xl border border-zinc-200">
                        <span className="text-[7.5px] font-black text-zinc-500 uppercase tracking-wider">SAVER CARD</span>
                        <div className="aspect-[4/3] w-full max-h-[85px] rounded-lg overflow-hidden border border-zinc-100 relative bg-zinc-950">
                          <img
                            src={receiptModalTx.cardPhoto}
                            className="w-full h-full object-cover"
                            alt="ID Card"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {receiptModalTx.status === "pending" && (() => {
                const customerForBal = state.customers.find(c => c.id === receiptModalTx.customerId);
                const currentBalance = customerForBal ? customerForBal.balance : 0;
                const hasSufficient = currentBalance >= receiptModalTx.amount;

                return (
                  <div className={`w-full mt-3.5 flex flex-col gap-2.5 p-3.5 border rounded-2xl text-left ${
                    hasSufficient ? 'bg-amber-50/70 border-amber-200 text-amber-950' : 'bg-rose-50/90 border-rose-200 text-rose-950 shadow-xs'
                  }`}>
                    <div className="flex gap-2 items-start">
                      {hasSufficient ? (
                        <ShieldAlert className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4.5 h-4.5 text-rose-600 shrink-0 mt-0.5 animate-bounce" />
                      )}
                      <div className="flex flex-col">
                        <span className="text-xs font-black tracking-tight leading-tight uppercase font-sans">
                          {hasSufficient ? "Authorize Payout" : "SAFETY BLOCK: Deficit Detected"}
                        </span>
                        <span className="text-[9.5px] font-semibold mt-0.5 leading-normal text-zinc-650 font-sans">
                          {hasSufficient 
                            ? "Review Saver identity portraits above. Click approved below to disburse Cash instantly."
                            : `This saver only has ₦${currentBalance.toLocaleString()} left. Payout requires ₦${receiptModalTx.amount.toLocaleString()}.`}
                        </span>
                      </div>
                    </div>
                    
                    {hasSufficient && receiptModalTx.type === "withdrawal" && (
                      <div className="w-full mt-2 mb-1 p-2.5 bg-zinc-50 rounded-xl border border-zinc-200">
                        <label className="text-[9px] font-black text-amber-600 tracking-widest mb-1.5 flex items-center justify-between">
                          <span>🧾 TRANSFER RECEIPT</span>
                          <span className="text-[8px] font-black bg-zinc-200 text-zinc-500 px-1.5 rounded uppercase">Optional</span>
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          className="w-full text-[9px] text-zinc-500 file:mr-2 file:py-1.5 file:px-2.5 file:rounded-md file:border-0 file:font-black file:bg-zinc-200 file:text-zinc-800 hover:file:bg-zinc-300 transition-colors"
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
                          <div className="mt-2 w-full rounded-lg overflow-hidden border border-zinc-200 p-1 bg-white relative">
                            <img src={authReceiptPhoto} alt="Receipt preview" className="w-full h-16 object-cover rounded-md" />
                            <button
                              onClick={() => setAuthReceiptPhoto("")}
                              className="absolute top-2 right-2 bg-rose-500 text-white p-1 rounded-full hover:bg-rose-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      disabled={!hasSufficient}
                      onClick={() => {
                        if (onApproveTransaction) {
                          onApproveTransaction(receiptModalTx.id, authReceiptPhoto || undefined);
                          setReceiptModalTx({ ...receiptModalTx, status: "approved" });
                        }
                      }}
                      className={`w-full py-3.5 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md mt-1 cursor-pointer active:scale-95 ${
                        hasSufficient 
                          ? 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-600/15' 
                          : 'bg-zinc-300 border border-zinc-200 text-zinc-400 cursor-not-allowed opacity-50 shadow-none'
                      }`}
                    >
                      {hasSufficient ? (
                        <>
                          <Check className="w-4 h-4 text-white font-black" />
                          <span>Approve & Disburse Payout</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-rose-500" />
                          <span>Strict Limit Blocked</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })()}

              {receiptModalTx.status === "approved" && (() => {
                const customer = state.customers.find(
                  (c) => c.id === receiptModalTx.customerId,
                );
                const relevantWaAlert = state.alerts?.find(
                  (a) => a.txId === receiptModalTx.id && a.type === "whatsapp",
                );
                const customMessage =
                  relevantWaAlert?.message ||
                  (receiptModalTx.type === "deposit"
                    ? `*ContriboPay HQ - Deposit Receipt*\nCustomer: ${receiptModalTx.customerName}\nAmount: ₦${receiptModalTx.amount.toLocaleString()}\nRef: ${receiptModalTx.reference}\nStatus: Completed ✅`
                    : `*ContriboPay HQ - Withdrawal Payout Receipt*\nCustomer: ${receiptModalTx.customerName}\nAmount: ₦${receiptModalTx.amount.toLocaleString()}${receiptModalTx.profitAmount ? `\nProfit Applied: ₦${receiptModalTx.profitAmount.toLocaleString()}` : ''}\nRef: ${receiptModalTx.reference}\nStatus: Paid Out ✅`);

                return (
                  <div className="w-full mt-3.5 flex flex-col gap-2 pt-3 border-t border-dashed border-zinc-200 text-left">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-zinc-500 font-bold">💬 AUTO SMS ALERT:</span>
                      <span className="text-emerald-600 font-extrabold flex items-center gap-0.5">
                        <span>✓</span> DELIVERED
                      </span>
                    </div>

                    <a
                      href={`https://api.whatsapp.com/send?phone=${customer?.phoneNumber ? customer.phoneNumber.replace(/[^0-9+]/g, "") : ""}&text=${encodeURIComponent(customMessage)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-505 text-white font-black text-[11px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs text-center active:scale-95 mt-1"
                    >
                      <span>💬 Share WhatsApp Receipt</span>
                    </a>
                  </div>
                );
              })()}

              <div className="w-full flex gap-2.5 mt-4">
                <button
                  onClick={() => setReceiptModalTx(null)}
                  className="flex-1 py-3 bg-[#0d0e0d] hover:bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center active:scale-95"
                >
                  Dismiss
                </button>
                {receiptModalTx.status === "pending" && (
                  <button
                    onClick={() => setReceiptModalTx(null)}
                    className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-820 hover:text-zinc-950 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center active:scale-95"
                  >
                    Go Back
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= PUBLIC WHATSAPP REMINDER ENGINE BROADCAST OVERLAY ================= */}
      <AnimatePresence>
        {showBroadcastModal && (
          <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="bg-[#111311] border border-zinc-900 rounded-3xl p-6.5 max-w-xs w-full flex flex-col gap-4 text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-950/25 border border-emerald-900/40 text-[#14cfb4] flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 animate-pulse" />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-sm font-black text-white uppercase leading-none">
                    Reminder Broadcaster
                  </h3>
                  <span className="text-[10px] text-zinc-500 mt-1 font-semibold uppercase">
                    SMS & WhatsApp Gateway
                  </span>
                </div>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed mt-1">
                Trigger simulated daily savings reminders, deposit instructions,
                and targets report alerts directly to your account subscriber
                contacts list automatically via Contribo Gateway.
              </p>

              {broadcastProgress >= 0 ? (
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex justify-between items-center text-[10px] font-bold text-[#14cfb4] uppercase font-mono">
                    <span>Sending Broadcast alerts...</span>
                    <span>{broadcastProgress}%</span>
                  </div>
                  <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden border border-zinc-950">
                    <motion.div
                      className="bg-[#14cfb4] h-full"
                      style={{ width: `${broadcastProgress}%` }}
                    />
                  </div>

                  <div className="text-[10px] mt-1 text-zinc-500 font-semibold italic">
                    {broadcastProgress < 40 &&
                      "Dispatching notifications to Amina Bello..."}
                    {broadcastProgress >= 40 &&
                      broadcastProgress < 80 &&
                      "Delivering logs links to Musa Ibrahim..."}
                    {broadcastProgress >= 80 &&
                      broadcastProgress < 100 &&
                      "Alerting Fatima Musa portfolio status..."}
                    {broadcastProgress === 100 &&
                      "🎯 5/5 reminders dispatched and delivered completely!"}
                  </div>
                </div>
              ) : (
                <div className="w-full pt-1">
                  <button
                    onClick={runSimulatedBroadcast}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-[#0da68d] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-97 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Send Broadcast Alert</span>
                  </button>
                </div>
              )}

              {broadcastProgress === 100 && (
                <button
                  onClick={() => {
                    setShowBroadcastModal(false);
                    setBroadcastProgress(-1);
                  }}
                  className="w-full py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 font-extrabold text-[10.5px] uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  Close Gateway Panel
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= COGNITIVE CUSTOMER IDENTIFICATION CARD (STAFF LIMITED PERMISSION OVERLAY) ================= */}
      <AnimatePresence>
        {viewingCustomer && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-xs z-55 flex items-center justify-center p-4">
            {/* Click backdrop to discard */}
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={() => setViewingCustomer(null)}
            />

            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 15 }}
              className="bg-[#0b0d0c] border border-zinc-900 rounded-[36px] p-6 max-h-[90vh] max-w-sm w-full flex flex-col text-center relative z-50 shadow-[0_24px_60px_rgba(0,0,0,0.95)] overflow-hidden"
            >
              {/* Back & Exit Buttons */}
              <div className="absolute top-5 left-5 right-5 flex justify-between items-center z-10">
                <button
                  onClick={() => setViewingCustomer(null)}
                  className="px-3 py-1.5 rounded-xl bg-[#111311] flex items-center justify-center text-zinc-300 hover:text-white border border-zinc-700 text-[10px] cursor-pointer font-bold transition-all hover:scale-105 active:scale-95 uppercase tracking-wider"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setViewingCustomer(null)}
                  className="px-3 py-1.5 rounded-xl bg-orange-950/20 flex items-center justify-center text-orange-500 hover:text-white border border-orange-900/50 text-[10px] cursor-pointer font-bold transition-all hover:scale-105 active:scale-95 uppercase tracking-wider"
                >
                  ✕ Exit
                </button>
              </div>

              {/* Scrollable Modal Body Container to prevent overflow on mobile screens */}
              <div className="flex-1 overflow-y-auto pr-1 mt-10 flex flex-col gap-5 text-center scrollbar-thin scrollbar-thumb-zinc-850 scrollbar-track-transparent">
                {/* ID Badge Header Card */}
                <div className="flex flex-col items-center gap-1">
                <span className="px-2.5 py-0.8 bg-amber-500/10 border border-amber-500/20 text-[#facc15] font-sans font-black text-[9px] uppercase tracking-widest rounded-full">
                  🛡️ Saver ID Verification Card
                </span>
                <span className="text-[9.5px] font-mono text-zinc-550 uppercase tracking-wider mt-1 block">
                  Contribo Secure Ledger Identity
                </span>
              </div>

              {/* THE BIG SIZE MIDDLE PHOTO CENTERSTAGE */}
              <div className="my-2.5 flex flex-col items-center">
                <div className="relative group">
                  <div className="w-72 h-72 bg-zinc-950 border-2 border-[#14cfb4]/35 p-1.5 rounded-[28px] flex items-center justify-center shadow-[0_0_30px_rgba(20,207,180,0.2)] overflow-hidden transition-all group-hover:border-[#14cfb4]">
                    {viewingCustomer.profileImage ? (
                      <img
                        src={viewingCustomer.profileImage}
                        className="w-full h-full object-cover rounded-[22px]"
                        alt="Saver Identity Portrait"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div
                        className={`w-full h-full rounded-[22px] bg-gradient-to-tr ${getCustomerAvatarGradient(viewingCustomer.name)} flex items-center justify-center font-black text-4xl tracking-wide shadow-inner`}
                      >
                        {viewingCustomer.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Micro chip indicator simulation like credit card standard to look professional */}
                  <div className="absolute bottom-3.5 right-3.5 bg-[#d4af37] border border-amber-600/50 w-6 h-5 rounded-md flex flex-col gap-0.5 p-0.5 shadow-md justify-between">
                    <div className="flex justify-between w-full h-[2px]">
                      <div className="bg-zinc-800/15 w-[5px] h-[2px]" />
                      <div className="bg-zinc-800/15 w-[5px] h-[2px]" />
                    </div>
                    <div className="bg-zinc-850/15 w-full h-[1.5px]" />
                    <div className="flex justify-between w-full h-[2px]">
                      <div className="bg-zinc-800/15 w-[5px] h-[2px]" />
                      <div className="bg-zinc-800/15 w-[5px] h-[2px]" />
                    </div>
                  </div>
                </div>

                {/* Secure Badge label exactly matching screenshot */}
                <div className="mt-3.5 px-3 py-1 bg-[#13372f]/35 border border-[#14cfb4]/25 text-[#14cfb4] font-sans font-black text-[9.5px] uppercase tracking-widest rounded-full leading-none flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#14cfb4] animate-pulse" />
                  CUSTOMER PHOTO ID
                </div>

                {/* Secure File Photo Selection and Capture mechanism */}
                <button
                  type="button"
                  onClick={() => viewingCustomerFileRef.current?.click()}
                  className="mt-3.5 px-3.5 py-2 bg-[#14cfb4]/10 hover:bg-[#14cfb4]/20 border border-[#14cfb4]/25 text-[#14cfb4] font-black uppercase text-[9px] tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                  title="Assign face picture for visual verification"
                >
                  📸 Capture / Assign Photo
                </button>
                <input
                  type="file"
                  accept="image/*"
                  ref={viewingCustomerFileRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && onUpdateCustomer) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === "string") {
                          onUpdateCustomer(viewingCustomer.id, {
                            profileImage: reader.result,
                          });
                          setViewingCustomer((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  profileImage: reader.result as string,
                                }
                              : null,
                          );
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />
              </div>

              {/* Limited read-only details micro-bento grid */}
              <div className="flex flex-col gap-3 text-left">
                {/* Full name of contributor */}
                <div className="text-center pb-2.5 border-b border-zinc-950">
                  <h3 className="text-lg font-black text-white leading-tight uppercase tracking-tight">
                    {viewingCustomer.name}
                  </h3>
                  <div className="flex items-center justify-center gap-2 mt-1.5">
                    <span className="font-mono text-xs font-bold text-zinc-400">
                      {viewingCustomer.phoneNumber}
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest bg-emerald-950/20 px-2 py-0.2 rounded border border-emerald-900/10">
                      verified saver
                    </span>
                  </div>
                </div>

                {/* Profile attributes list (ReadOnly metadata - no authorization to modify) */}
                <div className="grid grid-cols-2 gap-2.5 font-sans">
                  <div className="p-2.5 bg-[#111311] border border-zinc-950 rounded-xl flex flex-col justify-between">
                    <span className="text-[8.5px] font-black text-zinc-550 uppercase tracking-wider">
                      LEDGER BALANCE
                    </span>
                    <span className="text-xs font-black text-[#14cfb4] tracking-tight mt-1 font-mono">
                      ₦
                      {(viewingCustomer.balance || 0).toLocaleString("en-US", {
                        minimumFractionDigits: 1,
                      })}
                    </span>
                  </div>

                  <div className="p-2.5 bg-[#111311] border border-zinc-950 rounded-xl flex flex-col justify-between">
                    <span className="text-[8.5px] font-black text-zinc-550 uppercase tracking-wider">
                      SAVINGS GOAL
                    </span>
                    <span className="text-xs font-bold text-zinc-350 tracking-tight mt-1 font-mono">
                      ₦
                      {(viewingCustomer.targetSavings || 50000).toLocaleString(
                        "en-US",
                      )}{" "}
                      / mo
                    </span>
                  </div>

                  <div className="p-2.5 bg-[#111311] border border-zinc-950 rounded-xl flex flex-col justify-between">
                    <span className="text-[8.5px] font-black text-zinc-550 uppercase tracking-wider">
                      REGIONAL ZONE
                    </span>
                    <span className="text-[10px] font-black text-white truncate mt-1">
                      {viewingCustomer.location || "Kaduna North"}
                    </span>
                  </div>

                  <div className="p-2.5 bg-[#111311] border border-zinc-950 rounded-xl flex flex-col justify-between">
                    <span className="text-[8.5px] font-black text-zinc-550 uppercase tracking-wider">
                      MEMBER JOINED
                    </span>
                    <span className="text-[10px] font-bold text-zinc-400 mt-1">
                      {viewingCustomer.joinedDate || "June 2026"}
                    </span>
                  </div>
                </div>

                {/* Contributor's Physical home street address */}
                <div className="p-3 bg-[#111311] border border-zinc-950 rounded-xl flex flex-col gap-1">
                  <span className="text-[8.5px] font-black text-zinc-550 uppercase tracking-widest">
                    REGISTERED HOME ADDRESS
                  </span>
                  <p className="text-[10px] font-semibold text-zinc-300 leading-normal">
                    {viewingCustomer.address ||
                      "No. 5 Ahmadu Bello Way, Kaduna Kaduna"}
                  </p>
                </div>

                {/* Secure Customer PIN Reset & Recovery (Requested Feature) */}
                <div className="p-3 bg-[#111311] border border-zinc-950 rounded-xl flex flex-col gap-2 text-left">
                  <span className="text-[8.5px] font-black text-[#14cfb4] uppercase tracking-widest flex items-center gap-1">
                    🔑 SECURITY PIN RESET & RECOVERY
                  </span>
                  <p className="text-[9.5px] text-zinc-400 leading-normal">
                    If this customer forgot their login PIN, you are authorized to reset it. Enter a 4-digit numeric code or auto-generate one, then save and share the new PIN.
                  </p>

                  {staffLastResetPin && (
                    <div className="p-2 bg-[#14cfb4]/10 border border-[#14cfb4]/20 rounded-lg flex flex-col gap-1">
                      <span className="text-[9px] font-black text-[#14cfb4] uppercase tracking-wider">PIN Reset Succeeded!</span>
                      <p className="text-[9px] text-zinc-350">
                        Give this new PIN to the customer:
                      </p>
                      <span className="text-sm font-mono font-black text-white bg-zinc-950 px-2 py-1 rounded w-max border border-zinc-850 select-all tracking-wider">
                        {staffLastResetPin}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2 items-center mt-1">
                    <input
                      type="text"
                      maxLength={4}
                      value={staffPinResetValue}
                      onChange={(e) => setStaffPinResetValue(e.target.value.replace(/\D/g, ''))}
                      placeholder={viewingCustomer.pin ? `PIN Active (Current: ****)` : "Enter 4-digit PIN"}
                      className="flex-1 min-w-0 px-3 py-2 bg-[#060706] border border-zinc-900 rounded-lg text-xs font-mono font-bold text-zinc-200 focus:outline-none focus:border-[#14cfb4] placeholder-zinc-700"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
                        setStaffPinResetValue(randomPin);
                        showToast("Generated a secure random 4-digit PIN!", "info");
                      }}
                      className="px-2.5 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 font-bold text-[9px] uppercase tracking-wider rounded-lg transition-all active:scale-95 cursor-pointer shrink-0"
                    >
                      🎲 Gen
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const trimmedPin = staffPinResetValue.trim();
                        if (trimmedPin.length !== 4) {
                          showToast("PIN must be exactly 4 digits.", "error");
                          return;
                        }
                        if (onUpdateCustomer) {
                          onUpdateCustomer(viewingCustomer.id, { pin: trimmedPin });
                          setStaffLastResetPin(trimmedPin);
                          setStaffPinResetValue('');
                          showToast(`PIN changed successfully to ${trimmedPin}!`, "success");
                          // Update active local state representation for current drawer instance
                          setViewingCustomer(prev => prev ? { ...prev, pin: trimmedPin } : null);
                        }
                      }}
                      className="px-3 py-2 bg-[#14cfb4] hover:bg-[#12b9a1] text-black font-extrabold text-[9px] uppercase tracking-wider rounded-lg transition-all active:scale-95 cursor-pointer shrink-0"
                    >
                      Save PIN
                    </button>
                  </div>
                </div>

                {/* Direct Action Buttons for Staff to Deposit/Withdraw right from Profile */}
                <div className="grid grid-cols-2 gap-2.5 mt-1">
                  <button
                    onClick={() => {
                      const c = viewingCustomer;
                      setViewingCustomer(null);
                      setCollectingCustomer(c);
                      setCollectTxType("deposit");
                      setCollectAmount("2000");
                      setActiveTab("collect");
                    }}
                    className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <PlusSquare className="w-3.5 h-3.5" />
                    <span>Deposit Funds</span>
                  </button>
                  <button
                    onClick={() => {
                      const c = viewingCustomer;
                      setViewingCustomer(null);
                      setCollectingCustomer(c);
                      setCollectTxType("withdrawal");
                      setCollectAmount("2000");
                      setActiveTab("collect");
                    }}
                    className="py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-[11px] uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>Withdrawal Payout</span>
                  </button>
                </div>

                <button
                  onClick={() => setViewingCustomer(null)}
                  className="w-full py-3.5 bg-transparent hover:bg-zinc-950 border border-zinc-900 hover:border-zinc-850 text-zinc-400 hover:text-zinc-200 font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center mt-1"
                >
                  Return to Customer List
                </button>
              </div>

              {/* Permissions & Security watermark */}
              <div className="pt-2.5 border-t border-zinc-950 font-sans text-center leading-normal">
                <p className="text-[9.5px] text-zinc-550 font-medium">
                  🔒{" "}
                  <span className="font-extrabold text-zinc-400">
                    STAFF READ-ONLY LOCK:
                  </span>{" "}
                  Balance amendments, secure PIN settings, or account transfers
                  require direct Supervisor / Chairman authentication.
                </p>
              </div>

              {/* Explicit visible return/exit button at the bottom of the details file */}
              <button
                type="button"
                onClick={() => setViewingCustomer(null)}
                className="w-full py-3.5 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-900 hover:border-[#14cfb4]/20 rounded-xl text-[10.5px] font-black text-zinc-300 hover:text-[#14cfb4] focus:text-[#14cfb4] uppercase tracking-wider cursor-pointer transition-all active:scale-95 text-center mt-1 outline-none"
              >
                Return to Customer List
              </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <UnsavedChangesConfirmationModal 
        isOpen={showUnsavedChangesModal}
        pendingAction={pendingAction}
        onClose={() => setShowUnsavedChangesModal(false)}
      />
    </div>
  );
}
