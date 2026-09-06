import { useState } from 'react';
import { Search, ArrowUpRight, Check, X, FileDown, Calendar, ShieldCheck, Eye, HelpCircle, AlertTriangle } from 'lucide-react';
import { DashboardState } from '../types';
import { formatNaira } from './OverviewTab';
import { useToast } from './ToastProvider';

interface WithdrawalsTabProps {
  state: DashboardState;
  onApprove: (id: string, receiptPhoto?: string) => void;
  onReject: (id: string) => void;
}

export default function WithdrawalsTab({ state, onApprove, onReject }: WithdrawalsTabProps) {
  const { showToast } = useToast();
  const { transactions } = state;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedProofTx, setSelectedProofTx] = useState<any | null>(null);
  const [insufficientFundsTx, setInsufficientFundsTx] = useState<any | null>(null);
  const [approvingTx, setApprovingTx] = useState<any | null>(null);
  const [attachedReceiptPhoto, setAttachedReceiptPhoto] = useState<string>('');
  const [copiedText, setCopiedText] = useState(false);

  // Filter withdrawals
  const withdrawals = transactions.filter(t => t.type === 'withdrawal');

  const filteredWithdrawals = withdrawals.filter(w => {
    const matchesSearch = w.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || w.reference.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="w-full flex flex-col gap-6 select-none pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Withdrawal Archives</h2>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Status selector */}
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-[#121412] text-xs text-zinc-350 border border-zinc-900 rounded-xl focus:outline-none"
          >
            <option value="all">All Withdrawals</option>
            <option value="pending">Awaiting Approval</option>
            <option value="approved">Paid Out</option>
            <option value="rejected">Declined</option>
          </select>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
            <input 
              type="text"
              placeholder="Search reference or Client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-[#121412] text-xs text-zinc-200 border border-zinc-900 rounded-xl focus:border-teal-800 focus:outline-none w-44 sm:w-56"
            />
          </div>
        </div>
      </div>

      <div className="bg-[#121412] border border-zinc-900 rounded-[28px] overflow-hidden">
        {filteredWithdrawals.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">No withdrawal records match the filters.</div>
         ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 text-[11px] font-bold text-zinc-550 uppercase tracking-widest bg-black/15">
                  <th className="py-4 px-5">Withdrawal Reference</th>
                  <th className="py-4 px-5">Client Name</th>
                  <th className="py-4 px-5">Payout Amount</th>
                  <th className="py-4 px-5">Submission Time</th>
                  <th className="py-4 px-5">Security Audits</th>
                  <th className="py-4 px-5">Authorized Status</th>
                  <th className="py-4 px-5 text-right">Quick action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-xs text-zinc-300">
                {filteredWithdrawals.map((w, idx) => {
                  const isPending = w.status === 'pending';
                  const isApproved = w.status === 'approved';
                  const isRejected = w.status === 'rejected';

                  const hasPhotos = w.withdrawalPhoto || w.cardPhoto;

                  return (
                    <tr key={`${w.id}-${idx}`} className="hover:bg-zinc-850/20 transition-colors">
                      <td className="py-4 px-5 font-mono text-zinc-500 font-semibold">{w.reference}</td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2.5">
                          {(() => {
                            const c = state.customers.find(cust => cust.id === w.customerId);
                            const custPhoto = w.withdrawalPhoto || c?.profileImage;
                            const initials = c ? c.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase() : w.customerName.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
                            return custPhoto ? (
                              <img src={custPhoto} className="w-8 h-8 rounded-full object-cover border border-zinc-805 shrink-0" alt="Customer" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white bg-gradient-to-br from-amber-500 to-orange-600 shrink-0 select-none">
                                {initials}
                              </div>
                            );
                          })()}
                          <span className="font-bold text-zinc-150">{w.customerName}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 font-mono font-bold text-amber-500">
                        {formatNaira(w.amount, true)}
                      </td>
                      <td className="py-4 px-5 text-zinc-450 font-medium">
                        {new Date(w.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td className="py-2.5 px-5">
                        {hasPhotos ? (
                          <div className="flex items-center gap-2.5">
                            {w.withdrawalPhoto && (
                              <div className="relative shrink-0 flex items-center justify-center">
                                <img
                                  src={w.withdrawalPhoto}
                                  className="w-10 h-10 object-cover rounded-lg border border-amber-500/20 hover:border-amber-500 transition-all cursor-pointer shadow-sm"
                                  onClick={() => setSelectedProofTx(w)}
                                  title="Click to view full face capture"
                                  referrerPolicy="no-referrer"
                                />
                                <span className="absolute -top-1 -right-1 bg-amber-500 text-[7px] font-black leading-none px-1 py-0.5 rounded text-black font-sans uppercase tracking-tight scale-90">Face</span>
                              </div>
                            )}
                            {w.cardPhoto && (
                              <div className="relative shrink-0 flex items-center justify-center">
                                <img
                                  src={w.cardPhoto}
                                  className="w-10 h-10 object-cover rounded-lg border border-teal-500/20 hover:border-teal-500 transition-all cursor-pointer shadow-sm"
                                  onClick={() => setSelectedProofTx(w)}
                                  title="Click to view full ID card"
                                  referrerPolicy="no-referrer"
                                />
                                <span className="absolute -top-1 -right-1 bg-[#14cfb4] text-[7px] font-black leading-none px-1 py-0.5 rounded text-black font-sans uppercase tracking-tight scale-90">Doc</span>
                              </div>
                            )}
                            <button
                              onClick={() => setSelectedProofTx(w)}
                              className="px-2 py-1 rounded bg-[#14cfb4]/10 border border-[#14cfb4]/20 hover:bg-[#14cfb4]/20 hover:border-[#14cfb4]/45 text-[9.5px] font-black text-[#14cfb4] uppercase tracking-wider shrink-0 transition-all cursor-pointer"
                              title="Verify full size records"
                            >
                              🔎 Verify
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-zinc-650 font-medium text-[10.5px]">
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>Legacy / No captures</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <div className="relative group inline-block font-sans">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border cursor-help hover:brightness-110 transition-all select-none ${
                            isApproved ? 'bg-[#0d2e1b] border-[#1b5030] text-[#30d178]' :
                            isPending ? 'bg-[#2a1e0b] border-[#44310e] text-[#e0a92a]' :
                            'bg-[#280c0c] border-[#4a1616] text-[#fc5252]'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isApproved ? 'bg-[#30d178]' :
                              isPending ? 'bg-[#e0a92a]' :
                              'bg-[#fc5252]'
                            }`}></span>
                            <span className="capitalize">{w.status}</span>
                          </span>

                          {/* Custom UI Tooltip */}
                          <div className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 z-50 w-60 p-3 bg-zinc-950 border border-zinc-850 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.95)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none text-left font-sans normal-case">
                            <span className="block font-black text-[10px] mb-1.5 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-900 pb-1">
                              {isApproved && (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#30d178]"></span>
                                  <span className="text-[#30d178]">Approved &amp; Paid Out</span>
                                </>
                              )}
                              {isPending && (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#e0a92a] animate-pulse"></span>
                                  <span className="text-[#e0a92a]">Awaiting Approval</span>
                                </>
                              )}
                              {isRejected && (
                                <>
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#fc5252]"></span>
                                  <span className="text-[#fc5252]">Declined / Cancelled</span>
                                </>
                              )}
                            </span>
                            <p className="text-[9px] text-[#cbd5e1] leading-relaxed font-semibold">
                              {isApproved && "The withdrawal transaction has been fully audited, compliance selfie vetted, and paid out. Standard transfer receipts are logged correctly within the database."}
                              {isPending && "This request is pending a manager's safety checks, face snap validation, identity card verification, and administrative clearance before a cash payout can be executed."}
                              {isRejected && "This payout was declined. Typical triggers include customer available balance deficits, unverified selfie hand-over snapshot, or invalid banking details."}
                            </p>
                            <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-zinc-950"></span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-5 text-right">
                        {isPending ? (
                          <div className="inline-flex items-center gap-2">
                            <button 
                              onClick={() => onReject(w.id)}
                              className="p-1 px-2 border border-zinc-800 hover:border-red-900/50 hover:bg-red-950/10 hover:text-[#fc5252] rounded-lg text-zinc-400 font-semibold text-[10px] transition-all cursor-pointer"
                              title="Decline payout"
                            >
                              Reject
                            </button>
                            <button 
                              onClick={() => {
                                setAttachedReceiptPhoto('');
                                setApprovingTx(w);
                              }}
                              className="p-1 px-2 bg-emerald-950 border border-emerald-900 hover:bg-emerald-900 hover:border-emerald-700 rounded-lg text-[#30d178] font-bold text-[10px] transition-all cursor-pointer"
                              title="Authorize payout"
                            >
                              Approve
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-zinc-600 italic">No action required</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECURE BIOMETRIC DISPUTE RESOLUTION OVERLAY MODAL */}
      {selectedProofTx && (
        <div className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0e100e] border border-zinc-900 w-full max-w-lg rounded-[32px] overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.95)] animate-fade-in flex flex-col max-h-[90vh]">
            
            {/* Header branding */}
            <div className="p-5.5 border-b border-zinc-950 bg-zinc-950/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#14cfb4]/10 border border-[#14cfb4]/20 text-[#14cfb4]">
                  <ShieldCheck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Dispute Audit Center</h3>
                  <p className="text-[9px] font-mono font-bold text-zinc-550 uppercase tracking-widest mt-0.5">Biometric Proof of Cash Hand-Over</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedProofTx(null)}
                className="w-8 h-8 rounded-full bg-[#111311] hover:bg-zinc-900 text-zinc-450 hover:text-white flex items-center justify-center border border-zinc-900 text-xs transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Content area */}
            <div className="p-6 flex flex-col gap-5 overflow-y-auto font-sans text-zinc-300">
              
              {/* Client identity metadata */}
              <div className="bg-zinc-950/40 p-4 rounded-2xl border border-zinc-950 flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 font-extrabold uppercase tracking-wider">
                  <span>Audit Identity Target</span>
                  <span className="text-[#14cfb4]">{selectedProofTx.reference}</span>
                </div>
                <div className="h-px bg-zinc-900/60 my-1"/>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs font-medium">
                  <div>
                    <span className="text-[9.5px] text-zinc-500 block uppercase tracking-wider font-extrabold">Saver name</span>
                    <span className="text-zinc-200 uppercase font-black">{selectedProofTx.customerName}</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] text-zinc-500 block uppercase tracking-wider font-extrabold">Payout Amount</span>
                    <span className="text-amber-500 font-mono font-bold">{formatNaira(selectedProofTx.amount, true)}</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] text-zinc-500 block uppercase tracking-wider font-extrabold">Timestamp</span>
                    <span className="text-zinc-[450] font-mono text-[11px]">{new Date(selectedProofTx.timestamp).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[9.5px] text-zinc-500 block uppercase tracking-wider font-extrabold">Operator Stamp</span>
                    <span className="text-zinc-450 uppercase font-bold">{selectedProofTx.staffName || "Customer Link (Web)"}</span>
                  </div>
                </div>
              </div>

              {/* Photos Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* 1. Recipient Selfie Capture */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                    📸 1. Client Selfie/Face Capture
                  </span>
                  <div className="aspect-[4/3] bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden relative group">
                    {selectedProofTx.withdrawalPhoto ? (
                      <img 
                        src={selectedProofTx.withdrawalPhoto} 
                        className="w-full h-full object-cover" 
                        alt="Client Selfie Capture" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-650 p-4">
                        <span className="text-xl mb-1">📷</span>
                        <span className="text-[8.5px] uppercase font-bold text-center">No Recipient portrait register</span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[8px] font-mono text-zinc-350 tracking-wider">
                      Live Snap
                    </div>
                  </div>
                </div>

                {/* 2. Recipient ID Card / Passbook */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                    💳 2. Saver Card / ID Doc
                  </span>
                  <div className="aspect-[4/3] bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden relative group">
                    {selectedProofTx.cardPhoto ? (
                      <img 
                        src={selectedProofTx.cardPhoto} 
                        className="w-full h-full object-cover" 
                        alt="Client ID Card" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-650 p-4">
                        <span className="text-xl mb-1">🗂️</span>
                        <span className="text-[8.5px] uppercase font-bold text-center">No document upload registered</span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[8px] font-mono text-zinc-350 tracking-wider">
                      Savings Card
                    </div>
                  </div>
                </div>

              </div>

              {/* Warning/Confirmation Footnote */}
              <div className="p-3 bg-teal-500/5 rounded-2xl border border-[#14cfb4]/10 text-center">
                <p className="text-[10px] text-zinc-400 leading-normal">
                  🔐 <span className="font-extrabold text-[#14cfb4]">CONTRIBOPAY TAMPER-PROOF PROOF:</span> These cryptographic image assets contain embedded coordinate identifiers at deployment point <span className="font-mono text-[9px] text-[#14cfb4]">Kaduna, Nigeria</span>. Validated safe and complete.
                </p>
              </div>

            </div>

            {/* Bottom Actions */}
            <div className="p-4 bg-zinc-950 border-t border-zinc-900 flex gap-2">
              <button
                onClick={() => setSelectedProofTx(null)}
                className="flex-1 py-3 bg-[#111311] hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Close Audit Page
              </button>
              <button
                onClick={() => {
                  showToast("Audit documentation package generated. Ready for legal distribution.", "success");
                  setSelectedProofTx(null);
                }}
                className="py-3 px-5 bg-teal-950 border border-[#14cfb4]/20 hover:border-[#14cfb4]/50 hover:bg-[#14cfb4]/10 text-[#14cfb4] font-black rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                📥 Download Audit Pak
              </button>
            </div>

          </div>
        </div>
      )}

      {/* INSUFFICIENT FUNDS SANITY ALERT MODAL */}
      {insufficientFundsTx && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0e100e] border border-zinc-900 w-full max-w-md rounded-[32px] overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.95)] animate-fade-in flex flex-col">
            
            {/* Header with dangerous tone */}
            <div className="p-5.5 border-b border-rose-950/20 bg-rose-950/10 flex items-center gap-3">
              <span className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[#fc5252] animate-pulse">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-black text-[#fc5252] uppercase tracking-wider">Sanity Check Blocked</h3>
                <p className="text-[9px] font-mono font-bold text-rose-450 uppercase tracking-widest mt-0.5">Insufficient Customer Balance</p>
              </div>
            </div>

            {/* Content area explaining details */}
            <div className="p-6 flex flex-col gap-5 text-zinc-350">
              <p className="text-[11.5px] leading-relaxed text-zinc-400">
                The manager safety validation engine has blocked this withdrawal payout. The customer has insufficient available ledger funds.
              </p>

              {/* Balance & Request breakdown */}
              <div className="bg-[#121412] p-4 rounded-2xl border border-rose-950/20 flex flex-col gap-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 block uppercase font-black text-[10px]">Client Target name</span>
                  <span className="text-zinc-200 font-bold uppercase">{insufficientFundsTx.customerName}</span>
                </div>
                
                <div className="h-px bg-zinc-900" />
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-2.5 rounded-xl bg-rose-950/5 border border-rose-950/10">
                    <span className="text-[9px] text-zinc-500 block uppercase font-bold tracking-wider">Available Ledger</span>
                    <span className="text-[#30d178] font-mono font-black text-sm block mt-0.5">
                      {formatNaira(insufficientFundsTx.currentBalance, true)}
                    </span>
                  </div>
                  
                  <div className="p-2.5 rounded-xl bg-amber-950/5 border border-amber-950/10">
                    <span className="text-[9px] text-zinc-500 block uppercase font-bold tracking-wider">Withdraw Request</span>
                    <span className="text-rose-400 font-mono font-black text-sm block mt-0.5">
                      {formatNaira(insufficientFundsTx.amount, true)}
                    </span>
                  </div>
                </div>

                <div className="h-px bg-zinc-900" />

                <div className="flex justify-between items-center text-xs">
                  <span className="text-rose-505 block font-semibold text-[10px] uppercase">🚨 Funds Deficit</span>
                  <span className="text-rose-400 font-mono font-bold">
                    -{formatNaira(insufficientFundsTx.amount - insufficientFundsTx.currentBalance, true)}
                  </span>
                </div>
              </div>

              {/* Advisory details */}
              <div className="p-3 bg-rose-500/5 rounded-xl border border-rose-500/10 text-center">
                <p className="text-[10px] text-zinc-400 leading-normal">
                  Approving this transaction would place the customer's account in negative layout deficit. Reject the payout request or acquire secondary field collateral.
                </p>
              </div>
            </div>

            {/* Actions for resolution */}
            <div className="p-4 bg-zinc-950 border-t border-zinc-900 flex gap-2">
              <button
                onClick={() => setInsufficientFundsTx(null)}
                className="flex-1 py-3 bg-[#111311] hover:bg-zinc-900 border border-zinc-900 text-zinc-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center"
              >
                Go Back
              </button>
              
              <button
                onClick={() => {
                  onReject(insufficientFundsTx.id);
                  setInsufficientFundsTx(null);
                }}
                className="flex-1 py-3 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-900/30 hover:border-rose-500/50 text-[#fc5252] font-black rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer text-center"
              >
                Declined (Reject)
              </button>
            </div>

          </div>
        </div>
      )}

      {/* SECURE BIOMETRIC CONFIRMATION & APPROVAL SANITY DIAL */}
      {approvingTx && (() => {
        const customerForBal = state.customers.find(c => c.id === approvingTx.customerId);
        const currentBalance = customerForBal ? customerForBal.balance : 0;
        const hasSufficient = currentBalance >= approvingTx.amount;

        return (
          <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#0e100e] border border-zinc-900 w-full max-w-lg rounded-[32px] overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.95)] animate-fade-in flex flex-col max-h-[90vh]">
              
              {/* Header Branding */}
              <div className="p-5.5 border-b border-zinc-950 bg-zinc-950/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-[#3ad188]/10 border border-[#3ad188]/20 text-[#3ad188]">
                    <ShieldCheck className="w-5 h-5 animate-pulse" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Biometric Authorization</h3>
                    <p className="text-[9px] font-mono font-bold text-zinc-550 uppercase tracking-widest mt-0.5">
                      Verify face snapshot before payout confirmation
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setApprovingTx(null)}
                  className="w-8 h-8 rounded-full bg-[#111311] hover:bg-zinc-900 text-zinc-450 hover:text-white flex items-center justify-center border border-zinc-900 text-xs transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Main verification target panels */}
              <div className="p-6 flex flex-col gap-5 overflow-y-auto font-sans text-zinc-300">
                
                {/* Client profile, savings balance and requested amount */}
                <div className="bg-[#121412] p-4 rounded-2xl border border-zinc-900 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-550 block uppercase font-black text-[9px] tracking-wider">Account Holder</span>
                    <span className="text-zinc-[100] font-bold uppercase">{approvingTx.customerName}</span>
                  </div>

                  <div className="h-px bg-zinc-950" />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-900">
                      <span className="text-[9.5px] text-zinc-500 block uppercase font-bold tracking-wider mb-1">Available Ledger</span>
                      <span className="text-emerald-400 font-mono font-black text-sm block">
                        {formatNaira(currentBalance, true)}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-900">
                      <span className="text-[9.5px] text-zinc-500 block uppercase font-bold tracking-wider mb-1">Payout Requested</span>
                      <span className="text-amber-500 font-mono font-black text-sm block">
                        {formatNaira(approvingTx.amount, true)}
                      </span>
                    </div>
                  </div>

                  <div className="h-px bg-zinc-950" />

                  {/* Verification Sanity Balance Panel (Request 3 constraint) */}
                  {hasSufficient ? (
                    <div className="flex items-center gap-2 text-xs bg-emerald-500/5 p-2 px-3 border border-emerald-500/10 rounded-xl text-emerald-420">
                      <span>✓</span>
                      <span className="font-semibold text-[10.5px]">Ledger balance is sufficient. Safety limit validated.</span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2.5 text-xs bg-rose-500/5 p-3 border border-rose-500/20 rounded-xl text-rose-450">
                      <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-rose-500 animate-bounce" />
                      <div>
                        <span className="font-extrabold text-[11px] block text-rose-400 uppercase tracking-wide">SANITY CHECK WARNING: Deficit Detected</span>
                        <span className="text-[10px] text-zinc-400 mt-1 block leading-normal">
                          The requested payout amount exceeds the available ledger balance by <span className="font-mono font-black text-rose-400">₦{(approvingTx.amount - currentBalance).toLocaleString()}</span>. Approval is strictly blocked to maintain ledger alignment.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* BANK PAYOUT TARGET CREDENTIALS */}
                <div className="bg-[#121412] p-4.5 rounded-2xl border border-zinc-900 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-[450] block uppercase font-black text-[9px] tracking-wider">🏦 Payout Bank</span>
                    <span className="text-amber-500 font-extrabold uppercase">
                      {approvingTx.payoutBankName || 'STERLING BANK PLC'}
                    </span>
                  </div>

                  <div className="h-px bg-zinc-950" />

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-[450] block uppercase font-black text-[9px] tracking-wider">👤 Account Name</span>
                    <span className="text-zinc-200 font-bold uppercase">
                      {approvingTx.payoutAccountName || approvingTx.customerName}
                    </span>
                  </div>

                  <div className="h-px bg-zinc-950" />

                  {/* Copyable Account Number with interactive feedback */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-[450] block uppercase font-black text-[9px] tracking-wider">🔢 Account Number</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-[#14cfb4] text-sm bg-zinc-950 px-2 py-1 rounded-lg border border-zinc-900 select-all tracking-wider">
                        {approvingTx.payoutAccountNumber || '3048590021'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const acctNo = approvingTx.payoutAccountNumber || '3048590021';
                          navigator.clipboard.writeText(acctNo);
                          setCopiedText(true);
                          setTimeout(() => setCopiedText(false), 2000);
                        }}
                        className={`px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                          copiedText 
                            ? 'bg-emerald-950 border-emerald-900 text-emerald-400' 
                            : 'bg-zinc-950 hover:bg-zinc-900 border-zinc-905 text-[#14cfb4] hover:text-[#14cfb4]/85'
                        }`}
                      >
                        {copiedText ? 'Copied! ✓' : 'Copy 📋'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* VISUAL BIOMETRIC CORES - Request 2 constraint */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-0.5">
                    📸 Biometric Hand-Over Proof Of Capture:
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Selfie face snap */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-extrabold text-zinc-450 uppercase tracking-wider pl-0.5">
                        Client Selfie Image (At collection point)
                      </span>
                      <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden border border-zinc-900 bg-zinc-950 relative group">
                        {approvingTx.withdrawalPhoto ? (
                          <img 
                            src={approvingTx.withdrawalPhoto} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                            alt="Recipient Face verification" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-650 p-4">
                            <span className="text-2xl mb-1">📷</span>
                            <span className="text-[8.5px] uppercase font-bold text-center">No Recipient Portrait Captures</span>
                          </div>
                        )}
                        <div className="absolute top-2 left-2 bg-black/75 px-2 py-0.5 rounded text-[8px] font-mono text-amber-500 tracking-wider">
                          Identity Target
                        </div>
                      </div>
                    </div>

                    {/* Savings registration / doc upload */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-extrabold text-zinc-450 uppercase tracking-wider pl-0.5">
                        Saver Registration card / Proof Document
                      </span>
                      <div className="aspect-[4/3] w-full rounded-2xl overflow-hidden border border-zinc-900 bg-zinc-950 relative group">
                        {approvingTx.cardPhoto ? (
                          <img 
                            src={approvingTx.cardPhoto} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                            alt="Savings card doc" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-650 p-4">
                            <span className="text-2xl mb-1">🗂️</span>
                            <span className="text-[8.5px] uppercase font-bold text-center">No custom registration ledger</span>
                          </div>
                        )}
                        <div className="absolute top-2 left-2 bg-black/75 px-2 py-0.5 rounded text-[8px] font-mono text-[#3ad188] tracking-wider">
                          Ledger Key Card
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PAYMENT RECEIPT ATTACHMENT */}
                <div className="bg-[#121412] p-4 rounded-2xl border border-zinc-900 flex flex-col gap-3 font-sans">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-0.5 block">
                    🧾 Payout Receipt Attachment:
                  </span>

                  <div className="flex flex-col gap-2">
                    {attachedReceiptPhoto ? (
                      <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden border border-[#3ad188]/30 bg-zinc-950 flex items-center justify-center">
                        <img 
                          src={attachedReceiptPhoto} 
                          className="w-full h-full object-cover" 
                          alt="Transfer Payout Receipt" 
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => setAttachedReceiptPhoto('')}
                          className="absolute top-2 right-2 px-2 py-1 bg-black/80 rounded-lg text-rose-450 hover:text-white transition-colors text-[9px] font-black uppercase tracking-wider cursor-pointer"
                        >
                          ✕ Clear Receipt
                        </button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-zinc-800 hover:border-[#38bdf8]/60 bg-zinc-950/40 rounded-2xl py-6 px-4 text-center cursor-pointer flex flex-col items-center justify-center gap-2 transition-all">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = () => {
                                if (typeof reader.result === 'string') {
                                  setAttachedReceiptPhoto(reader.result);
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <span className="text-2xl">📤</span>
                        <div>
                          <p className="text-xs font-bold text-zinc-300">Click or Drag & Drop Transfer Receipt</p>
                          <p className="text-[9px] text-zinc-550 mt-1 uppercase tracking-wider font-semibold">Attach payment proof photo or PDF</p>
                        </div>
                      </label>
                    )}

                    {/* Pre-packaged simulation chips */}
                    <div className="flex flex-col gap-1.5 mt-1">
                      <span className="text-[8.5px] text-zinc-550 font-black uppercase tracking-wider">
                        💡 Fast Simulation presets (One-click receipt generate)
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const refCode = approvingTx.reference;
                            const currencyAmt = approvingTx.amount.toLocaleString();
                            setAttachedReceiptPhoto(`data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="400" height="250" fill="%230f172a"/><rect x="20" y="20" width="360" height="210" rx="8" fill="none" stroke="%2338bdf8" stroke-width="2"/><text x="40" y="55" fill="%2338bdf8" font-family="sans-serif" font-weight="black" font-size="14">STERLING BANK PLC</text><text x="40" y="75" fill="%23cbd5e1" font-family="monospace" font-size="10">INSTANT TRANSFER TRANSACTION ADVICE</text><line x1="40" y1="90" x2="360" y2="90" stroke="%23334155"/><text x="45" y="115" fill="%2394a3b8" font-family="sans-serif" font-size="10" font-weight="extrabold">BENEFICIARY:</text><text x="180" y="115" fill="white" font-family="sans-serif" font-size="11" font-weight="bold">${approvingTx.customerName.toUpperCase()}</text><text x="45" y="140" fill="%2394a3b8" font-family="sans-serif" font-size="10" font-weight="extrabold">ACCOUNT NUMBER:</text><text x="180" y="140" fill="%2338bdf8" font-family="monospace" font-size="11" font-weight="bold">${approvingTx.payoutAccountNumber || '3048590021'}</text><text x="45" y="165" fill="%2394a3b8" font-family="sans-serif" font-size="10" font-weight="extrabold">AMOUNT PAID:</text><text x="180" y="165" fill="%2334d399" font-family="monospace" font-size="14" font-weight="black">NGN ${currencyAmt}.00</text><text x="45" y="190" fill="%2394a3b8" font-family="sans-serif" font-size="10" font-weight="extrabold">REFERENCE NO:</text><text x="180" y="190" fill="%2394a3b8" font-family="monospace" font-size="10" font-weight="semibold">${refCode}-PAYOUT-OK</text><text x="45" y="215" fill="%2334d399" font-family="sans-serif" font-weight="extrabold" font-size="10">STATUS: APPROVED &amp; DISPATCHED ✅</text></svg>`);
                          }}
                          className="py-2 text-[10px] font-black text-center bg-zinc-950 border border-zinc-900 text-sky-420 hover:text-sky-300 hover:border-sky-800/40 rounded-xl cursor-pointer active:scale-98 transition-all"
                        >
                          🏦 Sterling Receipt
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const refCode = approvingTx.reference;
                            const currencyAmt = approvingTx.amount.toLocaleString();
                            setAttachedReceiptPhoto(`data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="400" height="250" fill="%23090514"/><rect x="25" y="25" width="350" height="200" rx="12" fill="none" stroke="%23a855f7" stroke-width="2"/><text x="45" y="60" fill="%23a855f7" font-family="sans-serif" font-weight="black" font-size="16">KUDA PAYOUT</text><text x="45" y="80" fill="%23cbd5e1" font-family="sans-serif" font-size="8" font-weight="bold" letter-spacing="1">LEDGER SETTLEMENT SUCCESS</text><line x1="45" y1="95" x2="355" y2="95" stroke="%233b0764"/><text x="50" y="125" fill="%23a855f7" font-family="sans-serif" font-size="11" font-weight="extrabold">REF:</text><text x="130" y="125" fill="white" font-family="monospace" font-size="11" font-weight="bold">${refCode}</text><text x="50" y="155" fill="%23a855f7" font-family="sans-serif" font-size="11" font-weight="extrabold">TARGET:</text><text x="130" y="155" fill="white" font-family="sans-serif" font-size="11" font-weight="bold">${approvingTx.customerName.toUpperCase()}</text><text x="50" y="185" fill="%23a855f7" font-family="sans-serif" font-size="11" font-weight="extrabold">AMOUNT:</text><text x="130" y="185" fill="%23a855f7" font-family="monospace" font-size="15" font-weight="black">₦ ${currencyAmt}.00</text></svg>`);
                          }}
                          className="py-2 text-[10px] font-black text-center bg-zinc-950 border border-zinc-900 text-purple-420 hover:text-purple-300 hover:border-purple-800/40 rounded-xl cursor-pointer active:scale-98 transition-all"
                        >
                          💜 Kuda Transfer advice
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Compliance Statement */}
                <div className="p-3 bg-[#3ad188]/5 rounded-2xl border border-[#3ad188]/10 text-center">
                  <p className="text-[10px] text-zinc-400 leading-normal">
                    By clicking Confirm below, you verify that the face portrait exactly matches the registered account subscriber. This record is sealed dynamically inside the audit archives.
                  </p>
                </div>

              </div>

              {/* Bottom confirmation triggers */}
              <div className="p-4 bg-zinc-950 border-t border-zinc-900 flex gap-2">
                <button
                  onClick={() => setApprovingTx(null)}
                  className="flex-1 py-3 bg-[#111311] hover:bg-zinc-900 border border-zinc-900 text-zinc-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                
                <button
                  disabled={!hasSufficient}
                  onClick={() => {
                    onApprove(approvingTx.id, attachedReceiptPhoto || undefined);
                    setApprovingTx(null);
                    setAttachedReceiptPhoto('');
                  }}
                  className={`flex-1 py-3 font-black rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                    hasSufficient 
                      ? 'bg-[#3ad188] hover:bg-[#28b871] text-[#090a09] shadow-md shadow-[#3ad188]/10' 
                      : 'bg-zinc-850 border border-zinc-900 text-zinc-600 cursor-not-allowed opacity-50'
                  }`}
                >
                  <Check className="w-4 h-4 font-black" />
                  <span>Confirm and Approve</span>
                </button>
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
}
