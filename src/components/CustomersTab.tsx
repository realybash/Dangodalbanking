import { useState, FormEvent, useEffect, useRef, ChangeEvent } from 'react';
import { 
  Search, 
  X, 
  Check, 
  Mail, 
  Phone, 
  MapPin, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Download, 
  User, 
  Home, 
  Calendar, 
  History, 
  ArrowDownLeft, 
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  Shield,
  Award,
  Activity,
  Briefcase,
  Clock,
  UserCheck,
  Coins,
  Lock,
  AlertCircle,
  MessageSquare,
  CheckSquare,
  Square,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DashboardState, Customer, Transaction } from '../types';
import { formatNaira } from './OverviewTab';
import { useToast } from './ToastProvider';

interface CustomersTabProps {
  state: DashboardState;
  onAddCustomer: (customer: any) => void;
  onAddTransaction: (tx: {
    customerId: string;
    type: 'deposit' | 'withdrawal';
    amount: number;
    profitAmount?: number;
    staffId: string;
    status?: 'pending' | 'approved';
    withdrawalPhoto?: string;
    cardPhoto?: string;
  }) => void;
  onToggleStatus: (id: string, status: 'active' | 'inactive') => void;
  onUpdateCustomer: (id: string, updatedFields: Partial<Customer>) => void;
  onDeleteCustomer: (id: string) => void;
}

