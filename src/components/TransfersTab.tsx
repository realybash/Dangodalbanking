import * as React from 'react';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Send, Wallet, Coins, ArrowUpRight, ShieldCheck, Loader2, Info } from 'lucide-react';
import { DashboardState, Customer, StaffMember } from '../types';
import { formatNaira } from './OverviewTab';
import { useToast } from './ToastProvider';

interface TransfersTabProps {
  state: DashboardState;
  onUpdateStaff: (id: string, updatedFields: Partial<StaffMember>) => void;
  onUpdateCustomer: (id: string, updatedFields: Partial<Customer>) => void;
  onAddTransaction: (tx: {
    customerId: string;
    type: 'deposit' | 'withdrawal';
    amount: number;
    staffId: string;
    status?: 'pending' | 'approved';
  }) => void;
  onUpdateSettings?: (updatedFields: any) => void;
}

export default function TransfersTab({
  state,
  onUpdateStaff,
  onUpdateCustomer,
  onAddTransaction,
  onUpdateSettings
}: TransfersTabProps) {
  const { showToast } = useToast();
  const { customers, staff, transactions, settings } = state;

  const [recipientAcc, setRecipientAcc] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchLedgerQuery, setSearchLedgerQuery] = useState('');

  // Calculate global totals
  const totalStaffWallets = useMemo(() => {
    return staff.reduce((acc, s) => acc + (s.walletBalance || 0), 0);
  }, [staff]);

  const totalCustomerBalances = useMemo(() => {
    return customers.reduce((acc, c) => acc + (c.balance || 0), 0);
  }, [customers]);

  const treasuryBalance = settings.treasuryBalance || 15000000; // default initial fallback

  // Real-time Recipient Matching
  const matchedRecipient = useMemo(() => {
    const acc = recipientAcc.trim();
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

    // Check customers
    const cust = customers.find(c => {
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

    // Check staff
    const stf = staff.find(s => {
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

    return null;
  }, [recipientAcc, customers, staff]);

  // Handle transfer from Treasury
  const handleTreasuryTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const amt = parseFloat(transferAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Please specify a valid transfer amount greater than 0.');
      return;
    }

    if (treasuryBalance < amt) {
      setErrorMsg('Insufficient Treasury balance.');
      return;
    }

    if (!matchedRecipient) {
      setErrorMsg('Recipient account not found or invalid.');
      return;
    }

    if (matchedRecipient.status !== 'active') {
      setErrorMsg('The account number is not active.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Debit Treasury settings
      const newTreasuryBalance = treasuryBalance - amt;
      if (onUpdateSettings) {
        await onUpdateSettings({ treasuryBalance: newTreasuryBalance });
      }

      // 2. Credit the target
      if (matchedRecipient.type === 'Customer Account') {
        const cust = matchedRecipient.original as Customer;
        const newCustBalance = (cust.balance || 0) + amt;
        await onUpdateCustomer(cust.id, { balance: newCustBalance });
        
        // Log transaction
        await onAddTransaction({
          customerId: cust.id,
          type: 'deposit',
          amount: amt,
          staffId: 's1', // Treasury Admin
          status: 'approved'
        });
      } else if (matchedRecipient.type === 'Staff Wallet') {
        const stf = matchedRecipient.original as StaffMember;
        const newStfBalance = (stf.walletBalance || 0) + amt;
        await onUpdateStaff(stf.id, { walletBalance: newStfBalance });
      }

      setSuccessMsg(`Successfully transferred ₦${amt.toLocaleString()} from Central Treasury to ${matchedRecipient.name}!`);
      showToast(`Treasury Transfer Successful! Sent ₦${amt.toLocaleString()}`, 'success');
      
      setTransferAmount('');
      setRecipientAcc('');
    } catch (err) {
      setErrorMsg('Transfer failed. Please check your network and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter transfers / transactions in the ledger history
  const transferTransactions = useMemo(() => {
    return transactions.filter(t => {
      const q = searchLedgerQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        t.customerName.toLowerCase().includes(q) ||
        t.reference.toLowerCase().includes(q) ||
        (t.customerId && t.customerId.toLowerCase().includes(q))
      );
    });
  }, [transactions, searchLedgerQuery]);

  return (
    <div className="w-full flex flex-col gap-6 select-none pb-12 font-sans text-left">
      {/* HEADER ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
            <Send className="w-5 h-5 text-[#3ad188]" />
            <span>Manager Treasury & Inter-Account Transfers</span>
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Centrally manage and transfer funds from the HQ Treasury to Customer savings and Staff field wallets.
          </p>
        </div>
      </div>

      {/* THREE BENTO CARDS: TREASURY AND BALANCES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Treasury Balance Card */}
        <div className="bg-gradient-to-tr from-[#0f1d18]/70 to-[#0c1411]/90 border border-[#3ad188]/20 rounded-2xl p-5 relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#3ad188]/5 rounded-full filter blur-2xl pointer-events-none" />
          <span className="text-[10px] font-black uppercase tracking-wider text-[#3ad188] flex items-center gap-1.5 mb-2">
            🏛️ HQ Treasury Account
          </span>
          <span className="text-[24px] font-black text-white block">
            {formatNaira(treasuryBalance)}
          </span>
          <span className="text-[10px] text-zinc-500 font-mono block mt-2">
            NUBAN: {settings.treasuryAccountNumber || '1000000001'} (Settled Vault)
          </span>
        </div>

        {/* Total Staff Wallets */}
        <div className="bg-[#121412] border border-zinc-900 rounded-2xl p-5 shadow-lg">
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 mb-2">
            💼 Total Staff Wallets
          </span>
          <span className="text-[24px] font-black text-white block">
            {formatNaira(totalStaffWallets)}
          </span>
          <span className="text-[10px] text-zinc-500 font-mono block mt-2">
            Active Fields: {staff.length} registered agents
          </span>
        </div>

        {/* Total Customer Savings */}
        <div className="bg-[#121412] border border-zinc-900 rounded-2xl p-5 shadow-lg">
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 mb-2">
            🪙 Total Member Savings
          </span>
          <span className="text-[24px] font-black text-white block">
            {formatNaira(totalCustomerBalances)}
          </span>
          <span className="text-[10px] text-zinc-500 font-mono block mt-2">
            Client Base: {customers.length} savers enrolled
          </span>
        </div>
      </div>

      {/* CORE TRANSFER SECTION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: TRANSFER FORM (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <form onSubmit={handleTreasuryTransfer} className="bg-[#121412] border border-zinc-900 rounded-[28px] p-6 flex flex-col gap-5 relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#3ad188]/5 rounded-full filter blur-xl pointer-events-none" />

            <div className="border-b border-zinc-900 pb-3">
              <h3 className="text-sm font-black text-white uppercase tracking-wider leading-none">Execute Treasury Transfer</h3>
              <span className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest block font-mono">Instant Core Ledger Dispatcher</span>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-950/20 border border-rose-500/20 text-rose-500 text-xs font-bold rounded-2xl flex items-center gap-2">
                <span className="shrink-0">⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 text-[#2ecc71] text-xs font-bold rounded-2xl flex items-center gap-2">
                <span className="shrink-0">✔️</span>
                <span>{successMsg}</span>
              </div>
            )}

            {/* Recipient Account Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                Recipient NUBAN / Account Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={recipientAcc}
                  onChange={(e) => setRecipientAcc(e.target.value.replace(/\s+/g, ""))}
                  placeholder="e.g. 2000000001 (Staff) or 3000000001 (Customer)"
                  className="w-full bg-[#090a09] border border-zinc-900 hover:border-zinc-800 focus:border-[#3ad188] text-white rounded-2xl px-4 py-3 text-[13px] font-bold outline-none font-mono transition-colors"
                />
                {recipientAcc.trim().length >= 3 && (
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                    {matchedRecipient ? (
                      <span className="text-[10px] uppercase font-black px-2 py-1 bg-emerald-955/20 text-[#3ad188] border border-emerald-900/40 rounded-lg">
                        Matched Account
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-black px-2 py-1 bg-rose-955/20 text-rose-500 border border-rose-900/40 rounded-lg">
                        No Match
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Dynamic Matched Recipient details */}
              <AnimatePresence>
                {matchedRecipient && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="mt-2 p-4 bg-[#090a09] border border-zinc-900 rounded-2xl flex flex-col gap-4 shadow-inner"
                  >
                    {/* Header line with badge */}
                    <div className="flex items-center justify-between border-b border-zinc-950 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                          Recipient Verification Details
                        </span>
                      </div>
                      <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        matchedRecipient.type === 'Customer Account' 
                          ? 'text-teal-400 bg-teal-950/40 border border-teal-900/30' 
                          : 'text-indigo-400 bg-indigo-950/40 border border-indigo-900/30'
                      }`}>
                        {matchedRecipient.type}
                      </span>
                    </div>

                    {/* STAFF TARGET DETAILS */}
                    {matchedRecipient.type === 'Staff Wallet' && (() => {
                      const stf = matchedRecipient.original as StaffMember;
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-wider">Full Name of Staff</span>
                            <span className="text-white font-extrabold text-[13px]">{stf.name}</span>
                          </div>
                          
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-wider">Bank Name</span>
                            <span className="text-[#3ad188] font-bold text-[12px] flex items-center gap-1">
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
                    {matchedRecipient.type === 'Customer Account' && (() => {
                      const cust = matchedRecipient.original as Customer;
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-wider">Customer Full Name</span>
                            <span className="text-white font-extrabold text-[13px]">{cust.name}</span>
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] text-zinc-600 uppercase font-bold tracking-wider">Current Savings Balance</span>
                            <span className="text-[#3ad188] font-black text-[13px] font-mono">
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
                              <span className={`w-1.5 h-1.5 rounded-full ${cust.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
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

            {/* Amount input */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-[#3ad188]">
                  Amount to Transfer (NGN)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-zinc-500 text-[13px] font-bold">
                    ₦
                  </span>
                  <input
                    type="number"
                    required
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#090a09] border border-zinc-900 hover:border-zinc-800 focus:border-[#3ad188] text-white rounded-2xl pl-8 pr-4 py-3 text-[13px] font-black outline-none font-mono transition-colors"
                  />
                </div>
              </div>

              {/* Presets */}
              <div className="flex gap-2 flex-wrap">
                {["5000", "10000", "20000", "50000", "100000"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTransferAmount(preset)}
                    className="px-3 py-1.5 bg-[#090a09] hover:bg-zinc-900 border border-zinc-900 text-zinc-400 hover:text-white text-[10.5px] font-bold font-mono rounded-xl cursor-pointer active:scale-95 transition-all"
                  >
                    ₦{parseInt(preset).toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !matchedRecipient}
              className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest cursor-pointer transition-all active:scale-[0.98] ${
                isSubmitting 
                  ? "bg-zinc-800 text-zinc-650"
                  : matchedRecipient
                    ? "bg-[#3ad188] hover:bg-[#25ab6b] text-[#090a09] shadow-lg shadow-[#3ad188]/10"
                    : "bg-zinc-900 text-zinc-650 cursor-not-allowed border border-zinc-950"
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Transferring from Treasury...</span>
                </span>
              ) : (
                <span>Post Treasury Transfer</span>
              )}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: RECIPIENT CHEAT SHEET / INFOGRAPHIC (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-[#121412] border border-zinc-900 rounded-[28px] p-5 flex flex-col gap-4">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block border-b border-zinc-900 pb-2">
              🧭 Account Identification Table
            </span>

            <div className="flex flex-col gap-3.5">
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 bg-indigo-950/40 border border-indigo-900 text-indigo-400 font-bold text-xs rounded-lg flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-200 block">Staff Wallet Accounts</span>
                  <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">
                    NUBANs starting with <span className="font-mono font-bold text-indigo-400">200...</span> representing field agents. Crediting these adds directly to the staff's float balance.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start border-t border-zinc-900/60 pt-3">
                <div className="w-7 h-7 bg-teal-950/40 border border-teal-900 text-teal-400 font-bold text-xs rounded-lg flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-200 block">Customer Main Accounts</span>
                  <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">
                    NUBANs starting with <span className="font-mono font-bold text-teal-400">300...</span>. Transferring here posts an immediate, approved savings credit.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start border-t border-zinc-900/60 pt-3">
                <div className="w-7 h-7 bg-amber-955/20 border border-amber-900 text-amber-500 font-bold text-xs rounded-lg flex items-center justify-center shrink-0">
                  4
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-200 block">Customer Contribution Accounts</span>
                  <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">
                    NUBANs starting with <span className="font-mono font-bold text-amber-500">400...</span>. These are linked directly to dedicated savings cycle products.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#121412] border border-zinc-900 rounded-[28px] p-5 flex gap-3 text-left">
            <Info className="w-5 h-5 text-[#3ad188] shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-zinc-150 block uppercase tracking-wider">Treasury Ledger Audits</span>
              <p className="text-[10.5px] text-zinc-500 leading-relaxed mt-1">
                Every treasury transaction instantly modifies the main Firebase ledger, posts real-time alerts to linked communication relays, and modifies client visual records in real time.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT TRANSACTIONS LEDGER */}
      <div className="bg-[#121412] border border-zinc-900 rounded-[28px] p-6 shadow-xl flex flex-col gap-4 mt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900 pb-3.5">
          <div className="flex flex-col">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Global Ledger Transaction Feed</h3>
            <span className="text-[9.5px] text-zinc-500 mt-0.5 font-sans font-medium">Search and filter active accounts currently receiving and dispatching funds</span>
          </div>

          <div className="relative shrink-0">
            <Search className="absolute left-3 top-2 w-3.5 h-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search reference or customer..."
              value={searchLedgerQuery}
              onChange={(e) => setSearchLedgerQuery(e.target.value)}
              className="pl-8.5 pr-4 py-1.5 bg-[#090a09] text-[11px] text-zinc-200 border border-zinc-900 focus:border-[#3ad188] focus:outline-none rounded-xl font-medium w-52 sm:w-60"
            />
          </div>
        </div>

        {/* Transactions list */}
        <div className="flex flex-col divide-y divide-zinc-950/60 max-h-[400px] overflow-y-auto pr-1 no-scrollbar">
          {transferTransactions.length === 0 ? (
            <div className="py-8 text-center text-[11px] text-zinc-600 uppercase font-black tracking-wider">
              No matching ledger entries found
            </div>
          ) : (
            transferTransactions.map((tx) => {
              const matchedCust = customers.find(c => c.id === tx.customerId);
              const targetNuban = matchedCust ? matchedCust.accountNumber : 'N/A';
              const isDep = tx.type === 'deposit';

              return (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      isDep 
                        ? 'bg-emerald-950/20 text-[#3ad188] border-emerald-900/30' 
                        : 'bg-rose-955/10 text-rose-500 border-rose-900/30'
                    }`}>
                      <ArrowUpRight className={`w-4 h-4 ${isDep ? '' : 'rotate-90 text-rose-500'}`} />
                    </div>

                    <div className="min-w-0">
                      <span className="text-xs font-black text-white block truncate">
                        {tx.customerName}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono block mt-0.5">
                        REF: {tx.reference} • Account: {targetNuban}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`text-xs font-mono font-black block ${isDep ? 'text-[#3ad188]' : 'text-rose-500'}`}>
                      {isDep ? '+' : '-'}{formatNaira(tx.amount)}
                    </span>
                    <span className="text-[9.5px] text-zinc-650 font-mono block mt-0.5">
                      {new Date(tx.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
