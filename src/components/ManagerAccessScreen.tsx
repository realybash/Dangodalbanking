import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Key, Mail, Lock, AlertCircle, Sparkles, Plus, ArrowRight, UserCheck, ShieldAlert, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { requestPasswordReset, registerWithEmail, loginWithEmail } from '../lib/authHelper';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, addDoc } from 'firebase/firestore';

// A secure local masking/hashing utility for PINs and passwords to keep it scrambled in localStorage
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

interface Manager {
  email: string;
  pin?: string;
  password?: string;
}

interface ManagerAccessScreenProps {
  onSuccess: (email: string) => void;
  onBack?: () => void;
}

export default function ManagerAccessScreen({ onSuccess, onBack }: ManagerAccessScreenProps) {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  
  // Sign In States
  const [email, setEmail] = useState('admin@contribopay.ng');
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [signinMethod, setSigninMethod] = useState<'pin' | 'password'>('pin');
  const [focusedField, setFocusedField] = useState<'email' | 'pin' | 'password'>('pin');
  const [loginError, setLoginError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Sign Up States
  const [registerEmail, setRegisterEmail] = useState('');
  const [signupMethod, setSignupMethod] = useState<'pin' | 'password'>('pin');
  const [registerPin, setRegisterPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [staffCode, setStaffCode] = useState('');

  // Read current active staff list from storage to cross-verify codes
  const [staffList] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('contribo_dashboard_state_v10');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed?.staff)) {
          return parsed.staff;
        }
      }
    } catch (e) {
      console.error('Error reading staff storage inside manager access:', e);
    }
    // Hardcoded fallback list in case state is not initialized yet
    return [
      { id: 's1', name: 'Bello Usman', code: 'CO-01' },
      { id: 's2', name: 'Zainab Ibrahim', code: 'CO-02' }
    ];
  });

  // Reset Modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [generatedPin, setGeneratedPin] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStep, setResetStep] = useState<'email' | 'enter_new_pin'>('email');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');

  // Saved Managers State (synced with localStorage)
  const [managers, setManagers] = useState<Manager[]>(() => {
    const saved = localStorage.getItem('contribo_managers_v2') || localStorage.getItem('contribo_managers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Error parsing managers, reverting to default:', e);
      }
    }
    // Default fallback managers with pre-created PIN or password
    return [
      { email: 'admin@contribopay.ng', pin: '1234' },
      { email: 'manager@contribopay.ng', password: 'managerpassword' }
    ];
  });

  // Save managers list on update
  useEffect(() => {
    localStorage.setItem('contribo_managers_v2', JSON.stringify(managers));
    localStorage.setItem('contribo_managers', JSON.stringify(managers));
  }, [managers]);

  // Subscribe to 'managers' collection in Firestore to sync administrative credentials across devices
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'managers'), (snapshot) => {
      const fbManagers: Manager[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Manager;
        if (data.email) {
          fbManagers.push(data);
        }
      });
      if (fbManagers.length > 0) {
        setManagers(prev => {
          const merged = [...prev];
          fbManagers.forEach(fbM => {
            const index = merged.findIndex(m => m.email.toLowerCase().trim() === fbM.email.toLowerCase().trim());
            if (index !== -1) {
              merged[index] = fbM;
            } else {
              merged.push(fbM);
            }
          });
          return merged;
        });
      }
    }, (error) => {
      console.warn('Local offline fallback active for managers:', error);
    });
    return () => unsub();
  }, []);

  // Verification handler for manager PIN logins (validates both hashed/masked and raw fallback PINs)
  const verifyPinLogin = async (enteredPin: string) => {
    if (enteredPin.length < 4 || enteredPin.length > 6) {
      setLoginError('PIN must be between 4 and 6 digits.');
      return;
    }
    
    setIsAuthLoading(true); // Assuming we have or want this state for visual feedback
    const formattedEmail = email.toLowerCase().trim();
    const passwordForPin = `pin_${enteredPin}_auth`;

    try {
      await loginWithEmail(formattedEmail, passwordForPin);
      setLoginSuccess(true);
      setLoginError('');
      setTimeout(() => {
        onSuccess(formattedEmail);
      }, 800);
    } catch (error: any) {
      // Fallback check against local state for legacy accounts or if just created
      const enteredHash = hashPin(enteredPin);
      const found = managers.find(
        m => m.email.toLowerCase().trim() === formattedEmail && 
             (m.pin === enteredHash || m.pin === enteredPin)
      );

      if (found) {
        setLoginSuccess(true);
        setLoginError('');
        setTimeout(() => {
          onSuccess(found.email);
        }, 800);
      } else {
        const emailExists = managers.find(m => m.email.toLowerCase().trim() === formattedEmail);
        if (emailExists && emailExists.password && !emailExists.pin) {
          setLoginError('This administrator account uses a password. Please switch to "Use Password".');
        } else {
          setLoginError('Incorrect PIN for this administrator email address.');
        }
        setPin(''); // Reset circles
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Handle number pad button press (from screen button)
  const handleNumPress = (num: string) => {
    setLoginError('');
    if (focusedField === 'pin') {
      if (pin.length < 6) {
        setPin(prev => prev + num);
      }
    } else if (focusedField === 'password') {
      setPassword(prev => prev + num);
    } else {
      setEmail(prev => prev + num);
    }
  };

  // Handle backspace
  const handleBackspace = () => {
    setLoginError('');
    if (focusedField === 'pin') {
      setPin(prev => prev.slice(0, -1));
    } else if (focusedField === 'password') {
      setPassword(prev => prev.slice(0, -1));
    } else {
      setEmail(prev => prev.slice(0, -1));
    }
  };

  // Listen for keyboard strokes to enter pin easily from computer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only process keystrokes if focused inside PIN context or not typing in other inputs
      if (activeTab === 'signin' && signinMethod === 'pin') {
        const activeEl = document.activeElement;
        const isEmailInputFocused = activeEl && activeEl.id === 'signin-email-input';
        
        if (isEmailInputFocused) {
          // If they hit Enter, move focus to pin typing
          if (e.key === 'Enter') {
            e.preventDefault();
            setFocusedField('pin');
          }
          return; // Let standard input handle typing inside Email field
        }

        // Otherwise handle PIN digits
        if (/^[0-9]$/.test(e.key)) {
          e.preventDefault();
          if (pin.length < 6) {
            setPin(prev => prev + e.key);
          }
        } else if (e.key === 'Backspace') {
          e.preventDefault();
          setPin(prev => prev.slice(0, -1));
        } else if (e.key === 'Delete') {
          e.preventDefault();
          setPin('');
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (pin.length >= 4) {
            verifyPinLogin(pin);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, activeTab, signinMethod, email, managers]);

  // Handle automatic check once correct 4-6 digit PIN is entered
  useEffect(() => {
    if (pin.length >= 4 && activeTab === 'signin' && signinMethod === 'pin') {
      const enteredHash = hashPin(pin);
      const found = managers.find(
        m => m.email.toLowerCase().trim() === email.toLowerCase().trim() && 
             (m.pin === enteredHash || m.pin === pin)
      );

      if (found) {
        // Match found! Auto-log in!
        setLoginSuccess(true);
        setLoginError('');
        const timer = setTimeout(() => {
          onSuccess(found.email);
        }, 800);
        return () => clearTimeout(timer);
      } else if (pin.length === 6) {
        // Max limit typed and no match, automatically evaluate error
        const timer = setTimeout(() => {
          verifyPinLogin(pin);
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [pin, email, managers, activeTab, signinMethod, onSuccess]);

  // Handle Password Sign In
  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginSuccess(false);

    const formattedEmail = email.toLowerCase().trim();

    if (!formattedEmail || !formattedEmail.includes('@')) {
      setLoginError('Please enter a valid administrator email address.');
      return;
    }

    if (!password) {
      setLoginError('Please enter your password.');
      return;
    }

    try {
      await loginWithEmail(formattedEmail, password);
      setLoginSuccess(true);
      setLoginError('');
      setTimeout(() => {
        onSuccess(formattedEmail);
      }, 800);
    } catch (error: any) {
      console.error("Manager Auth Error:", error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setLoginError('Invalid administrator credentials.');
      } else {
        setLoginError(error.message || 'Login failed. Please try again.');
      }
    }
  };

  // Handle Registering a new admin account
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess(false);

    const formattedEmail = registerEmail.toLowerCase().trim();

    if (!formattedEmail || !formattedEmail.includes('@')) {
      setRegisterError('Please enter a valid administrator email address.');
      return;
    }

    // Verify Staff Code is valid
    const normalizedStaffCode = staffCode.trim().toLowerCase();
    if (!normalizedStaffCode) {
      setRegisterError('You must provide a valid Staff Code or ID to register as an administrator.');
      return;
    }

    const matchedStaff = staffList.find(
      s => s.id.toLowerCase() === normalizedStaffCode ||
           (s.code && s.code.toLowerCase() === normalizedStaffCode) ||
           s.name.toLowerCase().includes(normalizedStaffCode)
    );

    if (!matchedStaff) {
      setRegisterError('Invalid Staff Code or ID! Registration is restricted. Please query a valid active staff agent (e.g. CO-01 or s1).');
      return;
    }

    // PIN is mandatory regardless of high-level signupMethod selected
    if (!registerPin) {
      setRegisterError('A numeric PIN is mandatory to register as an administrator.');
      return;
    }

    if (registerPin.length < 4 || registerPin.length > 6 || !/^\d+$/.test(registerPin)) {
      setRegisterError('PIN must be between 4 and 6 digits and numeric.');
      return;
    }

    if (registerPin !== confirmPin) {
      setRegisterError('PINs do not match. Please verify your fields.');
      return;
    }

    // Password is required for Firebase Auth
    let finalPassword = registerPassword;
    if (signupMethod === 'pin') {
      finalPassword = `pin_${registerPin}_auth`; // Use a derivative for PIN-only accounts
    } else {
      if (!registerPassword) {
        setRegisterError('You must provide a password to register using the password flow.');
        return;
      }
      if (registerPassword.length < 6) {
        setRegisterError('Password must be at least 6 characters long.');
        return;
      }
      if (registerPassword !== confirmPassword) {
        setRegisterError('Passwords do not match. Please verify your fields.');
        return;
      }
    }

    try {
      // 1. Create user in Firebase Auth
      await registerWithEmail(formattedEmail, finalPassword);

      // 2. Build manager profile with securely hashed/masked PIN
      const hashedPinVal = hashPin(registerPin);
      const newManager: Manager = {
        email: formattedEmail,
        pin: hashedPinVal,
        ...(signupMethod === 'password' ? { password: registerPassword } : {})
      };
      
      // 3. Save to Firestore
      const cleanDocId = formattedEmail.replace(/[^a-zA-Z0-9_.-]/g, '_');
      await setDoc(doc(db, 'managers', cleanDocId), newManager);
      
      setManagers(prev => [...prev, newManager]);
      setRegisterSuccess(true);

      // Swap back to sign-in with prefilled details
      setTimeout(() => {
        setEmail(formattedEmail);
        setPin('');
        setPassword('');
        setSigninMethod(signupMethod);
        setActiveTab('signin');
        setFocusedField(signupMethod === 'pin' ? 'pin' : 'password');
        setRegisterEmail('');
        setRegisterPin('');
        setConfirmPin('');
        setRegisterPassword('');
        setConfirmPassword('');
        setRegisterSuccess(false);
      }, 1200);
    } catch (error: any) {
      console.error("Manager Registration Error:", error);
      setRegisterError(error.message || 'Registration failed.');
    }
  };

  return (
    <div className="min-h-screen bg-[#070907] flex flex-col items-center justify-center p-4 select-none relative overflow-hidden font-sans">
      
      {/* Decorative background grid/auras for real high density UI design depth */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(20,207,180,0.03)_0%,transparent_60%)] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-yellow-500/5 rounded-full blur-[90px] pointer-events-none" />

      {/* Top Left Circular Back/Exit button matching screenshots */}
      <div className="absolute top-6 left-6 md:top-8 md:left-8">
        <button 
          onClick={() => {
            if (onBack) {
              onBack();
            } else {
              try {
                window.history.back();
              } catch {
                console.log("Navigating back...");
              }
            }
          }}
          className="w-11 h-11 rounded-full border border-zinc-900 bg-[#111311]/50 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-[#151715] hover:border-zinc-800 transition-all duration-200 active:scale-90 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
          title="Back"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4.5 h-4.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
      </div>

      {/* Main Core Form wrapper containing the animated transitions */}
      <div className="w-full max-w-sm flex flex-col items-center gap-7.5 animate-fade-in z-10">
        
        {/* Animated Custom Launcher Icon Banner matching screenshots */}
        <div className="flex flex-col items-center gap-4.5 text-center">
          <div className="relative">
            {/* Soft background radial amber glow */}
            <div className="absolute inset-x-0 bottom-[-15%] top-[15%] bg-[#fac536]/25 filter blur-[32px] rounded-full scale-150 animate-pulse duration-[4000ms]" />
            
            {/* The gold rounded icon square mimicking image */}
            <div className="w-21 h-21 bg-[#fac435] rounded-[24px] flex items-center justify-center shadow-[0_12px_36px_rgba(250,196,53,0.32)] active:scale-95 transition-transform duration-250 cursor-pointer border border-[#ffeca1]/20 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/8 to-transparent rotate-45 pointer-events-none" />
              <span className="text-4.5xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)] select-none">👑</span>
            </div>
          </div>

          <div className="flex flex-col mt-1">
            <h1 className="text-[27px] font-black text-zinc-100 tracking-tight leading-none uppercase font-sans">
              Manager Access
            </h1>
            <p className="text-[13.5px] font-medium text-zinc-500 tracking-wide mt-2">
              Secure portal for administrators
            </p>
          </div>
        </div>

        {/* Outer Form Card Box */}
        <div className="w-full bg-[#111311]/90 border border-[#fac435]/20 rounded-[32px] p-6.5 flex flex-col gap-6.5 relative shadow-[0_24px_64px_rgba(0,0,0,0.95),0_0_50px_rgba(250,196,53,0.05)] backdrop-blur-md">
          
          {/* Custom Track/Slider Pill Tabs with precise selected backgrounds */}
          <div className="grid grid-cols-2 bg-[#090a09] p-1 border border-zinc-950 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setLoginError('');
              }}
              className={`py-2 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'signin'
                  ? 'bg-[#1a1c1a] text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-350'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('signup');
                setRegisterError('');
              }}
              className={`py-2 rounded-xl text-xs font-black tracking-wide uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'signup'
                  ? 'bg-[#1a1c1a] text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Create Account
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'signin' ? (
              /* SIGN-IN SCREEN CONTENT CONTAINER */
              <motion.form
                key="signin"
                onSubmit={signinMethod === 'pin' ? (e) => e.preventDefault() : handlePasswordSignIn}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col gap-5.5 w-full"
              >
                {/* Field 1: Email Input Row styled precisely to match layout in screenshots */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="signin-email-input" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                    EMAIL ADDRESS
                  </label>
                  <input
                    id="signin-email-input"
                    type="email"
                    value={email}
                    onFocus={() => {
                      setFocusedField('email');
                      setLoginError('');
                    }}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@contribopay.ng"
                    className={`w-full px-4 py-3.5 bg-[#090a09] border rounded-xl text-xs font-semibold transition-all focus:outline-none ${
                      focusedField === 'email' 
                        ? 'border-zinc-800 text-zinc-150' 
                        : 'border-zinc-900/40 text-zinc-400'
                    }`}
                  />
                </div>

                {/* Sign In Method Toggles */}
                <div className="flex bg-[#090a09] p-0.5 border border-zinc-950 rounded-xl h-10 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setSigninMethod('pin');
                      setLoginError('');
                      setFocusedField('pin');
                    }}
                    className={`flex-1 rounded-lg text-[10px] font-black tracking-wider uppercase transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      signinMethod === 'pin'
                        ? 'bg-[#1a1c1a] text-[#14cfb4] shadow-sm font-black'
                        : 'text-zinc-500 hover:text-zinc-400 font-bold'
                    }`}
                  >
                    🔢 Use PIN
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSigninMethod('password');
                      setLoginError('');
                      setFocusedField('password');
                    }}
                    className={`flex-1 rounded-lg text-[10px] font-black tracking-wider uppercase transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      signinMethod === 'password'
                        ? 'bg-[#1a1c1a] text-[#14cfb4] shadow-sm font-black'
                        : 'text-zinc-500 hover:text-zinc-400 font-bold'
                    }`}
                  >
                    🔑 Use Password
                  </button>
                </div>

                {signinMethod === 'pin' ? (
                  <>
                    {/* Field 2: MANAGER PIN Indicators & Circles (Floating elegantly) */}
                    <div className="flex flex-col items-center gap-3.5 py-0.5 border-t border-zinc-900/35 pt-1">
                      <div className="flex justify-between w-full px-1">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">
                          MANAGER PIN
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsResetting(!isResetting);
                            setLoginError('');
                            setResetStep('email');
                            setNewPin('');
                            setConfirmNewPin('');
                          }}
                          className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg relative z-[5000] pointer-events-auto cursor-pointer transition-all active:scale-95 shadow-sm ${isResetting ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30' : 'text-[#14cfb4] bg-[#14cfb4]/10 border border-[#14cfb4]/30 hover:text-white'}`}
                        >
                          {isResetting ? 'Cancel Reset' : 'Reset PIN?'}
                        </button>
                      </div>

                      {isResetting ? (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="w-full bg-[#0d0e0d] border border-[#14cfb4]/20 rounded-xl p-4 flex flex-col gap-3"
                        >
                          <span className="text-[9px] font-bold text-zinc-500 uppercase">Enter Administrator Email</span>
                          <input 
                            type="email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            placeholder="admin@example.com"
                            className="w-full py-2.5 px-3 bg-[#090a09] border border-zinc-800 rounded-lg text-xs text-white focus:border-[#14cfb4] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!resetEmail) return;
                              const managerIndex = managers.findIndex(m => m.email?.toLowerCase().trim() === resetEmail.toLowerCase().trim());
                              if (managerIndex !== -1) {
                                // Instead of generating a random PIN immediately, show input for new PIN
                                setResetStep('enter_new_pin');
                              } else {
                                setLoginError("Administrator access failed: No profile matched this email.");
                              }
                            }}
                            className="w-full py-2.5 bg-[#14cfb4] text-black font-black rounded-lg text-[10px] uppercase tracking-widest shadow-lg"
                          >
                            Verify Admin
                          </button>
                        </motion.div>
                      ) : resetStep === 'enter_new_pin' ? (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="w-full bg-[#0d0e0d] border border-[#14cfb4]/20 rounded-xl p-4 flex flex-col gap-3"
                        >
                          <span className="text-[9px] font-bold text-zinc-500 uppercase">Set New 4-6 Digit PIN</span>
                          <input 
                            type="password"
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                            placeholder="Enter New PIN"
                            className="w-full py-2.5 px-3 bg-[#090a09] border border-zinc-800 rounded-lg text-xs text-white focus:border-[#14cfb4] focus:outline-none"
                          />
                          <input 
                            type="password"
                            value={confirmNewPin}
                            onChange={(e) => setConfirmNewPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                            placeholder="Confirm New PIN"
                            className="w-full py-2.5 px-3 bg-[#090a09] border border-zinc-800 rounded-lg text-xs text-white focus:border-[#14cfb4] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (newPin.length < 4 || newPin !== confirmNewPin) {
                                setLoginError("PINs do not match or are too short (min 4 digits).");
                                return;
                              }
                              
                              const managerIndex = managers.findIndex(m => m.email?.toLowerCase().trim() === resetEmail.toLowerCase().trim());
                              const managerToSave = { ...managers[managerIndex], pin: hashPin(newPin) };
                              
                              const cleanDocId = managerToSave.email.toLowerCase().trim().replace(/[^a-zA-Z0-9_.-]/g, '_');
                              setDoc(doc(db, 'managers', cleanDocId), managerToSave)
                                .then(async () => {
                                  
                                  // Update local cache state immediately
                                  setManagers(prev => prev.map(m => 
                                    m.email?.toLowerCase().trim() === managerToSave.email.toLowerCase().trim() 
                                      ? managerToSave 
                                      : m
                                  ));

                                  await addDoc(collection(db, 'auditLogs'), {
                                    timestamp: new Date().toISOString(),
                                    actionType: 'PIN_RESET',
                                    actor: resetEmail,
                                    title: 'PIN Reset',
                                    description: 'PIN was successfully reset.',
                                    severity: 'success'
                                  });
                                  setShowResetModal(true);
                                  setIsResetting(false);
                                  setResetStep('email');
                                  setResetEmail('');
                                  setNewPin('');
                                  setConfirmNewPin('');
                                  setLoginError('');
                                })
                                .catch(err => {
                                  console.error('Error saving new PIN to Firestore:', err);
                                  setLoginError('Error saving PIN. Please try again.');
                                });
                            }}
                            className="w-full py-2.5 bg-[#14cfb4] text-black font-black rounded-lg text-[10px] uppercase tracking-widest shadow-lg"
                          >
                            Save New PIN
                          </button>
                        </motion.div>
                      ) : (
                        /* Dot animation display block matching screenshot circular points - updated to show 6 circles for 4-6 digit PINs */
                        <div 
                          onClick={() => {
                            setFocusedField('pin');
                            setLoginError('');
                          }}
                          className="flex justify-center items-center gap-4.5 py-2 cursor-pointer select-none"
                        >
                          {[0, 1, 2, 3, 4, 5].map((index) => {
                            const isActive = pin.length > index;
                            return (
                              <div key={index} className="relative flex items-center justify-center">
                                {isActive ? (
                                  <motion.div 
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="w-3.5 h-3.5 rounded-full bg-[#14cfb4] border border-[#14cfb4] shadow-[0_0_12px_rgba(20,207,180,0.85)]"
                                  />
                                ) : (
                                  <div className="w-3.5 h-3.5 rounded-full border-2 border-zinc-900" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Password Input Block */}
                    <div className="flex flex-col gap-1.5 border-t border-zinc-900/35 pt-4">
                      <label htmlFor="signin-password-input" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                        PASSWORD
                      </label>
                      <div className="relative flex items-center">
                        <input
                          id="signin-password-input"
                          type={showSignInPassword ? "text" : "password"}
                          value={password}
                          onFocus={() => {
                            setFocusedField('password');
                            setLoginError('');
                          }}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className={`w-full pl-4 pr-11 py-3.5 bg-[#090a09] border rounded-xl text-xs font-semibold tracking-wide transition-all focus:outline-none ${
                            focusedField === 'password' 
                              ? 'border-zinc-800 text-zinc-150' 
                              : 'border-zinc-900/40 text-zinc-400'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignInPassword(!showSignInPassword)}
                          className="absolute right-3.5 text-zinc-500 hover:text-zinc-300"
                        >
                          {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {loginError && (
                  <motion.p 
                    initial={{ opacity: 0, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[10.5px] font-bold text-rose-455 text-center leading-normal max-w-xs mt-1 border border-rose-950/20 bg-rose-955/5 p-2 rounded-xl"
                  >
                    {loginError}
                  </motion.p>
                )}

                {loginSuccess && (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[11px] font-bold text-[#14cfb4] text-center leading-normal flex items-center justify-center gap-1.5 bg-emerald-950/20 border border-emerald-900/30 p-2 rounded-xl mt-1"
                  >
                    <Sparkles className="w-3.5 h-3.5 animate-bounce shrink-0 text-yellow-550" />
                    Sign In verified. Granting Admin session...
                  </motion.p>
                )}

                {signinMethod === 'pin' ? (
                  /* Premium Numeric Dialpad Layout exactly aligned Grid structure */
                  <div className="grid grid-cols-3 gap-3">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleNumPress(num)}
                        className="h-14.5 flex items-center justify-center rounded-[20px] bg-[#151715] hover:bg-[#1c1e1c] active:bg-zinc-900 border border-zinc-900/60 text-zinc-100 font-semibold text-2xl active:scale-95 transition-all cursor-pointer font-sans select-none"
                      >
                        {num}
                      </button>
                    ))}
                    
                    {/* Bottom Row: OK / Submit Key | 0 | Backspace Key */}
                    <button
                      type="button"
                      onClick={() => verifyPinLogin(pin)}
                      disabled={pin.length < 4}
                      className={`h-14.5 flex items-center justify-center rounded-[20px] border text-xs font-black tracking-widest uppercase active:scale-95 transition-all cursor-pointer font-sans select-none ${
                        pin.length >= 4 
                          ? 'bg-[#14cfb4]/20 border-[#14cfb4]/40 text-[#14cfb4] hover:bg-[#14cfb4]/30' 
                          : 'bg-[#151715]/40 border-zinc-850/35 text-zinc-650 cursor-not-allowed'
                      }`}
                      title="Submit PIN"
                    >
                      OK
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => handleNumPress('0')}
                      className="h-14.5 flex items-center justify-center rounded-[20px] bg-[#151715] hover:bg-[#1c1e1c] active:bg-zinc-900 border border-zinc-900/60 text-zinc-100 font-semibold text-2xl active:scale-95 transition-all cursor-pointer font-sans select-none"
                    >
                      0
                    </button>

                    <button
                      type="button"
                      onClick={handleBackspace}
                      className="h-14.5 flex items-center justify-center rounded-[20px] bg-[#151715] hover:bg-rose-955/10 active:bg-zinc-900 border border-zinc-900/60 text-zinc-400 hover:text-rose-450 active:scale-95 transition-all cursor-pointer select-none"
                      title="Backspace"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5.5 h-5.5 text-zinc-350">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 010-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 012.25 2.25v10.5a2.25 2.25 0 01-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33z" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    className="w-full py-3 bg-[#11b59d] hover:bg-[#14cfb4] text-[#090a09] font-black rounded-xl text-xs tracking-wider uppercase transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-1.5 mt-2"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Sign In Administrator</span>
                  </button>
                )}

                <div className="h-6" />
              </motion.form>
            ) : (
              /* SIGN-UP SCREEN CONTENT CONTAINER */
              <motion.form
                key="signup"
                onSubmit={handleRegister}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col gap-4"
              >
                {registerSuccess ? (
                  <div className="flex flex-col items-center justify-center text-center p-6 bg-emerald-950/25 border border-emerald-900/40 rounded-2xl gap-2.5 my-3 animate-scale-in">
                    <CheckCircle2 className="w-10 h-10 text-[#30d178]" />
                    <h3 className="text-zinc-150 font-black text-sm uppercase font-sans">Registration Approved</h3>
                    <p className="text-xs text-zinc-400 font-medium">
                      Primary administrative credentials linked securely. Relinking to login...
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Verifying Staff Code matching */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="signup-staff-code-input" className="text-[10px] font-black text-[#14cfb4] uppercase tracking-widest flex justify-between items-center">
                        <span>Staff Code or ID</span>
                        <span className="text-[9px] text-zinc-500 lowercase italic">required to enroll manager</span>
                      </label>
                      <input
                        id="signup-staff-code-input"
                        type="text"
                        required
                        value={staffCode}
                        onChange={(e) => setStaffCode(e.target.value)}
                        placeholder="e.g. CO-01 or s1"
                        className="w-full px-4 py-3 bg-[#090a09] border border-zinc-950 rounded-xl text-xs text-zinc-150 focus:border-zinc-850 focus:outline-none font-semibold font-mono tracking-wider"
                      />
                      {/* Real time verification feedback */}
                      {(() => {
                        const q = staffCode.trim().toLowerCase();
                        if (!q) return null;
                        const match = staffList.find(
                          s => s.id.toLowerCase() === q ||
                               (s.code && s.code.toLowerCase() === q) ||
                               s.name.toLowerCase().includes(q)
                        );
                        if (match) {
                          return (
                            <span className="text-[9.5px] text-[#14cfb4] font-extrabold flex items-center gap-1.5 mt-0.5 leading-none">
                              ✓ Verified Staff Member: {match.name} ({match.code || match.id})
                            </span>
                          );
                        } else {
                          return (
                            <span className="text-[9.5px] text-rose-455 font-bold flex items-center gap-1.5 mt-0.5 leading-none animate-pulse">
                              ❌ No Active Staff matches code
                            </span>
                          );
                        }
                      })()}
                    </div>

                    {/* Register field 1: Email */}
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="signup-email-input" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                        Email Address
                      </label>
                      <input
                        id="signup-email-input"
                        type="email"
                        required
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        placeholder="manager@domain.com"
                        className="w-full px-4 py-3 bg-[#090a09] border border-zinc-950 rounded-xl text-xs text-zinc-150 focus:border-zinc-850 focus:outline-none font-semibold font-mono"
                      />
                    </div>

                    {/* Sign Up Method Choice */}
                    <div className="flex bg-[#090a09] p-0.5 border border-zinc-950 rounded-xl h-10 w-full mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSignupMethod('pin');
                          setRegisterError('');
                        }}
                        className={`flex-1 rounded-lg text-[10px] font-black tracking-wider uppercase transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          signupMethod === 'pin'
                            ? 'bg-[#1a1c1a] text-[#14cfb4] shadow-sm font-black'
                            : 'text-zinc-500 hover:text-zinc-400 font-bold'
                        }`}
                      >
                        🔢 Register PIN
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSignupMethod('password');
                          setRegisterError('');
                        }}
                        className={`flex-1 rounded-lg text-[10px] font-black tracking-wider uppercase transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          signupMethod === 'password'
                            ? 'bg-[#1a1c1a] text-[#14cfb4] shadow-sm font-black'
                            : 'text-zinc-500 hover:text-zinc-400 font-bold'
                        }`}
                      >
                        🔑 Register Password
                      </button>
                    </div>

                    {signupMethod === 'pin' ? (
                      /* Double Grid PIN and Confirm */
                      <div className="grid grid-cols-2 gap-3.5">
                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="signup-pin-input" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                            Set 4-6 Digit PIN
                          </label>
                          <input
                            id="signup-pin-input"
                            type="password"
                            required
                            maxLength={6}
                            pattern="\d{4,6}"
                            value={registerPin}
                            onChange={(e) => setRegisterPin(e.target.value.replace(/\D/g, ''))}
                            placeholder="••••••"
                            className="w-full px-3 py-3 bg-[#090a09] border border-zinc-950 rounded-xl text-center text-xs tracking-widest text-[#14cfb4] focus:border-zinc-850 focus:outline-[#14cfb4] font-mono font-bold"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label htmlFor="signup-confirm-pin-input" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                            Confirm PIN
                          </label>
                          <input
                            id="signup-confirm-pin-input"
                            type="password"
                            required
                            maxLength={6}
                            pattern="\d{4,6}"
                            value={confirmPin}
                            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                            placeholder="••••••"
                            className="w-full px-3 py-3 bg-[#090a09] border border-zinc-950 rounded-xl text-center text-xs tracking-widest text-[#14cfb4] focus:border-zinc-850 focus:outline-[#14cfb4] font-mono font-bold"
                          />
                        </div>
                      </div>
                    ) : (
                      /* Double Grid Password and Confirm AND Mandatory PIN fields */
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1.5 w-full">
                          <label htmlFor="signup-password-input" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                            Choose Password (min. 6 chars)
                          </label>
                          <div className="relative flex items-center">
                            <input
                              id="signup-password-input"
                              type={showRegisterPassword ? "text" : "password"}
                              required
                              value={registerPassword}
                              onChange={(e) => setRegisterPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full pl-4 pr-11 py-3 bg-[#090a09] border border-zinc-950 rounded-xl text-xs text-zinc-150 focus:border-[#14cfb4] focus:outline-none font-semibold font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                              className="absolute right-3.5 text-zinc-500 hover:text-zinc-300"
                            >
                              {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5 w-full">
                          <label htmlFor="signup-confirm-password-input" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                            Confirm Password
                          </label>
                          <div className="relative flex items-center">
                            <input
                              id="signup-confirm-password-input"
                              type={showConfirmPassword ? "text" : "password"}
                              required
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full pl-4 pr-11 py-3 bg-[#090a09] border border-zinc-950 rounded-xl text-xs text-zinc-150 focus:border-[#14cfb4] focus:outline-none font-semibold font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3.5 text-zinc-500 hover:text-zinc-300"
                            >
                              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Mandatory PIN fields for Password signup flow */}
                        <div className="grid grid-cols-2 gap-3.5 border-t border-zinc-900/30 pt-3 mt-1">
                          <div className="flex flex-col gap-1.5">
                            <label htmlFor="signup-pin-input-pwd" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                              Set 4-6 Digit PIN
                            </label>
                            <input
                              id="signup-pin-input-pwd"
                              type="password"
                              required
                              maxLength={6}
                              pattern="\d{4,6}"
                              value={registerPin}
                              onChange={(e) => setRegisterPin(e.target.value.replace(/\D/g, ''))}
                              placeholder="••••••"
                              className="w-full px-3 py-3 bg-[#090a09] border border-zinc-950 rounded-xl text-center text-xs tracking-widest text-[#14cfb4] focus:border-zinc-850 focus:outline-[#14cfb4] font-mono font-bold"
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label htmlFor="signup-confirm-pin-input-pwd" className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                              Confirm PIN
                            </label>
                            <input
                              id="signup-confirm-pin-input-pwd"
                              type="password"
                              required
                              maxLength={6}
                              pattern="\d{4,6}"
                              value={confirmPin}
                              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                              placeholder="••••••"
                              className="w-full px-3 py-3 bg-[#090a09] border border-zinc-950 rounded-xl text-center text-xs tracking-widest text-[#14cfb4] focus:border-zinc-850 focus:outline-[#14cfb4] font-mono font-bold"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {registerError && (
                      <p className="text-[10.5px] font-bold text-rose-455 bg-rose-955/5 border border-rose-950/30 p-2 rounded-xl text-center leading-normal">
                        {registerError}
                      </p>
                    )}

                    <div className="flex flex-col gap-1.5 mt-2 font-sans">
                      <button
                        type="submit"
                        className="w-full py-3 bg-[#14cfb4] hover:bg-[#11b59d] text-[#090a09] font-black rounded-xl text-xs tracking-wider uppercase transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Register Administrator</span>
                      </button>
                      <p className="text-[9.5px] text-zinc-650 text-center leading-normal mt-1 px-1">
                        Registering adds the administrator security credentials to secure local storage.
                      </p>
                    </div>
                  </>
                )}
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Footer info system text matching design honesty */}
        <div className="flex items-center gap-2 text-[10px] text-zinc-650 font-bold select-none mt-1 uppercase tracking-wide">
          <ShieldAlert className="w-3.5 h-3.5 text-zinc-600" />
          <span>Local Device Security Escrow Bound</span>
        </div>
        {showResetModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#111311] border border-[#14cfb4]/30 p-6 rounded-3xl text-center shadow-2xl animate-fade-in">
              <CheckCircle2 className="w-12 h-12 text-[#14cfb4] mx-auto mb-4" />
              <h2 className="text-white font-black text-lg mb-2">PIN Updated Successfully</h2>
              <p className="text-zinc-400 text-sm mb-6">Your new PIN has been saved. Please use it to log in.</p>
              <button
                onClick={() => setShowResetModal(false)}
                className="w-full py-2.5 bg-[#14cfb4] text-black font-black rounded-lg text-[10px] uppercase tracking-widest shadow-lg"
              >
                Continue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