// Stable hashing utility to get dynamic but persistent color schemes for each staff member ID
export function getStaffColorStyles(staffId: string) {
  const colors = [
    { bg: 'bg-[#14cfb4]/10', border: 'border-[#14cfb4]/20', text: 'text-[#14cfb4]', dot: 'bg-[#14cfb4]' }, // Custom Brand Teal
    { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400', dot: 'bg-indigo-500' }, // Indigo
    { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-500' }, // Amber
    { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', dot: 'bg-purple-500' }, // Purple
    { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', dot: 'bg-rose-500' }, // Rose
    { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-500' }, // Blue
    { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', dot: 'bg-orange-500' }, // Orange
    { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', dot: 'bg-cyan-500' } // Cyan
  ];
  
  if (!staffId) return colors[0];
  
  let hash = 0;
  for (let i = 0; i < staffId.length; i++) {
    hash = staffId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export default function CustomersTab({ 
  state, 
  onAddCustomer, 
  onAddTransaction, 
  onToggleStatus,
  onUpdateCustomer,
  onDeleteCustomer 
}: CustomersTabProps) {
  const { showToast } = useToast();
  const { customers, staff, transactions, settings } = state;
  const minThreshold = settings?.minBalanceThreshold ?? 50000;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBulkNotifyIds, setSelectedBulkNotifyIds] = useState<string[]>([]);
  const [isBulkNotifyOpen, setIsBulkNotifyOpen] = useState(false);
  const [bulkNotifyChannel, setBulkNotifyChannel] = useState<'sms' | 'whatsapp'>('sms');
  const [bulkNotifyTemplate, setBulkNotifyTemplate] = useState<string>('custom');
  const [bulkNotifyCustomMessage, setBulkNotifyCustomMessage] = useState<string>('');
  const [isSendingNotifications, setIsSendingNotifications] = useState(false);
  const [notificationProgress, setNotificationProgress] = useState(0);
  const [notificationLogs, setNotificationLogs] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'low'>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedTxDetail, setSelectedTxDetail] = useState<Transaction | null>(null);
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);

  const logCustomerActivity = (customerId: string, type: 'status_change' | 'profile_update' | 'other', title: string, description: string) => {
    try {
      const logs = JSON.parse(localStorage.getItem('contribopay_status_logs') || '[]');
      const newLog = {
        id: `ev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        customerId,
        type,
        title,
        description,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('contribopay_status_logs', JSON.stringify([newLog, ...logs]));
    } catch (e) {
      console.error(e);
    }
  };
  
  // Edit customer details state
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editAssignedStaffId, setEditAssignedStaffId] = useState('');
  const [editManagerNotes, setEditManagerNotes] = useState('');
  // PIN reset and management state
  const [pinResetValue, setPinResetValue] = useState('');
  const [lastResetPin, setLastResetPin] = useState<string | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New customer modal state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('Kaduna North');
  const [address, setAddress] = useState('');
  const [newManagerNotes, setNewManagerNotes] = useState('');
  const [assignedStaff, setAssignedStaff] = useState(staff[0]?.id || '');
  const [formError, setFormError] = useState('');
  const [customAccountNumber, setCustomAccountNumber] = useState('');

  // Quick transaction form state
  const [txType, setTxType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [txAmount, setTxAmount] = useState('');
  const [txStaffId, setTxStaffId] = useState(staff[0]?.id || '');
  const [txStatus, setTxStatus] = useState<'approved' | 'pending'>('approved');
  const [txSuccessMsg, setTxSuccessMsg] = useState('');
  const [txErrorMsg, setTxErrorMsg] = useState('');
  const [isTxSubmitting, setIsTxSubmitting] = useState(false);
  const [txIsRecurring, setTxIsRecurring] = useState(false);
  const [txRecurringInterval, setTxRecurringInterval] = useState<'weekly' | 'monthly'>('weekly');

  // Set default status when swapping transaction types
  useEffect(() => {
    setTxStatus(txType === 'deposit' ? 'approved' : 'pending');
  }, [txType]);

  // Manager Biometric & Card Upload States for withdrawals
  const [managerWithdrawalPhoto, setManagerWithdrawalPhoto] = useState<string>('');
  const [managerWithdrawalCard, setManagerWithdrawalCard] = useState<string>('');
  const [managerCamActive, setManagerCamActive] = useState<boolean>(false);
  const [managerCaptureTab, setManagerCaptureTab] = useState<'selfie' | 'card' | 'simulation'>('simulation');
  const managerVideoRef = useRef<HTMLVideoElement | null>(null);

  const startManagerCamera = async () => {
    try {
      setManagerCamActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setTimeout(() => {
        if (managerVideoRef.current) {
          managerVideoRef.current.srcObject = stream;
        }
      }, 150);
    } catch (err) {
      console.error("Manager Camera load error:", err);
      setManagerCamActive(false);
    }
  };

  const captureManagerPhoto = () => {
    if (managerVideoRef.current) {
      try {
        const video = managerVideoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg');
          setManagerWithdrawalPhoto(dataUrl);
          
          // Stop track
          const stream = video.srcObject as MediaStream;
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          setManagerCamActive(false);
        }
      } catch (err) {
        console.error("Manager Capture error:", err);
      }
    }
  };

  const stopManagerCamera = () => {
    if (managerVideoRef.current && managerVideoRef.current.srcObject) {
      const stream = managerVideoRef.current.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
    setManagerCamActive(false);
  };

  const handleManagerCardUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setManagerWithdrawalCard(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // Sync edits state when selected client changes or edit mode toggles
  useEffect(() => {
    if (selectedCustomer) {
      setEditName(selectedCustomer.name || '');
      setEditPhone(selectedCustomer.phoneNumber || '');
      setEditLocation(selectedCustomer.location || '');
      setEditAddress(selectedCustomer.address || 'No. 5 Ahmadu Bello Way');
      setEditAssignedStaffId(selectedCustomer.assignedStaffId || '');
      setEditManagerNotes(selectedCustomer.managerNotes || '');
      setPinResetValue('');
      setLastResetPin(null);
    }
  }, [selectedCustomerId, isEditingInfo]);

  // Filters
  const filteredCustomers = customers.filter(c => {
    const sMember = staff.find(s => s.id === c.assignedStaffId);
    
    // Check if searchQuery matches customer name, ID, phone, account, or assigned staff name/id/code
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phoneNumber.includes(searchQuery) ||
      ((c.accountNumber || '').includes(searchQuery)) ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.location && c.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.username && c.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.staffCustomerId && c.staffCustomerId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (sMember && (
        sMember.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sMember.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sMember.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sMember.initials.toLowerCase().includes(searchQuery.toLowerCase())
      ));

    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesBalance = balanceFilter === 'all' || (balanceFilter === 'low' && c.balance < minThreshold);
    const matchesStaffFilter = staffFilter === 'all' || c.assignedStaffId === staffFilter;

    return matchesSearch && matchesStatus && matchesBalance && matchesStaffFilter;
  });

  // Calculate dynamic transactions for selected Customer
  const customerHistory = transactions
    .filter(t => t.customerId === selectedCustomerId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Initials generator
  const getInitials = (nameStr: string) => {
    return nameStr
      .split(' ')
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Avatar Gradients tailored precisely to look amazing and align with screenshots
  const getAvatarGradient = (nameStr: string) => {
    const initials = getInitials(nameStr);
    if (nameStr.toLowerCase().includes('amina') || initials === 'AB') {
      return 'bg-gradient-to-tr from-emerald-400 via-[#14cfb4] to-yellow-300 text-black';
    }
    if (nameStr.toLowerCase().includes('chukwuemeka') || initials === 'CE') {
      return 'bg-gradient-to-tr from-fuchsia-500 via-purple-600 to-indigo-700 text-white';
    }
    if (nameStr.toLowerCase().includes('fatima') || initials === 'FM') {
      return 'bg-gradient-to-tr from-orange-400 via-orange-600 to-yellow-400 text-white';
    }
    // Backup beautiful dynamic choices
    const code = initials.charCodeAt(0) + (initials.charCodeAt(1) || 0);
    const bgList = [
      'bg-gradient-to-tr from-teal-400 via-[#10dcd3] to-cyan-300 text-black',
      'bg-gradient-to-tr from-rose-500 via-pink-600 to-violet-600 text-white',
      'bg-gradient-to-tr from-purple-500 to-amber-500 text-white',
    ];
    return bgList[code % bgList.length];
  };

  // Create Client
  const handleCreateCustomerSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name || !location || !address || !assignedStaff) {
      setFormError('Please fill out all registration fields including street address.');
      return;
    }

    if (customAccountNumber.trim() && customers.some(c => c.accountNumber === customAccountNumber.trim())) {
      setFormError('This custom account number is already assigned to another customer.');
      return;
    }

    onAddCustomer({
      name,
      phoneNumber: phone.trim() || 'No Phone',
      location,
      address,
      assignedStaffId: assignedStaff,
      status: 'active',
      approvalStatus: 'approved',
      contributionsCount: 1, // first subscription
      managerNotes: newManagerNotes,
      accountNumber: customAccountNumber.trim() || undefined,
    });

    // Reset Form
    setName('');
    setPhone('');
    setLocation('Kaduna North');
    setAddress('');
    setNewManagerNotes('');
    setCustomAccountNumber('');
    setFormError('');
    setShowAddForm(false);
  };

  // Save changes
  const handleSaveInfoEdits = () => {
    if (!selectedCustomerId) return;
    if (!editName || !editLocation || !editAddress) {
      showToast("Name, zone, and address fields cannot be blank.", "error");
      return;
    }
    const staffMemberObj = staff.find(s => s.id === editAssignedStaffId);
    logCustomerActivity(
      selectedCustomerId,
      'profile_update',
      'Profile Information Updated',
      `Profile modified: Name set to ${editName}, Zone: ${editLocation}, Street Address: ${editAddress}${staffMemberObj ? `, assigned to staff ${staffMemberObj.name} (${staffMemberObj.code || staffMemberObj.id})` : ''}.`
    );
    onUpdateCustomer(selectedCustomerId, {
      name: editName,
      phoneNumber: editPhone.trim() || 'No Phone',
      location: editLocation,
      address: editAddress,
      assignedStaffId: editAssignedStaffId,
      managerNotes: editManagerNotes
    });
    setIsEditingInfo(false);
    showToast("Customer details updated successfully!", "success");
  };

  // Export spreadsheet matching screenshot 1 actions block
  const handleExportCSV = () => {
    const csvRows = [
      ['Client ID', 'Full Name', 'Phone Number', 'Zone', 'Address', 'Balance (NGN)', 'Status', 'Joined Date', 'Serving Agent ID'],
      ...customers.map((c, idx) => [
        `C00${idx + 1}`,
        c.name,
        c.phoneNumber,
        c.location || 'N/A',
        c.address || 'N/A',
        c.balance,
        c.status,
        c.joinedDate,
        c.assignedStaffId
      ])
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + csvRows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `contribopay_customers_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Post Transaction
  const handlePostTransaction = (e: FormEvent) => {
    e.preventDefault();
    if (isTxSubmitting) return;
    if (!selectedCustomerId || !txAmount) {
      setTxErrorMsg('Please specify an amount.');
      return;
    }

    const amountNum = parseFloat(txAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setTxErrorMsg('Please specify a positive valid amount.');
      return;
    }

    if (txType === 'withdrawal' && selectedCustomer && selectedCustomer.balance < amountNum) {
      setTxErrorMsg(`Insufficient balance. Maximum request: ${formatNaira(selectedCustomer.balance)}`);
      return;
    }

    if (txType === 'withdrawal') {
      if (!managerWithdrawalPhoto && !managerWithdrawalCard) {
        setTxErrorMsg("🔒 Required: Please capture the customer's face, or upload their customer card/document to proceed with withdrawals! This avoids payout arguments.");
        return;
      }
    }

    setIsTxSubmitting(true);

    onAddTransaction({
      customerId: selectedCustomerId,
      type: txType,
      amount: amountNum,
      staffId: txStaffId,
      status: txStatus,
      withdrawalPhoto: managerWithdrawalPhoto || undefined,
      cardPhoto: managerWithdrawalCard || undefined
    });

    if (txType === 'deposit' && txIsRecurring) {
      try {
        const nextOccurrence = new Date();
        if (txRecurringInterval === 'weekly') {
          nextOccurrence.setDate(nextOccurrence.getDate() + 7);
        } else {
          nextOccurrence.setMonth(nextOccurrence.getMonth() + 1);
        }

        const newPlan = {
          id: `plan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          customerId: selectedCustomerId,
          customerName: selectedCustomer?.name || 'Customer',
          amount: amountNum,
          interval: txRecurringInterval,
          staffId: txStaffId,
          staffName: staff.find(s => s.id === txStaffId)?.name || 'Administrator',
          status: txStatus,
          nextOccurrence: nextOccurrence.toISOString(),
          isActive: true,
          createdAt: new Date().toISOString()
        };

        const savedPlans = JSON.parse(localStorage.getItem('contribopay_recurring_plans') || '[]');
        savedPlans.push(newPlan);
        localStorage.setItem('contribopay_recurring_plans', JSON.stringify(savedPlans));
      } catch (err) {
        console.error('Failed to create recurring savings plan', err);
      }
    }

    setTxAmount('');
    setTxErrorMsg('');
    setManagerWithdrawalPhoto('');
    setManagerWithdrawalCard('');
    setTxIsRecurring(false);
    stopManagerCamera();

    setTxSuccessMsg(txStatus === 'approved'
      ? (txIsRecurring 
          ? `Savings deposit posted & auto-pay set to run ${txRecurringInterval}!` 
          : 'Savings record posted and credited successfully!')
      : 'Savings request queued successfully! Awaiting Manager approval.'
    );
    setTimeout(() => {
      setTxSuccessMsg('');
      setIsTxSubmitting(false);
    }, 4000);
  };

  // --- CUSTOMER PROFILE VIEW (Screenshots 2 & 3) ---
  if (selectedCustomerId && selectedCustomer) {
    const serialIndex = customers.findIndex(c => c.id === selectedCustomer.id) + 1;
    const clientSerial = `C00${serialIndex}`;
    const isActive = selectedCustomer.status === 'active';
    const assignedStaffObj = staff.find(s => s.id === selectedCustomer.assignedStaffId);

    // Custom Currency Formatter that respects state settings
    const formatCustomCurrency = (amount: number, showDecimals = true) => {
      const symbol = state.settings.currencySymbol || '₦';
      const formatter = new Intl.NumberFormat('en-NG', {
        minimumFractionDigits: showDecimals ? 2 : 0,
        maximumFractionDigits: showDecimals ? 2 : 0,
      });
      return `${symbol}${formatter.format(amount)}`;
    };

    const getCustomerTier = (balance: number) => {
      if (balance >= 1000000) return { label: 'Diamond Enterprise Core', color: 'text-cyan-400 bg-cyan-950/20 border-cyan-900/30', badge: '💎', sub: 'High stake partner' };
      if (balance >= 250000) return { label: 'Gold Premier Saver', color: 'text-amber-400 bg-amber-950/20 border-amber-900/30', badge: '⭐', sub: 'Priority contributor' };
      if (balance > 0) return { label: 'Silver Active Contributor', color: 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30', badge: '🌱', sub: 'Consistent local saver' };
      return { label: 'Standard Digital Wallet', color: 'text-zinc-400 bg-zinc-900 border-zinc-800', badge: '❄️', sub: 'Newly activated ledger' };
    };

    const tier = getCustomerTier(selectedCustomer.balance);

    const formatRegisteredDate = (dateStr?: string) => {
      if (!dateStr) return 'June 2, 2024';
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      } catch (e) {
        return dateStr;
      }
    };

    return (
      <div id="customer-profile-container" className="w-full flex flex-col gap-6 select-none pb-12 animate-fade-in">
        
        {/* Profile Nav Bar & Title Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-zinc-1000 pb-4">
          <div className="flex items-center gap-2.5">
            <button 
              id="back-list-btn"
              onClick={() => {
                setSelectedCustomerId(null);
                setIsEditingInfo(false);
                setIsActivityDrawerOpen(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#111311] hover:bg-zinc-900 border border-zinc-900 text-zinc-300 text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to list</span>
            </button>

            <button
              id="activity-drawer-toggle-btn"
              onClick={() => setIsActivityDrawerOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#14cfb4]/10 hover:bg-[#14cfb4]/20 border border-[#14cfb4]/20 text-[#14cfb4] text-xs font-extrabold rounded-xl cursor-pointer transition-all active:scale-95"
            >
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              <span>Activity Log</span>
            </button>
          </div>

          <div className="hidden md:flex flex-col items-center">
            <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest leading-none">Ledger Profile</h2>
            <span className="text-[10px] text-zinc-650 mt-1 font-mono font-bold">{clientSerial}</span>
          </div>

          <button 
            id="edit-profile-btn"
            onClick={() => setIsEditingInfo(!isEditingInfo)}
            className={`flex items-center gap-1.5 px-4.5 py-2 text-xs font-extrabold rounded-xl border transition-all cursor-pointer ${
              isEditingInfo 
                ? 'bg-rose-950/20 border-rose-900/40 text-rose-450 hover:bg-rose-950/40'
                : 'bg-[#111311] border-zinc-900 text-[#14cfb4] hover:bg-zinc-900 hover:border-zinc-800'
            }`}
          >
            {isEditingInfo ? (
              <>
                <X className="w-3.5 h-3.5" />
                <span>Cancel Editing</span>
              </>
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5" />
                <span>Update Profile</span>
              </>
            )}
          </button>
        </div>

        {/* HERO BANNER - DIGITAL ATM PASSPORT ID DECK */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#121312] via-[#181a18] to-[#111211] border border-zinc-900 rounded-[32px] p-6 md:p-7.5 flex flex-col xl:flex-row items-center justify-between gap-6 shadow-2xl animate-fade-in select-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#14cfb4]/5 via-transparent to-transparent rounded-full filter blur-3xl pointer-events-none" />
          
          {/* Main profile content layout */}
          <div className="flex flex-col md:flex-row items-center gap-8 w-full xl:w-auto">
            
            {/* STANDALONE CUSTOMER PHOTO ID CONTAINER */}
            <div className="flex flex-col items-center gap-3 shrink-0 select-none justify-center bg-gradient-to-b from-[#111311] via-[#1a1c1a] to-[#0d0e0d] border border-zinc-800 rounded-[28px] p-5.5 shadow-2xl min-w-[320px] relative">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#14cfb4]/5 rounded-full filter blur-xl pointer-events-none" />
              <div 
                className="relative group/photo w-72 h-72 rounded-2xl border-2 border-[#14cfb4]/40 bg-zinc-950/90 overflow-hidden cursor-pointer shadow-lg hover:scale-[1.03] transition-all p-0.5 flex flex-col items-center justify-center animate-fade-in"
                onClick={() => fileInputRef.current?.click()}
                title="Change Customer Photo (Upload)"
              >
                {selectedCustomer.profileImage ? (
                  <img src={selectedCustomer.profileImage} className="w-full h-full object-cover rounded-xl" alt="Customer Profile" />
                ) : (
                  <div className={`w-full h-full rounded-xl flex flex-col gap-1.5 items-center justify-center font-black ${getAvatarGradient(selectedCustomer.name)} text-white`}>
                    <span className="text-5xl font-sans">👤</span>
                    <span className="text-[14px] tracking-wider leading-none uppercase font-mono">{getInitials(selectedCustomer.name)}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/photo:opacity-100 transition-opacity flex flex-col items-center justify-center text-[10px] text-[#14cfb4] font-black tracking-widest uppercase rounded-xl">
                  <span>UPLOAD PHOTO</span>
                </div>
              </div>
              
              <span className="text-[7px] font-black text-[#14cfb4] tracking-widest uppercase bg-[#14cfb4]/10 border border-[#14cfb4]/20 px-3 py-1 rounded-full leading-none">CUSTOMER PHOTO ID</span>
              
              {/* Ledger Balance Display under the photo */}
              <div className="flex flex-col items-center mt-1 leading-none">
                <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">SAVINGS BALANCE</span>
                <span className="text-xl font-bold text-white mt-1.5 font-sans">
                  ₦{(selectedCustomer.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}
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
                        onUpdateCustomer(selectedCustomer.id, { profileImage: reader.result });
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </div>

            {/* Profile Meta values display */}
            <div className="flex flex-col gap-3.5 min-w-0 text-center md:text-left md:pl-2">
              <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
                <h3 className="font-extrabold text-3xl text-zinc-100 tracking-tight leading-none">{selectedCustomer.name}</h3>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[9.5px] font-black uppercase rounded-full border tracking-wider select-none ${
                  isActive 
                    ? 'bg-[#112415] text-[#30d178] border-[#13372f]' 
                    : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#35e886]' : 'bg-zinc-650'}`} />
                  {selectedCustomer.status}
                </span>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-x-3 gap-y-1.5 text-xs text-zinc-400 font-medium">
                <span className="font-black text-[#14cfb4] px-2 py-0.5 rounded-md bg-[#14cfb4]/5 border border-[#14cfb4]/20 font-mono text-[11px]">{clientSerial}</span>
                <span className="hidden md:inline text-zinc-700">•</span>
                <span>Registered on {formatRegisteredDate(selectedCustomer.joinedDate)}</span>
              </div>
              
              <div className="flex justify-center md:justify-start mt-1">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10.5px] font-extrabold border uppercase tracking-wider ${tier.color}`}>
                  <span>{tier.badge}</span>
                  <span>{tier.label}</span>
                </span>
              </div>

              {/* Friendly security signals / tags */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 mt-2 text-zinc-500 text-[11px]">
                <div className="flex items-center gap-1">
                  <span>💎</span> <span className="font-medium text-zinc-400">Authorized Ledger Profile</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>🛡️</span> <span className="font-medium text-zinc-400">Secured Node</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>⚡</span> <span className="font-medium text-zinc-400">Active Ledger</span>
                </div>
              </div>
            </div>
          </div>

          {/* Core savings ledger summary panel */}
          <div className="flex flex-col items-center md:items-end justify-center shrink-0 border-t md:border-t-0 md:border-l border-zinc-900 pt-5 md:pt-0 md:pl-8 text-center md:text-right w-full xl:w-auto mt-4 xl:mt-0">
            <span className="text-[9px] font-extrabold text-[#14cfb4] uppercase tracking-widest leading-none">TOTAL SAVINGS BALANCE</span>
            <span className="text-3xl md:text-4xl font-mono font-black text-white tracking-tight mt-1.5">
              {formatCustomCurrency(selectedCustomer.balance, true)}
            </span>
            <span className="text-[10px] text-zinc-500 font-semibold mt-1">Current Ledger Status (Secure {state.settings.currencySymbol || '₦'})</span>
          </div>
        </div>

        {/* PROFILE ACTIVE CHANGES FORM PANEL */}
        {isEditingInfo ? (
          <div id="editing-form-card" className="bg-[#111311] border border-zinc-900 rounded-[28px] p-6 flex flex-col gap-5 shadow-xl animate-fade-in">
            <div className="border-b border-zinc-900 pb-3 flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <h4 className="text-sm font-black text-zinc-250 uppercase tracking-wider">Modify Customer Credentials</h4>
                <p className="text-[10px] text-zinc-500">Edit core geographic boundaries, contact nodes, and supervisor alignments.</p>
              </div>
              <span className="text-xs bg-amber-950/20 text-amber-500 border border-amber-900/30 px-2.5 py-1 rounded-xl font-bold">Authorized Mode</span>
            </div>

            <div className="flex flex-col gap-4">
              {/* Name and Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="edit-field-name" className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">Full Account Name</label>
                  <input 
                    id="edit-field-name"
                    type="text"
                    value={editName || ''}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-[#090a09] border border-zinc-850 rounded-2xl text-xs font-semibold text-zinc-150 focus:border-[#14cfb4] focus:outline-none"
                    placeholder="Enter full name"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="edit-field-phone" className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Phone Contact</span>
                    <span className="text-[8px] text-[#14cfb4] font-semibold lowercase italic">optional</span>
                  </label>
                  <input 
                    id="edit-field-phone"
                    type="text"
                    value={(editPhone === 'No Phone' ? '' : editPhone) || ''}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-[#090a09] border border-[#1f211f] rounded-2xl text-xs font-mono font-bold text-zinc-150 focus:border-[#14cfb4] focus:outline-none"
                    placeholder="No Mobile Phone"
                  />
                </div>
              </div>

              {/* Geographic and physical address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="edit-field-zone" className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">Territory Location / Zone</label>
                  <input 
                    id="edit-field-zone"
                    type="text"
                    value={editLocation || ''}
                    onChange={(e) => setEditLocation(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-[#090a09] border border-zinc-850 rounded-2xl text-xs font-semibold text-zinc-150 focus:border-[#14cfb4] focus:outline-none"
                    placeholder="E.g. Kaduna North"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="edit-field-address" className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">Street Address Details</label>
                  <input 
                    id="edit-field-address"
                    type="text"
                    value={editAddress || ''}
                    onChange={(e) => setEditAddress(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-[#090a09] border border-zinc-850 rounded-2xl text-xs font-medium text-zinc-150 focus:border-[#14cfb4] focus:outline-none"
                    placeholder="E.g. No. 12 Sultan Road"
                  />
                </div>
              </div>

              {/* Assigned Representative Agent alignment */}
              <div className="flex flex-col gap-1.5 border-t border-zinc-900/50 pt-4 mt-1">
                <label htmlFor="edit-field-agent" className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">Assigned Ledger Mobilizer Agent</label>
                <select 
                  id="edit-field-agent"
                  value={editAssignedStaffId || ''}
                  onChange={(e) => setEditAssignedStaffId(e.target.value)}
                  className="w-full px-4 py-3 bg-[#090a09] border border-zinc-850 rounded-2xl text-xs font-bold text-zinc-200 focus:outline-none focus:border-[#14cfb4]"
                >
                  {staff.map((s, idx) => (
                    <option key={`${s.id}-${idx}`} value={s.id}>{s.name} ({s.initials}) — {s.role}</option>
                  ))}
                </select>
                <p className="text-[10px] text-zinc-600 mt-1 leading-normal">
                  Changing the assigned agent immediately re-allocates field accountability. The new officer is instantly authorized to post entries.
                </p>
              </div>

              {/* Private Manager Notes */}
              <div className="flex flex-col gap-1.5 border-t border-zinc-900/50 pt-4 mt-1 text-left">
                <label htmlFor="edit-field-notes" className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Private Manager Notes</span>
                  <span className="text-[9px] bg-amber-950/20 text-amber-500 border border-amber-900/30 px-2 py-0.5 rounded font-black uppercase tracking-wider select-none text-[8.5px]">Internal Use Only</span>
                </label>
                <textarea
                  id="edit-field-notes"
                  value={editManagerNotes || ''}
                  onChange={(e) => setEditManagerNotes(e.target.value)}
                  rows={3}
                  placeholder="E.g., VIP enterprise customer. Keep security verification strict on withdrawals."
                  className="w-full px-4 py-3 bg-[#090a09] border border-zinc-850 rounded-2xl text-xs font-medium text-zinc-200 focus:outline-none focus:border-[#14cfb4] placeholder-zinc-700 resize-y leading-relaxed"
                />
              </div>
            </div>

            <button
              onClick={handleSaveInfoEdits}
              className="w-full py-4 mt-2 bg-[#14cfb4] hover:bg-[#12b9a1] text-black font-extrabold text-xs tracking-wider uppercase rounded-2xl active:scale-95 transition-all cursor-pointer shadow-lg shadow-[#14cfb4]/5 text-center"
            >
              ✓ Propagate Modifications to Local Ledger
            </button>
          </div>
        ) : (
          /* ARRANGED RE-STRUCTURED BENTO METRICS DETAILS BOARD */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in animate-duration-300">
            
            {/* BOX 1: FINANCIAL & TRANSACTION MATRIX */}
            <div className={`border rounded-[28px] p-6 flex flex-col justify-between shadow-xl min-h-[220px] ${
              selectedCustomer.balance < minThreshold 
                ? 'bg-red-950/20 border-red-900/50' 
                : 'bg-[#111311] border-zinc-900'
            }`}>
              <div className="flex items-center justify-between border-b border-zinc-900/50 pb-3">
                <span className={`text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-1.5 ${
                  selectedCustomer.balance < minThreshold ? 'text-rose-455' : 'text-teal-400'
                }`}>
                  <Coins className="w-3.5 h-3.5" /> LEDGER PORTFOLIO
                </span>
                {selectedCustomer.balance < minThreshold ? (
                  <span className="text-[8px] font-mono text-rose-455 font-black tracking-widest bg-rose-955/20 border border-rose-900/40 px-1.5 py-0.5 rounded-md">ALERT</span>
                ) : (
                  <span className="text-[9px] font-mono text-zinc-650 font-black">BOX A</span>
                )}
              </div>

              <div className="flex flex-col gap-3 mt-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-[450] font-semibold text-[11px]">Account Number:</span>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-mono font-black text-[#14cfb4] bg-[#14cfb4]/10 px-2 py-0.5 border border-[#14cfb4]/20 rounded select-all">
                      {selectedCustomer.accountNumber || `30${(selectedCustomer.phoneNumber || selectedCustomer.id).slice(-8)}`}
                    </span>
                    <span className="text-[9.5px] text-zinc-500 font-bold uppercase tracking-wider font-mono">
                      🏦 {state.settings.partnerBankName || 'Sterling Bank Plc'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-[450] font-semibold">Ledger ID:</span>
                  <span className="font-mono font-black text-zinc-150">{clientSerial}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-[450] font-semibold">Total Savings:</span>
                  <span className={`font-mono font-black text-sm ${
                    selectedCustomer.balance < minThreshold ? 'text-rose-455 font-extrabold' : 'text-[#14cfb4]'
                  }`}>{formatCustomCurrency(selectedCustomer.balance, true)}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-[450] font-semibold">Logged Postings:</span>
                  <span className={`font-mono font-black px-2.5 py-0.5 border rounded-lg text-[10.5px] ${
                    selectedCustomer.balance < minThreshold 
                      ? 'text-rose-455 bg-rose-950/20 border-rose-900/25' 
                      : 'text-emerald-450 bg-emerald-950/10 border-emerald-900/25'
                  }`}>
                    {selectedCustomer.contributionsCount || 0} payments
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-[450] font-semibold">Average Deposit:</span>
                  <span className="font-mono font-bold text-zinc-400">
                    {selectedCustomer.contributionsCount && selectedCustomer.contributionsCount > 0 
                      ? formatCustomCurrency(selectedCustomer.balance / selectedCustomer.contributionsCount, false) 
                      : formatCustomCurrency(0)
                    }
                  </span>
                </div>
              </div>

              <div className="border-t border-zinc-900/50 pt-3 mt-4 flex items-center gap-1">
                {selectedCustomer.balance < minThreshold ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span className="text-[10px] text-rose-455 font-bold uppercase tracking-wider">Under configured min balance limits</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="text-[10px] text-zinc-555 font-semibold">100% Secure Collateral Escrow active</span>
                  </>
                )}
              </div>
            </div>

            {/* BOX 2: LOGISTICS & GEOGRAPHY */}
            <div className="bg-[#111311] border border-zinc-900 rounded-[28px] p-6 flex flex-col justify-between shadow-xl min-h-[220px]">
              <div className="flex items-center justify-between border-b border-zinc-900/50 pb-3">
                <span className="text-[10px] font-extrabold text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> LOCALITY MATRIX
                </span>
                <span className="text-[9px] font-mono text-zinc-650 font-black">BOX B</span>
              </div>

              <div className="flex flex-col gap-3.5 mt-4 min-w-0">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-[450] font-semibold shrink-0">Working Zone:</span>
                  <span className="font-extrabold text-zinc-200 truncate">{selectedCustomer.location || 'Kaduna North'}</span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-extrabold text-zinc-600 uppercase tracking-widest leading-none">Complete Physical Address</span>
                  <div className="bg-[#090b09] p-3 border border-zinc-850 rounded-xl mt-1.5 text-xs text-zinc-350 font-medium leading-relaxed break-words">
                    {selectedCustomer.address || 'No. 5 Ahmadu Bello Way, Kaduna'}
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-900/50 pt-3 mt-4 flex items-center gap-1">
                <Clock className="w-3 h-3 text-zinc-650" />
                <span className="text-[10px] text-zinc-550 font-semibold">Registered on record since {selectedCustomer.joinedDate || '2024'}</span>
              </div>
            </div>

            {/* BOX 3: ASSIGNED FIELD MOBILIZER */}
            <div className="bg-[#111311] border border-zinc-900 rounded-[28px] p-6 flex flex-col justify-between shadow-xl min-h-[220px]">
              <div className="flex items-center justify-between border-b border-zinc-900/50 pb-3">
                <span className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" /> RESPONSIBLE MOBILIZER
                </span>
                <span className="text-[9px] font-mono text-zinc-650 font-black">BOX C</span>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 shadow border border-white/5 flex items-center justify-center">
                  {assignedStaffObj?.profileImage ? (
                    <img src={assignedStaffObj.profileImage} className="w-full h-full object-cover" alt={assignedStaffObj.name} referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white font-black text-xs flex items-center justify-center uppercase">
                      {assignedStaffObj?.initials || 'BO'}
                    </div>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-extrabold text-zinc-200 truncate leading-tight">
                    {assignedStaffObj?.name || 'Bello Usman'}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-bold mt-0.5 font-mono uppercase">
                    {assignedStaffObj?.role || 'Field Officer'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 mt-3 pt-2.5 border-t border-zinc-900/30">
                <div className="flex items-center gap-2 text-xs">
                  <Phone className="w-3 h-3 text-zinc-600 shrink-0" />
                  <span className="text-zinc-400 font-mono text-[11px] leading-none">{assignedStaffObj?.phoneNumber || '+234 812 300 1122'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Mail className="w-3 h-3 text-zinc-600 shrink-0" />
                  <span className="text-zinc-400 font-mono text-[10px] leading-none truncate">{assignedStaffObj?.email || 'officer@contribopay.com'}</span>
                </div>
              </div>

              <div className="border-t border-zinc-900/50 pt-3 mt-4 flex items-center gap-1 justify-between">
                <span className="text-[10px] text-zinc-550 font-semibold">Zone coverage priority</span>
                {assignedStaffObj ? (() => {
                  const styles = getStaffColorStyles(assignedStaffObj.id);
                  return (
                    <span className={`text-[9.5px] font-mono font-bold ${styles.bg} ${styles.text} border ${styles.border} px-2.5 py-0.5 rounded-lg flex items-center gap-1 uppercase`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
                      {assignedStaffObj.code || assignedStaffObj.initials} Active
                    </span>
                  );
                })() : (
                  <span className="text-[10px] font-mono bg-cyan-950/20 text-cyan-400 border border-cyan-900/40 px-2 py-0.5 rounded-lg font-bold">Aligned</span>
                )}
              </div>
            </div>

            {/* BOX 4: PRIVATE MANAGER COMMENTS & DIRECT SAVE */}
            <div className="bg-[#111311] border border-zinc-900 rounded-[28px] p-6 flex flex-col justify-between shadow-xl min-h-[220px] lg:col-span-3 md:col-span-2 relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full filter blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between border-b border-zinc-900/50 pb-3">
                <span className="text-[10px] font-extrabold text-[#14cfb4] uppercase tracking-widest flex items-center gap-1.5">
                  🛡️ Private Manager Observations & internal comments
                </span>
                <span className="text-[9.5px] font-mono text-zinc-650 font-black">BOX D (SECURED NOTES)</span>
              </div>

              <div className="flex flex-col gap-3 mt-4">
                <p className="text-[11px] text-zinc-500 font-medium">
                  These internal alerts and observations are strictly private and can only be accessed or modified by supervisors and administrators.
                </p>

                <div className="flex flex-col gap-2 mt-1">
                  <textarea
                    value={editManagerNotes}
                    onChange={(e) => setEditManagerNotes(e.target.value)}
                    rows={3}
                    placeholder="No private comments stored for this customer. Type any supervisor observations or private internal files here..."
                    className="w-full px-4 py-3 bg-[#090b09] border border-zinc-850 rounded-2xl text-xs font-medium text-zinc-150 focus:outline-none focus:border-amber-500/70 placeholder-zinc-700 resize-y leading-relaxed"
                  />
                </div>
              </div>

              <div className="border-t border-zinc-900/50 pt-3 mt-4 flex items-center justify-between gap-4">
                <span className="text-[10px] text-zinc-550 font-semibold tracking-wider uppercase text-[8.5px] font-mono flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Auto-persisted node
                </span>
                <button
                  onClick={() => {
                    if (selectedCustomer) {
                      onUpdateCustomer(selectedCustomer.id, {
                        managerNotes: editManagerNotes
                      });
                      showToast("Private manager notes updated successfully!", "success");
                    }
                  }}
                  className="px-5 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 font-extrabold text-[10px] tracking-wider uppercase rounded-xl transition-all active:scale-95 cursor-pointer leading-none"
                >
                  Save Internal Comments
                </button>
              </div>
            </div>

            {/* BOX 5: CLIENT SECURITY PIN CONTROL & RECOVERY */}
            <div className="bg-[#111311] border border-zinc-900 rounded-[28px] p-6 flex flex-col justify-between shadow-xl min-h-[220px] lg:col-span-3 md:col-span-2 relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#14cfb4]/5 rounded-full filter blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between border-b border-[#222b3b]/30 pb-3">
                <span className="text-[10px] font-extrabold text-[#14cfb4] uppercase tracking-widest flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#14cfb4]" /> 🔑 SECURITY PIN RESET & ACCOUNT RECOVERY
                </span>
                <span className="text-[9.5px] font-mono text-zinc-650 font-black">BOX E (SECURITY CONTROLS)</span>
              </div>

              <div className="flex flex-col gap-3.5 mt-4 text-left">
                <p className="text-[11.5px] text-zinc-450 font-medium leading-relaxed">
                  If the customer forgot their security PIN, you are authorized to reset or change it. Please specify a 4-digit numeric code below, or auto-generate a secure PIN. Share the new PIN with the saver so they can log back into their portal.
                </p>

                {lastResetPin && (
                  <div className="p-3 bg-[#14cfb4]/10 border border-[#14cfb4]/20 rounded-xl flex flex-col gap-1">
                    <span className="text-[10px] font-extrabold text-[#14cfb4] uppercase tracking-wider">PIN SUCCESSFULLY UPDATED!</span>
                    <p className="text-xs text-zinc-300 font-medium">
                      The customer's PIN has been updated. Please communicate this new PIN to the customer:
                    </p>
                    <span className="text-xl font-mono font-black text-white mt-1 select-all tracking-widest bg-zinc-950 px-3 py-1.5 rounded-lg w-max border border-zinc-800">
                      {lastResetPin}
                    </span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3.5 items-end mt-1">
                  <div className="flex flex-col gap-1.5 flex-1 w-full">
                    <label className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-wider">New 4-Digit Security PIN</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={pinResetValue}
                      onChange={(e) => setPinResetValue(e.target.value.replace(/\D/g, ''))}
                      placeholder={selectedCustomer.pin ? `Current PIN: ****` : `Enter new 4-digit PIN`}
                      className="w-full px-4 py-3 bg-[#090a09] border border-zinc-850 rounded-xl text-sm font-mono font-bold text-zinc-200 focus:outline-none focus:border-[#14cfb4] placeholder-zinc-700"
                    />
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
                        setPinResetValue(randomPin);
                        showToast("Generated a secure random 4-digit PIN!", "info");
                      }}
                      className="px-3.5 py-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 font-extrabold text-[10px] tracking-wider uppercase rounded-xl transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      🎲 Auto-Generate
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const trimmedPin = pinResetValue.trim();
                        if (trimmedPin.length !== 4) {
                          showToast("PIN must be exactly 4 digits.", "error");
                          return;
                        }
                        onUpdateCustomer(selectedCustomer.id, { pin: trimmedPin });
                        logCustomerActivity(
                          selectedCustomer.id,
                          'other',
                          'PIN Reset/Changed',
                          `Customer security PIN was successfully changed and updated by the Manager.`
                        );
                        setLastResetPin(trimmedPin);
                        setPinResetValue('');
                        showToast(`PIN changed successfully to ${trimmedPin}!`, "success");
                      }}
                      className="px-5 py-3 bg-[#14cfb4] hover:bg-[#12b9a1] text-black font-extrabold text-[10px] tracking-wider uppercase rounded-xl transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      Update Customer PIN
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-900/50 pt-3 mt-4 flex items-center justify-between">
                <span className="text-[10px] text-zinc-550 font-semibold tracking-wider uppercase font-mono flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Secure Cryptographic Node
                </span>
                <span className="text-[10px] text-zinc-500 font-bold font-mono">
                  {selectedCustomer.pin ? `PIN Active (Current: ${selectedCustomer.pin})` : 'No PIN Active (Default)'}
                </span>
              </div>
            </div>

          </div>
        )}

        {/* TRANSACTION HISTORY & QUICK POST INTERACTION */}
        <div id="quick-savings-post-card" className="bg-[#111311] border border-zinc-900/80 rounded-[28px] p-5.5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-zinc-500 uppercase tracking-widest leading-none">
              SUBMIT SAVINGS TRANSACTION
            </h3>
            <span className="text-[10px] text-zinc-650 tracking-wider">File & Record Instant Cash</span>
          </div>

          {txErrorMsg && (
            <div className="text-xs text-red-400 p-3 bg-red-950/25 border border-red-900/30 rounded-xl">
              ⚠️ {txErrorMsg}
            </div>
          )}
          {txSuccessMsg && (
            <div className="text-xs text-[#14cfb4] p-3 bg-[#13372f]/45 border border-[#14cfb4]/25 rounded-xl">
              ✓ {txSuccessMsg}
            </div>
          )}

          <form onSubmit={handlePostTransaction} className="flex flex-col gap-3.5">
            <div className="grid grid-cols-2 gap-2 bg-[#090a09] p-1.5 border border-zinc-900/80 rounded-xl">
              <button
                type="button"
                onClick={() => setTxType('deposit')}
                className={`py-2 text-xs font-extrabold rounded-lg cursor-pointer transition-all ${
                  txType === 'deposit' 
                    ? 'bg-[#13372f]/45 border border-[#14cfb4]/25 text-[#14cfb4]' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Deposit Contribution
              </button>
              <button
                type="button"
                onClick={() => setTxType('withdrawal')}
                className={`py-2 text-xs font-extrabold rounded-lg cursor-pointer transition-all ${
                  txType === 'withdrawal' 
                    ? 'bg-amber-950/25 border border-amber-900/25 text-amber-500' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Withdrawal Box
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Amount (₦)</label>
                <input 
                  type="number"
                  placeholder="25000"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#090a09] border border-zinc-905 rounded-xl text-xs font-mono font-black text-zinc-100 placeholder-zinc-700 focus:border-[#14cfb4] focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Submitting Agent</label>
                <select
                  value={txStaffId}
                  onChange={(e) => setTxStaffId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#090a09] border border-zinc-905 rounded-xl text-xs font-bold text-zinc-400 focus:border-[#14cfb4] focus:outline-none"
                >
                  {staff.map((s, idx) => (
                    <option key={`${s.id}-${idx}`} value={s.id}>
                      {s.name} ({s.initials})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Posting Status</label>
                <select
                  value={txStatus}
                  onChange={(e) => setTxStatus(e.target.value as 'approved' | 'pending')}
                  className="w-full px-3.5 py-2 bg-[#090a09] border border-zinc-905 rounded-xl text-xs font-bold text-zinc-400 focus:border-[#14cfb4] focus:outline-none"
                >
                  <option value="approved">Approved (Instant Balance Credit)</option>
                  <option value="pending">Pending (Queued for Approval)</option>
                </select>
              </div>
            </div>

            {/* BIOMETRIC & DOCUMENT WORKSPACE (Shown ONLY for withdrawals) */}
            {txType === 'withdrawal' && (
              <div className="bg-[#090b09]/80 p-4 rounded-2xl border border-zinc-900/60 flex flex-col gap-2.5">
                <div className="flex items-center justify-between border-b border-zinc-900/40 pb-1.5">
                  <span className="text-[9px] font-extrabold text-zinc-400 uppercase tracking-wider">SECURE PAYOUT CAPTURES</span>
                  <span className="text-[8px] font-mono text-zinc-500">Pick verification method</span>
                </div>

                <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-lg">
                  {(['selfie', 'card', 'simulation'] as const).map(tab => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => {
                        setManagerCaptureTab(tab);
                        if (tab !== 'selfie') {
                          stopManagerCamera();
                        }
                      }}
                      className={`py-1 text-[8.5px] font-black uppercase rounded transition-all cursor-pointer ${
                        managerCaptureTab === tab 
                          ? 'bg-amber-500 text-black shadow' 
                          : 'text-zinc-500 hover:text-white'
                      }`}
                    >
                      {tab === 'selfie' ? '📸 Selfie' : tab === 'card' ? '🗂️ Card/ID' : '⚙️ Presets'}
                    </button>
                  ))}
                </div>

                {/* Live manager camera snap */}
                {managerCaptureTab === 'selfie' && (
                  <div className="flex flex-col gap-2 mt-0.5">
                    {managerWithdrawalPhoto ? (
                      <div className="relative rounded-xl overflow-hidden border border-zinc-900 w-44 mx-auto bg-black select-none">
                        <img src={managerWithdrawalPhoto} className="w-full h-24 object-cover" alt="Manager snap" referrerPolicy="no-referrer"/>
                        <div className="absolute top-1 right-1 bg-emerald-500 text-zinc-950 w-4 h-4 rounded-full flex items-center justify-center font-black text-[9px]">✓</div>
                        <button 
                          onClick={() => setManagerWithdrawalPhoto('')}
                          className="absolute bottom-1.5 left-1.5 right-1.5 bg-black/80 hover:bg-black text-white text-[8px] font-black py-0.5 rounded uppercase"
                        >
                          ↺ Retake
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {managerCamActive ? (
                          <div className="relative rounded-xl overflow-hidden border border-zinc-900 bg-black">
                            <video ref={managerVideoRef} autoPlay playsInline className="w-full h-28 object-cover" />
                            <div className="absolute bottom-1.5 left-0 right-0 flex gap-1 justify-center">
                              <button
                                type="button"
                                onClick={captureManagerPhoto}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-black text-[8.5px] uppercase rounded-md shadow"
                              >
                                📸 Capture Selfie
                              </button>
                              <button
                                type="button"
                                onClick={stopManagerCamera}
                                className="px-1.5 py-1 bg-zinc-900 text-zinc-400 font-bold text-[8.5px] rounded-md"
                              >
                                Off
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={startManagerCamera}
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
                {managerCaptureTab === 'card' && (
                  <div className="flex flex-col gap-2 mt-0.5">
                    {managerWithdrawalCard ? (
                      <div className="relative rounded-xl overflow-hidden border border-zinc-900 w-44 mx-auto bg-black select-none">
                        <img src={managerWithdrawalCard} className="w-full h-20 object-cover" alt="Card doc" referrerPolicy="no-referrer" />
                        <div className="absolute top-1 right-1 bg-emerald-500 text-zinc-950 w-4 h-4 rounded-full flex items-center justify-center font-black text-[9px]">✓</div>
                        <button 
                          onClick={() => setManagerWithdrawalCard('')}
                          className="absolute bottom-1.5 left-1.5 right-1.5 bg-black/80 hover:bg-black text-white text-[8px] font-black py-0.5 rounded uppercase"
                        >
                          ↺ Clear card
                        </button>
                      </div>
                    ) : (
                      <div className="border border-dashed border-zinc-800 rounded-xl bg-[#070807] p-4 text-center relative hover:bg-[#0a0b0a] cursor-pointer">
                        <input type="file" accept="image/*" onChange={handleManagerCardUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                        <span className="text-sm block">🗂️</span>
                        <span className="text-[9px] text-zinc-400 font-black uppercase mt-1 block">Upload card/savings book</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Simulation presets option for quick validation */}
                {managerCaptureTab === 'simulation' && (
                  <div className="flex flex-col gap-1 mt-0.5">
                    <div className="grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setManagerWithdrawalPhoto(`data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" fill="%231e293b"/><circle cx="100" cy="65" r="30" fill="%2338bdf8"/><path d="M70,120 Q100,85 130,120 Z" fill="%2338bdf8" opacity="0.85"/><text x="15" y="25" fill="%23cbd5e1" font-family="monospace" font-size="9" font-weight="extrabold">MANAGER VERIFIED PORTRT</text><text x="65" y="140" fill="white" font-family="sans-serif" font-size="11" font-weight="black">SAVER SNAP</text></svg>`);
                        }}
                        className={`p-1 border rounded-md text-[7.5px] font-bold text-center bg-zinc-950 transition-colors cursor-pointer ${managerWithdrawalPhoto !== '' ? 'border-amber-500 text-amber-400' : 'border-zinc-800 text-zinc-400'}`}
                      >
                        🧑‍⚕️ Cap Face
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setManagerWithdrawalCard(`data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect width="200" height="150" rx="8" fill="%230f172a" stroke="amber" stroke-width="2"/><text x="15" y="55" fill="white" font-family="sans-serif" font-weight="black" font-size="12">SAVER CARD</text><text x="15" y="75" fill="amber" font-family="monospace" font-size="8">CBP-SUBSCRIBER-${selectedCustomer.id}</text><text x="15" y="95" fill="white" font-size="10">${selectedCustomer.name.toUpperCase()}</text></svg>`);
                        }}
                        className={`p-1 border rounded-md text-[7.5px] font-bold text-center bg-zinc-950 transition-colors cursor-pointer ${managerWithdrawalCard !== '' ? 'border-amber-500 text-amber-400' : 'border-zinc-800 text-zinc-400'}`}
                      >
                        💳 Cap ID
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setManagerWithdrawalPhoto('');
                          setManagerWithdrawalCard('');
                        }}
                        className="p-1 border border-zinc-805 rounded-md text-[7.5px] text-zinc-500 font-bold text-center bg-zinc-950 hover:text-white cursor-pointer"
                      >
                        Reset All
                      </button>
                    </div>
                  </div>
                )}

                {/* Mini confirmation tags */}
                {(managerWithdrawalPhoto || managerWithdrawalCard) && (
                  <div className="p-1 text-[8px] text-emerald-400 font-bold bg-emerald-950/20 rounded flex items-center gap-1">
                    <span>✓ Security Assets:</span>
                    {managerWithdrawalPhoto && <span className="bg-emerald-500/10 px-1 py-0.2 rounded font-black">Face photo</span>}
                    {managerWithdrawalCard && <span className="bg-emerald-500/10 px-1 py-0.2 rounded font-black font-mono">Card ID</span>}
                  </div>
                )}
              </div>
            )}

            {/* Automated Recurring Toggle - ONLY for deposits */}
            {txType === 'deposit' && (
              <div className="p-3.5 bg-zinc-950/70 border border-zinc-900 rounded-2xl flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5 text-left">
                    <span className="text-[11px] font-black text-zinc-350 uppercase tracking-wide leading-none flex items-center gap-1.5 select-none">
                      ⏱️ Set Auto-Recurring Savings Plan
                    </span>
                    <span className="text-[9px] text-zinc-550 select-none">
                      Auto-deposits matching this amount at scheduled intervals.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTxIsRecurring(!txIsRecurring)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                      txIsRecurring ? 'bg-[#14cfb4]' : 'bg-zinc-850'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-slate-950 transition-all ${
                        txIsRecurring ? 'translate-x-[20px]' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Interval options plans */}
                {txIsRecurring && (
                  <div className="flex flex-col gap-1.5 border-t border-zinc-900/40 pt-2 text-left animate-fade-in">
                    <label className="text-[8px] font-black text-[#14cfb4] uppercase tracking-wider block">
                      Select Automated Interval Plans
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTxRecurringInterval('weekly')}
                        className={`py-1.5 px-3 rounded-lg text-[10px] font-bold text-center border transition-all cursor-pointer ${
                          txRecurringInterval === 'weekly'
                            ? 'bg-[#14cfb4]/10 border-[#14cfb4] text-[#14cfb4]'
                            : 'bg-zinc-950 border-zinc-900 text-zinc-500 hover:text-zinc-350'
                        }`}
                      >
                        🔄 Weekly Interval (7 Days)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTxRecurringInterval('monthly')}
                        className={`py-1.5 px-3 rounded-lg text-[10px] font-bold text-center border transition-all cursor-pointer ${
                          txRecurringInterval === 'monthly'
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
            )}

            <button
              type="submit"
              disabled={isTxSubmitting || (txType === 'withdrawal' && !managerWithdrawalPhoto && !managerWithdrawalCard)}
              className={`w-full py-2.5 rounded-xl font-extrabold text-xs tracking-wider uppercase active:scale-95 transition-all cursor-pointer ${
                isTxSubmitting
                  ? 'bg-zinc-850 text-zinc-550 border border-zinc-900 cursor-not-allowed'
                  : txType === 'deposit' 
                    ? 'bg-[#14cfb4] text-black hover:bg-[#12b9a1]' 
                    : managerWithdrawalPhoto || managerWithdrawalCard
                      ? 'bg-amber-500 text-black hover:bg-amber-400 font-black shadow-lg'
                      : 'bg-zinc-850 text-zinc-500 border border-zinc-900 cursor-not-allowed'
              }`}
            >
              {isTxSubmitting
                ? 'Processing record...'
                : txType === 'deposit' 
                  ? 'Post Contribution Ledger entry' 
                  : (managerWithdrawalPhoto || managerWithdrawalCard)
                    ? 'Post Payout Box entry ✓'
                    : 'Needs Biometric / Card ID 🔒'
              }
            </button>
          </form>

          {/* History list inside Customer Details */}
          <div className="flex flex-col gap-2 mt-2">
            <span className="text-[11px] font-extrabold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 px-0.5">
              <History className="w-3.5 h-3.5 text-zinc-650" />
              <span>LOGGED STATEMENT</span>
            </span>

            <div className="bg-black/35 border border-zinc-900 rounded-2xl p-4 flex flex-col gap-2.5 max-h-[220px] overflow-y-auto">
              {customerHistory.length === 0 ? (
                <div className="text-center py-5 text-zinc-600 text-xs font-medium">No contribution logs yet on this ledger.</div>
              ) : (
                customerHistory.map((h, idx) => {
                  const isDeposit = h.type === 'deposit';
                  return (
                    <button
                      key={`${h.id}-${idx}`}
                      onClick={() => setSelectedTxDetail(h)}
                      type="button"
                      className="w-full text-left flex justify-between items-center text-xs py-2 px-2.5 -mx-1 hover:bg-zinc-900/30 rounded-xl transition-all cursor-pointer group hover:scale-[1.01] select-none border-b border-zinc-900/60 last:border-0 pb-2.5 last:pb-0"
                    >
                      <div className="flex items-center gap-2.5">
                        {(() => {
                          const custPhoto = h.withdrawalPhoto || selectedCustomer.profileImage;
                          const initials = selectedCustomer.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
                          return (
                            <div className="relative shrink-0 select-none">
                              {custPhoto ? (
                                <img src={custPhoto} className="w-9 h-9 rounded-full object-cover border border-zinc-800 animate-fade-in" alt="Customer avatar" referrerPolicy="no-referrer" />
                              ) : (
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-black text-white bg-gradient-to-br ${
                                  isDeposit ? 'from-teal-500 to-emerald-600' : 'from-rose-550 to-amber-500'
                                }`}>
                                  {initials}
                                </div>
                              )}
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border border-zinc-950 text-[9px] ${
                                isDeposit ? 'bg-emerald-500 text-black font-extrabold' : 'bg-amber-500 text-black font-extrabold'
                              }`}>
                                {isDeposit ? '↓' : '↑'}
                              </div>
                            </div>
                          );
                        })()}
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-zinc-200 group-hover:text-[#14cfb4] transition-colors">{isDeposit ? 'Deposit' : 'Withdrawal'}</span>
                          <span className="text-[9px] font-medium text-zinc-400 leading-none">by {h.staffName || 'HQ'}</span>
                          <span className="text-[8.5px] font-mono font-medium text-zinc-500 mt-0.5">
                            {(() => {
                              try {
                                const d = new Date(h.timestamp);
                                return d.toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                });
                              } catch {
                                return h.timestamp;
                              }
                            })()}
                          </span>
                        </div>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase inline-block font-sans self-start mt-0.5 ${
                          h.status === 'approved' ? 'bg-emerald-950/20 text-[#30d178]' :
                          h.status === 'pending' ? 'bg-amber-950/15 text-amber-400' : 'bg-red-950/10 text-red-400'
                        }`}>{h.status}</span>
                      </div>
                      <div className="text-right flex flex-col gap-0.5 shrink-0 pl-2">
                        <span className="font-mono font-bold text-zinc-150">{formatNaira(h.amount, false)}</span>
                        <span className="text-[9px] font-mono text-zinc-650">{h.reference}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* PROFILE ACTION ACTIONS (SUSPEND & DELETE) exact match with Screenshot 3 */}
        <div className="grid grid-cols-2 gap-4 border-t border-zinc-900/50 pt-6 mt-4 pb-8">
          <button 
            onClick={() => {
              const nextStatusState = isActive ? 'inactive' : 'active';
              onToggleStatus(selectedCustomer.id, nextStatusState);
              logCustomerActivity(
                selectedCustomer.id,
                'status_change',
                nextStatusState === 'active' ? 'Account Activated' : 'Account Suspended',
                `Mobilizer savings card was ${nextStatusState === 'active' ? 're-activated for public savings' : 'suspended and temporarily frozen'} by management.`
              );
              showToast(`Savings card has been successfully ${nextStatusState === 'active' ? 'Activated' : 'Suspended'}.`, "success");
            }}
            className="py-3.5 bg-[#111311] hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 text-zinc-350 font-black text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer text-center active:scale-95 shadow-sm"
          >
            {isActive ? 'Suspend' : 'Activate'}
          </button>

          <button 
            onClick={() => {
              if (confirm(`Are you sure you want to completely de-provision and DELETE "${selectedCustomer.name}" from the systems?`)) {
                onDeleteCustomer(selectedCustomer.id);
                setSelectedCustomerId(null);
                showToast(`Customer successfully deleted.`, "success");
              }
            }}
            className="py-3.5 bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-900/40 font-black text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer text-center active:scale-95 shadow-md shadow-red-950/5"
          >
            Delete
          </button>
        </div>

        {/* DEDICATED AUDIT TRAIL SECTION */}
        <div className="flex flex-col gap-4 mt-2 mb-4">
          <div className="flex items-center gap-2 border-b border-zinc-900/60 pb-3 pl-1">
            <History className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-widest">Master Audit Trail</h3>
          </div>
          <div className="bg-[#0b0c0b] border border-zinc-900/60 rounded-[24px] p-6 shadow-sm overflow-hidden">
            {(() => {
              // Assemble dynamic transaction activities
              const txActivities = customerHistory.map(t => {
                const isDeposit = t.type === 'deposit';
                return {
                  id: t.id,
                  type: t.type,
                  title: isDeposit ? 'Savings Deposit' : 'Savings Withdrawal',
                  description: `${isDeposit ? 'Deposited' : 'Withdrew'} ${formatCustomCurrency(t.amount, false)}${t.profitAmount ? ` with a profit/bonus applied of ${formatCustomCurrency(t.profitAmount, false)}` : ''} via agent ${t.staffName || 'HQ Agent'} (Ref: ${t.reference}).`,
                  timestamp: t.timestamp,
                  status: t.status,
                  amount: t.amount,
                  ref: t.reference,
                  agent: t.staffName || 'HQ'
                };
              });

              // LocalStorage status logs
              let localLogs: any[] = [];
              try {
                const saved = JSON.parse(localStorage.getItem('contribopay_status_logs') || '[]');
                localLogs = saved.filter((l: any) => l.customerId === selectedCustomer.id).map((l: any) => ({
                  id: l.id,
                  type: 'status',
                  title: l.title,
                  description: l.description,
                  timestamp: l.timestamp,
                  status: 'completed'
                }));
              } catch (e) {
                console.error(e);
              }

              // Auto-generated Enrollment log from joinedDate
              const joinedDateStr = selectedCustomer.joinedDate || '2024-06-01T08:00:00Z';
              const enrollmentLog = {
                id: `enroll-${selectedCustomer.id}`,
                type: 'enrollment',
                title: 'Account Enrollment Activated',
                description: `Customer account registered under staff collector: ${assignedStaffObj?.name || 'General staff'} (${assignedStaffObj?.code || assignedStaffObj?.initials || 'HQ'}). Starting balance initialized of ${formatCustomCurrency(selectedCustomer.balance, false)}.`,
                timestamp: joinedDateStr,
                status: 'system'
              };

              const timeline = [...txActivities, ...localLogs, enrollmentLog];
              timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

              if (timeline.length === 0) {
                return <div className="text-center py-8 text-zinc-650 text-xs">No audit history found.</div>;
              }

              return (
                <div className="relative border-l-2 border-zinc-800/60 pl-6 space-y-6 text-left ml-2 py-2">
                  {timeline.map((evt, idx) => {
                    const isDep = evt.type === 'deposit';
                    const isWith = evt.type === 'withdrawal';
                    const isStat = evt.type === 'status';
                    const isEnroll = evt.type === 'enrollment';

                    let dotColor = 'bg-zinc-900 border-zinc-800 text-zinc-500';
                    let badgeSymbol = <Shield className="w-3.5 h-3.5" />;
                    
                    if (isDep) {
                      dotColor = 'bg-emerald-950 text-emerald-400 border-emerald-800/60 border';
                      badgeSymbol = <TrendingUp className="w-3.5 h-3.5" />;
                    } else if (isWith) {
                      dotColor = 'bg-amber-950 text-amber-500 border-amber-800/60 border';
                      badgeSymbol = <ArrowUpRight className="w-3.5 h-3.5" />;
                    } else if (isStat) {
                      dotColor = 'bg-purple-950 text-purple-400 border-purple-800/60 border';
                      badgeSymbol = <AlertCircle className="w-3.5 h-3.5" />;
                    } else if (isEnroll) {
                      dotColor = 'bg-cyan-950 text-cyan-400 border-cyan-800/60 border';
                      badgeSymbol = <UserCheck className="w-3.5 h-3.5" />;
                    }

                    return (
                      <div key={`${evt.id}-${idx}`} className="relative group">
                        {/* Timeline indicator node */}
                        <div className={`absolute -left-[41px] top-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 duration-300 ${dotColor}`}>
                          {badgeSymbol}
                        </div>

                        {/* Card detail wrapper */}
                        <div className="flex flex-col gap-1.5 p-4 bg-[#111311]/50 border border-zinc-900/50 hover:bg-[#111311] rounded-2xl hover:border-zinc-800 transition-all">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className="font-extrabold text-[12px] text-zinc-200 group-hover:text-white transition-all leading-snug flex items-center gap-2">
                              {evt.title}
                              {evt.status === 'pending' && (
                                <span className="text-[8px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded font-black uppercase ring-1 ring-inset ring-amber-500/20 animate-pulse">Pending</span>
                              )}
                              {evt.status === 'rejected' && (
                                <span className="text-[8px] bg-rose-500/10 text-rose-500 px-1.5 py-0.5 rounded font-black uppercase ring-1 ring-inset ring-rose-500/20">Rejected</span>
                              )}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500 shrink-0 font-bold bg-zinc-900/30 px-2 py-1 rounded-md border border-zinc-800/50">
                              {(() => {
                                try {
                                  const d = new Date(evt.timestamp);
                                  return d.toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  });
                                } catch {
                                  return evt.timestamp;
                                }
                              })()}
                            </span>
                          </div>

                          <p className="text-[11.5px] text-zinc-400 font-medium leading-relaxed max-w-3xl mt-1">
                            {evt.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

        {/* RECENT ACTIVITY EXPANDABLE SLIDE-OUT DRAWER / SIDEBAR */}
        <AnimatePresence>
          {isActivityDrawerOpen && (
            <div className="fixed inset-0 z-50 flex justify-end">
              {/* Backdrop with elegant visual blur */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsActivityDrawerOpen(false)}
                className="absolute inset-0 bg-black/75 backdrop-blur-xs cursor-pointer transition-opacity"
              />
              
              {/* Drawer Panel */}
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="relative w-full max-w-md bg-[#0b0c0b] border-l border-zinc-900 h-full shadow-2xl flex flex-col z-10 overflow-hidden"
              >
                {/* Header */}
                <div className="p-6 border-b border-zinc-900 flex items-center justify-between bg-[#111311]">
                  <div className="flex flex-col gap-1 text-left">
                    <span className="text-[9.5px] font-black text-[#14cfb4] uppercase tracking-widest flex items-center gap-1.5 leading-none">
                      <Activity className="w-3.5 h-3.5" /> RECENT ACTIVITY LEDGER
                    </span>
                    <h3 className="text-sm font-black text-white uppercase mt-1 tracking-tight truncate max-w-[280px]">
                      {selectedCustomer.name}
                    </h3>
                    <span className="text-[10px] font-mono text-zinc-500 font-bold leading-none mt-0.5">
                      Acct: {selectedCustomer.accountNumber || `30${(selectedCustomer.phoneNumber || selectedCustomer.id).slice(-8)}`}
                    </span>
                  </div>
                  <button 
                    onClick={() => setIsActivityDrawerOpen(false)}
                    className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Info summary metric bar */}
                <div className="grid grid-cols-2 divide-x divide-zinc-900 bg-black/20 border-b border-zinc-900/60 p-4 shrink-0">
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider">Total balance</span>
                    <span className="text-sm font-mono font-black text-[#14cfb4] mt-1">
                      {formatCustomCurrency(selectedCustomer.balance, false)}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider">Status on card</span>
                    <span className={`text-[9.5px] font-mono font-black px-2 py-0.5 rounded uppercase mt-0.5 ${
                      isActive ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/20' : 'bg-red-950/30 text-red-400 border border-red-900/20'
                    }`}>
                      {selectedCustomer.status}
                    </span>
                  </div>
                </div>

                {/* Scrollable Timeline */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                  {(() => {
                    // Assemble dynamic transaction activities
                    const txActivities = customerHistory.map(t => {
                      const isDeposit = t.type === 'deposit';
                      return {
                        id: t.id,
                        type: t.type,
                        title: isDeposit ? 'Savings Deposit contribution' : 'Savings Withdrawal log',
                        description: `${isDeposit ? 'Deposited contribution' : 'Withdrew cashout'} of ${formatCustomCurrency(t.amount, false)} via agent ${t.staffName || 'HQ Agent'} using ref ${t.reference}.`,
                        timestamp: t.timestamp,
                        status: t.status,
                        amount: t.amount,
                        ref: t.reference,
                        agent: t.staffName || 'HQ'
                      };
                    });

                    // LocalStorage status logs
                    let localLogs: any[] = [];
                    try {
                      const saved = JSON.parse(localStorage.getItem('contribopay_status_logs') || '[]');
                      localLogs = saved.filter((l: any) => l.customerId === selectedCustomer.id).map((l: any) => ({
                        id: l.id,
                        type: 'status',
                        title: l.title,
                        description: l.description,
                        timestamp: l.timestamp,
                        status: 'completed'
                      }));
                    } catch (e) {
                      console.error(e);
                    }

                    // Auto-generated Enrollment log from joinedDate
                    const joinedDateStr = selectedCustomer.joinedDate || '2024-06-01T08:00:00Z';
                    const enrollmentLog = {
                      id: `enroll-${selectedCustomer.id}`,
                      type: 'enrollment',
                      title: 'Account Enrollment Activated',
                      description: `Customer account registered under staff collector: ${assignedStaffObj?.name || 'General staff'} (${assignedStaffObj?.code || assignedStaffObj?.initials || 'HQ'}). Starting balance initialized of ${formatCustomCurrency(selectedCustomer.balance, false)}.`,
                      timestamp: joinedDateStr,
                      status: 'system'
                    };

                    const timeline = [...txActivities, ...localLogs, enrollmentLog];
                    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                    if (timeline.length === 0) {
                      return <div className="text-center py-8 text-zinc-650 text-xs">No activity history logged.</div>;
                    }

                    return (
                      <div className="relative border-l border-zinc-900 pl-5.5 space-y-6 text-left">
                        {timeline.map((evt, idx) => {
                          const isDep = evt.type === 'deposit';
                          const isWith = evt.type === 'withdrawal';
                          const isStat = evt.type === 'status';
                          const isEnroll = evt.type === 'enrollment';

                          let dotColor = 'bg-zinc-800 border-zinc-750 text-zinc-400';
                          let badgeSymbol = '📝';
                          if (isDep) {
                            dotColor = 'bg-emerald-950 text-emerald-400 border border-emerald-800/40';
                            badgeSymbol = '↓';
                          } else if (isWith) {
                            dotColor = 'bg-amber-950 text-amber-500 border border-amber-800/40';
                            badgeSymbol = '↑';
                          } else if (isStat) {
                            dotColor = 'bg-purple-950 text-purple-400 border border-purple-800/40';
                            badgeSymbol = '⚙️';
                          } else if (isEnroll) {
                            dotColor = 'bg-teal-950 text-teal-400 border border-teal-800/40';
                            badgeSymbol = '🛡️';
                          }

                          return (
                            <div key={`${evt.id}-${idx}`} className="relative group">
                              {/* Timeline indicator node */}
                              <div className={`absolute -left-[30.5px] top-1.5 w-6.5 h-6.5 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm ${dotColor}`}>
                                {badgeSymbol}
                              </div>

                              {/* Card detail wrapper */}
                              <div className="flex flex-col gap-1.5 bg-[#0e0f0e] border border-zinc-900 rounded-2xl p-4 hover:border-zinc-800 hover:bg-[#111211] transition-all">
                                <div className="flex items-start justify-between gap-2">
                                  <span className="font-extrabold text-[12px] text-zinc-200 group-hover:text-[#14cfb4] transition-all leading-snug">
                                    {evt.title}
                                  </span>
                                  <span className="text-[9px] font-mono text-zinc-500 shrink-0 font-bold mt-0.5">
                                    {(() => {
                                      try {
                                        const d = new Date(evt.timestamp);
                                        return d.toLocaleString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          hour12: true
                                        });
                                      } catch {
                                        return evt.timestamp;
                                      }
                                    })()}
                                  </span>
                                </div>

                                <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                                  {evt.description}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-zinc-900 bg-[#0c0d0c] text-center shrink-0">
                  <span className="text-[9.5px] text-zinc-600 font-bold uppercase tracking-wider">
                    Postings backed by Dan Godal savings Security Standard
                  </span>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    );
  }

  // --- BULK NOTIFY TEMPLATE DEFINITIONS & DISPATCH LOGIC ---
  const getTemplateText = (key: string) => {
    switch (key) {
      case 'balance':
        return "Hello {name}, your ContriboPay account balance is {balance}. Keep saving to reach your priority goals! - ContriboPay Team";
      case 'reminder':
        return "Urgent: Hello {name}, our mobilization officer {agent} will visit your zone ({location}) today. Please have your daily savings ready! - ContriboPay Team";
      case 'maintenance':
        return "System Alert: Hello {name}, please note that we are upgrading our server. Deposits will reflect inside 2 hours. - ContriboPay Support";
      case 'low_balance':
        return "Alert: Hello {name}, your balance of {balance} is below the threshold. Contact {agent} today for a top-up. - ContriboPay Team";
      default:
        return bulkNotifyCustomMessage;
    }
  };

  const getParsedMessage = (templateString: string, customer: Customer) => {
    const staffObj = staff.find(s => s.id === customer.assignedStaffId);
    return templateString
      .replace(/{name}/g, customer.name)
      .replace(/{balance}/g, formatNaira(customer.balance, true))
      .replace(/{location}/g, customer.location || 'Kaduna North')
      .replace(/{agent}/g, staffObj?.name || 'Mobilizer Officer')
      .replace(/{reference}/g, 'TX-' + Math.floor(100000 + Math.random() * 900000));
  };

  const handleSendBulkNotifications = async () => {
    if (selectedBulkNotifyIds.length === 0) return;
    setIsSendingNotifications(true);
    setNotificationProgress(0);
    
    const selectedCustomers = customers.filter(c => selectedBulkNotifyIds.includes(c.id));
    const logs: string[] = [];
    
    // Progressively update status
    for (let i = 0; i < selectedCustomers.length; i++) {
      const cust = selectedCustomers[i];
      // Small wait to give a genuine real-time processor feel
      await new Promise(resolve => setTimeout(resolve, i === 0 ? 550 : 350));
      
      const rawText = bulkNotifyTemplate === 'custom' ? bulkNotifyCustomMessage : getTemplateText(bulkNotifyTemplate);
      const parsedText = getParsedMessage(rawText || 'Verify account status with agent.', cust);
      
      const channelName = bulkNotifyChannel === 'sms' ? 'SMS' : 'WhatsApp';
      const logMsg = `Sent ${channelName} to ${cust.name} (${cust.phoneNumber})`;
      logs.push(logMsg);
      setNotificationLogs([...logs]);
      
      logCustomerActivity(
        cust.id,
        'other',
        `Bulk ${bulkNotifyChannel.toUpperCase()} Dispatched`,
        `Digital broadcast sent via ${channelName}: "${parsedText}"`
      );
      
      setNotificationProgress(Math.round(((i + 1) / selectedCustomers.length) * 100));
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
    setIsSendingNotifications(false);
    showToast(`Successfully completed broadcasting channel broadcasts to ${selectedCustomers.length} customers over secure pipeline!`, "success");
    setSelectedBulkNotifyIds([]);
    setIsBulkNotifyOpen(false);
    setNotificationLogs([]);
  };

  // --- CATALOG LIST VIEW (Screenshot 1) ---
  return (
    <div className="w-full flex flex-col gap-6 select-none pb-12 animate-fade-in">
      
      {/* Directory Title and Premium Export CSV Button (Screenshot 1) */}
      <div className="flex items-center justify-between gap-4 mt-1 pb-1">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-2xl font-black text-zinc-150 tracking-tight">All Customers</h2>
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">{filteredCustomers.length} total accounts</span>
        </div>

        <div className="flex items-center gap-2">
          {/* CSV Export */}
          <button 
            onClick={handleExportCSV}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#14cfb4] hover:bg-[#12b9a1] text-black text-xs font-black rounded-full active:scale-95 transition-all cursor-pointer shadow-md shadow-[#14cfb4]/10"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {/* New Customer */}
          <button 
            onClick={() => setShowAddForm(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#111311] hover:bg-zinc-850 border border-zinc-900 text-teal-400 text-xs font-black rounded-full active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Customer</span>
          </button>
        </div>
      </div>

      {/* Prominent Real-Time Search Bar across the Top of the Customers Tab */}
      <div id="customers-top-search-bar" className="relative w-full h-11.5">
        <Search className="absolute left-4 top-3.5 w-4.5 h-4.5 text-teal-400" />
        <input 
          type="text"
          placeholder="Search and filter customers in real-time by Name, Account Number, Phone, NUBAN, subscriber ID, or Assigned Mobilizer..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-full pl-11.5 pr-11 bg-[#111311] text-xs font-bold text-zinc-200 border border-zinc-900 hover:border-zinc-800 focus:border-[#14cfb4] rounded-2xl focus:outline-none placeholder-zinc-550 font-sans transition-all shadow-lg shadow-black/25"
        />
        {searchQuery && (
          <button 
            type="button" 
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-3.5 text-[9px] font-black uppercase tracking-widest text-[#14cfb4] bg-[#14cfb4]/10 border border-[#14cfb4]/20 px-2 py-0.5 rounded-md hover:bg-[#14cfb4]/20 transition-all cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Dynamic Summary Cards for Customer Dir */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4.5">
        <div className="bg-[#111311] border border-zinc-900/60 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
            <Coins className="w-3 h-3 text-teal-400" /> TOTAL VALUATION
          </span>
          <span className="text-lg font-mono font-black text-zinc-100 mt-1.5">
            {formatNaira(customers.reduce((acc, c) => acc + c.balance, 0), false)}
          </span>
          <span className="text-[10px] text-zinc-550 font-semibold mt-1">Platform assets escrow</span>
        </div>

        <div className="bg-[#111311] border border-zinc-900/60 rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-[9px] font-black text-zinc-550 uppercase tracking-widest flex items-center gap-1.5">
            <UserCheck className="w-3 h-3 text-emerald-400" /> ACTIVE CONTRIBUTORS
          </span>
          <span className="text-lg font-mono font-black text-[#14cfb4] mt-1.5">
            {customers.filter(c => c.status === 'active').length} Members
          </span>
          <span className="text-[10px] text-zinc-550 font-semibold mt-1">
            {((customers.filter(c => c.status === 'active').length / (customers.length || 1)) * 100).toFixed(0)}% retention index
          </span>
        </div>

        <div className="hidden lg:flex bg-[#111311] border border-zinc-900/60 rounded-2xl p-4 flex-col justify-between">
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-indigo-400" /> AVERAGE VALUE
          </span>
          <span className="text-lg font-mono font-black text-zinc-150 mt-1.5">
            {formatNaira(customers.length > 0 ? (customers.reduce((acc, c) => acc + c.balance, 0) / customers.length) : 0, false)}
          </span>
          <span className="text-[10px] text-zinc-550 font-semibold mt-1">Average saver equity</span>
        </div>
      </div>

      {/* Modern Real-Time Filter bar Container */}
      <div className="bg-[#111311] border border-zinc-900 rounded-[24px] p-4.5 flex flex-col gap-3 shadow-sm">
        {/* Row 1: Filters Group */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs w-full">
          
          {/* Leftside: Filter Pills Group */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider">Status:</span>
              <div className="flex bg-[#090a09] border border-zinc-900 p-0.5 rounded-lg select-none">
                {(['all', 'active', 'inactive'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all cursor-pointer ${
                      statusFilter === st
                        ? 'bg-[#13372f] border border-[#14cfb4]/25 text-[#14cfb4]'
                        : 'text-zinc-500 hover:text-[#14cfb4] border border-transparent'
                    }`}
                  >
                    {st === 'all' ? 'All' : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <span className="hidden md:inline text-zinc-800">|</span>

            {/* Balance Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider font-sans">Cap limits:</span>
              <div className="flex bg-[#090a09] border border-zinc-900 p-0.5 rounded-lg select-none">
                <button
                  type="button"
                  onClick={() => setBalanceFilter('all')}
                  className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all cursor-pointer ${
                    balanceFilter === 'all'
                      ? 'bg-[#13372f] border border-[#14cfb4]/25 text-[#14cfb4]'
                      : 'text-zinc-500 hover:text-[#14cfb4] border border-transparent'
                  }`}
                >
                  All Vol
                </button>
                <button
                  type="button"
                  onClick={() => setBalanceFilter('low')}
                  className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all cursor-pointer ${
                    balanceFilter === 'low'
                      ? 'bg-red-955/40 border border-red-900/30 text-rose-450'
                      : 'text-rose-600 hover:text-rose-500 border border-transparent'
                  }`}
                >
                  Low Bal
                </button>
              </div>
            </div>
          </div>

          {/* Rightside: Collector assigned Dropdown Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
            <span className="text-[10px] font-bold text-zinc-555 uppercase tracking-wider shrink-0 font-sans">Mobilizer:</span>
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="py-1.5 px-3 bg-[#090a09] text-[11px] font-semibold text-zinc-300 border border-zinc-900 rounded-lg focus:outline-none focus:border-[#14cfb4] cursor-pointer"
            >
              <option value="all">👥 Show All Agents</option>
              {staff.map((s, idx) => (
                <option key={`${s.id}-${idx}`} value={s.id}>
                  👤 [{s.code || s.initials}] {s.name}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Filter Summary Status */}
        {(searchQuery || statusFilter !== 'all' || balanceFilter !== 'all' || staffFilter !== 'all') && (
          <div className="flex items-center justify-between border-t border-zinc-900/60 pt-3 select-none text-[10.5px]">
            <div className="text-zinc-550 flex items-center gap-1.5 flex-wrap">
              <span>Filtering active: matched <strong className="text-zinc-300 font-bold">{filteredCustomers.length}</strong> of {customers.length} savers.</span>
              <span className="bg-[#14cfb4]/10 text-[#14cfb4] border border-[#14cfb4]/20 px-2 py-0.2 rounded font-mono font-bold text-[9px] uppercase tracking-wider">
                Ledger Live
              </span>
            </div>
            
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setBalanceFilter('all');
                setStaffFilter('all');
              }}
              className="text-[10px] font-bold text-rose-450 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" /> Clear filters
            </button>
          </div>
        )}

      </div>

      {/* Add Customer Modal Form Pop-up */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#111311] border border-zinc-900 rounded-[28px] p-6.5 flex flex-col gap-5 relative shadow-2xl">
            <button 
              onClick={() => setShowAddForm(false)}
              className="absolute right-4.5 top-4.5 p-1.5 rounded-full hover:bg-zinc-805 text-zinc-550 hover:text-zinc-300 transition-colors cursor-pointer animate-fade-in"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-black text-zinc-100">Add New Customer</h3>
              <p className="text-xs text-zinc-500">Add a client card to enable daily payments and records securely.</p>
            </div>

            {formError && (
              <div className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 p-2.5 rounded-lg flex items-center gap-1.5">
                <span>⚠️ {formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCustomerSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Amina Bello"
                  className="w-full px-3.5 py-2 bg-[#090a09] border border-zinc-900 rounded-xl text-sm text-zinc-200 placeholder-zinc-700 focus:border-[#14cfb4] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Phone number</span>
                    <span className="text-[10px] text-[#14cfb4] font-black lowercase italic">optional</span>
                  </label>
                  <input 
                    type="text" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="No phone / Leave empty"
                    className="w-full px-3.5 py-2 bg-[#090a09] border border-zinc-900 rounded-xl text-sm text-zinc-200 placeholder-zinc-700 focus:border-[#14cfb4] focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Location Zone</label>
                  <input 
                    type="text" 
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Kaduna North"
                    className="w-full px-3.5 py-2 bg-[#090a09] border border-zinc-900 rounded-xl text-sm text-zinc-200 placeholder-zinc-700 focus:border-[#14cfb4] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Street Address</label>
                <input 
                  type="text" 
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. No. 12 Ahmadu Bello Way"
                  className="w-full px-3.5 py-2 bg-[#090a09] border border-zinc-900 rounded-xl text-sm text-zinc-200 placeholder-zinc-700 focus:border-[#14cfb4] focus:outline-none"
                />
              </div>



              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Assigned Collector Agent</label>
                <select
                  value={assignedStaff}
                  onChange={(e) => setAssignedStaff(e.target.value)}
                  className="w-full px-3 py-2 bg-[#090a09] border border-zinc-900 rounded-xl text-sm text-zinc-200 focus:border-[#14cfb4] focus:outline-none text-zinc-300"
                >
                  {staff.map((s, idx) => (
                    <option key={`${s.id}-${idx}`} value={s.id}>{s.name} ({s.code || s.initials}) [ID: {s.id}]</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Manager Notes</span>
                  <span className="text-[10px] text-zinc-650 font-semibold lowercase italic">Private Comments</span>
                </label>
                <textarea 
                  value={newManagerNotes}
                  onChange={(e) => setNewManagerNotes(e.target.value)}
                  placeholder="Verified merchant. Keep check on double-withdrawals."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-[#090a09] border border-zinc-900 rounded-xl text-xs text-zinc-200 placeholder-zinc-700 focus:border-[#14cfb4] focus:outline-none min-h-[60px] resize-y font-sans leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-3 mt-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-850 hover:bg-zinc-850/30 text-zinc-350 font-semibold text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 rounded-xl bg-[#14cfb4] hover:bg-[#12b9a1] text-black font-extrabold text-xs transition-all cursor-pointer shadow-lg shadow-[#14cfb4]/10"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detailed Transaction Modal Form Pop-up */}
      {selectedTxDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#111311] border border-zinc-900 rounded-[28px] p-6.5 flex flex-col gap-5 relative shadow-2xl animate-scale-in">
            <button 
              onClick={() => setSelectedTxDetail(null)}
              className="absolute right-4.5 top-4.5 p-1.5 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex flex-col gap-1.5 border-b border-zinc-900/50 pb-3">
              <span className="text-[10px] font-black text-[#14cfb4] uppercase tracking-widest flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> TRANSACTION METADATA
              </span>
              <h3 className="text-lg font-black text-zinc-100">Ledger Entry Details</h3>
            </div>

            <div className="flex flex-col gap-4">
              {/* Type & Status */}
              <div className="flex justify-between items-center bg-[#090a09] border border-zinc-900/40 p-3 rounded-2xl">
                <div className="flex items-center gap-2">
                  {selectedTxDetail.type === 'deposit' ? (
                    <ArrowDownLeft className="w-4 h-4 text-[#14cfb4] shrink-0" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-zinc-200 uppercase tracking-wide">
                      {selectedTxDetail.type}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-medium">Payment Type</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase inline-block font-sans ${
                    selectedTxDetail.status === 'approved' ? 'bg-emerald-950/20 text-[#30d178]' :
                    selectedTxDetail.status === 'pending' ? 'bg-amber-950/15 text-amber-400' : 'bg-red-950/10 text-red-500'
                  }`}>
                    {selectedTxDetail.status}
                  </span>
                </div>
              </div>

              {/* Data Rows */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-zinc-900/45">
                  <span className="text-zinc-500 font-semibold">Customer / Saver</span>
                  <span className="text-zinc-200 font-extrabold">{selectedTxDetail.customerName || selectedCustomer?.name}</span>
                </div>

                <div className="flex justify-between items-center text-xs pb-2 border-b border-zinc-900/45">
                  <span className="text-zinc-500 font-semibold">Post Amount</span>
                  <span className="text-[#14cfb4] font-mono font-black text-sm">{formatNaira(selectedTxDetail.amount, true)}</span>
                </div>

                <div className="flex justify-between items-center text-xs pb-2 border-b border-zinc-900/45">
                  <span className="text-zinc-500 font-semibold">Reference Number</span>
                  <span className="text-zinc-300 font-mono font-bold uppercase tracking-wider">{selectedTxDetail.reference}</span>
                </div>

                <div className="flex justify-between items-center text-xs pb-2 border-b border-zinc-900/45">
                  <span className="text-zinc-500 font-semibold">Submitting Agent</span>
                  <div className="flex flex-col items-end">
                    <span className="text-zinc-200 font-bold">{selectedTxDetail.staffName || 'HQ / Parent'}</span>
                    {selectedTxDetail.staffId && (
                      <span className="text-[9px] text-zinc-550 font-mono">ID: {selectedTxDetail.staffId}</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs pb-2">
                  <span className="text-zinc-500 font-semibold">Logged Timestamp</span>
                  <span className="text-zinc-300 font-mono text-right">
                    {(() => {
                      try {
                        return new Date(selectedTxDetail.timestamp).toLocaleString('en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: true
                        });
                      } catch {
                        return selectedTxDetail.timestamp;
                      }
                    })()}
                  </span>
                </div>
              </div>
            </div>

            {(() => {
              const relevantSmsAlert = state.alerts?.find(a => a.txId === selectedTxDetail.id && a.type === 'sms');
              const relevantWaAlert = state.alerts?.find(a => a.txId === selectedTxDetail.id && a.type === 'whatsapp');
              
              if (selectedTxDetail.type !== 'deposit' || selectedTxDetail.status !== 'approved') return null;

              return (
                <div id="outbound-alerts-panel" className="bg-[#090a09] border border-zinc-900 rounded-2xl p-4 flex flex-col gap-3 mt-1.5 text-left">
                  <div className="flex items-center justify-between border-b border-zinc-850 pb-2">
                    <span className="text-[10px] font-black text-[#14cfb4] uppercase tracking-wider flex items-center gap-1">
                      📲 AUTOMATED DISPATCH OUTCOMES
                    </span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-mono font-bold uppercase">
                      Delivered Live
                    </span>
                  </div>

                  {/* SMS Section */}
                  <div className="flex flex-col gap-1.5 bg-black/40 p-2.5 rounded-xl border border-zinc-900/50">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-extrabold text-zinc-300 flex items-center gap-1">
                        💬 SMS Credit Notification
                      </span>
                      <span className="text-[9.5px] text-[#30d178] font-bold">● Sent & Delivered</span>
                    </div>
                    <p className="text-[10.5px] font-mono text-zinc-400 bg-black/60 p-2 rounded-lg leading-relaxed select-all">
                      {relevantSmsAlert?.message || `Dan Godal savings Credit! Acct: *${selectedCustomer?.accountNumber?.slice(-4) || 'N/A'} Amt: ₦${(selectedTxDetail.amount || 0).toLocaleString()} Bal: ₦${(selectedCustomer?.balance || 0).toLocaleString()} Ref: ${selectedTxDetail.reference}. Thanks for saving!`}
                    </p>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          const smsText = relevantSmsAlert?.message || `Dan Godal savings Credit! Acct: *${selectedCustomer?.accountNumber?.slice(-4) || 'N/A'} Amt: ₦${(selectedTxDetail.amount || 0).toLocaleString()} Bal: ₦${(selectedCustomer?.balance || 0).toLocaleString()} Ref: ${selectedTxDetail.reference}. Thanks for saving!`;
                          navigator.clipboard.writeText(smsText);
                          showToast("📋 SMS custom content copied to clipboard!", "success");
                        }}
                        className="text-[9px] font-bold text-[#14cfb4] hover:underline cursor-pointer"
                      >
                        Copy SMS Content
                      </button>
                    </div>
                  </div>

                  {/* WhatsApp Section */}
                  <div className="flex flex-col gap-1.5 bg-black/40 p-2.5 rounded-xl border border-zinc-900/50">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-extrabold text-zinc-300 flex items-center gap-1">
                        📲 WhatsApp Receipt Tracker
                      </span>
                      <span className="text-[9px] text-[#30d178] font-bold font-mono">Auto Logged</span>
                    </div>
                    <p className="text-[10px] font-mono text-zinc-400 bg-black/60 p-1.5 rounded-lg leading-relaxed whitespace-pre-wrap select-all max-h-[110px] overflow-y-auto">
                      {relevantWaAlert?.message || `*Dan Godal savings HQ - Deposit Receipt*\nCustomer: ${selectedTxDetail.customerName || selectedCustomer?.name}\nAmount: ₦${(selectedTxDetail.amount || 0).toLocaleString()}\nRef: ${selectedTxDetail.reference}\nStatus: Completed ✅`}
                    </p>
                    
                    <div className="flex items-center justify-between gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const waText = relevantWaAlert?.message || `*Dan Godal savings HQ - Deposit Receipt*\nCustomer: ${selectedTxDetail.customerName || selectedCustomer?.name}\nAmount: ₦${(selectedTxDetail.amount || 0).toLocaleString()}\nRef: ${selectedTxDetail.reference}\nStatus: Completed ✅`;
                          navigator.clipboard.writeText(waText);
                          showToast("📋 WhatsApp custom receipt copied to clipboard!", "success");
                        }}
                        className="text-[9px] font-bold text-zinc-450 hover:text-zinc-300 hover:underline cursor-pointer"
                      >
                        Copy Receipt Text
                      </button>
                      
                      <a
                        href={`https://api.whatsapp.com/send?phone=${selectedCustomer?.phoneNumber ? selectedCustomer.phoneNumber.replace(/[^0-9+]/g, '') : ''}&text=${encodeURIComponent(relevantWaAlert?.message || `*Dan Godal savings HQ - Deposit Receipt*\nCustomer: ${selectedTxDetail.customerName || selectedCustomer?.name}\nAmount: ₦${(selectedTxDetail.amount || 0).toLocaleString()}\nRef: ${selectedTxDetail.reference}\nStatus: Completed ✅`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-500/20 hover:border-emerald-500/40 text-[#14cfb4] font-black text-[9.5px] uppercase tracking-wider rounded-md transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span>💬 Send via WhatsApp</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="mt-2">
              <button 
                onClick={() => setSelectedTxDetail(null)}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-black tracking-wider uppercase transition-colors cursor-pointer"
              >
                Dismiss Detail View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Directory Row Listing aligned perfectly to Screenshot 1 */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-[#111311] border border-zinc-900 rounded-[28px] p-12 text-center text-zinc-500 font-medium">
          No customer accounts found matching search term.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Master Selection Controls Bar */}
          <div className="flex items-center justify-between px-5 py-3 bg-[#111311] border border-zinc-900/60 rounded-[20px] select-none text-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const allFilteredIds = filteredCustomers.map(c => c.id);
                  const isAllSelected = allFilteredIds.every(id => selectedBulkNotifyIds.includes(id));
                  if (isAllSelected) {
                    // Deselect all filtered
                    setSelectedBulkNotifyIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
                  } else {
                    // Select all filtered
                    setSelectedBulkNotifyIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
                  }
                }}
                className={`flex items-center justify-center w-5 h-5 rounded-md border transition-all text-[#14cfb4] cursor-pointer ${
                  filteredCustomers.length > 0 && filteredCustomers.map(c => c.id).every(id => selectedBulkNotifyIds.includes(id))
                    ? 'bg-[#14cfb4]/10 border-[#14cfb4]'
                    : 'bg-zinc-950 border-zinc-850 hover:border-[#14cfb4]/40'
                }`}
              >
                {filteredCustomers.length > 0 && filteredCustomers.map(c => c.id).every(id => selectedBulkNotifyIds.includes(id)) ? (
                  <Check className="w-3.5 h-3.5 font-bold stroke-[3]" />
                ) : filteredCustomers.map(c => c.id).some(id => selectedBulkNotifyIds.includes(id)) ? (
                  <div className="w-2.5 h-0.5 bg-[#14cfb4] rounded-sm" />
                ) : null}
              </button>
              <div className="flex flex-col text-left">
                <span className="text-zinc-200 font-extrabold text-[11px] leading-tight">
                  {filteredCustomers.map(c => c.id).every(id => selectedBulkNotifyIds.includes(id)) ? 'Select None' : 'Check All Matching'}
                </span>
                <span className="text-[10px] text-zinc-500 font-semibold leading-none mt-0.5">
                  {selectedBulkNotifyIds.length} customer{selectedBulkNotifyIds.length !== 1 ? 's' : ''} selected
                </span>
              </div>
            </div>
            
            {selectedBulkNotifyIds.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setBulkNotifyCustomMessage('');
                    setIsBulkNotifyOpen(true);
                  }}
                  className="px-3.5 py-1.5 bg-[#14cfb4]/15 hover:bg-[#14cfb4]/25 border border-[#14cfb4]/35 text-[#14cfb4] font-black text-[10px] tracking-wider uppercase rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>Notify Bulk ({selectedBulkNotifyIds.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBulkNotifyIds([])}
                  className="text-rose-400 hover:text-rose-350 font-bold hover:underline cursor-pointer text-[10.5px]"
                >
                  Clear Selection
                </button>
              </div>
            )}
          </div>

          {filteredCustomers.map((c, idx) => {
            const isActive = c.status === 'active';
            const isBelowThreshold = c.balance < minThreshold;
            const assignedStaffObj = staff.find(s => s.id === c.assignedStaffId);

            return (
              <div 
                key={`${c.id}-${idx}`}
                id={`customer-card-${c.id}`}
                onClick={() => setSelectedCustomerId(c.id)}
                className={`w-full border rounded-[24px] p-4.5 flex items-center justify-between transition-all cursor-pointer select-none active:scale-[0.99] shadow-sm ${
                   isBelowThreshold 
                     ? 'bg-red-950/20 border-red-900/60 hover:bg-red-950/30 hover:border-red-800' 
                     : 'bg-[#111311]/85 border-zinc-900/60 hover:bg-zinc-900/45 hover:border-zinc-800'
                }`}
              >
                {/* Left section: Avatar + Details info */}
                <div className="flex items-center gap-4 min-w-0">
                  {/* Select Checkbox for Bulk Notifications */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation(); // prevent opening details view
                      setSelectedBulkNotifyIds(prev => 
                        prev.includes(c.id) 
                          ? prev.filter(id => id !== c.id) 
                          : [...prev, c.id]
                      );
                    }}
                    className={`shrink-0 w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                      selectedBulkNotifyIds.includes(c.id)
                        ? 'bg-[#14cfb4] border-[#14cfb4] text-black shadow shadow-[#14cfb4]/20'
                        : 'bg-zinc-950/80 border-zinc-850 hover:border-[#14cfb4]/40 text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 font-bold stroke-[3]" />
                  </button>

                  {/* Circle bubble initials layout inside elegant gradients or uploaded custom photo */}
                  <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 border border-white/5 shadow flex items-center justify-center">
                    {c.profileImage ? (
                      <img src={c.profileImage} className="w-full h-full object-cover" alt={c.name} referrerPolicy="no-referrer" />
                    ) : (
                      <div className={`w-full h-full font-black text-sm flex items-center justify-center uppercase tracking-widest ${getAvatarGradient(c.name)}`}>
                        {getInitials(c.name)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 min-w-0 text-left">
                    <span className="font-extrabold text-[16px] text-zinc-150 leading-tight tracking-tight truncate flex items-center gap-1.5 flex-wrap">
                      {c.name}
                      {c.staffCustomerId && (
                        <span className="text-[9px] font-mono font-black text-zinc-450 bg-zinc-950 px-1 py-0.5 rounded border border-zinc-900 shadow-sm uppercase shrink-0">
                          {c.staffCustomerId}
                        </span>
                      )}
                      {assignedStaffObj && (() => {
                        const styles = getStaffColorStyles(assignedStaffObj.id);
                        return (
                          <span className={`text-[9px] font-mono font-black ${styles.text} ${styles.bg} border ${styles.border} px-2 py-0.5 rounded-md uppercase shrink-0 flex items-center gap-1 shadow-sm`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
                            AGENT: {assignedStaffObj.code || assignedStaffObj.initials || assignedStaffObj.id}
                          </span>
                        );
                      })()}
                      {isBelowThreshold && (
                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-red-950/60 border border-red-900/30 text-rose-450 uppercase tracking-wider flex items-center gap-1">
                          <AlertCircle className="w-2.5 h-2.5 shrink-0" /> LOW BALANCE
                        </span>
                      )}
                    </span>
                    <span className="text-xs font-mono font-medium text-zinc-500 leading-none flex items-center gap-1.5 flex-wrap">
                      {c.username && (
                        <>
                          <span className="text-emerald-400 font-bold">@{c.username}</span>
                          <span className="text-zinc-700">•</span>
                        </>
                      )}
                      <span className="text-[#14cfb4] font-extrabold">{c.accountNumber || `30${(c.phoneNumber || c.id).slice(-8)}`}</span>
                      <span className="text-zinc-700">•</span>
                      <span>{c.phoneNumber}</span>
                      <span className="text-zinc-700">•</span>
                      <span className="truncate">{c.location || 'Kaduna North'}</span>
                    </span>
                  </div>
                </div>

                {/* Right section: Balance & Badge */}
                <div className="text-right flex flex-col items-end gap-1.5 shrink-0 pl-4">
                  <span className={`text-[17px] font-mono font-black tracking-wide ${
                    isBelowThreshold ? 'text-rose-450' : 'text-[#14cfb4]'
                  }`}>
                    {formatNaira(c.balance, true)}
                  </span>
                  
                  {/* Mini status pill */}
                  <span className={`px-2.5 py-0.5 text-[9.5px] font-black rounded-full border tracking-wider select-none uppercase ${
                    isActive 
                      ? 'bg-[#112415] text-[#30d178]/95 border-[#1d3d29]/40' 
                      : 'bg-zinc-950 text-zinc-650 border-zinc-900'
                  }`}>
                    {c.status}
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Floating 'Bulk Notify' action button and small panel when customers are selected */}
      {selectedBulkNotifyIds.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40 bg-[#111311] border border-[#14cfb4]/30 text-zinc-150 p-4.5 rounded-[24px] shadow-2xl shadow-teal-950/20 max-w-sm w-80 animate-slide-up flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#14cfb4] animate-pulse" />
              <span className="text-xs font-black tracking-wider uppercase text-zinc-300">Bulk Operations Mode</span>
            </div>
            <button
              onClick={() => setSelectedBulkNotifyIds([])}
              className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-zinc-400 font-medium">
            You have selected <strong className="text-teal-400 font-bold">{selectedBulkNotifyIds.length}</strong> customer accounts for bulk broadcasting alert profiles.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setBulkNotifyCustomMessage('');
                setIsBulkNotifyOpen(true);
              }}
              className="flex-1 py-2 rounded-xl bg-[#14cfb4] hover:bg-[#12b9a1] text-black font-black text-[11px] uppercase tracking-wider transition-all select-none flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-[#14cfb4]/10"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Configure Notification</span>
            </button>
          </div>
        </div>
      )}

      {/* Bulk Notify Modal form popup */}
      {isBulkNotifyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-[#111311] border border-zinc-900 rounded-[32px] p-6.5 flex flex-col gap-5 relative shadow-2xl animate-scale-in">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-900/50 pb-3">
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-black text-[#14cfb4] uppercase tracking-widest flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> BULK COMMUNICATIONS HUB
                </span>
                <h3 className="text-lg font-black text-zinc-100 mt-1">Send Automated Broadcast</h3>
              </div>
              {!isSendingNotifications && (
                <button 
                  onClick={() => setIsBulkNotifyOpen(false)}
                  className="p-1.5 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Selected targets count info */}
            <div className="bg-[#090a09] border border-zinc-900 p-3.5 rounded-2xl flex items-center justify-between text-xs">
              <span className="text-zinc-500 font-bold">Targeted Customers / Savers:</span>
              <span className="px-3 py-1 bg-[#13372f] text-[#14cfb4] font-mono font-black rounded-lg border border-[#14cfb4]/25">
                {selectedBulkNotifyIds.length} Recipients
              </span>
            </div>

            {/* Modal Body form */}
            {!isSendingNotifications ? (
              <div className="flex flex-col gap-4 text-left">
                {/* Channel Select */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest animate-pulse-slow">Select Route Channel</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setBulkNotifyChannel('sms')}
                      className={`py-3.5 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                        bulkNotifyChannel === 'sms'
                          ? 'bg-[#13372f]/35 border-[#14cfb4] text-[#14cfb4] shadow-sm shadow-[#14cfb4]/5'
                          : 'bg-[#090a09] border-[#1d1d1d] hover:border-[#2d2d2d] text-zinc-400 hover:text-zinc-250'
                      }`}
                    >
                      <Phone className="w-4 h-4" />
                      <span className="text-[11px] font-black uppercase tracking-wider leading-none">SMS Cellular</span>
                      <span className="text-[8.5px] text-zinc-500 lowercase italic leading-none mt-1">Carrier Network rates</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkNotifyChannel('whatsapp')}
                      className={`py-3.5 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                        bulkNotifyChannel === 'whatsapp'
                          ? 'bg-emerald-950/20 border-emerald-500/50 text-[#30d178] shadow-sm shadow-emerald-950/10'
                          : 'bg-[#090a09] border-[#1d1d1d] hover:border-[#2d2d2d] text-zinc-400 hover:text-zinc-250'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4 text-emerald-550" />
                      <span className="text-[11px] font-black uppercase tracking-wider leading-none">WhatsApp Chat</span>
                      <span className="text-[8.5px] text-zinc-500 lowercase italic leading-none mt-1">Instant delivery api</span>
                    </button>
                  </div>
                </div>

                {/* Templates Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">Select Message Template</label>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    {[
                      { key: 'custom', label: '✍️ Custom Field message' },
                      { key: 'balance', label: '📊 Account Balance Update' },
                      { key: 'reminder', label: '🏃 Mobilizer officer Visit' },
                      { key: 'maintenance', label: '🛠️ Server Maintenance' },
                      { key: 'low_balance', label: '⚠️ Alert: Low Threshold' }
                    ].map((tpl) => (
                      <button
                        key={tpl.key}
                        type="button"
                        onClick={() => {
                          setBulkNotifyTemplate(tpl.key);
                          if (tpl.key !== 'custom') {
                            setBulkNotifyCustomMessage(getTemplateText(tpl.key));
                          } else {
                            setBulkNotifyCustomMessage('');
                          }
                        }}
                        className={`px-3 py-2 rounded-xl border font-bold text-left transition-all truncate cursor-pointer ${
                          bulkNotifyTemplate === tpl.key
                            ? 'bg-zinc-850/60 border-[#14cfb4]/60 text-[#14cfb4]'
                            : 'bg-[#090a09] border-[#1d1d1d]/60 hover:border-zinc-800 text-zinc-400'
                        }`}
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message Text Area */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">Message Text Content</label>
                    <span className="text-[8.5px] font-mono text-zinc-550">Keys: {'{name}, {balance}, {agent}, {location}'}</span>
                  </div>
                  <textarea
                    rows={3}
                    value={bulkNotifyCustomMessage}
                    onChange={(e) => {
                      setBulkNotifyTemplate('custom');
                      setBulkNotifyCustomMessage(e.target.value);
                    }}
                    placeholder="Enter customized announcement notes... Variables like {name} and {balance} will be filled in dynamically for each customer automatically."
                    className="w-full px-4 py-3 bg-[#090a09] border border-zinc-850 rounded-2xl text-xs font-medium text-zinc-200 focus:outline-none focus:border-[#14cfb4] placeholder-zinc-700 resize-none leading-relaxed"
                  />
                </div>

                {/* Real-Time Preview Panel of First Selected Customer */}
                {(() => {
                  const firstCust = customers.find(c => selectedBulkNotifyIds.includes(c.id));
                  if (!firstCust) return null;
                  const currentRaw = bulkNotifyTemplate === 'custom' ? bulkNotifyCustomMessage : getTemplateText(bulkNotifyTemplate);
                  const previewText = getParsedMessage(currentRaw || 'Enter message text values above to see live preview rendering.', firstCust);
                  return (
                    <div className="bg-[#0e100e] border border-zinc-900/50 p-3.5 rounded-[18px] flex flex-col gap-1.5">
                      <span className="text-[9px] font-extrabold text-[#14cfb4] uppercase tracking-widest flex items-center gap-1 select-none">
                        🎯 Preview profile: {firstCust.name} (first recipient)
                      </span>
                      <div className="px-3.5 py-2.5 bg-[#050505] rounded-xl max-w-full text-[11px] text-zinc-300 border-l-2 border-[#14cfb4] italic leading-relaxed whitespace-pre-wrap">
                        {previewText}
                      </div>
                    </div>
                  );
                })()}

                {/* Perform Dispatch Action */}
                <button
                  type="button"
                  onClick={handleSendBulkNotifications}
                  disabled={!bulkNotifyCustomMessage.trim()}
                  className="w-full mt-2.5 py-3.5 bg-[#14cfb4] hover:bg-[#12b9a1] text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#14cfb4]/10 disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Execute Bulk Broadcasting alerts</span>
                </button>

              </div>
            ) : (
              /* PROGRESS METRICS */
              <div className="flex flex-col gap-4 text-left my-4">
                <div className="flex flex-col items-center justify-center gap-3 py-6">
                  <div className="w-12 h-12 rounded-full border-4 border-zinc-900 border-t-[#14cfb4] animate-spin" />
                  <span className="text-sm font-black text-[#14cfb4] uppercase tracking-wider">Broadcasting communications...</span>
                  <span className="text-xs text-zinc-500 font-bold">{notificationProgress}% progress finalized</span>
                </div>

                {/* Progress bar UI */}
                <div className="w-full bg-[#090a09] border border-zinc-900 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#14cfb4] h-full transition-all duration-300 rounded-full" 
                    style={{ width: `${notificationProgress}%` }}
                  />
                </div>

                {/* Micro operational transmission log timeline */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9.5px] font-black text-zinc-550 uppercase tracking-wider">Broadcast dispatch feeds:</span>
                  <div className="bg-[#090a09] border border-zinc-900/70 rounded-2xl p-4.5 max-h-40 overflow-y-auto font-mono text-[9px] text-[#14cfb4] flex flex-col gap-2 leading-relaxed h-32 scrollbar-thin">
                    {notificationLogs.length === 0 ? (
                      <span className="italic text-zinc-700 font-sans">Connecting to GSM routing server...</span>
                    ) : (
                      notificationLogs.map((log, lidx) => (
                        <div key={`notif-log-${lidx}`} className="flex gap-1.5 items-start">
                          <span className="text-[#30d178] shrink-0">✔</span>
                          <span className="text-zinc-200">{log}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
