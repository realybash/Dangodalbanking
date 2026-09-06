import React from 'react';
import { Transaction } from '../types';

interface CustomerTransactionStatsProps {
  transactions: Transaction[];
}

export const CustomerTransactionStats: React.FC<CustomerTransactionStatsProps> = ({ transactions }) => {
  const now = new Date();
  
  const getTotals = (txs: Transaction[]) => {
    return txs.reduce((acc, tx) => {
      if (tx.type === 'deposit') acc.deposit += tx.amount;
      if (tx.type === 'withdrawal') acc.withdrawal += tx.amount;
      return acc;
    }, { deposit: 0, withdrawal: 0 });
  };

  const isDaily = (date: Date) => date.toDateString() === now.toDateString();
  const isWeekly = (date: Date) => {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    return date >= startOfWeek;
  };
  const isMonthly = (date: Date) => date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  const isYearly = (date: Date) => date.getFullYear() === now.getFullYear();

  const daily = getTotals(transactions.filter(t => isDaily(new Date(t.timestamp))));
  const weekly = getTotals(transactions.filter(t => isWeekly(new Date(t.timestamp))));
  const monthly = getTotals(transactions.filter(t => isMonthly(new Date(t.timestamp))));
  const yearly = getTotals(transactions.filter(t => isYearly(new Date(t.timestamp))));

  const data = [
    { label: 'Daily', ...daily },
    { label: 'Weekly', ...weekly },
    { label: 'Monthly', ...monthly },
    { label: 'Yearly', ...yearly },
  ];

  return (
    <div className="bg-[#0b0c0b] border border-zinc-800 rounded-3xl p-5 flex flex-col gap-4 mt-4 shadow-lg">
      <h3 className="text-zinc-100 font-semibold text-sm">Transaction Summary</h3>
      <div className="grid grid-cols-2 gap-3">
        {data.map((d) => (
          <div key={d.label} className="bg-zinc-900/40 p-3 rounded-2xl border border-zinc-800">
            <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-wider">{d.label}</p>
            <div className="flex justify-between items-center mt-2">
              <span className="text-[#14cfb4] font-bold text-xs">Dep: {d.deposit.toLocaleString()}</span>
              <span className="text-rose-400 font-bold text-xs">Wit: {d.withdrawal.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
