import React, { useState, useEffect } from 'react';
import { X, MoreVertical, ArrowLeft, ShieldAlert, Lock, Search, Eye, ExternalLink, Calendar } from 'lucide-react';
import { ContriboSettings } from '../types';
import { formatNaira } from './OverviewTab';

interface HeaderProps {
  settings: ContriboSettings;
  onUpdateSettings: (updated: Partial<ContriboSettings>) => void;
  onReset: () => void;
  onSimulate: () => void;
  onLock?: () => void;
  customers?: any[];
  staff?: any[];
  transactions?: any[];
  onNavigateToTab?: (tab: string) => void;
}

export default function Header({ 
  settings, 
  onUpdateSettings, 
  onReset, 
  onSimulate, 
  onLock,
  customers = [],
  staff = [],
  transactions = [],
  onNavigateToTab
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedResult, setSelectedResult] = useState<{ type: 'customer' | 'staff' | 'transaction'; data: any } | null>(null);

  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('contribo_recent_searches');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const addRecentSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, 5);
      try {
        localStorage.setItem('contribo_recent_searches', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const searchRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const input = document.getElementById('global-header-search');
        if (input) {
          input.focus();
          setIsFocused(true);
        }
      } else if (e.key === 'Escape') {
        setIsFocused(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const lowQuery = searchQuery.trim().toLowerCase();
  
  const searchResults = React.useMemo(() => {
    if (!lowQuery) return { customers: [], staff: [], transactions: [] };
    
    const filteredCustomers = customers.filter(c => 
      (c.name && c.name.toLowerCase().includes(lowQuery)) ||
      (c.id && c.id.toLowerCase().includes(lowQuery)) ||
      (c.phoneNumber && c.phoneNumber.includes(lowQuery)) ||
      (c.accountNumber && c.accountNumber.includes(lowQuery))
    );

    const filteredStaff = staff.filter(s =>
      (s.name && s.name.toLowerCase().includes(lowQuery)) ||
      (s.id && s.id.toLowerCase().includes(lowQuery)) ||
      (s.role && s.role.toLowerCase().includes(lowQuery)) ||
      (s.phoneNumber && s.phoneNumber.includes(lowQuery)) ||
      (s.code && s.code.toLowerCase().includes(lowQuery))
    );

    const filteredTransactions = transactions.filter(t => {
      const matchesBasic = 
        (t.reference && t.reference.toLowerCase().includes(lowQuery)) ||
        (t.customerName && t.customerName.toLowerCase().includes(lowQuery)) ||
        (t.id && t.id.toLowerCase().includes(lowQuery)) ||
        (t.amount && String(t.amount).includes(lowQuery));
      
      if (matchesBasic) return true;

      // Search across transaction by customer phone number
      const matchedCustomer = customers.find(c => c.id === t.customerId);
      if (matchedCustomer && matchedCustomer.phoneNumber && matchedCustomer.phoneNumber.includes(lowQuery)) {
        return true;
      }
      return false;
    });

    return {
      customers: filteredCustomers.slice(0, 5),
      staff: filteredStaff.slice(0, 5),
      transactions: filteredTransactions.slice(0, 5)
    };
  }, [lowQuery, customers, staff, transactions]);

  return (
    <div className="w-full flex flex-col bg-[#090a09] border-b border-zinc-900 select-none">
      {/* Immersive Top App Bar mimicking the exact header in the screenshot */}
      <div className="w-full px-4 py-3 flex items-center justify-between bg-[#121412] text-zinc-300">
        <button 
          onClick={onReset}
          title="Reset to initial screenshot values"
          className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-sm md:text-base font-semibold text-zinc-100">
            <span>ContriboApp.jsx</span>
            <span className="text-zinc-500">—</span>
            <span className="text-zinc-300 font-normal">Persistent localStorage v9</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={onSimulate}
            title="Create simulated random contribution deposit"
            className="hidden sm:flex items-center gap-1.5 text-xs bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-400 font-medium px-2.5 py-1 rounded-full transition-colors cursor-pointer"
          >
            <span>⚡ Sim Deposit</span>
          </button>
          <button className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Dashboard Account Header Block */}
      <div className="w-full max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative">
        <div className="flex items-center gap-3 shrink-0">
          {/* Avatar with dynamic photo upload or initialized fallback */}
          <div 
            className="relative group w-12 h-12 rounded-full cursor-pointer overflow-hidden transition-all duration-150 active:scale-95 shrink-0"
            title="Click to upload profile photo"
            onClick={() => {
              const fileInput = document.getElementById('header-profile-file-input');
              if (fileInput) fileInput.click();
            }}
          >
            {settings.profileImage ? (
              <img 
                src={settings.profileImage} 
                className="w-full h-full rounded-full object-cover border-2 border-[#f1be48] shadow-lg" 
                alt="Profile" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-[#f1be48] text-stone-900 font-bold text-lg flex items-center justify-center shadow-lg uppercase">
                {settings.profileInitials || 'BN'}
              </div>
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center rounded-full text-[8.5px] text-[#14cfb4] font-black tracking-widest uppercase">
              <span>📷 Update</span>
            </div>
          </div>
          <img 
            src="/src/assets/images/dan_godal_logo_1781303023813.jpg" 
            alt="Dan Godal Group Savings Logo" 
            className="w-10 h-10 object-contain ml-2 shrink-0"
            referrerPolicy="no-referrer"
          />
          <input 
            type="file" 
            id="header-profile-file-input" 
            accept="image/*" 
            className="hidden" 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
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
          
          <div className="flex flex-col gap-0.5 min-w-0">
            <h1 className="text-xl md:text-1.5xl font-extrabold text-zinc-100 tracking-tight flex items-center gap-2 truncate">
              {settings.orgName || 'Dan Godal Group savings'}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              {settings.isLive !== false ? (
                <span className="inline-flex items-center gap-1 bg-[#0b2b1a]/90 text-[#30d178] border border-[#16482d] text-[11px] font-semibold px-2 py-0.5 rounded-full select-none animate-fade-in">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#35e886] animate-pulse"></span>
                  <span>Live</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-amber-950/40 text-amber-500 border border-amber-900/40 text-[11px] font-semibold px-2 py-0.5 rounded-full select-none animate-fade-in">
                  <ShieldAlert className="w-3 h-3 text-amber-500" />
                  <span>Auditor Locked</span>
                </span>
              )}
              <span className="text-sm font-semibold text-zinc-250 truncate max-w-[100px] leading-none">{settings.profileName}</span>
              <span className="text-zinc-700 font-semibold">•</span>
              <span className="text-xs text-zinc-500 font-mono tracking-tight max-w-[120px] truncate">{settings.profileRole || 'Supervisor Managed'}</span>
            </div>
          </div>
        </div>

        {/* Global Operational Search Component */}
        <div ref={searchRef} className="w-full lg:max-w-md relative z-40">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-zinc-500" />
            </div>
            <input
              id="global-header-search"
              type="text"
              placeholder="🔍 Search by name, reference, or phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const q = searchQuery.trim();
                  if (q) {
                    addRecentSearch(q);
                  }
                }
              }}
              className="w-full bg-[#050605] border border-zinc-900 focus:border-[#14cfb4] focus:ring-1 focus:ring-[#14cfb4] rounded-2xl py-2.5 pl-10 pr-10 text-xs text-zinc-200 placeholder-zinc-500 outline-none transition-all shadow-inner font-sans"
            />
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none gap-1">
              {searchQuery ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery('');
                  }}
                  className="p-1 rounded-full hover:bg-zinc-800 text-zinc-400 pointer-events-auto transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex items-center h-5 select-none rounded bg-zinc-900 border border-zinc-850 px-1.5 font-mono text-[9px] font-black text-zinc-500 uppercase tracking-widest gap-0.5">
                  <span>⌘</span>K
                </kbd>
              )}
            </div>
          </div>

          {/* Absolute Floating Dropdown Panels */}
          {isFocused && (
            <div className="absolute left-0 right-0 mt-2 z-50 bg-[#090a09]/98 border border-zinc-850 rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.98)] max-h-[480px] overflow-y-auto no-scrollbar backdrop-blur-md animate-fade-in flex flex-col p-3 gap-3.5 text-left text-zinc-300 font-sans">
              
              {!lowQuery ? (
                /* Tips and Guide when query is empty */
                <div className="p-2 flex flex-col gap-3">
                  {recentSearches.length > 0 && (
                     <div className="flex flex-col gap-1.5 border-b border-zinc-900/60 pb-3 text-left">
                       <div className="flex items-center justify-between">
                         <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block flex items-center gap-1">
                           🕒 Recent Searches
                         </span>
                         <button
                           type="button"
                           onClick={() => {
                             setRecentSearches([]);
                             try {
                               localStorage.removeItem('contribo_recent_searches');
                             } catch (e) {}
                           }}
                           className="text-[9px] font-bold text-[#e0a92a] hover:text-rose-400 uppercase transition-colors cursor-pointer"
                         >
                           Clear All
                         </button>
                       </div>
                       <div className="flex flex-wrap gap-1.5 mt-1.5">
                         {recentSearches.map((query, idx) => (
                           <div
                             key={idx}
                             className="inline-flex items-center gap-1 bg-zinc-900/40 border border-zinc-850 hover:border-[#14cfb4]/40 rounded-xl pl-2.5 pr-1.5 py-1 text-[10px] font-semibold text-zinc-350 hover:text-[#14cfb4] transition-all cursor-pointer group"
                             onClick={() => {
                               setSearchQuery(query);
                               addRecentSearch(query);
                             }}
                           >
                             <span>{query}</span>
                             <button
                               type="button"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 const updated = recentSearches.filter((_, i) => i !== idx);
                                 setRecentSearches(updated);
                                 try {
                                   localStorage.setItem('contribo_recent_searches', JSON.stringify(updated));
                                 } catch (err) {}
                               }}
                               className="text-zinc-650 hover:text-rose-450 ml-1 font-bold text-[10px] w-3.5 h-3.5 rounded-full hover:bg-zinc-950 inline-flex items-center justify-center transition-colors"
                             >
                               ×
                             </button>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}

                  <div className="flex flex-col gap-0.5 border-b border-zinc-900/60 pb-2">
                    <span className="text-[10px] font-black text-[#14cfb4] uppercase tracking-wider block">⚡ Operations Live Search</span>
                    <span className="text-[9px] text-zinc-500">Fast tracking administrative indices and field journals</span>
                  </div>

                  <div className="flex flex-col gap-2 font-mono text-[9.5px] text-zinc-400">
                    <div className="flex items-start gap-1.5">
                      <span className="text-[#14cfb4] font-black shrink-0">✓</span>
                      <span>Find customer portfolios by Full Name, Phone, Account NUBAN, or Database IDs.</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="text-[#14cfb4] font-black shrink-0">✓</span>
                      <span>Scan transaction references (e.g., CBP-D2381) to view digital ledger audits instantly.</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="text-[#14cfb4] font-black shrink-0">✓</span>
                      <span>Scan field supervisors accounts, locations, or operational collector codes.</span>
                    </div>
                  </div>

                  {customers.length > 0 && (
                    <div className="flex flex-col gap-1.5 border-t border-zinc-900/40 pt-2.5 text-left">
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1">⭐ Direct Customer Shortcuts</span>
                      <div className="flex flex-wrap gap-1.5">
                        {customers.slice(0, 4).map((c, idx) => (
                          <button
                            key={`${c.id}-${idx}`}
                            type="button"
                            onClick={() => {
                              setSearchQuery(c.name);
                              addRecentSearch(c.name);
                              const el = document.getElementById('global-header-search');
                              if (el) el.focus();
                            }}
                            className="px-2.5 py-1 text-[9px] bg-zinc-950 border border-zinc-900 hover:border-zinc-700 text-zinc-350 font-semibold rounded-lg hover:text-[#14cfb4] transition-all cursor-pointer"
                          >
                            👤 {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {staff.length > 0 && (
                    <div className="flex flex-col gap-1.5 border-t border-zinc-900/40 pt-2.5 text-left">
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block mb-1">⭐ Direct Staff Shortcuts</span>
                      <div className="flex flex-wrap gap-1.5">
                        {staff.slice(0, 4).map((s, idx) => (
                          <button
                            key={`${s.id}-${idx}`}
                            type="button"
                            onClick={() => {
                              setSearchQuery(s.name);
                              addRecentSearch(s.name);
                              const el = document.getElementById('global-header-search');
                              if (el) el.focus();
                            }}
                            className="px-2.5 py-1 text-[9px] bg-zinc-950 border border-zinc-900 hover:border-zinc-700 text-zinc-350 font-semibold rounded-lg hover:text-[#14cfb4] transition-all cursor-pointer"
                          >
                            👔 {s.name} ({s.role})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Filtered results displays */
                (() => {
                  const hasCustResult = searchResults.customers.length > 0;
                  const hasStaffResult = searchResults.staff.length > 0;
                  const hasTxResult = searchResults.transactions.length > 0;
                  const hasAnyResult = hasCustResult || hasStaffResult || hasTxResult;

                  if (!hasAnyResult) {
                    return (
                      <div className="py-8 text-center flex flex-col items-center justify-center p-4 gap-1.5 text-zinc-500">
                        <Search className="w-5 h-5 text-zinc-700" />
                        <span className="text-[10px] uppercase font-black tracking-wider text-zinc-400 mt-1">No matching indices found</span>
                        <span className="text-[9.5px] text-zinc-600 max-w-xs leading-normal">
                          We found no customers, staff profiles, field codes, or transactions matching "{searchQuery}".
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-col gap-4">
                      {/* Customers Column */}
                      {hasCustResult && (
                        <div className="flex flex-col gap-1.5 text-left">
                          <span className="text-[8.5px] font-black text-zinc-500 uppercase tracking-widest px-2.5 py-0.5 bg-zinc-950/80 border border-zinc-900/50 rounded-lg select-none">Customers ({searchResults.customers.length})</span>
                          <div className="flex flex-col gap-1">
                            {searchResults.customers.map((c, idx) => (
                              <div 
                                key={`${c.id}-${idx}`} 
                                className="p-2 hover:bg-zinc-900/40 border border-transparent hover:border-zinc-900 rounded-xl flex items-center justify-between gap-3 transition-colors text-left"
                              >
                                <div className="flex items-center gap-2.5 truncate max-w-[200px] min-w-0">
                                  <div className="w-7 h-7 bg-zinc-900 rounded-full flex items-center justify-center font-bold text-[10px] text-[#14cfb4] shrink-0 border border-zinc-800">
                                    {c.name.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[11px] font-extrabold text-zinc-200 truncate">{c.name}</span>
                                    <span className="text-[9.5px] text-zinc-500 font-mono">NUBAN: {c.accountNumber || 'Pending'}</span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="flex flex-col text-right font-mono">
                                    <span className="text-[11px] font-black text-[#14cfb4]">{formatNaira(c.balance)}</span>
                                    <span className="text-[8px] text-zinc-600 font-sans uppercase">AVAILABLE</span>
                                  </div>
                                  
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (searchQuery) addRecentSearch(searchQuery);
                                        setSelectedResult({ type: 'customer', data: c });
                                        setIsFocused(false);
                                      }}
                                      className="p-1.5 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
                                      title="Profile full audit dialog"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    {onNavigateToTab && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onNavigateToTab('customers');
                                          setIsFocused(false);
                                        }}
                                        className="p-1.5 bg-zinc-900/80 hover:bg-[#14cfb4]/10 border border-zinc-800 text-[#14cfb4] rounded-lg transition-all cursor-pointer"
                                        title="Navigate to Customers Tab"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Staff members column */}
                      {hasStaffResult && (
                        <div className="flex flex-col gap-1.5 text-left">
                          <span className="text-[8.5px] font-black text-zinc-500 uppercase tracking-widest px-2.5 py-0.5 bg-zinc-950/80 border border-zinc-900/50 rounded-lg select-none">Staff Members ({searchResults.staff.length})</span>
                          <div className="flex flex-col gap-1">
                            {searchResults.staff.map((s, idx) => (
                              <div 
                                key={`${s.id}-${idx}`} 
                                className="p-2 hover:bg-zinc-900/40 border border-transparent hover:border-zinc-900 rounded-xl flex items-center justify-between gap-3 transition-colors text-left"
                              >
                                <div className="flex items-center gap-2.5 truncate max-w-[200px] min-w-0">
                                  <div className="w-7 h-7 bg-zinc-900 rounded-full flex items-center justify-center font-bold text-[10px] text-[#e0a92a] shrink-0 border border-zinc-800">
                                    {s.initials || s.name.slice(0, 2).toUpperCase()}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-[11px] font-extrabold text-zinc-200 truncate">{s.name}</span>
                                    <span className="text-[9.5px] text-zinc-500 font-mono">{s.role} | {s.code}</span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="flex flex-col text-right font-mono">
                                    <span className="text-[11px] font-black text-[#e0a92a]">{formatNaira(s.totalCollectionsAmount || 0)}</span>
                                    <span className="text-[8px] text-zinc-600 font-sans uppercase">{s.collectionsCount || 0} DEPOSITS</span>
                                  </div>
                                  
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (searchQuery) addRecentSearch(searchQuery);
                                        setSelectedResult({ type: 'staff', data: s });
                                        setIsFocused(false);
                                      }}
                                      className="p-1.5 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
                                      title="Staff profile detailed audit"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    {onNavigateToTab && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onNavigateToTab('staff');
                                          setIsFocused(false);
                                        }}
                                        className="p-1.5 bg-zinc-900/80 hover:bg-[#e0a92a]/10 border border-zinc-800 text-[#e0a92a] rounded-lg transition-all cursor-pointer"
                                        title="Navigate to Staff Tab"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Transactions column */}
                      {hasTxResult && (
                        <div className="flex flex-col gap-1.5 text-left">
                          <span className="text-[8.5px] font-black text-zinc-500 uppercase tracking-widest px-2.5 py-0.5 bg-zinc-950/80 border border-zinc-900/50 rounded-lg select-none">Transactions Ledger ({searchResults.transactions.length})</span>
                          <div className="flex flex-col gap-1">
                            {searchResults.transactions.map((t, idx) => {
                              const isDep = t.type === 'deposit';
                              return (
                                <div 
                                  key={`${t.id}-${idx}`} 
                                  className="p-2 hover:bg-zinc-900/40 border border-transparent hover:border-zinc-900 rounded-xl flex items-center justify-between gap-3 transition-colors text-left"
                                >
                                  <div className="flex items-center gap-2.5 truncate max-w-[200px] min-w-0">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[9px] shrink-0 border ${
                                      isDep 
                                        ? 'bg-[#0d2e1b] border-[#1b5030] text-[#30d178]' 
                                        : 'bg-[#2a1e0b] border-[#44310e] text-[#e0a92a]'
                                    }`}>
                                      {isDep ? 'DEP' : 'WTH'}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-[11px] font-extrabold text-zinc-200 truncate">{t.customerName}</span>
                                      <span className="text-[9.5px] text-[#94a3b8] font-mono tracking-wide">{t.reference}</span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 shrink-0">
                                    <div className="flex flex-col text-right font-mono">
                                      <span className={`text-[11px] font-black ${
                                        isDep ? 'text-[#30d178]' : 'text-rose-450'
                                      }`}>{formatNaira(t.amount)}</span>
                                      <span className={`text-[8px] font-extrabold font-sans uppercase ${
                                        t.status === 'approved' ? 'text-emerald-500' :
                                        t.status === 'pending' ? 'text-amber-500 animate-pulse' : 'text-rose-500'
                                      }`}>● {t.status}</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (searchQuery) addRecentSearch(searchQuery);
                                          setSelectedResult({ type: 'transaction', data: t });
                                          setIsFocused(false);
                                        }}
                                        className="p-1.5 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
                                        title="Receipt deep audit detail"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                      {onNavigateToTab && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            onNavigateToTab(t.type === 'withdrawal' ? 'withdrawals' : 'overview');
                                            setIsFocused(false);
                                          }}
                                          className="p-1.5 bg-zinc-900/80 hover:bg-emerald-950/80 border border-zinc-800 text-teal-400 rounded-lg transition-all cursor-pointer"
                                          title="Navigate to ledger views"
                                        >
                                          <ExternalLink className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          )}
        </div>

        {/* Active Session Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end lg:self-auto">
          {onLock && (
            <button 
              onClick={onLock}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-950/45 bg-red-950/15 text-rose-455 text-sm font-semibold hover:bg-rose-950/25 active:scale-95 transition-all cursor-pointer"
              title="Lock administrative dashboard session"
            >
              <Lock className="w-3.5 h-3.5 text-rose-500" />
              <span>Lock Portal</span>
            </button>
          )}

          <button 
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-850 bg-zinc-900 text-zinc-200 text-sm font-semibold hover:bg-zinc-850 hover:border-zinc-700 active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit</span>
          </button>
        </div>
      </div>

      {/* Search Details Dialog Backdrop */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in text-[#e4e4e7]">
          <div className="bg-[#121312] border border-zinc-850 rounded-[28px] max-w-sm w-full overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.98)] font-sans">
            <div className="p-5 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/50">
              <span className="text-[10px] font-black text-[#14cfb4] uppercase tracking-widest font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#14cfb4] animate-ping"></span>
                🔒 Live HQ Ledger Audit
              </span>
              <button
                type="button"
                onClick={() => setSelectedResult(null)}
                className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 text-left flex flex-col gap-4">
              {selectedResult.type === 'customer' && (() => {
                const c = selectedResult.data;
                return (
                  <div className="flex flex-col gap-3.5">
                    <div className="flex items-center gap-3 border-b border-zinc-900/60 pb-3">
                      <div className="w-11 h-11 bg-emerald-950/40 border border-[#14cfb4]/20 rounded-full flex items-center justify-center font-bold text-base text-[#14cfb4] shrink-0">
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-extrabold text-zinc-100 truncate">{c.name}</span>
                        <span className="text-[11px] text-zinc-500 font-mono">{c.phoneNumber}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex flex-col bg-zinc-950 p-3 rounded-2xl border border-zinc-900">
                        <span className="text-[8px] font-black text-zinc-550 uppercase">Savings Balance</span>
                        <span className="text-xs font-mono font-black text-[#14cfb4] mt-1">{formatNaira(c.balance)}</span>
                      </div>
                      <div className="flex flex-col bg-zinc-950 p-3 rounded-2xl border border-zinc-900">
                        <span className="text-[8px] font-black text-zinc-550 uppercase">Security Status</span>
                        <span className="mt-1">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold border ${c.status === 'active' ? 'bg-[#0f2e1e]/60 border-emerald-900/40 text-emerald-400' : 'bg-rose-950/40 border-rose-900/40 text-rose-400'}`}>
                            ● {c.status.toUpperCase()}
                          </span>
                        </span>
                      </div>
                      <div className="flex flex-col bg-zinc-950 p-3 rounded-2xl border border-zinc-900 col-span-2">
                        <span className="text-[8px] font-black text-zinc-550 uppercase">Personal NUBAN Account</span>
                        <span className="text-[11px] font-mono font-bold text-zinc-350 mt-1 select-all">{c.accountNumber || 'Not Associated'}</span>
                      </div>
                      <div className="flex flex-col bg-zinc-950 p-3 rounded-2xl border border-zinc-900">
                        <span className="text-[8px] font-black text-zinc-550 uppercase">KYC Status</span>
                        <span className="text-[10px] font-semibold text-zinc-300 mt-1 uppercase truncate">{c.idDocumentType || 'Pending'} / {c.kycStatus || 'unverified'}</span>
                      </div>
                      <div className="flex flex-col bg-zinc-950 p-3 rounded-2xl border border-zinc-900">
                        <span className="text-[8px] font-black text-zinc-550 uppercase">Joined On</span>
                        <span className="text-[10px] font-semibold text-zinc-300 mt-1 truncate">{c.joinedDate ? new Date(c.joinedDate).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {selectedResult.type === 'staff' && (() => {
                const s = selectedResult.data;
                return (
                  <div className="flex flex-col gap-3.5">
                    <div className="flex items-center gap-3 border-b border-[#e0a92a]/10 pb-3">
                      <div className="w-11 h-11 bg-amber-950/40 border border-[#e0a92a]/20 rounded-full flex items-center justify-center font-bold text-base text-[#e0a92a] shrink-0">
                        {s.initials || s.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-extrabold text-zinc-100 truncate">{s.name}</span>
                        <span className="text-[11px] text-zinc-500 font-mono">{s.phoneNumber}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex flex-col bg-zinc-950 p-3 rounded-2xl border border-zinc-900">
                        <span className="text-[8px] font-black text-zinc-550 uppercase">Rank Designation</span>
                        <span className="text-[11px] font-bold text-[#e0a92a] mt-1 truncate">{s.role}</span>
                      </div>
                      <div className="flex flex-col bg-zinc-950 p-3 rounded-2xl border border-zinc-900">
                        <span className="text-[8px] font-black text-zinc-550 uppercase">Authorization Badge</span>
                        <span className="text-[11px] font-mono font-bold text-zinc-300 mt-1 uppercase truncate">{s.code}</span>
                      </div>
                      <div className="flex flex-col bg-zinc-950 p-3 rounded-2xl border border-zinc-900 col-span-2">
                        <span className="text-[8px] font-black text-zinc-550 uppercase">Collector Email</span>
                        <span className="text-[11px] font-mono font-bold text-zinc-350 mt-1 select-all truncate">{s.email}</span>
                      </div>
                      <div className="flex flex-col bg-zinc-950 p-3 rounded-2xl border border-zinc-900">
                        <span className="text-[8px] font-black text-zinc-550 uppercase">Field Journals</span>
                        <span className="text-xs font-mono font-bold text-zinc-300 mt-1">{s.collectionsCount || 0} collections</span>
                      </div>
                      <div className="flex flex-col bg-zinc-950 p-3 rounded-2xl border border-zinc-900">
                        <span className="text-[8px] font-black text-zinc-550 uppercase">Total Vouched Vol</span>
                        <span className="text-xs font-mono font-bold text-[#e0a92a] mt-1">{formatNaira(s.totalCollectionsAmount || 0)}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {selectedResult.type === 'transaction' && (() => {
                const t = selectedResult.data;
                const isDeposit = t.type === 'deposit';
                return (
                  <div className="flex flex-col gap-3.5">
                    <div className="flex items-center gap-3 border-b border-zinc-900/60 pb-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-[10px] shrink-0 border ${
                        isDeposit 
                          ? 'bg-[#0d2e1b] border-[#1b5030] text-[#30d178]' 
                          : 'bg-[#2a1e0b] border-[#44310e] text-[#e0a92a]'
                      }`}>
                        {isDeposit ? 'INBOUND' : 'OUTBOUND'}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[8px] font-black text-zinc-550 uppercase">Audit Reference Key</span>
                        <span className="text-xs font-mono font-black text-zinc-100 select-all truncate">{t.reference}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex flex-col bg-zinc-950 p-3 rounded-2xl border border-zinc-900 col-span-2">
                        <span className="text-[8px] font-black text-zinc-550 uppercase">Target Member Account</span>
                        <span className="text-xs font-bold text-zinc-100 mt-1 truncate">{t.customerName}</span>
                      </div>
                      <div className="flex flex-col bg-zinc-950 p-3 rounded-2xl border border-zinc-900">
                        <span className="text-[8px] font-black text-zinc-550 uppercase">Amount Transfer</span>
                        <span className={`text-xs font-mono font-black mt-1 ${isDeposit ? 'text-[#30d178]' : 'text-rose-450'}`}>
                          {isDeposit ? '+' : '-'}{formatNaira(t.amount)}
                        </span>
                      </div>
                      <div className="flex flex-col bg-zinc-950 p-3 rounded-2xl border border-zinc-900">
                        <span className="text-[8px] font-black text-zinc-550 uppercase">Clearing Status</span>
                        <span className={`text-xs font-bold mt-1 uppercase ${
                          t.status === 'approved' ? 'text-emerald-400' :
                          t.status === 'pending' ? 'text-amber-400 animate-pulse' : 'text-rose-455'
                        }`}>
                          ● {t.status}
                        </span>
                      </div>
                      <div className="flex flex-col bg-zinc-950 p-3 rounded-2xl border border-zinc-900 col-span-2">
                        <span className="text-[8px] font-black text-zinc-550 uppercase">Ledger Posting Timeline</span>
                        <span className="text-[10px] font-mono font-bold text-zinc-300 mt-1 select-all">
                          {new Date(t.timestamp).toLocaleDateString()} {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="mt-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedResult(null)}
                  className="w-full bg-zinc-900 hover:bg-zinc-850 text-zinc-300 font-bold text-[11px] py-2.5 rounded-xl border border-zinc-800 transition-colors uppercase cursor-pointer"
                >
                  Close Audit Sheet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
