import { useState, FormEvent, useEffect } from 'react';
import { 
  Settings, 
  RefreshCw, 
  Building, 
  User, 
  Play, 
  Pause, 
  Database, 
  Mail, 
  Phone, 
  MapPin, 
  Lock, 
  TrendingUp, 
  Coins, 
  Percent, 
  Check, 
  ShieldAlert, 
  Briefcase,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { DashboardState, ContriboSettings } from '../types';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { useToast } from './ToastProvider';

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

interface SettingsTabProps {
  state: DashboardState;
  authEmail: string | null;
  onUpdateSettings: (updated: Partial<ContriboSettings>) => void;
  onReset: () => void;
  onSimulate: () => void;
  isSimulating: boolean;
  onToggleSimulating: (isActive: boolean) => void;
}

export default function SettingsTab({ 
  state, 
  authEmail,
  onUpdateSettings, 
  onReset, 
  onSimulate,
  isSimulating,
  onToggleSimulating 
}: SettingsTabProps) {
  const { showToast } = useToast();
  const { settings } = state;

  // Form states initialized properly
  const [orgName, setOrgName] = useState(settings.orgName || 'Dan Godal Group savings');
  const [profileName, setProfileName] = useState(settings.profileName || 'Bashar');
  const [profileInitials, setProfileInitials] = useState(settings.profileInitials || 'BN');
  const [profileEmail, setProfileEmail] = useState(settings.profileEmail || 'bashar.nadama@contribopay.com');
  const [profilePhone, setProfilePhone] = useState(settings.profilePhone || '+234 812 345 9900');
  const [profileRole, setProfileRole] = useState(settings.profileRole || 'Managing Director & Partner');
  const [profileLocation, setProfileLocation] = useState(settings.profileLocation || 'Northern Division, Kaduna HQ');
  const [managerPin, setManagerPin] = useState<string>('');

  useEffect(() => {
    const fetchManagerPin = async () => {
      if (!authEmail) return;
      const docId = authEmail.toLowerCase().trim().replace(/[^a-zA-Z0-9_.-]/g, '_');
      const docRef = doc(db, 'managers', docId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setManagerPin(docSnap.data().pin || '');
      }
    };
    fetchManagerPin();
  }, [authEmail]);
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol || '₦');
  const [dailyTargetSavings, setDailyTargetSavings] = useState(String(settings.dailyTargetSavings || 100000000));
  const [platformCommissionRate, setPlatformCommissionRate] = useState(String(settings.platformCommissionRate || 1.5));
  const [defaultSlotValue, setDefaultSlotValue] = useState(String(settings.defaultSlotValue || 2000));
  const [withdrawalHoldLimit, setWithdrawalHoldLimit] = useState(String(settings.withdrawalHoldLimit || 150000));
  const [minBalanceThreshold, setMinBalanceThreshold] = useState(String(settings.minBalanceThreshold || 50000));
  const [partnerBankName, setPartnerBankName] = useState(settings.partnerBankName || 'Sterling Bank Plc');
  const [isLive, setIsLive] = useState(settings.isLive !== false);
  const [profileImage, setProfileImage] = useState(settings.profileImage || '');
  const [gatewayMode, setGatewayMode] = useState<'disabled' | 'monnify' | 'squad' | 'paystack' | 'flutterwave'>(settings.gatewayMode || 'disabled');
  const [gatewayApiKey, setGatewayApiKey] = useState(settings.gatewayApiKey || '');
  const [gatewayWebhookSecret, setGatewayWebhookSecret] = useState(settings.gatewayWebhookSecret || '');
  const [smsApiKey, setSmsApiKey] = useState(settings.smsApiKey || '');
  const [smsSenderId, setSmsSenderId] = useState(settings.smsSenderId || 'DAN GODAL');
  const [smsNotificationsEnabled, setSmsNotificationsEnabled] = useState(settings.smsNotificationsEnabled !== false);
  const [isSaved, setIsSaved] = useState(false);
  const [showPinChange, setShowPinChange] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [pinMessage, setPinMessage] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  // Sync settings when they are updated from external source (like Resetting/Re-seeding)
  useEffect(() => {
    setOrgName(settings.orgName || 'Dan Godal Group savings');
    setProfileName(settings.profileName || 'Bashar');
    setProfileInitials(settings.profileInitials || 'BN');
    setProfileEmail(settings.profileEmail || 'bashar.nadama@contribopay.com');
    setProfilePhone(settings.profilePhone || '+234 812 345 9900');
    setProfileRole(settings.profileRole || 'Managing Director & Partner');
    setProfileLocation(settings.profileLocation || 'Northern Division, Kaduna HQ');
    setCurrencySymbol(settings.currencySymbol || '₦');
    setDailyTargetSavings(String(settings.dailyTargetSavings || 100000000));
    setPlatformCommissionRate(String(settings.platformCommissionRate || 1.5));
    setDefaultSlotValue(String(settings.defaultSlotValue || 2000));
    setWithdrawalHoldLimit(String(settings.withdrawalHoldLimit || 150000));
    setMinBalanceThreshold(String(settings.minBalanceThreshold || 50000));
    setPartnerBankName(settings.partnerBankName || 'Sterling Bank Plc');
    setIsLive(settings.isLive !== false);
    setProfileImage(settings.profileImage || '');
    setGatewayMode(settings.gatewayMode || 'disabled');
    setGatewayApiKey(settings.gatewayApiKey || '');
    setGatewayWebhookSecret(settings.gatewayWebhookSecret || '');
    setSmsApiKey(settings.smsApiKey || '');
    setSmsSenderId(settings.smsSenderId || 'DAN GODAL');
    setSmsNotificationsEnabled(settings.smsNotificationsEnabled !== false);
  }, [settings]);

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      orgName,
      profileName,
      profileInitials: profileInitials.toUpperCase().slice(0, 2),
      profileEmail,
      profilePhone,
      profileRole,
      profileLocation,
      currencySymbol,
      dailyTargetSavings: Number(dailyTargetSavings) || 100000000,
      platformCommissionRate: Number(platformCommissionRate) || 1.5,
      defaultSlotValue: Number(defaultSlotValue) || 2000,
      withdrawalHoldLimit: Number(withdrawalHoldLimit) || 150000,
      minBalanceThreshold: Number(minBalanceThreshold) || 50000,
      partnerBankName,
      isLive,
      profileImage,
      gatewayMode,
      gatewayApiKey,
      gatewayWebhookSecret,
      smsApiKey,
      smsSenderId,
      smsNotificationsEnabled
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3500);
  };

  // Avatar Gradient matching high quality esusu aesthetic
  const getAvatarGradient = () => {
    return 'bg-gradient-to-tr from-amber-400 via-[#f1be48] to-[#df9d1c] text-[#090a09]';
  };

  return (
    <div id="settings-tab-viewport" className="w-full flex flex-col gap-6 select-none pb-12 animate-fade-in">
      
      {/* Title Header area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-2xl font-black text-zinc-100 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#14cfb4]" /> Platform Configurations
          </h2>
          <p className="text-xs text-zinc-500">
            Arrange profile credentials, set corporate Esusu caps, configure commission margins, and secure endpoints.
          </p>
        </div>

        {/* Global Save Indicator banner */}
        {isSaved && (
          <div className="flex items-center gap-1.5 px-4 py-2 bg-[#13372f]/40 border border-[#14cfb4]/20 text-[#14cfb4] text-xs font-bold rounded-xl animate-fade-in">
            <Check className="w-4 h-4 shrink-0" />
            <span>✓ All settings saved to Local Ledger!</span>
          </div>
        )}
      </div>

      <form id="settings-global-form" onSubmit={handleSave} className="flex flex-col gap-6">
        
        {/* UPPER DOUBLE COLUMN GRID PROFILE VS FINANCIAL RULES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* LEFT COLUMN: MANAGER PROFILE CARD */}
          <div id="manager-profile-card" className="bg-[#111311] border border-zinc-900 rounded-[28px] p-6 flex flex-col gap-5 relative overflow-hidden shadow-xl">
            
            {/* Minimalist Profile Background Header design */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b border-zinc-900/50 pb-5">
              <div 
                className="relative group w-14 h-14 rounded-full font-black text-lg flex items-center justify-center tracking-wider border border-white/5 select-none shrink-0 cursor-pointer overflow-hidden transition-all duration-150 active:scale-95 shadow-md"
                onClick={() => {
                  const fileInput = document.getElementById('settings-profile-file-input');
                  if (fileInput) fileInput.click();
                }}
                title="Click to upload profile photo"
              >
                {profileImage ? (
                  <img src={profileImage} className="w-full h-full rounded-full object-cover" alt="Profile" />
                ) : (
                  <div className={`w-full h-full rounded-full flex items-center justify-center ${getAvatarGradient()}`}>
                    {profileInitials || 'BN'}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[8.5px] text-[#14cfb4] font-black tracking-widest uppercase rounded-full">
                  <span>📷 Edit</span>
                </div>
              </div>
              <input 
                type="file" 
                id="settings-profile-file-input" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      if (typeof reader.result === 'string') {
                        setProfileImage(reader.result);
                        onUpdateSettings({ profileImage: reader.result });
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full min-w-0">
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] font-black text-[#14cfb4] uppercase tracking-widest leading-none">Administrative Profile</span>
                  <span className="text-[17px] font-black text-zinc-150 tracking-tight truncate mt-1">
                    {profileName || 'Bashar'}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono mt-0.5 truncate">
                    {profileEmail || 'bashar.nadama@contribopay.com'}
                  </span>
                </div>
                {/* File Input Triggered Control Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const fileInput = document.getElementById('settings-profile-file-input');
                      if (fileInput) fileInput.click();
                    }}
                    className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-[10px] font-black text-[#14cfb4] tracking-wider uppercase rounded-xl transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-md"
                  >
                    <span>📷 Upload Photo</span>
                  </button>
                  {profileImage && (
                    <button
                      type="button"
                      onClick={() => {
                        setProfileImage('');
                        onUpdateSettings({ profileImage: '' });
                      }}
                      className="px-3 py-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 hover:border-red-950/50 text-[10px] font-black text-rose-455 tracking-wider uppercase rounded-xl transition-all active:scale-95 cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              
              {/* Profile Name & Initials line */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 flex flex-col gap-1.5">
                  <label htmlFor="input-profile-name" className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                    <User className="w-3 h-3" /> Full Name
                  </label>
                  <input 
                    id="input-profile-name"
                    type="text" 
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-[#090a09] border border-zinc-850 rounded-xl text-xs text-zinc-200 placeholder-zinc-800 focus:border-[#14cfb4] focus:outline-none"
                    placeholder="E.g. Bashar Bello"
                  />
                </div>
                <div className="col-span-1 flex flex-col gap-1.5">
                  <label htmlFor="input-profile-initials" className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">
                    Initials
                  </label>
                  <input 
                    id="input-profile-initials"
                    type="text" 
                    value={profileInitials}
                    maxLength={2}
                    onChange={(e) => setProfileInitials(e.target.value.toUpperCase())}
                    required
                    className="w-full px-3 py-2.5 bg-[#090a09] border border-zinc-850 rounded-xl text-xs text-center font-black text-zinc-100 uppercase focus:border-[#14cfb4] focus:outline-none"
                    placeholder="BN"
                  />
                </div>
              </div>

              {/* Email & Phone info row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="input-profile-email" className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Email Address
                  </label>
                  <input 
                    id="input-profile-email"
                    type="email" 
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#090a09] border border-zinc-850 rounded-xl text-xs text-zinc-200 focus:border-[#14cfb4] focus:outline-none font-mono"
                    placeholder="manager@example.com"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="input-profile-phone" className="text-[10px] font-extrabold text-[#9ca3af]/40 uppercase tracking-widest flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Contact Phone
                  </label>
                  <input 
                    id="input-profile-phone"
                    type="text" 
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#090a09] border border-zinc-850 rounded-xl text-xs text-zinc-200 focus:border-[#14cfb4] focus:outline-none font-mono"
                    placeholder="+234 812..."
                  />
                </div>
              </div>

              {/* Designation Role & Geographic Coverage */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="input-profile-role" className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                    <Briefcase className="w-3 h-3" /> Authority Role
                  </label>
                  <input 
                    id="input-profile-role"
                    type="text" 
                    value={profileRole || ''}
                    onChange={(e) => setProfileRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#090a09] border border-zinc-850 rounded-xl text-xs text-zinc-200 focus:border-[#14cfb4] focus:outline-none"
                    placeholder="Managing Director"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="input-profile-loc" className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Location Coverage
                  </label>
                  <input 
                    id="input-profile-loc"
                    type="text" 
                    value={profileLocation || ''}
                    onChange={(e) => setProfileLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#090a09] border border-zinc-850 rounded-xl text-xs text-zinc-200 focus:border-[#14cfb4] focus:outline-none"
                    placeholder="Kaduna Area Office"
                  />
                </div>
              </div>

              {/* Security Override Core PIN */}
              <div className="flex flex-col gap-1.5 border-t border-zinc-900/50 pt-4 mt-1">
                <label htmlFor="input-security-pin" className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-500" /> Administrative Security PIN
                </label>
                <div className="relative">
                  <input 
                    id="input-security-pin"
                    type="text"
                    value={managerPin ? '******' : ''}
                    readOnly
                    className="w-full px-3.5 py-2.5 bg-[#090a09] border border-zinc-850 rounded-xl text-xs text-zinc-200 focus:border-amber-700 focus:outline-none font-mono tracking-[0.25em]"
                    placeholder="Not set"
                  />
                  <span className="absolute right-3.5 top-3 text-[9px] font-bold text-zinc-650 uppercase tracking-widest pointer-events-none">6 Digits</span>
                </div>
                <p className="text-[10px] text-zinc-600 leading-normal">
                  Used for supervisor approvals, overriding withdrawal thresholds, and unlocking frozen mobilizer profiles.
                </p>
                <button
                  type="button"
                  onClick={() => setShowPinChange(!showPinChange)}
                  className="text-[10px] font-black underline text-[#14cfb4] uppercase tracking-widest mt-2 cursor-pointer"
                >
                  {showPinChange ? 'Cancel PIN Change' : 'Change Security PIN'}
                </button>
                {showPinChange && (
                  <div className="mt-4 p-4 bg-[#090a09] border border-[#14cfb4]/20 rounded-xl flex flex-col gap-3 animate-fade-in">
                    <div className="relative">
                      <input type={showNewPin ? 'text' : 'password'} placeholder="New PIN" className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg text-xs text-white" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} />
                      <button type="button" onClick={() => setShowNewPin(!showNewPin)} className="absolute right-3 top-2.5 text-zinc-500">{showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                    <div className="relative">
                      <input type={showConfirmPin ? 'text' : 'password'} placeholder="Confirm New PIN" className="w-full px-3 py-2 bg-black border border-zinc-800 rounded-lg text-xs text-white" value={confirmNewPin} onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} />
                      <button type="button" onClick={() => setShowConfirmPin(!showConfirmPin)} className="absolute right-3 top-2.5 text-zinc-500">{showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        console.log('PIN update attempt:', { newPin, confirmNewPin, newPinLength: newPin.length });
                        if (newPin.length !== 6 || newPin !== confirmNewPin) {
                          setPinMessage("PIN must be 6 digits and match.");
                          console.log('PIN validation failed');
                          return;
                        }

                        const hashed = hashPin(newPin);
                        
                        try {
                          if (authEmail) {
                            const docId = authEmail.toLowerCase().trim().replace(/[^a-zA-Z0-9_.-]/g, '_');
                            await updateDoc(doc(db, 'managers', docId), { pin: hashed });
                            await addDoc(collection(db, 'auditLogs'), {
                              timestamp: new Date().toISOString(),
                              actionType: 'PIN_CHANGE',
                              actor: authEmail,
                              title: 'PIN Changed',
                              description: 'PIN was successfully changed.',
                              severity: 'success'
                            });
                          }
                          
                          onUpdateSettings({  });
                          setManagerPin(hashed);
                          setShowPinChange(false);
                          setNewPin('');
                          setConfirmNewPin('');
                          setPinMessage("PIN updated!");
                          setTimeout(() => setPinMessage(''), 3000);
                        } catch (error) {
                          console.error('Failed to update PIN:', error);
                          setPinMessage("Failed to update PIN. Please try again.");
                        }
                      }}
                      className="w-full py-2 bg-[#14cfb4] text-black font-black rounded-lg text-[10px] uppercase tracking-widest"
                    >
                      Update PIN
                    </button>
                    {pinMessage && <p className="text-[10px] text-amber-500 font-bold">{pinMessage}</p>}
                  </div>
                )}
              </div>


            </div>
          </div>

          {/* RIGHT COLUMN: ENTERPRISE FINANCIAL LAWS CARD */}
          <div id="financial-laws-card" className="bg-[#111311] border border-zinc-900 rounded-[28px] p-6 flex flex-col justify-between gap-5 shadow-xl">
            
            <div className="flex flex-col gap-1 border-b border-zinc-900/50 pb-4">
              <span className="text-xs font-bold text-zinc-550 uppercase tracking-widest leading-none block pt-1">Agency Setup</span>
              <h3 className="text-base font-extrabold text-zinc-200 tracking-tight mt-1">Enterprise Esusu Governance</h3>
            </div>

            <div className="flex flex-col gap-4">
              
              {/* Organization name & operational currency */}
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-3 flex flex-col gap-1.5">
                  <label htmlFor="input-org-name" className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                    <Building className="w-3 h-3" /> Company / Agency Name
                  </label>
                  <input 
                    id="input-org-name"
                    type="text" 
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-[#090a09] border border-zinc-850 rounded-xl text-xs text-zinc-200 focus:border-[#14cfb4] focus:outline-none"
                    placeholder="E.g. Dan Godal Group savings"
                  />
                </div>
                <div className="col-span-1 flex flex-col gap-1.5">
                  <label htmlFor="select-currency" className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest text-center">
                    Currency
                  </label>
                  <select 
                    id="select-currency"
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    className="w-full px-2 py-2.5 bg-[#090a09] border border-zinc-850 rounded-xl text-xs text-center font-bold text-zinc-200 focus:outline-none"
                  >
                    <option value="₦">₦ (NGN)</option>
                    <option value="$">$ (USD)</option>
                    <option value="CFA">CFA (XOF)</option>
                    <option value="£">£ (GBP)</option>
                    <option value="€">€ (EUR)</option>
                  </select>
                </div>
              </div>

              {/* Target Savings Benchmark & Default slots */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="input-target-savings" className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-[#14cfb4]" /> Daily Net Capital Goal
                  </label>
                  <input 
                    id="input-target-savings"
                    type="number" 
                    value={dailyTargetSavings}
                    onChange={(e) => setDailyTargetSavings(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#090a09] border border-zinc-850 rounded-xl text-xs text-zinc-200 focus:border-[#14cfb4] focus:outline-none font-mono"
                    placeholder="100000000"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="input-default-slot" className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                    <Coins className="w-3 h-3 text-[#f1be48]" /> Standard Daily Slot Cost
                  </label>
                  <input 
                    id="input-default-slot"
                    type="number" 
                    value={defaultSlotValue}
                    onChange={(e) => setDefaultSlotValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#090a09] border border-zinc-850 rounded-xl text-xs text-zinc-200 focus:border-[#14cfb4] focus:outline-none font-mono"
                    placeholder="2000"
                  />
                </div>
              </div>

              {/* Commission Fee & Withdrawal limits */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="input-commission-rate" className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                    <Percent className="w-3 h-3 text-teal-400" /> Platform Fee Margin (%)
                  </label>
                  <input 
                    id="input-commission-rate"
                    type="number" 
                    step="0.1"
                    value={platformCommissionRate}
                    onChange={(e) => setPlatformCommissionRate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#090a09] border border-zinc-850 rounded-xl text-xs text-zinc-200 focus:border-[#14cfb4] focus:outline-none font-mono"
                    placeholder="1.5"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="input-withdrawal-limit" className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3 text-rose-500" /> Audit Withdrawal Alert (₦)
                  </label>
                  <input 
                    id="input-withdrawal-limit"
                    type="number" 
                    value={withdrawalHoldLimit}
                    onChange={(e) => setWithdrawalHoldLimit(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#090a09] border border-zinc-850 rounded-xl text-xs text-zinc-200 focus:border-[#14cfb4] focus:outline-none font-mono"
                    placeholder="150000"
                  />
                </div>
              </div>

              {/* Threshold indicator settings row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="input-min-balance-threshold" className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-rose-500" /> Minimum Balance Alert Threshold ({currencySymbol})
                  </label>
                  <input 
                    id="input-min-balance-threshold"
                    type="number" 
                    value={minBalanceThreshold}
                    onChange={(e) => setMinBalanceThreshold(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#090a09] border border-zinc-850 rounded-xl text-xs text-zinc-200 focus:border-rose-900 focus:outline-none font-mono"
                    placeholder="50000"
                  />
                  <p className="text-[10px] text-zinc-600 leading-normal">
                    Highlight customer balance cards in red if they fall below this minimum balance.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="input-partner-bank" className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                    <Building className="w-3 h-3 text-[#14cfb4]" /> Settlement Partner Bank
                  </label>
                  <input 
                    id="input-partner-bank"
                    type="text" 
                    value={partnerBankName}
                    onChange={(e) => setPartnerBankName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#090a09] border border-zinc-850 rounded-xl text-xs text-zinc-200 focus:border-[#14cfb4] focus:outline-none font-mono font-bold"
                    placeholder="e.g. Sterling Bank Plc"
                  />
                  <p className="text-[10px] text-zinc-600 leading-normal">
                    The commercial banking partner providing customized virtual NUBAN accounts.
                  </p>
                </div>
              </div>

              {/* System Active Operating State Toggle (Live ES Module simulation) */}
              <div className="flex flex-col gap-1.5 border-t border-zinc-900/50 pt-4 mt-1">
                <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">Platform Core State Mode</span>
                <div className="grid grid-cols-2 gap-2 bg-[#090a09] p-1 border border-zinc-900 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setIsLive(true)}
                    className={`py-2 text-[11px] font-extrabold rounded-lg cursor-pointer transition-all ${
                      isLive 
                        ? 'bg-[#13372f]/50 border border-[#14cfb4]/20 text-[#14cfb4]' 
                        : 'text-zinc-500 hover:text-zinc-350'
                    }`}
                  >
                    🟢 Active (Live)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLive(false)}
                    className={`py-2 text-[11px] font-extrabold rounded-lg cursor-pointer transition-all ${
                      !isLive 
                        ? 'bg-amber-950/20 border border-amber-900/30 text-amber-500' 
                        : 'text-zinc-500 hover:text-zinc-350'
                    }`}
                  >
                    🔒 Auditing Check
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* THIRD SECTION: ACTIVE PAYMENT GATEWAYS & LIVE WEBHOOK SIMULATION */}
        <div id="payment-gateways-card" className="bg-[#111311] border border-zinc-900 rounded-[28px] p-6 flex flex-col gap-5 mt-6 shadow-xl text-left">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
            <div className="flex flex-col">
              <span className="text-xs font-black text-[#14cfb4] uppercase tracking-widest flex items-center gap-1.5">
                🌐 ACTIVE WEBHOOK ROUTER & VIRTUAL ACCOUNTS
              </span>
              <p className="text-[11px] text-zinc-500 mt-1">
                Link real-world Central Bank of Nigeria authorized payment processors to route transfers from physical POS or bank apps.
              </p>
            </div>
            
            <div className="flex items-center gap-2 font-mono text-[9.5px] font-black uppercase">
              <span className="text-zinc-600">Integrations:</span>
              <span className={`px-2 py-0.5 rounded-full ${gatewayMode !== 'disabled' ? 'bg-[#14cfb4]/15 text-[#14cfb4]' : 'bg-amber-500/10 text-amber-500'}`}>
                {gatewayMode !== 'disabled' ? `🟢 Active ${gatewayMode}` : '⚠️ Static Sandbox (Offline)'}
              </span>
            </div>
          </div>

          <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl flex items-start gap-3">
            <span className="text-lg shrink-0 mt-0.5">⚠️</span>
            <div className="flex flex-col gap-1">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wide">POS ERROR TROUBLESHOOTING: "Account Invalid [A.T.I.07]"</h4>
              <p className="text-[10.5px] text-zinc-400 leading-relaxed">
                You received this error on your terminal because the account number <strong className="text-zinc-200">2097892315</strong> (Sterling Bank) is a local offline simulation. To activate it on the Nigerian Inter-Bank Settlement System (NIBSS) central switch so that physical ATM transfers can fund your ledgers, configure one of the active gateways below.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                Payment Processor Gateway
              </label>
              <select
                value={gatewayMode}
                onChange={(e) => setGatewayMode(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-[#090a09] border border-zinc-850 rounded-xl text-xs text-zinc-200 font-bold focus:outline-none focus:border-[#14cfb4]"
              >
                <option value="disabled">🚫 Simulated Sandbox (Offline Mode)</option>
                <option value="squad">Squad Co (by GTBank) ⚡ Preferred</option>
                <option value="monnify">Monnify (by Moniepoint)</option>
                <option value="paystack">Paystack</option>
                <option value="flutterwave">Flutterwave</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                API Secret Key
              </label>
              <input
                type="password"
                value={gatewayApiKey}
                onChange={(e) => setGatewayApiKey(e.target.value)}
                placeholder={gatewayMode === 'disabled' ? 'N/A - Sandbox Active' : 'Enter Secret API Key (sk_live_...)'}
                disabled={gatewayMode === 'disabled'}
                className="w-full px-3.5 py-2.5 bg-[#090a09] border border-zinc-850 rounded-xl text-xs text-zinc-200 font-mono focus:outline-none focus:border-[#14cfb4] disabled:opacity-50"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                Webhook Signature / ID
              </label>
              <input
                type="password"
                value={gatewayWebhookSecret}
                onChange={(e) => setGatewayWebhookSecret(e.target.value)}
                placeholder={gatewayMode === 'disabled' ? 'N/A - Sandbox Active' : 'Webhook Securing Token / Hash'}
                disabled={gatewayMode === 'disabled'}
                className="w-full px-3.5 py-2.5 bg-[#090a09] border border-zinc-850 rounded-xl text-xs text-zinc-200 font-mono focus:outline-none focus:border-[#14cfb4] disabled:opacity-50"
              />
            </div>
          </div>

          <div className="bg-[#090a09] border border-zinc-950 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
            <div className="flex flex-col">
              <span className="text-[9.5px] font-black text-zinc-500 uppercase tracking-widest">Your Dedicated Gateway Webhook Address</span>
              <span className="text-xs font-mono text-[#14cfb4] font-bold mt-1 break-all select-all">
                {window.location.origin}/api/webhook/bank-transfer
              </span>
              <span className="text-[9px] text-zinc-600 mt-0.5 leading-normal">
                Paste this address into your payment gateway developer settings to route real physical deposits to this web ledger app.
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const url = window.location.origin + '/api/webhook/bank-transfer';
                navigator.clipboard.writeText(url).then(() => {
                  showToast("📋 Dedicated Webhook URL copied to clipboard!", "success");
                });
              }}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-[10px] font-black tracking-wider uppercase rounded-xl transition-all select-none active:scale-95 shrink-0 cursor-pointer"
            >
              Copy Webhook URL
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-4 mt-4">
            <div className="flex flex-col">
              <span className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                💬 SMS & COMMUNICATION GATEWAY (TERMII)
              </span>
              <p className="text-[11px] text-zinc-500 mt-1">
                Automate real-time savings alerts and withdrawal notifications to customer mobile devices.
              </p>
            </div>
            <div className="flex items-center gap-4 font-mono text-[9.5px] font-black uppercase">
              <div className="flex items-center gap-2">
                <span className="text-zinc-600">Notifications:</span>
                <button
                  type="button"
                  onClick={() => setSmsNotificationsEnabled(!smsNotificationsEnabled)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${smsNotificationsEnabled ? 'bg-amber-500' : 'bg-zinc-800'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${smsNotificationsEnabled ? 'left-6' : 'left-1'}`} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-600">Status:</span>
                <span className={`px-2 py-0.5 rounded-full ${smsApiKey && smsNotificationsEnabled ? 'bg-amber-500/15 text-amber-500' : 'bg-zinc-900 text-zinc-600'}`}>
                  {smsApiKey && smsNotificationsEnabled ? '🟢 Live Dispatch Active' : '⚪ Dispatch Inactive'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                Termii API Secret Key
              </label>
              <input
                type="password"
                value={smsApiKey}
                onChange={(e) => setSmsApiKey(e.target.value)}
                placeholder="Enter your Termii API Key"
                className="w-full px-3.5 py-2.5 bg-[#090a09] border border-zinc-850 rounded-xl text-xs text-zinc-200 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                Approved SMS Sender ID
              </label>
              <input
                type="text"
                value={smsSenderId}
                onChange={(e) => setSmsSenderId(e.target.value)}
                placeholder="e.g. DAN GODAL"
                className="w-full px-3.5 py-2.5 bg-[#090a09] border border-zinc-850 rounded-xl text-xs text-zinc-200 font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="bg-zinc-950 p-4 rounded-2xl mt-2 border border-zinc-900/50 flex flex-col gap-3">
            <div className="flex justify-between items-center pb-2 border-b border-dashed border-zinc-900">
              <span className="text-[9.5px] font-bold text-[#14cfb4]">🧪 INTEGRATIVE TRANSFER & API WEBHOOK SIMULATOR</span>
              <span className="text-[8px] font-mono text-zinc-600 font-bold uppercase">Dev Sandbox Tools</span>
            </div>
            
            <p className="text-[10px] text-zinc-400 leading-normal">
              Test how physical bank transfers made via real POS terminals or web apps instantly hit the backend and credit the member ledger. This emulator bypasses live authentication to allow end-to-end flow validation.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-1">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-extrabold text-zinc-500 uppercase">Select Recipient Customer</span>
                <select
                  id="sim-recipient-cust-id"
                  className="px-3 py-2 bg-[#090a09] border border-zinc-900 text-[11px] text-zinc-200 focus:outline-none focus:border-zinc-750 font-semibold rounded-lg"
                >
                  {state.customers.map((c, idx) => (
                    <option key={`${c.id}-${idx}`} value={c.accountNumber}>
                      {c.name} (@{c.username || 'N/A'} - {c.accountNumber || 'no acct'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-extrabold text-zinc-500 uppercase">Input Amount (₦)</span>
                <input
                  id="sim-deposit-amount"
                  type="number"
                  defaultValue="1500"
                  className="px-3 py-2 bg-[#090a09] border border-zinc-900 text-[11px] text-zinc-200 focus:outline-none focus:border-zinc-750 font-bold font-mono rounded-lg"
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-extrabold text-zinc-500 uppercase">Source Sender Bank</span>
                <select
                  id="sim-source-bank"
                  className="px-3 py-2 bg-[#090a09] border border-zinc-900 text-[11px] text-zinc-200 focus:outline-none focus:border-zinc-750 rounded-lg"
                >
                  <option value="Zenith Bank Plc">Zenith Bank Plc</option>
                  <option value="Sterling Bank Plc">Sterling Bank Plc</option>
                  <option value="Guaranty Trust Bank (GTB)">Guaranty Trust Bank (GTB)</option>
                  <option value="United Bank for Africa (UBA)">United Bank for Africa (UBA)</option>
                  <option value="Access Bank Plc">Access Bank Plc</option>
                  <option value="OPay Digital Services">OPay Digital Services</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                const selectCust = document.getElementById('sim-recipient-cust-id') as HTMLSelectElement;
                const inputAmount = document.getElementById('sim-deposit-amount') as HTMLInputElement;
                const selectBank = document.getElementById('sim-source-bank') as HTMLSelectElement;
                
                if (!selectCust || !inputAmount || !selectBank) return;
                
                const amt = parseFloat(inputAmount.value);
                const acct = selectCust.value;
                const bank = selectBank.value;
                
                if (isNaN(amt) || amt <= 0) {
                  showToast("Please specify a valid positive transfer amount.", "error");
                  return;
                }

                try {
                  const cleanAcct = acct.trim();
                  const txRef = "SIM-TRANS-" + Math.floor(100000 + Math.random() * 900000);
                  
                  const payload = {
                    event: "transfer.success",
                    status: "success",
                    transaction_reference: txRef,
                    payment_destination: "Sterling Bank",
                    virtual_account_number: cleanAcct,
                    amount: amt,
                    sender_bank: bank,
                    gateway_provider: gatewayMode === 'disabled' ? 'simulation' : gatewayMode
                  };

                  const response = await fetch('/api/webhook/bank-transfer', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload)
                  });
                  
                  const responseData = await response.json();
                  
                  if (response.ok && responseData.status === 'ok') {
                    showToast(`✅ SIMULATED STATUS POST SUCCESSFUL!\n\nWebhook acknowledged by Express server. The transfer of ₦${amt.toLocaleString()} has been received for Account Number ${cleanAcct}. Check your dashboard ledgers!`, "success");
                  } else {
                    showToast(`⚠️ Webhook rejected: ${responseData.message || 'Unknown server error.'}`, "error");
                  }
                } catch (err: any) {
                  showToast(`❌ Simulation failed to dispatch: ${err.message}. Ensure the dev mode full-stack server is booted correctly!`, "error");
                }
              }}
              className="py-3 bg-[#14cfb4]/10 hover:bg-[#14cfb4]/20 border border-[#14cfb4]/30 hover:border-[#14cfb4]/50 text-[#14cfb4] text-[10.5px] font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer mt-1"
            >
              ⚡ SEND SIMULATED POS WEBHOOK TRANSACTION TO LEDGER SERVER
            </button>
          </div>
        </div>

        {/* Global Save Button block */}
        <button
          type="submit"
          id="btn-save-settings"
          className="w-full py-4 bg-[#14cfb4] hover:bg-[#12b9a1] text-black font-extrabold text-xs tracking-wider uppercase rounded-2xl active:scale-95 transition-all cursor-pointer shadow-lg shadow-[#14cfb4]/5 text-center"
        >
          ✓ Propagate settings & finalize profile
        </button>
      </form>

      {/* LOWER COMPARTMENT: SANDBOX CONTROLS & SEED DATABASE */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2 border-t border-zinc-900 pt-8 pb-8">
        
        {/* Real-time simulation state */}
        <div className="bg-[#111311] border border-zinc-900 rounded-[28px] p-5.5 flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest">Testing Sandbox</span>
            <h4 className="text-sm font-extrabold text-zinc-150">Autonomous Live Contributor Traffic</h4>
            <p className="text-xs text-zinc-550 leading-relaxed">
              Enable the simulation thread to automatically trigger realistic agent collections from client ledger cards twice per minute. This allows you to inspect graph scalability and progress metrics.
            </p>
          </div>

          <div className="flex items-center gap-3.5 pt-2">
            <button
              type="button"
              onClick={() => onToggleSimulating(!isSimulating)}
              className={`px-4.5 py-2.5 rounded-xl border text-xs font-black flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer ${
                isSimulating 
                  ? 'bg-emerald-950/70 border-emerald-800 text-emerald-400' 
                  : 'bg-zinc-900 border-zinc-850 text-zinc-300 hover:border-zinc-800'
              }`}
            >
              {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 animate-pulse" />}
              <span>{isSimulating ? 'Autonomous Active' : 'Enable Simulator Feed'}</span>
            </button>

            {/* Instant micro deposit simulator */}
            <button
              type="button"
              onClick={onSimulate}
              className="px-4.5 py-2.5 bg-zinc-950 hover:bg-black border border-zinc-950 hover:border-zinc-850 text-emerald-500 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              ⚡ Instant Sim Card Deposit
            </button>
          </div>
        </div>

        {/* Hard reseed data card */}
        <div className="bg-[#111311] border border-zinc-900 rounded-[28px] p-5.5 flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-extrabold text-rose-455 uppercase tracking-widest">Administrative Reset</span>
            <h4 className="text-sm font-extrabold text-zinc-150 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-zinc-650" /> Ledger Reset Utility
            </h4>
            <p className="text-xs text-zinc-550 leading-relaxed">
              If local storage metrics or balances have undergone diagnostic tests that you wish to drop, this utility returns cash constants back to their original startup parameters immediately (₦84.2M gross savings).
            </p>
          </div>

          <button 
            type="button"
            onClick={() => {
              if (confirm('Verify: Purge current ledger modifications and load baseline constants? All custom records will be dropped.')) {
                onReset();
                showToast('State successfully reset to database baseline defaults.', "success");
              }
            }}
            className="w-full py-2.5 bg-red-950/30 hover:bg-red-950/50 border border-red-900/30 hover:border-red-920 text-red-400 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reseed Dashboard state to default configuration</span>
          </button>
        </div>

      </div>

      {/* Audit Log Section */}
      <div className="bg-[#111311] border border-zinc-900 rounded-[28px] p-5.5 mt-8">
        <h4 className="text-sm font-extrabold text-zinc-150 mb-4 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-zinc-650" /> Security Activity Logs
        </h4>
        <div className="bg-[#090a09] border border-zinc-800 rounded-xl p-4 max-h-60 overflow-y-auto">
          {(state.auditLogs || [])
            .filter(log => log.actionType === 'PIN_CHANGE' || log.actionType === 'PIN_RESET')
            .slice(0, 10)
            .map((log, index) => (
              <div key={`${log.id}-${index}`} className="mb-3 border-b border-zinc-800 pb-2 flex justify-between items-start">
                <div>
                  <p className="text-xs text-white font-bold">{log.title}</p>
                  <p className="text-[10px] text-zinc-400">{log.description}</p>
                  <p className="text-[9px] text-zinc-600 mt-1">{new Date(log.timestamp).toLocaleString()}</p>
                </div>
                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  log.severity === 'success' ? 'bg-emerald-950 text-emerald-400' :
                  log.severity === 'error' ? 'bg-red-950 text-red-400' :
                  'bg-zinc-800 text-zinc-300'
                }`}>
                  {log.severity}
                </span>
              </div>
          ))}
          {(!state.auditLogs || state.auditLogs.filter(log => log.actionType === 'PIN_CHANGE' || log.actionType === 'PIN_RESET').length === 0) && (
            <p className="text-[10px] text-zinc-600 italic">No security logs found.</p>
          )}
        </div>
      </div>

    </div>
  );
}
