import { useState, FormEvent, useEffect } from 'react';
import { Search, X, Check, Mail, Phone, MapPin, Briefcase, Plus, ShieldCheck, Trash2, ArrowLeft, TrendingUp, Clock, Activity, ArrowUpRight, Send } from 'lucide-react';
import { DashboardState, StaffMember } from '../types';
import { formatNaira } from './OverviewTab';
import { useToast } from './ToastProvider';

interface StaffTabProps {
  state: DashboardState;
  onAddStaff: (staff: any) => void;
  onToggleStatus: (id: string, status: 'active' | 'inactive') => void;
  onUpdateStaff: (id: string, updatedFields: Partial<StaffMember>) => void;
  onDeleteStaff: (id: string) => void;
  onFundStaffWallet?: (staffId: string, amount: number) => void;
}

type FilterRole = 'All' | 'Supervisor' | 'Collector' | 'Viewer';

// Standard comprehensive list of permissions from screen capture
const ALL_PERMISSIONS_DECLARATION = [
  { id: 'View All Customers', label: 'View All Customers', emoji: '👥' },
  { id: 'Record Collections', label: 'Record Collections', emoji: '💰' },
  { id: 'Approve Withdrawals', label: 'Approve Withdrawals', emoji: '🏦' },
  { id: 'Manage Staff', label: 'Manage Staff', emoji: '👤' },
  { id: 'View Reports', label: 'View Reports', emoji: '📊' },
  { id: 'App Settings', label: 'App Settings', emoji: '⚙️' },
  { id: 'Fraud Alerts', label: 'Fraud Alerts', emoji: '🚨' },
  { id: 'Send Bulk SMS', label: 'Send Bulk SMS', emoji: '📲' },
  { id: 'Audit Logs', label: 'Audit Logs', emoji: '📋' },
  { id: 'View Own Collections', label: 'View Own Collections', emoji: '📂' },
  { id: 'Generate Receipts', label: 'Generate Receipts', emoji: '📄' },
];

export const getDefaultPermissions = (role: 'Supervisor' | 'Collector' | 'Viewer'): string[] => {
  if (role === 'Supervisor') {
    return [
      'View All Customers',
      'Record Collections',
      'Approve Withdrawals',
      'Manage Staff',
      'View Reports',
      'Generate Receipts',
    ];
  }
  if (role === 'Viewer') {
    return [
      'View Reports',
      'View Own Collections',
    ];
  }
  // Collector Default Checklist matching screenshot
  return [
    'View All Customers',
    'Record Collections',
    'View Own Collections',
    'Generate Receipts',
  ];
};

