import React, { useState } from 'react';
import { Check, X, UserCheck, AlertCircle, Trash2, CheckCircle2, RefreshCw } from 'lucide-react';
import { DashboardState, Customer, Transaction } from '../types';
import { formatNaira } from './OverviewTab';

interface ApprovalsTabProps {
  state: DashboardState;
  onApproveCustomer: (id: string) => void;
  onRejectCustomer: (id: string) => void;
  onApproveTransaction: (id: string) => void;
  onRejectTransaction: (id: string) => void;
}

export default function ApprovalsTab({ 
  state, 
  onApproveCustomer, 
  onRejectCustomer,
  onApproveTransaction,
  onRejectTransaction 
}: ApprovalsTabProps) {
  const { customers, transactions } = state;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedTxIds, setSelectedTxIds] = useState<Set<string>>(new Set());

  const pendingCustomers = customers.filter(c => c.approvalStatus === 'pending');
  const approvedCustomers = customers.filter(c => c.approvalStatus === 'approved' || !c.approvalStatus);
  const pendingTransactions = transactions.filter(t => t.status === 'pending');

  const [activeSubTab, setActiveSubTab] = useState<'customers' | 'transactions'>(() => {
    if (pendingCustomers.length === 0 && pendingTransactions.length > 0) {
      return 'transactions';
    }
    return 'customers';
  });

  // Customer Onboarding Selectors
  const handleToggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === pendingCustomers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingCustomers.map(c => c.id)));
    }
  };

  const handleBulkApprove = () => {
    selectedIds.forEach(id => onApproveCustomer(id));
    setSelectedIds(new Set());
  };

  const handleBulkReject = () => {
    selectedIds.forEach(id => onRejectCustomer(id));
    setSelectedIds(new Set());
  };

  // Transaction Selectors
  const handleToggleTxSelection = (id: string) => {
    const next = new Set(selectedTxIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedTxIds(next);
  };

  const handleSelectAllTxs = () => {
    if (selectedTxIds.size === pendingTransactions.length) {
      setSelectedTxIds(new Set());
    } else {
      setSelectedTxIds(new Set(pendingTransactions.map(t => t.id)));
    }
  };

  const handleBulkApproveTxs = () => {
    selectedTxIds.forEach(id => onApproveTransaction(id));
    setSelectedTxIds(new Set());
  };

  const handleBulkRejectTxs = () => {
    selectedTxIds.forEach(id => onRejectTransaction(id));
    setSelectedTxIds(new Set());
  };

  // Helper function to get a consistent signature gradient for avatars
  const getAvatarGradient = (name: string) => {
    const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
    const mod = code % 4;
    if (mod === 0) return 'from-purple-500 to-pink-500';
    if (mod === 1) return 'from-emerald-500 to-teal-500';
    if (mod === 2) return 'from-amber-500 to-red-500';
    return 'from-blue-500 to-indigo-500';
  };

  // Helper to extract initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="w-full flex flex-col gap-6 select-none pb-12">
      {/* Tab Title Block */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black text-zinc-100 tracking-tight">Vault Approvals</h2>
        <p className="text-xs text-zinc-500 font-medium">Clear pending customer registrations and mobile cash operations</p>
      </div>

      {/* Sub tabs navigation */}
      <div className="flex border-b border-zinc-900/60 pb-1.5 gap-6">
        <button
          id="approvals-subtab-customers"
          onClick={() => setActiveSubTab('customers')}
          className={`relative pb-3 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'customers' ? 'text-[#14cfb4]' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          👤 Account Onboarding
          {pendingCustomers.length > 0 && (
            <span className="bg-[#14cfb4]/15 px-2 py-0.5 rounded-full text-[10px] font-black text-[#14cfb4] border border-[#14cfb4]/20 shrink-0">
              {pendingCustomers.length}
            </span>
          )}
          {activeSubTab === 'customers' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#14cfb4] rounded-t-full" />
          )}
        </button>

        <button
          id="approvals-subtab-transactions"
          onClick={() => setActiveSubTab('transactions')}
          className={`relative pb-3 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'transactions' ? 'text-[#14cfb4]' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          💸 Pending Transactions
          {pendingTransactions.length > 0 && (
            <span className="bg-rose-500/10 px-2 py-0.5 rounded-full text-[10px] font-black text-rose-400 border border-rose-500/20 shrink-0">
              {pendingTransactions.length}
            </span>
          )}
          {activeSubTab === 'transactions' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#14cfb4] rounded-t-full" />
          )}
        </button>
      </div>

      {/* RENDER CURRENT TAB */}
      {activeSubTab === 'customers' ? (
        <div className="flex flex-col gap-6">
          {pendingCustomers.length === 0 ? (
            <div className="bg-[#111311] border border-[#1b3d29]/20 rounded-[28px] py-14 px-6 flex flex-col items-center justify-center text-center">
              {/* Green Check Box Sticker */}
              <div className="w-16 h-16 bg-[#72c043] rounded-2xl flex items-center justify-center text-white text-4xl font-extrabold shadow-lg shadow-emerald-950/25 mb-4 select-none">
                ✓
              </div>
              <h3 className="font-extrabold text-zinc-100 text-lg tracking-wide">No Pending Approvals</h3>
              <p className="text-zinc-500 text-xs font-semibold mt-1">All onboarding customers have been authenticated.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black text-amber-500/90 tracking-widest uppercase flex items-center gap-1.5">
                  ⚠️ PENDING CUSTOMER APPROVALS ({pendingCustomers.length})
                </span>
                <button 
                  id="btn-select-all-customers"
                  onClick={handleSelectAll}
                  className="text-xs font-bold text-zinc-400 hover:text-zinc-200 uppercase tracking-wider cursor-pointer"
                >
                  {selectedIds.size === pendingCustomers.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {selectedIds.size > 0 && (
                <div className="bg-[#111311] border border-zinc-800 rounded-2xl p-3 flex items-center justify-between animate-fade-in shadow-xl">
                  <span className="text-xs font-extrabold text-zinc-100 px-2">{selectedIds.size} Selected</span>
                  <div className="flex gap-2">
                    <button 
                      id="btn-bulk-reject-customers"
                      onClick={handleBulkReject}
                      className="px-4 py-2 bg-red-950/20 hover:bg-red-950/40 text-red-500 border border-red-900/40 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Reject Selected
                    </button>
                    <button 
                      id="btn-bulk-approve-customers"
                      onClick={handleBulkApprove}
                      className="px-4 py-2 bg-[#1b3d29] hover:bg-[#204930] text-[#30d178] border border-[#163f27] font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve Selected
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                {pendingCustomers.map((cust, idx) => (
                  <div 
                    key={`${cust.id}-${idx}`}
                    onClick={() => handleToggleSelection(cust.id)}
                    className={`bg-[#111311] border ${selectedIds.has(cust.id) ? 'border-[#30d178] shadow-[#30d178]/5 shadow-md' : 'border-zinc-900 hover:border-zinc-800'} rounded-[24px] p-5 flex flex-col justify-between gap-4 transition-all cursor-pointer relative overflow-hidden`}
                  >
                    {selectedIds.has(cust.id) && (
                      <div className="absolute top-0 right-0 bg-[#30d178] rounded-bl-xl w-8 h-8 flex items-center justify-center text-black shadow-sm">
                        <Check className="w-4 h-4 font-black" />
                      </div>
                    )}
                    
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-full text-xs font-extrabold flex items-center justify-center text-white bg-gradient-to-tr ${getAvatarGradient(cust.name)} shrink-0`}>
                          {getInitials(cust.name)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-extrabold text-zinc-100">{cust.name}</span>
                          <div className="flex items-center gap-2 mt-1 relative group" onClick={(e) => e.stopPropagation()}>
                            <span className="text-xs text-zinc-500 font-mono">{cust.phoneNumber}</span>
                            <span className="text-[9px] font-black uppercase bg-[#2a1e0b] text-[#e0a92a] border border-[#44310e] px-2 py-0.5 rounded-full select-none flex items-center gap-1 cursor-help transition-all hover:brightness-110">
                              <span className="w-1 h-1 rounded-full bg-[#e0a92a] animate-pulse"></span>
                              Pending
                            </span>
                            
                            {/* Custom Tooltip */}
                            <div className="absolute left-0 bottom-full mb-2 ml-4 z-50 w-56 p-3 bg-zinc-950 border border-zinc-850 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.9)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none text-left">
                              <span className="block font-black text-[#e0a92a] text-[10px] mb-1 tracking-wider uppercase">⏱️ Awaiting Approval</span>
                              <p className="text-[9px] text-zinc-400 leading-relaxed font-semibold">This customer represents a new field registration. A manager or supervisor must confirm their details and authorize login access before they can log in.</p>
                              <span className="absolute top-full left-6 -mt-1 border-4 border-transparent border-t-zinc-950 animate-fade-in"></span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {!selectedIds.has(cust.id) && (
                        <div className="w-5 h-5 rounded-md border-2 border-zinc-750 hover:border-zinc-500 mt-1 mr-1 shrink-0"></div>
                      )}
                    </div>

                    <div className="flex items-center justify-between bg-black/35 py-2 px-3 rounded-xl border border-zinc-900 text-xs text-zinc-400">
                      <span className="text-zinc-500 font-medium">Zone/Location:</span>
                      <span className="font-semibold text-zinc-300">{cust.location || 'Kaduna South'}</span>
                    </div>

                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <button 
                        id={`btn-reject-customer-${cust.id}`}
                        onClick={() => onRejectCustomer(cust.id)}
                        className="flex-1 py-2.5 bg-red-950/10 hover:bg-red-950/20 border border-zinc-900/40 text-red-400 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>
                      <button 
                        id={`btn-approve-customer-${cust.id}`}
                        onClick={() => onApproveCustomer(cust.id)}
                        className="flex-1 py-2.5 bg-[#1b3d29] hover:bg-[#204930] text-[#30d178] border border-[#163f27] font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve Login</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* APPROVED ACCOUNTS section */}
          <div className="flex flex-col gap-3 mt-4">
            <div className="flex items-center gap-2 text-[11px] font-black text-zinc-500 uppercase tracking-widest px-1">
              <span className="text-[#30d178]/90 text-sm">☑</span>
              <span>APPROVED ACCOUNTS ({approvedCustomers.length})</span>
            </div>

            <div className="flex flex-col gap-2.5">
              {approvedCustomers.map((cust, idx) => (
                <div 
                  key={`${cust.id}-${idx}`}
                  className="bg-[#111311]/90 border border-zinc-900/70 rounded-[20px] p-4 flex items-center justify-between hover:border-zinc-850/40 transition-colors"
                >
                  <div className="flex items-center gap-3.5">
                    {/* Visual Circle Avatar */}
                    <div className={`w-11 h-11 rounded-full text-xs font-black flex items-center justify-center text-white bg-gradient-to-tr ${getAvatarGradient(cust.name)} shrink-0`}>
                      {getInitials(cust.name)}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-extrabold text-zinc-150 text-[15px] tracking-tight">{cust.name}</span>
                      <span className="text-xs text-zinc-500 font-mono">{cust.phoneNumber}</span>
                    </div>
                  </div>

                  {/* Badges saying approved */}
                  <div className="relative group">
                    <div className="bg-[#14231b] text-[#30d178]/90 text-xs font-black px-4.5 py-1.5 rounded-xl border border-[#1d3d29]/40 tracking-wide uppercase cursor-help select-none flex items-center gap-1 hover:brightness-110 transition-all">
                      <span className="w-1 h-1 rounded-full bg-[#30d178]"></span>
                      Approved
                    </div>

                    {/* Custom Tooltip */}
                    <div className="absolute right-0 bottom-full mb-2.5 z-50 w-64 p-3 bg-zinc-950 border border-zinc-900 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.9)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none text-left font-sans normal-case">
                      <span className="block font-black text-[#30d178] text-[10px] mb-1 tracking-wider uppercase">✓ Account Authorized</span>
                      <p className="text-[9px] text-zinc-400 leading-relaxed font-semibold">This profile has been verified and administrative login is fully authorized. The customer has full access to mobile saves tracking, statements, and security audits.</p>
                      <span className="absolute top-full right-6 -mt-1 border-4 border-transparent border-t-zinc-950"></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* TRANSACTIONS SECTION */
        <div className="flex flex-col gap-6">
          {pendingTransactions.length === 0 ? (
            <div className="bg-[#111311] border border-[#1b3d29]/20 rounded-[28px] py-14 px-6 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-[#14cfb4] rounded-2xl flex items-center justify-center text-slate-950 text-4xl font-extrabold shadow-lg shadow-teal-950/25 mb-4 select-none">
                ✓
              </div>
              <h3 className="font-extrabold text-zinc-100 text-lg tracking-wide">No Pending Transactions</h3>
              <p className="text-zinc-500 text-xs font-semibold mt-1">All savings &amp; withdrawal transactions are cleared.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black text-rose-400/90 tracking-widest uppercase flex items-center gap-1.5">
                  🛡️ PENDING TRANSACTION ACTIONS ({pendingTransactions.length})
                </span>
                <button 
                  id="btn-select-all-txs"
                  onClick={handleSelectAllTxs}
                  className="text-xs font-bold text-zinc-400 hover:text-zinc-200 uppercase tracking-wider cursor-pointer"
                >
                  {selectedTxIds.size === pendingTransactions.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {selectedTxIds.size > 0 && (
                <div className="bg-[#111311] border border-zinc-800 rounded-2xl p-3 flex items-center justify-between animate-fade-in shadow-xl">
                  <span className="text-xs font-extrabold text-zinc-100 px-2">{selectedTxIds.size} Selected</span>
                  <div className="flex gap-2">
                    <button 
                      id="btn-bulk-reject-txs"
                      onClick={handleBulkRejectTxs}
                      className="px-4 py-2 bg-red-950/20 hover:bg-red-950/40 text-red-500 border border-red-900/40 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Decline Selected
                    </button>
                    <button 
                      id="btn-bulk-approve-txs"
                      onClick={handleBulkApproveTxs}
                      className="px-4 py-2 bg-teal-950/20 hover:bg-teal-900/40 text-[#14cfb4] border border-[#14cfb4]/30 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 animate-pulse"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve Selected
                    </button>
                  </div>
                </div>
              )}

              {/* Transaction Table */}
              <div className="bg-[#121412] border border-zinc-900 rounded-[28px] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-900 text-[11px] font-bold text-zinc-550 uppercase tracking-widest bg-black/15">
                        <th className="py-4 px-5 w-12">
                          <input
                            id="tx-table-select-all-cb"
                            type="checkbox"
                            checked={selectedTxIds.size === pendingTransactions.length && pendingTransactions.length > 0}
                            onChange={handleSelectAllTxs}
                            className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-[#14cfb4] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#14cfb4]"
                          />
                        </th>
                        <th className="py-4 px-5">Ref Code</th>
                        <th className="py-4 px-5">Client Name</th>
                        <th className="py-4 px-5">Amount</th>
                        <th className="py-4 px-5 font-mono">Type</th>
                        <th className="py-4 px-5">Applied Date</th>
                        <th className="py-4 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 text-xs text-zinc-300">
                      {pendingTransactions.map((tx, idx) => {
                        const isSelected = selectedTxIds.has(tx.id);
                        const isDeposit = tx.type === 'deposit';
                        return (
                          <tr 
                            key={`${tx.id}-${idx}`} 
                            className={`hover:bg-zinc-850/20 transition-colors cursor-pointer ${isSelected ? 'bg-[#14cfb4]/5' : ''}`}
                            onClick={() => handleToggleTxSelection(tx.id)}
                          >
                            <td className="py-4 px-5" onClick={(e) => e.stopPropagation()}>
                              <input
                                id={`tx-checkbox-${tx.id}`}
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleTxSelection(tx.id)}
                                className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-[#14cfb4] focus:ring-0 focus:ring-offset-0 cursor-pointer accent-[#14cfb4]"
                              />
                            </td>
                            <td className="py-4 px-5 font-mono text-zinc-500 font-semibold">{tx.reference}</td>
                            <td className="py-4 px-5">
                              <span className="font-bold text-zinc-150">{tx.customerName}</span>
                            </td>
                            <td className={`py-4 px-5 font-mono font-bold ${isDeposit ? 'text-[#14cfb4]' : 'text-amber-500'}`}>
                              {formatNaira(tx.amount, true)}
                            </td>
                            <td className="py-4 px-5 font-mono">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                                isDeposit 
                                  ? 'bg-[#14cfb4]/10 border-[#14cfb4]/20 text-[#14cfb4]' 
                                  : 'bg-amber-955/20 border-amber-900/10 text-amber-500'
                              }`}>
                                {tx.type.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-4 px-5 text-zinc-450 font-medium">
                              {new Date(tx.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </td>
                            <td className="py-3 px-5 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="inline-flex items-center gap-2">
                                <button 
                                  id={`btn-reject-tx-${tx.id}`}
                                  onClick={() => onRejectTransaction(tx.id)}
                                  className="p-1 px-2 border border-zinc-800 hover:border-red-900/50 hover:bg-red-950/10 hover:text-[#fc5252] rounded-lg text-zinc-400 font-bold text-[10px] transition-all cursor-pointer"
                                  title="Decline Transaction"
                                >
                                  Reject
                                </button>
                                <button 
                                  id={`btn-approve-tx-${tx.id}`}
                                  onClick={() => onApproveTransaction(tx.id)}
                                  className={`p-1 px-2 border rounded-lg font-black text-[10px] transition-all cursor-pointer ${
                                    isDeposit 
                                      ? 'bg-emerald-950/20 border-[#14cfb4]/20 hover:bg-[#14cfb4]/20 text-[#14cfb4]' 
                                      : 'bg-amber-950/20 border-[#e0a92a]/20 hover:bg-[#e0a92a]/10 text-amber-500'
                                  }`}
                                  title="Approve Transaction"
                                >
                                  Approve
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
