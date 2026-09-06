import React, { useState } from 'react';
import { Customer } from '../types';
import { 
  Users, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight,
  UserCheck,
  UserX
} from 'lucide-react';

interface CustomerStatsProps {
  customers: Customer[];
}

export const CustomerStats: React.FC<CustomerStatsProps> = ({ customers }) => {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly');
  const [searchQuery, setSearchQuery] = useState('');

  // Helper to determine if customer joined or had activity in a specific timeframe
  const getWithinPeriod = (dateStr: string | undefined, period: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    if (!dateStr) return false;
    try {
      const now = new Date();
      const joinedDate = new Date(dateStr);
      const diffTime = Math.abs(now.getTime() - joinedDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (period === 'daily') return diffDays <= 1;
      if (period === 'weekly') return diffDays <= 7;
      if (period === 'monthly') return diffDays <= 30;
      if (period === 'yearly') return diffDays <= 365;
    } catch {
      return false;
    }
    return false;
  };

  // Get metrics for a given period
  const getPeriodDistribution = (period: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    // Filter customers who joined/active in this period
    const periodCustomers = customers.filter(c => getWithinPeriod(c.joinedDate, period));
    const hasMoney = periodCustomers.filter(c => (c.balance || 0) > 0);
    const noMoney = periodCustomers.filter(c => (c.balance || 0) <= 0);

    return {
      total: periodCustomers.length,
      hasMoney: hasMoney.length,
      noMoney: noMoney.length,
      hasMoneyPct: periodCustomers.length > 0 ? Math.round((hasMoney.length / periodCustomers.length) * 100) : 0,
      noMoneyPct: periodCustomers.length > 0 ? Math.round((noMoney.length / periodCustomers.length) * 100) : 0,
      customersList: periodCustomers
    };
  };

  const dailyStats = getPeriodDistribution('daily');
  const weeklyStats = getPeriodDistribution('weekly');
  const monthlyStats = getPeriodDistribution('monthly');
  const yearlyStats = getPeriodDistribution('yearly');

  // Overall counts (for reference)
  const totalHasMoney = customers.filter(c => (c.balance || 0) > 0).length;
  const totalNoMoney = customers.filter(c => (c.balance || 0) <= 0).length;

  const currentPeriodStats = 
    activeTab === 'daily' ? dailyStats :
    activeTab === 'weekly' ? weeklyStats :
    activeTab === 'monthly' ? monthlyStats : yearlyStats;

  // Filtered customer list for the interactive inspector
  const filteredCustomers = currentPeriodStats.customersList.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.accountNumber || '').includes(q) ||
      (c.phoneNumber || '').includes(q)
    );
  });

  return (
    <div className="bg-[#0b0c0b] border border-zinc-800 rounded-3xl p-6 flex flex-col gap-6 shadow-xl text-left font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-zinc-100 font-extrabold text-xl tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[#14cfb4]" />
            <span>Fund Distribution Insights</span>
          </h3>
          <p className="text-zinc-500 text-xs mt-1">
            Tracking customers with positive vs zero balances across timeframes
          </p>
        </div>
        
        {/* Overall Summary badge */}
        <div className="flex items-center gap-3 bg-zinc-900/80 px-4 py-2.5 rounded-2xl border border-zinc-800">
          <div className="flex flex-col">
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Total Members</span>
            <span className="text-white font-black text-sm">{customers.length}</span>
          </div>
          <div className="h-6 w-[1px] bg-zinc-800" />
          <div className="flex flex-col">
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Has Money</span>
            <span className="text-[#14cfb4] font-black text-sm">{totalHasMoney}</span>
          </div>
          <div className="h-6 w-[1px] bg-zinc-800" />
          <div className="flex flex-col">
            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">No Money</span>
            <span className="text-rose-400 font-black text-sm">{totalNoMoney}</span>
          </div>
        </div>
      </div>

      {/* Grid comparing periods side by side */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Daily card */}
        <div className="bg-zinc-900/30 border border-zinc-800/80 p-4 rounded-2xl flex flex-col gap-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              ☀️ Daily Focus
            </span>
            <span className="text-[10px] bg-zinc-800/60 text-zinc-300 px-2 py-0.5 rounded-full font-mono">
              n={dailyStats.total}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 mt-1">
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] text-zinc-500 font-medium">Has Money:</span>
              <span className="text-[#14cfb4] font-extrabold text-base">{dailyStats.hasMoney}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] text-zinc-500 font-medium">No Money:</span>
              <span className="text-rose-400 font-extrabold text-base">{dailyStats.noMoney}</span>
            </div>
          </div>
          <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden mt-1 flex">
            <div style={{ width: `${dailyStats.hasMoneyPct}%` }} className="bg-[#14cfb4] h-full" />
            <div style={{ width: `${dailyStats.noMoneyPct}%` }} className="bg-rose-500 h-full" />
          </div>
        </div>

        {/* Weekly card */}
        <div className="bg-zinc-900/30 border border-zinc-800/80 p-4 rounded-2xl flex flex-col gap-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#14cfb4]" />
              📅 Weekly Focus
            </span>
            <span className="text-[10px] bg-zinc-800/60 text-zinc-300 px-2 py-0.5 rounded-full font-mono">
              n={weeklyStats.total}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 mt-1">
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] text-zinc-500 font-medium">Has Money:</span>
              <span className="text-[#14cfb4] font-extrabold text-base">{weeklyStats.hasMoney}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] text-zinc-500 font-medium">No Money:</span>
              <span className="text-rose-400 font-extrabold text-base">{weeklyStats.noMoney}</span>
            </div>
          </div>
          <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden mt-1 flex">
            <div style={{ width: `${weeklyStats.hasMoneyPct}%` }} className="bg-[#14cfb4] h-full" />
            <div style={{ width: `${weeklyStats.noMoneyPct}%` }} className="bg-rose-500 h-full" />
          </div>
        </div>

        {/* Monthly card */}
        <div className="bg-zinc-900/30 border border-zinc-800/80 p-4 rounded-2xl flex flex-col gap-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              🗓️ Monthly Focus
            </span>
            <span className="text-[10px] bg-zinc-800/60 text-zinc-300 px-2 py-0.5 rounded-full font-mono">
              n={monthlyStats.total}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 mt-1">
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] text-zinc-500 font-medium">Has Money:</span>
              <span className="text-[#14cfb4] font-extrabold text-base">{monthlyStats.hasMoney}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] text-zinc-500 font-medium">No Money:</span>
              <span className="text-rose-400 font-extrabold text-base">{monthlyStats.noMoney}</span>
            </div>
          </div>
          <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden mt-1 flex">
            <div style={{ width: `${monthlyStats.hasMoneyPct}%` }} className="bg-[#14cfb4] h-full" />
            <div style={{ width: `${monthlyStats.noMoneyPct}%` }} className="bg-rose-500 h-full" />
          </div>
        </div>

        {/* Yearly card */}
        <div className="bg-zinc-900/30 border border-zinc-800/80 p-4 rounded-2xl flex flex-col gap-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              🏛️ Yearly Focus
            </span>
            <span className="text-[10px] bg-zinc-800/60 text-zinc-300 px-2 py-0.5 rounded-full font-mono">
              n={yearlyStats.total}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 mt-1">
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] text-zinc-500 font-medium">Has Money:</span>
              <span className="text-[#14cfb4] font-extrabold text-base">{yearlyStats.hasMoney}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] text-zinc-500 font-medium">No Money:</span>
              <span className="text-rose-400 font-extrabold text-base">{yearlyStats.noMoney}</span>
            </div>
          </div>
          <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden mt-1 flex">
            <div style={{ width: `${yearlyStats.hasMoneyPct}%` }} className="bg-[#14cfb4] h-full" />
            <div style={{ width: `${yearlyStats.noMoneyPct}%` }} className="bg-rose-500 h-full" />
          </div>
        </div>
      </div>

      {/* Interactive Detail Inspector Section */}
      <div className="bg-zinc-900/20 rounded-2xl border border-zinc-800/80 p-5 mt-2 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-zinc-950 p-1.2 rounded-xl border border-zinc-900 max-w-fit flex-wrap">
            {([
              { id: 'daily', label: 'Daily', icon: '📅' },
              { id: 'weekly', label: 'Weekly', icon: '📆' },
              { id: 'monthly', label: 'Monthly', icon: '📊' },
              { id: 'yearly', label: 'Yearly', icon: '📈' }
            ] as const).map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-3 py-1.5 text-[10.5px] font-black uppercase rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === id
                    ? 'bg-[#14cfb4]/10 text-[#14cfb4] border-[#14cfb4]/25 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-355 hover:bg-zinc-900/40 border-transparent'
                }`}
              >
                <span className="text-[11px]">{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Search bar inside inspector */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search member in list..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-1.5 pl-9 pr-4 text-xs text-white placeholder-zinc-550 focus:outline-none focus:border-[#14cfb4]/50"
            />
          </div>
        </div>

        {/* Dynamic customer table list for currently selected period */}
        <div className="overflow-x-auto">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-xs">
              No matching records for {activeTab} frame.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 font-bold uppercase text-[10px]">
                  <th className="pb-3 px-3">Member Name</th>
                  <th className="pb-3 px-3">Account Number</th>
                  <th className="pb-3 px-3 text-center">Ledger Balance</th>
                  <th className="pb-3 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {filteredCustomers.map((cust) => {
                  const hasFund = (cust.balance || 0) > 0;
                  return (
                    <tr key={cust.id} className="hover:bg-zinc-900/30 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-zinc-100">{cust.name}</span>
                          <span className="text-[10px] text-zinc-500">{cust.phoneNumber}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-zinc-400">
                        {cust.accountNumber || 'Pending'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`font-mono font-bold px-2 py-0.5 rounded-lg text-[11px] ${
                          hasFund 
                            ? 'bg-[#14cfb4]/10 text-[#14cfb4]' 
                            : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          ₦{cust.balance.toLocaleString('en-US')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {hasFund ? (
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                              <UserCheck className="w-2.5 h-2.5" /> Funded
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-500 bg-zinc-800/40 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                              <UserX className="w-2.5 h-2.5" /> Unfunded
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