export default function StaffTab({ 
  state, 
  onAddStaff, 
  onToggleStatus, 
  onUpdateStaff, 
  onDeleteStaff,
  onFundStaffWallet
}: StaffTabProps) {
  const { showToast } = useToast();
  const { staff } = state;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<FilterRole>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive' | 'Performance'>('All');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Navigation / active detail view state
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [performanceModalStaffId, setPerformanceModalStaffId] = useState<string | null>(null);

  // Edit fields state
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editWorkingAddress, setEditWorkingAddress] = useState('');
  const [editAccountNumber, setEditAccountNumber] = useState('');

  // New staff form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Supervisor' | 'Collector' | 'Viewer'>('Collector');
  const [location, setLocation] = useState('Kaduna North');
  const [workingAddress, setWorkingAddress] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [managerReferralCode, setManagerReferralCode] = useState('');
  const [formError, setFormError] = useState('');

  // Local sub-tabs on staff profile
  const [profileSubTab, setProfileSubTab] = useState<'details' | 'subscribers' | 'performance'>('details');
  const [subCustomerSearch, setSubCustomerSearch] = useState('');
  const [txSearchQuery, setTxSearchQuery] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'deposit' | 'withdrawal'>('all');
  const [txTimeframeFilter, setTxTimeframeFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('all');

  const selectedStaff = staff.find(s => s.id === selectedStaffId);

  // Reset sub-tabs on selecting a different staff member
  useEffect(() => {
    if (selectedStaffId) {
      setProfileSubTab('details');
      setSubCustomerSearch('');
      setTxSearchQuery('');
      setTxTypeFilter('all');
      setTxTimeframeFilter('all');
    }
  }, [selectedStaffId]);

  // Synchronize local edit values when selection or editing mode triggers
  useEffect(() => {
    if (selectedStaff) {
      setEditName(selectedStaff.name || '');
      setEditPhone(selectedStaff.phoneNumber || '');
      setEditEmail(selectedStaff.email || '');
      setEditLocation(selectedStaff.location || '');
      setEditWorkingAddress(selectedStaff.workingAddress || '');
      setEditAccountNumber(selectedStaff.accountNumber || '');
    }
  }, [selectedStaffId, isEditingInfo]);

  // Filtering based on search, role selector and status/performance filter
  const filteredStaff = staff.filter(member => {
    const matchesSearch = 
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phoneNumber.includes(searchQuery) ||
      member.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.code && member.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
      member.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = 
      selectedRole === 'All' || 
      member.role.toLowerCase() === selectedRole.toLowerCase();

    const matchesStatus = 
      statusFilter === 'All' || 
      statusFilter === 'Performance' ||
      member.status === statusFilter.toLowerCase();

    return matchesSearch && matchesRole && matchesStatus;
  }).sort((a, b) => {
    if (statusFilter === 'Performance') {
      const aTxs = state.transactions.filter(t => t.staffId === a.id && t.status === 'approved');
      const bTxs = state.transactions.filter(t => t.staffId === b.id && t.status === 'approved');
      const aVolume = aTxs.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
      const bVolume = bTxs.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
      return bVolume - aVolume; // Top performers (highest volume) first
    }
    return 0; // Maintain original order
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !email || !location || !workingAddress || !managerReferralCode) {
      setFormError('Please fill out all registration fields including manager referral code.');
      return;
    }

    // Validate Manager Referral Code
    const mCodeNormalized = managerReferralCode.trim().toLowerCase();
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
      setFormError('Invalid Manager Referral Code! You must enter a registered administrator/manager email address (e.g. admin@contribopay.ng).');
      return;
    }
    
    // Create new agent with the enriched parameters matching the list
    onAddStaff({
      name,
      phoneNumber: phone,
      email,
      role,
      location,
      workingAddress,
      accountNumber,
      status: 'active' as const,
      pinStatus: 'pending' as const,
      collectionsCount: 0,
      totalCollectionsAmount: 0,
      permissions: getDefaultPermissions(role),
    });

    // Reset Form
    setName('');
    setPhone('');
    setEmail('');
    setRole('Collector');
    setLocation('Kaduna North');
    setWorkingAddress('');
    setAccountNumber('');
    setManagerReferralCode('');
    setFormError('');
    setShowAddForm(false);
  };

  const handleSaveInfoEdits = () => {
    if (!selectedStaffId) return;
    if (!editName || !editPhone || !editEmail) {
      showToast("Name, phone, and email cannot be blank.", "error");
      return;
    }
    onUpdateStaff(selectedStaffId, {
      name: editName,
      phoneNumber: editPhone,
      email: editEmail,
      location: editLocation,
      workingAddress: editWorkingAddress,
      accountNumber: editAccountNumber,
      initials: editName.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
    });
    setIsEditingInfo(false);
  };

  const handleTogglePermission = (permId: string) => {
    if (!selectedStaffId || !selectedStaff) return;
    const currentPerms = selectedStaff.permissions || getDefaultPermissions(selectedStaff.role);
    let nextPerms: string[];
    if (currentPerms.includes(permId)) {
      nextPerms = currentPerms.filter(p => p !== permId);
    } else {
      nextPerms = [...currentPerms, permId];
    }
    onUpdateStaff(selectedStaffId, { permissions: nextPerms });
  };

  const getRoleEmoji = (r: string) => {
    if (r === 'Supervisor') return '👑';
    if (r === 'Viewer') return '👁️';
    return '💼';
  };

  // --- STAFF DETAIL PROFILE RENDER (Screenshots 2 - 6) ---
  if (selectedStaffId && selectedStaff) {
    const serialIndex = staff.findIndex(s => s.id === selectedStaff.id) + 1;
    const staffSerial = `S00${serialIndex}`;
    const isActive = selectedStaff.status === 'active';

    return (
      <div id="staff-profile-container" className="w-full flex flex-col gap-6 select-none pb-12 animate-fade-in">
        
        {/* Navigation Header Section */}
        <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
          <button 
            id="back-btn"
            onClick={() => {
              setSelectedStaffId(null);
              setIsEditingInfo(false);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#0a0c0a] hover:bg-zinc-900 border border-zinc-900 text-zinc-400 text-xs font-black rounded-xl cursor-pointer transition-all active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <h2 className="text-[13px] font-black text-zinc-400 uppercase tracking-[0.2em]">Staff Profile Detail</h2>

          <button 
            id="edit-profile-btn"
            onClick={() => setIsEditingInfo(!isEditingInfo)}
            className={`flex items-center gap-1.5 px-4.5 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
              isEditingInfo 
                ? 'bg-amber-500/10 border-amber-500/50 text-amber-500'
                : 'bg-[#0a0c0a] border-zinc-900 text-zinc-400 hover:bg-zinc-900'
            }`}
          >
            <span>✏️</span>
            <span>{isEditingInfo ? 'Cancel' : 'Edit'}</span>
          </button>
        </div>

        {/* Hero Card Banner - Redesigned to match Screenshot exactly but with Amber Staff Theme */}
        <div className="bg-[#0a0c0a] border border-zinc-900/50 rounded-[32px] p-8 flex flex-col items-center justify-center text-center gap-6 shadow-2xl relative overflow-hidden">
          {/* Background subtle amber gradient */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/5 blur-[100px] pointer-events-none"></div>

          {/* Profile Photo Display with Amber Glow */}
          <div className="flex flex-col items-center gap-4 w-full">
            <div 
              className="relative group w-56 h-56 rounded-[32px] overflow-hidden border-2 border-amber-500/20 shadow-[0_0_50px_rgba(245,158,11,0.1)] transition-all duration-300 hover:border-amber-500/40 cursor-pointer"
              onClick={() => {
                const fileInput = document.getElementById('staff-profile-file-input');
                if (fileInput) fileInput.click();
              }}
            >
              {selectedStaff.profileImage ? (
                <img src={selectedStaff.profileImage} className="w-full h-full object-cover" alt="Profile" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-amber-500 text-4xl font-black uppercase">
                  {selectedStaff.initials}
                </div>
              )}
              
              {/* Overlay for Edit */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[10px] text-amber-500 font-black tracking-widest uppercase">
                <span className="mb-1 text-xl">📸</span>
                <span>Change Photo</span>
              </div>

              {/* Status corner badge matching screenshot style */}
              <div className="absolute bottom-3 right-3 w-4 h-4 bg-amber-500 rounded-lg shadow-lg border-2 border-black"></div>
            </div>

            {/* Badges Layout matching screenshot */}
            <div className="flex flex-col gap-2.5 mt-2">
              <div className="inline-flex items-center gap-2 px-5 py-1.5 bg-[#0a0c0a] border border-amber-500/20 rounded-full text-[10px] font-black text-amber-500 uppercase tracking-widest shadow-inner">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
                OFFICIAL STAFF ID
              </div>

              <button 
                onClick={() => {
                  const fileInput = document.getElementById('staff-profile-file-input');
                  if (fileInput) fileInput.click();
                }}
                className="inline-flex items-center gap-2 px-5 py-2 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/30 rounded-full text-[9px] font-black text-amber-500 uppercase tracking-[0.15em] transition-all active:scale-95"
              >
                📸 CAPTURE / ASSIGN PHOTO
              </button>
            </div>
          </div>

          <input 
            type="file" 
            id="staff-profile-file-input" 
            accept="image/*" 
            className="hidden" 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                  if (typeof reader.result === 'string') {
                    onUpdateStaff(selectedStaff.id, { profileImage: reader.result });
                    showToast("Staff profile photo updated successfully.", "success");
                  }
                };
                reader.readAsDataURL(file);
              }
            }}
          />

          <div className="flex flex-col gap-2 items-center w-full">
            {isEditingInfo ? (
              <input 
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full max-w-xs text-center font-black text-2xl text-white bg-black border-b-2 border-amber-500/50 py-1 focus:outline-none placeholder-zinc-800 uppercase tracking-tight"
                placeholder="STAFF NAME"
              />
            ) : (
              <h3 className="font-black text-4xl text-white tracking-tighter uppercase">{selectedStaff.name}</h3>
            )}

            <div className="flex items-center gap-3">
              <span className="font-mono text-zinc-500 text-sm tracking-widest">{selectedStaff.code || 'STF-001'}</span>
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
              <span className="text-amber-500/80 text-[11px] font-black uppercase tracking-[0.2em] bg-amber-500/5 px-3 py-1 rounded-lg border border-amber-500/10">VERIFIED AGENT</span>
            </div>
          </div>

          {/* Bento Grid Info Cards - Specific Staff Data */}
          <div className="grid grid-cols-2 gap-3 w-full mt-2">
            <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-2xl p-5 text-left flex flex-col gap-1.5">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.15em]">LEDGER BALANCE</span>
              <span className="text-xl font-black text-amber-500 font-mono">₦{(selectedStaff.walletBalance || 0).toLocaleString()}</span>
            </div>

            <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-2xl p-5 text-left flex flex-col gap-1.5">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.15em]">COLLECTIONS COUNT</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-white font-mono">{selectedStaff.collectionsCount || 0}</span>
                <span className="text-[10px] font-bold text-zinc-500 uppercase">Total</span>
              </div>
            </div>

            <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-2xl p-5 text-left flex flex-col gap-1.5">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.15em]">REGIONAL ZONE</span>
              <span className="text-base font-black text-zinc-200 uppercase tracking-wide truncate">{selectedStaff.location || 'Not Assigned'}</span>
            </div>

            <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-2xl p-5 text-left flex flex-col gap-1.5">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.15em]">MEMBER JOINED</span>
              <span className="text-base font-black text-zinc-200 font-mono">{selectedStaff.joinedDate}</span>
            </div>
          </div>

          {/* Full Width Address Card */}
          <div className="bg-zinc-900/30 border border-zinc-800/40 rounded-2xl p-5 text-left flex flex-col gap-1.5 w-full">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.15em]">OFFICIAL DEPLOYMENT ADDRESS</span>
            <span className="text-sm font-bold text-zinc-300 leading-relaxed italic">
              {selectedStaff.workingAddress || 'No official field address registered for this agent.'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 bg-[#0a0c0a] border border-zinc-900/80 p-1.5 rounded-[24px] select-none">
          <button
            onClick={() => setProfileSubTab('details')}
            className={`py-3 px-2 text-[10px] font-black uppercase tracking-widest rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
              profileSubTab === 'details'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span className="text-lg">⚙️</span>
            <span>Profile</span>
          </button>

          <button
            onClick={() => setProfileSubTab('subscribers')}
            className={`py-3 px-2 text-[10px] font-black uppercase tracking-widest rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
              profileSubTab === 'subscribers'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span className="text-lg">👥</span>
            <span>Users ({state.customers.filter(c => c.assignedStaffId === selectedStaff.id).length})</span>
          </button>

          <button
            onClick={() => setProfileSubTab('performance')}
            className={`py-3 px-2 text-[10px] font-black uppercase tracking-widest rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
              profileSubTab === 'performance'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span className="text-lg">📈</span>
            <span>Stats</span>
          </button>
        </div>

        {profileSubTab === 'details' && (
          <>
            <div className="bg-[#0a0c0a] border border-zinc-900/70 rounded-[32px] p-8 flex flex-col gap-6 shadow-xl">
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.25em] mb-2">PERSONAL IDENTIFICATION</span>
              
              {/* ID, Code & Account Number */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 p-4 bg-zinc-900/20 border border-zinc-900 rounded-2xl">
                  <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">INTERNAL ID</span>
                  <span className="text-xs font-mono font-black text-white tracking-wider">{staffSerial}</span>
                </div>
                <div className="flex flex-col gap-1.5 p-4 bg-zinc-900/20 border border-zinc-900 rounded-2xl">
                  <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">AGENT CODE</span>
                  <span className="text-xs font-mono font-black text-amber-500 tracking-wider">{selectedStaff.code}</span>
                </div>
                <div className="flex flex-col gap-1.5 p-4 bg-zinc-900/20 border border-zinc-900 rounded-2xl col-span-2">
                  <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">COLLECTION ACCOUNT NUMBER</span>
                  {isEditingInfo ? (
                    <input 
                      type="text"
                      value={editAccountNumber}
                      onChange={(e) => setEditAccountNumber(e.target.value)}
                      className="text-xs font-mono font-black text-amber-500 bg-transparent border-b border-amber-500/30 focus:outline-none"
                    />
                  ) : (
                    <span className="text-xs font-mono font-black text-amber-500 tracking-wider">
                      {selectedStaff.accountNumber || '--- --- ---'}
                    </span>
                  )}
                </div>
              </div>

              {/* Contacts Section */}
              <div className="flex flex-col gap-4 mt-2">
                <div className="flex items-center justify-between border-b border-zinc-900/50 pb-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.15em]">MOBILE NUMBER</span>
                    {isEditingInfo ? (
                      <input 
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="text-sm font-black text-white bg-black border-b border-amber-500/30 focus:outline-none"
                      />
                    ) : (
                      <span className="text-sm font-black text-zinc-200">{selectedStaff.phoneNumber}</span>
                    )}
                  </div>
                  <div className="w-10 h-10 bg-zinc-900/50 rounded-full flex items-center justify-center text-zinc-600 border border-zinc-900">
                    <Phone className="w-4 h-4" />
                  </div>
                </div>

                <div className="flex items-center justify-between border-b border-zinc-900/50 pb-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.15em]">EMAIL ADDRESS</span>
                    {isEditingInfo ? (
                      <input 
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="text-sm font-black text-white bg-black border-b border-amber-500/30 focus:outline-none"
                      />
                    ) : (
                      <span className="text-sm font-black text-zinc-200">{selectedStaff.email}</span>
                    )}
                  </div>
                  <div className="w-10 h-10 bg-zinc-900/50 rounded-full flex items-center justify-center text-zinc-600 border border-zinc-900">
                    <Mail className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Location Override Edit Mode */}
              {isEditingInfo && (
                <div className="grid grid-cols-1 gap-4 mt-2">
                  <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">ASSIGNED ZONE</span>
                    <input 
                      type="text"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      className="bg-black border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white font-bold focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">OFFICIAL WORKING ADDRESS</span>
                    <input 
                      type="text"
                      value={editWorkingAddress}
                      onChange={(e) => setEditWorkingAddress(e.target.value)}
                      className="bg-black border border-zinc-800 rounded-xl px-4 py-3 text-xs text-white font-bold focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Security PIN Section */}
              <div className="mt-4 p-5 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">SECURITY PROTOCOL</span>
                    <span className="text-xs font-black text-amber-500">STAFF LOGIN PIN</span>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    selectedStaff.pinStatus === 'pending' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'
                  }`}>
                    {selectedStaff.pinStatus === 'pending' ? 'ACTION REQUIRED' : 'SECURE'}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-black border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-600 uppercase">CURRENT PIN:</span>
                    <span className="text-lg font-black text-white font-mono tracking-[0.3em]">{selectedStaff.pin || '----'}</span>
                  </div>
                  <input
                    type="password"
                    maxLength={4}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length === 4) {
                        onUpdateStaff(selectedStaff.id, {
                          pin: val,
                          pinStatus: 'set'
                        });
                        showToast("Security PIN updated successfully.", "success");
                      }
                    }}
                    placeholder="NEW"
                    className="w-20 bg-amber-500 text-black border-none rounded-xl px-2 py-3 text-center text-xs font-black focus:ring-0 placeholder-black/50"
                  />
                </div>
              </div>
            </div>

            {/* If user is editing info, show a friendly commit button */}
            {isEditingInfo && (
              <button
                onClick={handleSaveInfoEdits}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-xs tracking-wider uppercase rounded-xl active:scale-95 transition-all cursor-pointer shadow-lg shadow-amber-500/20 text-center mt-1"
              >
                ✓ Save Profile Changes
              </button>
            )}

            {/* CHANGE ROLE Component Section */}
            <div className="flex flex-col gap-3">
              <span className="text-[11px] font-black text-zinc-500 uppercase tracking-widest px-1">
                CHANGE ROLE AUTHORITY
              </span>

              <div className="grid grid-cols-3 gap-2 bg-[#0a0c0a] border border-zinc-900/80 p-1.5 rounded-[24px]">
                {/* Collector Button */}
                <button
                  id="change-role-collector"
                  onClick={() => onUpdateStaff(selectedStaff.id, { role: 'Collector' })}
                  className={`py-2.5 px-3 text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
                    selectedStaff.role === 'Collector'
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/10'
                      : 'bg-transparent border border-transparent text-zinc-500 hover:text-zinc-400'
                  }`}
                >
                  <span>Collector</span>
                </button>

                {/* Supervisor Button */}
                <button
                  id="change-role-supervisor"
                  onClick={() => onUpdateStaff(selectedStaff.id, { role: 'Supervisor' })}
                  className={`py-2.5 px-3 text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
                    selectedStaff.role === 'Supervisor'
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/10'
                      : 'bg-transparent border border-transparent text-zinc-500 hover:text-zinc-400'
                  }`}
                >
                  <span>Supervisor</span>
                </button>

                {/* Viewer Button */}
                <button
                  id="change-role-viewer"
                  onClick={() => onUpdateStaff(selectedStaff.id, { role: 'Viewer' })}
                  className={`py-2.5 px-3 text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
                    selectedStaff.role === 'Viewer'
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/10'
                      : 'bg-transparent border border-transparent text-zinc-500 hover:text-zinc-400'
                  }`}
                >
                  <span>Viewer</span>
                </button>
              </div>
            </div>

            {/* PERMISSIONS Panel Component */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-black text-zinc-500 uppercase tracking-widest leading-none">
                  ACCESS PERMISSIONS
                </span>

                <button 
                  onClick={() => {
                    showToast("Tap any permission to toggle authority.", "info");
                  }}
                  className="text-[9px] font-black text-amber-500 hover:text-amber-400 transition-all cursor-pointer flex items-center gap-1 leading-none uppercase tracking-widest"
                >
                  <span>EDIT</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {ALL_PERMISSIONS_DECLARATION.map(perm => {
                  const currentActivePermList = selectedStaff.permissions || getDefaultPermissions(selectedStaff.role);
                  const isSelected = currentActivePermList.includes(perm.id);

                  return (
                    <button
                      key={perm.id}
                      onClick={() => handleTogglePermission(perm.id)}
                      className={`px-4 py-4 rounded-2xl border text-left flex items-center justify-between gap-3 cursor-pointer transition-all select-none focus:outline-none group ${
                        isSelected
                          ? 'bg-amber-500/5 border-amber-500/30 text-amber-500'
                          : 'bg-[#0a0c0a] border-zinc-900 text-zinc-600 hover:border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-base shrink-0 select-none opacity-80">{perm.emoji}</span>
                        <span className={`text-[11px] font-black uppercase tracking-wider leading-tight truncate ${
                          isSelected ? 'text-amber-500' : 'text-zinc-500'
                        }`}>
                          {perm.label}
                        </span>
                      </div>

                      <div className={`w-4 h-4 rounded flex items-center justify-center text-[8px] font-black shrink-0 border transition-all ${
                        isSelected
                          ? 'bg-amber-500 border-amber-500 text-black shadow-inner'
                          : 'border-zinc-800 bg-zinc-900/50'
                      }`}>
                        {isSelected && '✓'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* BOTTOM ACTION BUTTONS */}
            <div className="grid grid-cols-2 gap-4 border-t border-zinc-900/50 pt-8 mt-4 pb-8">
              <button 
                onClick={() => {
                  const nextStatusState = isActive ? 'inactive' : 'active';
                  onToggleStatus(selectedStaff.id, nextStatusState);
                  showToast(`${selectedStaff.name} state successfully switched to ${nextStatusState === 'active' ? 'Active' : 'Suspended'}.`, "success");
                }}
                className="py-4 bg-[#0a0c0a] hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 text-zinc-500 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all cursor-pointer text-center active:scale-95 shadow-sm"
              >
                {isActive ? 'SUSPEND AGENT' : 'ACTIVATE AGENT'}
              </button>

              <button 
                onClick={() => {
                  if (confirm(`Are you sure you want to completely de-provision and DELETE "${selectedStaff.name}" from the systems?`)) {
                    onDeleteStaff(selectedStaff.id);
                    setSelectedStaffId(null);
                    showToast(`Account successfully deleted from database.`, "success");
                  }
                }}
                className="py-4 bg-red-950/20 hover:bg-red-900/30 text-red-500 border border-red-900/20 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all cursor-pointer text-center active:scale-95 shadow-md"
              >
                DELETE ACCOUNT
              </button>
            </div>
          </>
        )}

        {profileSubTab === 'subscribers' && (
          <div className="flex flex-col gap-5 animate-fade-in text-left">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">ASSIGNED CUSTOMER BASE</span>
              <span className="text-[10px] font-black text-amber-500 bg-amber-500/5 px-3 py-1 rounded-full border border-amber-500/10">
                {state.customers.filter(c => c.assignedStaffId === selectedStaff.id).length} MEMBERS
              </span>
            </div>

            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Search mapped customers by name, account or location..."
                value={subCustomerSearch}
                onChange={(e) => setSubCustomerSearch(e.target.value)}
                className="w-full bg-[#0a0c0a] border border-zinc-900 focus:border-amber-500/50 rounded-2xl pl-11 pr-4 py-3.5 text-xs text-white font-bold placeholder-zinc-700 transition-all focus:outline-none focus:ring-0 shadow-inner"
              />
            </div>

            {(() => {
              const assignedCusts = state.customers.filter(c => {
                if (c.assignedStaffId !== selectedStaff.id) return false;
                const query = subCustomerSearch.toLowerCase();
                if (!query) return true;
                
                const matchesText = 
                  c.name.toLowerCase().includes(query) ||
                  (c.accountNumber && c.accountNumber.includes(query)) ||
                  c.phoneNumber.includes(query) ||
                  (c.location && c.location.toLowerCase().includes(query));
                
                return matchesText;
              });

              if (assignedCusts.length === 0) {
                return (
                  <div className="bg-[#0a0c0a] border border-zinc-900 rounded-[32px] p-16 text-center text-zinc-600 text-xs font-black uppercase tracking-widest leading-loose">
                    🏢 No subscribers currently mapped to {selectedStaff.name.split(' ')[0]}.
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assignedCusts.map((c, idx) => {
                    const custTx = state.transactions.filter(t => t.customerId === c.id && t.type === 'deposit');
                    const lastTxDate = custTx.length > 0 
                      ? new Date(custTx[0].timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : 'N/A';

                    return (
                      <div 
                        key={`${c.id}-${idx}`}
                        className="bg-[#0a0c0a] border border-zinc-900/60 hover:border-amber-500/20 p-5 rounded-[28px] flex flex-col gap-4 relative select-none transition-all duration-300 group shadow-md"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center font-black text-sm text-zinc-500 uppercase tracking-wider shrink-0 overflow-hidden group-hover:border-amber-500/30 transition-colors">
                              {c.profileImage ? (
                                <img src={c.profileImage} className="w-full h-full object-cover" alt={c.name} referrerPolicy="no-referrer" />
                              ) : (
                                c.name.split(' ').map(p => p[0]).join('').slice(0, 2)
                              )}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-black text-white truncate leading-tight tracking-tight">{c.name}</span>
                              <span className="text-[10px] font-mono text-zinc-500 font-bold mt-1.5 uppercase">
                                {c.accountNumber || `30${(c.phoneNumber || c.id).slice(-8)}`}
                              </span>
                            </div>
                          </div>
                          
                          <div className={`w-2 h-2 rounded-full ${c.status === 'active' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-zinc-800'}`}></div>
                        </div>

                        <div className="grid grid-cols-2 bg-zinc-900/40 rounded-2xl p-3 border border-zinc-900/50 gap-2">
                          <div className="flex flex-col gap-1 px-1">
                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">SAVINGS</span>
                            <span className="text-xs font-black text-white font-mono">
                              ₦{(c.balance || 0).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1 px-1 border-l border-zinc-900">
                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">LAST SAVED</span>
                            <span className="text-xs font-black text-zinc-400 font-mono">
                              {lastTxDate}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[8px] font-black text-zinc-600 uppercase tracking-[0.1em]">
                          <span className="flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> {c.location || 'KADUNA'}</span>
                          <span className="bg-amber-500/5 text-amber-500 px-2 py-0.5 rounded-lg border border-amber-500/10">VIEW PROFILE</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {profileSubTab === 'performance' && (() => {
          const assignedCustomers = state.customers.filter(c => c.assignedStaffId === selectedStaff.id);
          const assignedCustIds = new Set(assignedCustomers.map(c => c.id));
          
          const nowMs = new Date().getTime();
          const oneDayMs = 1000 * 60 * 60 * 24;

          const getWithinPeriod = (timestampStr: string, period: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
            const txTime = new Date(timestampStr).getTime();
            const diffMs = nowMs - txTime;
            if (period === 'daily') return diffMs <= oneDayMs;
            if (period === 'weekly') return diffMs <= oneDayMs * 7;
            if (period === 'monthly') return diffMs <= oneDayMs * 30;
            if (period === 'yearly') return diffMs <= oneDayMs * 365;
            return true;
          };

          const processedTransactions = state.transactions.filter(t => {
            const matchesStaff = t.staffId === selectedStaff.id;
            if (!matchesStaff) return false;
            if (txTypeFilter !== 'all' && t.type !== txTypeFilter) return false;
            if (txTimeframeFilter !== 'all' && !getWithinPeriod(t.timestamp, txTimeframeFilter)) return false;
            if (txSearchQuery) {
              const query = txSearchQuery.toLowerCase();
              return (
                t.customerName.toLowerCase().includes(query) ||
                t.reference.toLowerCase().includes(query) ||
                t.amount.toString().includes(query)
              );
            }
            return true;
          });

          return (
            <div className="flex flex-col gap-8 animate-fade-in text-left">
              
              {/* STAFF KPI DASHBOARD */}
              <div className="bg-[#0a0c0a] border border-zinc-900 rounded-[32px] p-8 flex flex-col gap-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-[60px]"></div>
                
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.25em]">STAFF PERFORMANCE</span>
                    <span className="text-sm font-black text-white">REVENUE & ACTIVITY KPI</span>
                  </div>
                  <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-500/20">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-6 bg-zinc-900/30 rounded-3xl border border-zinc-900 group hover:border-amber-500/20 transition-colors">
                    <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest block mb-2 group-hover:text-amber-500/60">PLATFORM COLLECTIONS</span>
                    <span className="text-2xl font-black text-amber-500 font-mono tracking-tight">
                      ₦{(selectedStaff.totalCollectionsAmount || 0).toLocaleString()}
                    </span>
                    <div className="mt-4 pt-4 border-t border-zinc-900/50 flex items-center justify-between">
                      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">LIFETIME VOLUME</span>
                      <div className="px-2 py-0.5 bg-amber-500/10 text-amber-500 text-[8px] font-black rounded-md">AGENT</div>
                    </div>
                  </div>

                  <div className="p-6 bg-zinc-900/30 rounded-3xl border border-zinc-900 group hover:border-amber-500/20 transition-colors">
                    <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest block mb-2 group-hover:text-amber-500/60">TOTAL POSTINGS</span>
                    <span className="text-2xl font-black text-white font-mono tracking-tight">
                      {(selectedStaff.collectionsCount || 0).toLocaleString()} <span className="text-xs text-zinc-600 uppercase font-sans">Entries</span>
                    </span>
                    <div className="mt-4 pt-4 border-t border-zinc-900/50 flex items-center justify-between">
                      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">TRANSACTION COUNT</span>
                      <div className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-[8px] font-black rounded-md">VERIFIED</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RECENT ACTIVITY LOG */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">AGENT TRANSACTION LOG</span>
                  <div className="flex gap-2">
                    {/* Timeframe Filter Buttons */}
                    <select 
                      value={txTimeframeFilter}
                      onChange={(e: any) => setTxTimeframeFilter(e.target.value)}
                      className="bg-[#0a0c0a] border border-zinc-900 text-zinc-400 text-[10px] font-bold rounded-xl px-3 py-1.5 outline-none focus:border-amber-500/50 appearance-none"
                    >
                      <option value="all">ALL TIME</option>
                      <option value="daily">TODAY</option>
                      <option value="weekly">THIS WEEK</option>
                      <option value="monthly">THIS MONTH</option>
                    </select>
                    <div className="flex gap-1">
                      <button onClick={() => setTxTypeFilter('all')} className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${txTypeFilter === 'all' ? 'bg-amber-500 border-amber-500 text-black' : 'bg-transparent border-zinc-900 text-zinc-500 hover:border-zinc-700'}`}>ALL</button>
                      <button onClick={() => setTxTypeFilter('deposit')} className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${txTypeFilter === 'deposit' ? 'bg-amber-500 border-amber-500 text-black' : 'bg-transparent border-zinc-900 text-zinc-500 hover:border-zinc-700'}`}>SAVINGS</button>
                    </div>
                  </div>
                </div>

                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Filter historical journals by customer name, reference ref..."
                    value={txSearchQuery}
                    onChange={(e) => setTxSearchQuery(e.target.value)}
                    className="w-full bg-[#0a0c0a] border border-zinc-900 focus:border-amber-500/50 rounded-2xl pl-11 pr-4 py-3.5 text-xs text-white font-bold placeholder-zinc-700 transition-all focus:outline-none focus:ring-0 shadow-inner"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  {processedTransactions.length === 0 ? (
                    <div className="bg-[#0a0c0a] border border-zinc-900 rounded-[32px] p-12 text-center text-zinc-650 text-xs font-black uppercase tracking-widest leading-loose">
                      NO LOGGED ACTIVITY FOR THIS PERIOD
                    </div>
                  ) : (
                    processedTransactions.map((t, idx) => (
                      <div key={`${t.id}-${idx}`} className="bg-[#0a0c0a] border border-zinc-900/50 hover:border-amber-500/20 p-5 rounded-2xl flex items-center justify-between transition-all group">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${t.type === 'deposit' ? 'bg-amber-500/10 text-amber-500' : 'bg-zinc-900 text-zinc-400'}`}>
                            {t.type === 'deposit' ? '💸' : '🏦'}
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-black text-zinc-200 group-hover:text-white transition-colors">{t.customerName}</span>
                            <span className="text-[9px] font-mono text-zinc-600 font-bold uppercase tracking-widest">{t.reference} · {new Date(t.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[12px] font-black font-mono ${t.type === 'deposit' ? 'text-amber-500' : 'text-zinc-400'}`}>
                            {t.type === 'deposit' ? '+' : '-'} ₦{t.amount.toLocaleString()}
                          </span>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-widest ${t.status === 'approved' ? 'bg-emerald-500/5 text-emerald-500 border-emerald-500/10' : 'bg-amber-500/5 text-amber-500 border-amber-500/10'}`}>
                            {t.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      </div>
    );
  }

  // --- STANDARD DIRECTORY & LIST GRID VIEW ---
  return (
    <div className="w-full flex flex-col gap-6 select-none pb-12 animate-fade-in">
      
      {/* Visual Header Matching Screenshot 2 */}
      <div className="flex items-center justify-between gap-4 mt-1 pb-1">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-2xl font-black text-zinc-150 tracking-tight">Staff Management</h2>
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">{staff.length} accounts Registered</span>
        </div>

        {/* Aqua-Teal Add Staff Button */}
        <button 
          id="show-add-staff-modal"
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black text-sm font-black rounded-2xl active:scale-95 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
        >
          <Plus className="w-4 h-4 stroke-[3px]" />
          <span>Add New Staff</span>
        </button>
      </div>

      {/* Prominent Real-Time Search Bar across the Top of the Staff Tab */}
      <div id="staff-top-search-bar" className="relative w-full h-12">
        <Search className="absolute left-4 top-[15px] w-4.5 h-4.5 text-amber-500/60" />
        <input 
          type="text"
          placeholder="Search and filter agents by Name, Code ID, Mobile, Zone or Email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-full pl-12 pr-12 bg-[#0a0c0a] text-sm font-bold text-white border border-zinc-900 hover:border-zinc-800 focus:border-amber-500 rounded-2xl focus:outline-none placeholder-zinc-700 font-sans transition-all shadow-xl shadow-black/25"
        />
        {searchQuery && (
          <button 
            type="button" 
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-3.5 text-[9px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md hover:bg-amber-500/20 transition-all cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Filter Selector and Search Row */}
      <div className="w-full flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <div className="overflow-x-auto flex flex-row items-center gap-2 pb-1 scrollbar-none shrink-0">
          {(['All', 'Supervisor', 'Collector', 'Viewer'] as FilterRole[]).map(roleOption => {
            const isActive = selectedRole === roleOption;
            return (
              <button
                key={roleOption}
                onClick={() => setSelectedRole(roleOption)}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap border ${
                  isActive
                    ? 'bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/10'
                    : 'bg-[#0a0c0a] border-zinc-900 text-zinc-600 hover:text-zinc-400'
                }`}
               >
                {roleOption}
              </button>
            );
          })}
        </div>

        {/* Status and Performance Dropdown */}
        <div className="flex items-center gap-3 bg-[#0a0c0a] border border-zinc-900 rounded-2xl px-5 py-2 self-start md:self-auto shadow-md">
          <span className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-600 font-sans">
            STATUS:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-transparent text-[10px] font-black uppercase tracking-widest text-amber-500 focus:outline-none cursor-pointer pr-1 appearance-none"
          >
            <option value="All" className="bg-[#0a0c0a] text-zinc-300 font-bold uppercase tracking-widest">ALL RECORDS</option>
            <option value="Active" className="bg-[#0a0c0a] text-zinc-300 font-bold uppercase tracking-widest">ACTIVE AGENTS</option>
            <option value="Inactive" className="bg-[#0a0c0a] text-zinc-300 font-bold uppercase tracking-widest">SUSPENDED</option>
            <option value="Performance" className="bg-[#0a0c0a] text-amber-500 font-bold uppercase tracking-widest">TOP PERFORMANCE</option>
          </select>
        </div>
      </div>

      {/* Add Staff Modal Form overlay */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-[#0a0c0a] border border-zinc-900 rounded-[40px] p-10 flex flex-col gap-8 relative shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[100px]"></div>
            
            <button 
              onClick={() => setShowAddForm(false)}
              className="absolute right-6 top-6 w-10 h-10 rounded-full bg-zinc-900/50 hover:bg-zinc-800 text-zinc-500 hover:text-white transition-all cursor-pointer flex items-center justify-center border border-zinc-900"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex flex-col gap-2 relative">
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em]">ADMINISTRATION</span>
              <h3 className="text-2xl font-black text-white uppercase tracking-tight">Provision Agent Account</h3>
              <p className="text-sm text-zinc-600 font-medium leading-relaxed">Register a new field operative into the core collection network.</p>
            </div>

            {formError && (
              <div className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 p-2.5 rounded-lg flex items-center gap-1.5">
                <span>⚠️ {formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Full Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Bello Usman"
                  className="w-full px-3.5 py-2 bg-[#090a09] border border-zinc-900 rounded-xl text-sm text-zinc-200 placeholder-zinc-700 focus:border-[#14cfb4] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Phone number</label>
                  <input 
                    type="text" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0801112222"
                    className="w-full px-3.5 py-2 bg-[#090a09] border border-zinc-900 rounded-xl text-sm text-zinc-200 placeholder-zinc-700 focus:border-[#14cfb4] focus:outline-none placeholder-zinc-650"
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
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="bello@contribopay.ng"
                  className="w-full px-3.5 py-2 bg-[#090a09] border border-zinc-900 rounded-xl text-sm text-zinc-200 placeholder-zinc-700 focus:border-[#14cfb4] focus:outline-none placeholder-zinc-650"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Staff Area Working Address</label>
                <input 
                  type="text" 
                  value={workingAddress}
                  onChange={(e) => setWorkingAddress(e.target.value)}
                  placeholder="e.g. 12 Ahmadu Bello Way, Kaduna"
                  className="w-full px-3.5 py-2 bg-[#090a09] border border-zinc-900 rounded-xl text-sm text-zinc-200 placeholder-zinc-700 focus:border-[#14cfb4] focus:outline-none placeholder-zinc-650"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Collection Account Number (Optional)</label>
                <input 
                  type="text" 
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. 2001928374"
                  className="w-full px-3.5 py-2 bg-[#090a09] border border-zinc-900 rounded-xl text-sm text-[#14cfb4] font-mono placeholder-zinc-700 focus:border-[#14cfb4] focus:outline-none"
                />
                <p className="text-[9px] text-zinc-600 italic">Leave blank to auto-generate a sequential account number.</p>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Assigned Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#090a09] border border-zinc-900 rounded-xl text-sm text-zinc-200 focus:border-[#14cfb4] focus:outline-none text-zinc-300"
                >
                  <option value="Collector">Collector (Field Agent)</option>
                  <option value="Supervisor">Supervisor (Territory Admin)</option>
                  <option value="Viewer">Viewer (Read-only Partner)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Manager Referral Code</label>
                <input 
                  type="text" 
                  required
                  value={managerReferralCode}
                  onChange={(e) => setManagerReferralCode(e.target.value)}
                  placeholder="e.g. admin@contribopay.ng"
                  className="w-full px-3.5 py-2 bg-[#090a09] border border-zinc-900 rounded-xl text-sm text-[#14cfb4] font-mono placeholder-zinc-700 focus:border-[#14cfb4] focus:outline-none"
                />
                <p className="text-[10px] text-zinc-550 italic font-medium mt-0.5">
                  Input active administrator escrow email (e.g., admin@contribopay.ng).
                </p>
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

      {/* Performance Details Modal overlay popup */}
      {performanceModalStaffId && (() => {
        const perfStaff = staff.find(s => s.id === performanceModalStaffId);
        if (!perfStaff) return null;
        
        const staffTxs = state.transactions.filter(t => t.staffId === perfStaff.id);
        const approvedDeposits = staffTxs.filter(t => t.type === 'deposit' && t.status === 'approved');
        const approvedWithdrawals = staffTxs.filter(t => t.type === 'withdrawal' && t.status === 'approved');
        
        const totalApprovedDepositsAmount = approvedDeposits.reduce((sum, t) => sum + t.amount, 0);
        const totalApprovedWithdrawalsAmount = approvedWithdrawals.reduce((sum, t) => sum + t.amount, 0);
        const totalHandledVolume = totalApprovedDepositsAmount + totalApprovedWithdrawalsAmount;
        
        const pendingCustomers = state.customers.filter(c => c.assignedStaffId === perfStaff.id && c.approvalStatus === 'pending');
        
        const pendingTransactions = state.transactions.filter(t => 
          t.status === 'pending' && 
          (t.staffId === perfStaff.id || 
           state.customers.some(c => c.id === t.customerId && c.assignedStaffId === perfStaff.id))
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-lg bg-[#111311] border border-zinc-900 rounded-[32px] p-6.5 flex flex-col gap-5 relative shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
              
              <button 
                onClick={() => setPerformanceModalStaffId(null)}
                className="absolute right-4.5 top-4.5 p-1.5 rounded-full hover:bg-zinc-800 text-zinc-550 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 border-b border-zinc-900/60 pb-4">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-[#14cfb4]/20 shrink-0 select-none">
                  {perfStaff.profileImage ? (
                    <img src={perfStaff.profileImage} className="w-full h-full object-cover" alt={perfStaff.name} />
                  ) : (
                    <div className="w-full h-full font-black text-sm flex items-center justify-center bg-[#14cfb4]/10 text-[#14cfb4] uppercase tracking-wider">
                      {perfStaff.initials}
                    </div>
                  )}
                </div>
                <div className="text-left flex flex-col">
                  <span className="text-[10px] font-black text-[#14cfb4] uppercase tracking-widest flex items-center gap-1 font-sans">
                    📊 PERFORMANCE DASHBOARD
                  </span>
                  <h3 className="text-base font-black text-zinc-100">{perfStaff.name}</h3>
                  <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Code: {perfStaff.code || 'N/A'} · Zone: {perfStaff.location}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 text-left">
                <span className="text-[10.5px] font-black text-zinc-500 uppercase tracking-widest">
                  💰 Handled Transaction Volume
                </span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#090a09] border border-zinc-900/80 p-3 rounded-2xl">
                    <span className="text-[8.5px] font-black text-zinc-500 uppercase tracking-widest block mb-1">
                      Approved Deposits
                    </span>
                    <span className="text-[#14cfb4] text-base font-black font-mono">
                      {formatNaira(totalApprovedDepositsAmount, true)}
                    </span>
                    <span className="text-[9px] text-[#30d178]/90 font-bold block mt-1">
                      {approvedDeposits.length} verified operations
                    </span>
                  </div>

                  <div className="bg-[#090a09] border border-zinc-900/80 p-3 rounded-2xl">
                    <span className="text-[8.5px] font-black text-zinc-500 uppercase tracking-widest block mb-1">
                      Approved Withdrawals
                    </span>
                    <span className="text-rose-455 text-base font-black font-mono">
                      {formatNaira(totalApprovedWithdrawalsAmount, true)}
                    </span>
                    <span className="text-[9px] text-rose-550 font-bold block mt-1">
                      {approvedWithdrawals.length} verified operations
                    </span>
                  </div>
                </div>

                <div className="bg-[#14cfb4]/5 border border-[#14cfb4]/25 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex flex-col text-left gap-0.5">
                    <span className="text-[9px] font-black text-[#14cfb4] uppercase tracking-widest">
                      Overall Operations Flow
                    </span>
                    <span className="text-[11px] text-zinc-400 font-medium font-sans">Combined approved cash flow volume</span>
                  </div>
                  <span className="text-zinc-100 text-lg font-black font-mono">
                    {formatNaira(totalHandledVolume, true)}
                  </span>
                </div>

                <div className="bg-emerald-500/5 border border-emerald-500/25 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex flex-col text-left gap-0.5">
                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                      Actual Profit Accrued
                    </span>
                    <span className="text-[11px] text-zinc-400 font-medium font-sans">Total payout profits generated</span>
                  </div>
                  <span className="text-emerald-400 text-lg font-black font-mono">
                    {formatNaira(staffTxs.filter(t => t.status === 'approved').reduce((sum, t) => sum + (t.profitAmount || 0), 0), true)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3 text-left border-t border-zinc-900/50 pt-4 mt-2.5">
                <span className="text-[10.5px] font-black text-zinc-500 uppercase tracking-widest block mb-1">
                  ⏳ Current Pending Approvals ({pendingCustomers.length + pendingTransactions.length})
                </span>

                {pendingCustomers.length === 0 && pendingTransactions.length === 0 ? (
                  <div className="bg-[#090a09] border border-zinc-900/50 text-zinc-500 rounded-2xl p-6 text-center text-xs font-bold flex flex-col items-center justify-center gap-2">
                    <Check className="w-7 h-7 text-emerald-500 bg-emerald-950/20 p-1.5 rounded-full border border-emerald-900/30" />
                    <span>No pending approvals or unverified entries in pipeline!</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 max-h-[35vh] overflow-y-auto scrollbar-thin pr-1">
                    {/* Pending Customers */}
                    {pendingCustomers.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-wider">
                          👤 Customer Onboarding Approvals ({pendingCustomers.length})
                        </span>
                        <div className="flex flex-col gap-2">
                          {pendingCustomers.map((cust, idx) => (
                            <div key={`${cust.id}-${idx}`} className="bg-amber-950/10 border border-amber-900/15 p-3 rounded-xl flex items-center justify-between gap-3 font-sans">
                              <div className="flex items-center gap-2.5 min-w-0 text-left animate-fade-in">
                                <span className="text-sm">📝</span>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-black text-zinc-200 truncate">{cust.name}</span>
                                  <span className="text-[9px] font-mono text-zinc-500">Phone: {cust.phoneNumber}</span>
                                </div>
                              </div>
                              <span className="text-[10px] bg-amber-950/20 text-amber-500 border border-amber-900/20 px-2 py-0.5 rounded font-extrabold uppercase shrink-0">
                                Pending Log
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pending Transactions */}
                    {pendingTransactions.length > 0 && (
                      <div className="flex flex-col gap-2 mt-2">
                        <span className="text-[9px] font-black text-rose-500 uppercase tracking-wider">
                          💸 Transaction Approvals ({pendingTransactions.length})
                        </span>
                        <div className="flex flex-col gap-2">
                          {pendingTransactions.map((tx, idx) => {
                            const isDeposit = tx.type === 'deposit';
                            return (
                              <div key={`${tx.id}-${idx}`} className="bg-[#090a09] border border-zinc-900/60 p-3 rounded-xl flex items-center justify-between gap-3 text-left animate-fade-in">
                                <div className="flex items-center gap-2.5 min-w-0 font-sans">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] shrink-0 ${
                                    isDeposit 
                                      ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-950/40' 
                                      : 'bg-rose-950/20 text-rose-455 border border-rose-900/10'
                                  }`}>
                                    {isDeposit ? '📥' : '📤'}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-black text-zinc-200 truncate">{tx.customerName}</span>
                                    <span className="text-[9px] font-mono text-zinc-500">Ref: {tx.reference} · {new Date(tx.timestamp).toLocaleDateString()}</span>
                                  </div>
                                </div>
                                <div className="text-right flex flex-col gap-0.5 shrink-0">
                                  <span className="text-xs font-black font-mono text-zinc-150">₦{tx.amount.toLocaleString()}</span>
                                  <span className="text-[8.5px] bg-[#1a1510] text-amber-500 border border-amber-950/30 px-1.5 py-0.2 rounded font-bold uppercase w-fit ml-auto shrink-0">
                                    Awaiting Approval
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button 
                onClick={() => setPerformanceModalStaffId(null)}
                className="w-full mt-2.5 py-3.5 bg-[#14cfb4] hover:bg-[#12b9a1] text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-[#14cfb4]/10 active:scale-95 text-center font-sans"
              >
                Close Metrics Dashboard
              </button>

            </div>
          </div>
        );
      })()}

      {/* Dynamic Agent Performance & Volume Ledger Summary */}
      {staff.length > 0 && (() => {
        const staffPerformances = staff.map(member => {
          const staffTxs = state.transactions.filter(t => t.staffId === member.id && t.status === 'approved');
          const depositVolume = staffTxs.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
          const totalTxCount = staffTxs.length;
          const profit = staffTxs.reduce((sum, t) => sum + (t.profitAmount || 0), 0);
          return {
            member,
            depositVolume,
            totalTxCount,
            profit,
          };
        });

        const totalSystemDepositVolume = staffPerformances.reduce((sum, sp) => sum + sp.depositVolume, 0);
        const totalSystemTxCount = staffPerformances.reduce((sum, sp) => sum + sp.totalTxCount, 0);
        const totalSystemProfit = staffPerformances.reduce((sum, sp) => sum + sp.profit, 0);
        
        // Find top performing staff member by volume
        const topPerformer = [...staffPerformances].sort((a, b) => b.depositVolume - a.depositVolume)[0];
        const highestVolume = topPerformer ? topPerformer.depositVolume : 0;
        
        return (
          <div className="bg-[#111311] border border-zinc-900 rounded-[28px] p-6 flex flex-col gap-6 shadow-xl select-none">
            <div className="flex flex-col gap-1 text-left">
              <span className="text-[10px] font-black text-[#14cfb4] uppercase tracking-widest flex items-center gap-1.5 font-sans">
                📊 LIVE FIELD OPERATIONS REPORT
              </span>
              <h3 className="text-sm font-black text-zinc-300 uppercase tracking-tight mt-1 font-sans">
                Mobilizer Collection Volume & Transaction Leaderboard
              </h3>
              <p className="text-[11px] text-zinc-500 leading-relaxed font-sans mt-0.5">
                Live visual summary of total transactions, ledger postings, and daily/monthly deposit volumes associated with each active staff collector.
              </p>
            </div>

            {/* Bento-style aggregated operational metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="bg-[#090a09] border border-zinc-900/60 p-4 rounded-2xl text-left flex flex-col justify-between">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block font-sans">Total Managed Volume</span>
                <span className="text-lg font-mono font-black text-[#14cfb4] mt-1.5 block">
                  {formatNaira(totalSystemDepositVolume, false)}
                </span>
                <span className="text-[9.5px] text-zinc-500 font-semibold block mt-1">Approved daily deposits</span>
              </div>

              <div className="bg-[#090a09] border border-zinc-900/60 p-4 rounded-2xl text-left flex flex-col justify-between">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block font-sans">Total Profits (All)</span>
                <span className="text-lg font-mono font-black text-emerald-400 mt-1.5 block">
                  {formatNaira(totalSystemProfit, false)}
                </span>
                <span className="text-[9.5px] text-emerald-500/70 font-semibold block mt-1">Combined staff earnings</span>
              </div>

              <div className="bg-[#090a09] border border-zinc-900/60 p-4 rounded-2xl text-left flex flex-col justify-between">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block font-sans">Total Postings</span>
                <span className="text-lg font-mono font-black text-zinc-100 mt-1.5 block">
                  {totalSystemTxCount} Txs
                </span>
                <span className="text-[9.5px] text-zinc-500 font-semibold block mt-1">Escrow verified actions</span>
              </div>

              <div className="bg-[#090a09] border border-zinc-900/60 p-4 rounded-2xl text-left flex flex-col justify-between">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block font-sans">Top Performer</span>
                <span className="text-[13px] font-sans font-extrabold text-[#fad563] mt-2 block truncate">
                  🏆 {topPerformer?.member.name || 'None'}
                </span>
                <span className="text-[9.5px] text-zinc-500 font-semibold block mt-1 truncate">
                  {topPerformer && topPerformer.depositVolume > 0 ? `Posted ${formatNaira(topPerformer.depositVolume, false)}` : 'No deposits logged'}
                </span>
              </div>
            </div>

            {/* Visual list tracker with custom Progress Tracks */}
            <div className="flex flex-col gap-4 border-t border-zinc-900/40 pt-4">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block text-left font-sans">
                Agent Volume share progress
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {staffPerformances.map((sp, idx) => {
                  const relativePct = highestVolume > 0 ? Math.round((sp.depositVolume / highestVolume) * 100) : 0;
                  
                  return (
                    <div key={`${sp.member.id}-${idx}`} className="flex flex-col gap-2 bg-black/15 p-3 rounded-xl border border-zinc-900/40 hover:border-zinc-800/60 transition-colors">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-[#14cfb4]/10 border border-[#14cfb4]/10 flex items-center justify-center text-[10px] font-black text-[#14cfb4] uppercase shrink-0">
                            {sp.member.initials}
                          </span>
                          <div className="flex flex-col items-start min-w-0">
                            <span className="text-xs font-bold text-zinc-200 truncate font-sans">{sp.member.name}</span>
                            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">CODE: {sp.member.code || 'N/A'}</span>
                          </div>
                        </div>

                        {/* Metrics values side */}
                        <div className="flex items-center gap-2 px-1 py-0.5 rounded-lg bg-black/35 shrink-0">
                          <span className="text-[9px] font-mono font-bold text-emerald-400">
                            +{formatNaira(sp.profit, false)} profit
                          </span>
                          <span className="text-zinc-650 font-mono text-[9px] font-black">·</span>
                          <span className="text-[9px] font-mono font-bold text-[#14cfb4]">
                            {sp.totalTxCount} Txs
                          </span>
                          <span className="text-zinc-650 font-mono text-[9px] font-black">·</span>
                          <span className="text-xs font-mono font-black text-zinc-150 font-bold">
                            {formatNaira(sp.depositVolume, false)}
                          </span>
                        </div>
                      </div>

                      {/* Visual Progress bar container */}
                      <div className="w-full bg-[#090a09] h-2 rounded-full border border-zinc-950/80 overflow-hidden relative">
                        <div 
                          style={{ width: `${Math.max(relativePct, sp.depositVolume > 0 ? 3 : 0)}%` }}
                          className="h-full bg-gradient-to-r from-[#14cfb4]/30 to-[#14cfb4] rounded-full transition-all duration-500 shadow-sm"
                        />
                      </div>
                      
                      <div className="flex justify-between items-center text-[8.5px] font-mono font-bold text-zinc-550 leading-none">
                        <span>Relative Share: {relativePct}%</span>
                        <span>Zone: {sp.member.location || 'HQ'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        );
      })()}

      {/* Staff Listing Grid */}
      {filteredStaff.length === 0 ? (
        <div className="bg-[#0a0c0a] border border-zinc-900 rounded-[32px] p-16 text-center text-zinc-600 text-xs font-black uppercase tracking-widest">
          No matching agents found in records.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((member, idx) => {
            const isActive = member.status === 'active';
            const staffTxs = state.transactions.filter(t => t.staffId === member.id && t.status === 'approved');
            const depositVolume = staffTxs.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
            const totalTxCount = staffTxs.length;

            return (
              <div 
                key={`${member.id}-${idx}`} 
                className="bg-[#0a0c0a] border border-zinc-900/50 rounded-[32px] p-6 flex flex-col gap-6 relative hover:border-amber-500/20 transition-all shadow-xl group overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-[40px] group-hover:bg-amber-500/10 transition-all"></div>

                <div className="flex items-start gap-4 relative">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-amber-500/10 shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.05)]">
                    {member.profileImage ? (
                      <img src={member.profileImage} className="w-full h-full object-cover" alt={member.name} referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full font-black text-base flex items-center justify-center bg-amber-500/10 text-amber-500 uppercase tracking-wider">
                        {member.initials}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex flex-col">
                      <span className="font-black text-base text-white leading-tight tracking-tight truncate group-hover:text-amber-500 transition-colors">
                        {member.name}
                      </span>
                      <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mt-0.5">
                        {member.code} {member.accountNumber && `· ${member.accountNumber}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 text-[8px] font-black rounded-md uppercase tracking-wider border ${
                        isActive 
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                          : 'bg-zinc-900 text-zinc-600 border-zinc-800'
                      }`}>
                        {isActive ? '● ONLINE' : '● OFFLINE'}
                      </span>
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{member.location}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-4 bg-zinc-900/20 border border-zinc-900 rounded-2xl flex flex-col gap-1">
                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">COLLECTIONS</span>
                    <span className="text-xs font-black text-amber-500 font-mono">₦{depositVolume.toLocaleString()}</span>
                  </div>
                  <div className="p-4 bg-zinc-900/20 border border-zinc-900 rounded-2xl flex flex-col gap-1">
                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">TRANSACTIONS</span>
                    <span className="text-xs font-black text-white font-mono">{totalTxCount} Entries</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedStaffId(member.id)}
                  className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-black font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl active:scale-95 transition-all cursor-pointer shadow-lg shadow-amber-500/10"
                >
                  MANAGE PROFILE
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
