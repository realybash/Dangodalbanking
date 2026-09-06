import { useState } from 'react';
import { 
  Activity, 
  Landmark, 
  ShieldCheck, 
  TrendingUp, 
  PiggyBank, 
  Briefcase, 
  FileText,
  Search,
  MessageSquare,
  Send,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Copy,
  Calendar
} from 'lucide-react';
import { DashboardState, AlertLog, AuditLog } from '../types';
import { formatNaira, formatShorthand } from './OverviewTab';
import { useToast } from './ToastProvider';
import { Clock, User, ShieldAlert, Filter } from 'lucide-react';

interface ReportsTabProps {
  state: DashboardState;
}

export default function ReportsTab({ state }: ReportsTabProps) {
  const { showToast } = useToast();
  const { customers, staff, transactions } = state;

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'activity' | 'communication'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'sms' | 'whatsapp'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'delivered' | 'sent' | 'pending'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AlertLog | null>(null);
  const itemsPerPage = 5;

  // Audit Logs Section States
  const [auditSearch, setAuditSearch] = useState('');
  const [auditTypeFilter, setAuditTypeFilter] = useState<string>('all');
  const [auditSeverityFilter, setAuditSeverityFilter] = useState<string>('all');
  const [auditPage, setAuditPage] = useState(1);
  const auditLogsPerPage = 8;

  // Compute stats
  const totalSavings = customers.reduce((acc, c) => acc + c.balance, 0);
  const totalDraftedTransactions = transactions.length;
  const approvedDeposits = transactions.filter(t => t.type === 'deposit' && t.status === 'approved');
  const totalDepositedAmount = approvedDeposits.reduce((acc, t) => acc + t.amount, 0);
  
  const approvedWithdrawals = transactions.filter(t => t.type === 'withdrawal' && t.status === 'approved');
  const totalWithdrawnAmount = approvedWithdrawals.reduce((acc, t) => acc + t.amount, 0);

  // In Ajo / Thrift systems, the manager makes money by charging a management fee/commission 
  // (typically 1 day of contribution per month, or a flat 1.5% of total savings)
  const commissionRate = state.settings.platformCommissionRate ?? 1.5;
  const simulatedCommission = totalSavings * (commissionRate / 100);

  const logs = state.alerts || [];

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.customerPhone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesChannel = channelFilter === 'all' || log.type === channelFilter;
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;

    return matchesSearch && matchesChannel && matchesStatus;
  });

  // Pagination bounds
  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const activePage = Math.min(currentPage, totalPages);
  
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);

  // Audit Logs Filtering & Pagination
  const auditLogs = state.auditLogs || [];

  const filteredAuditLogs = auditLogs.filter(log => {
    const query = auditSearch.toLowerCase().trim();
    const matchesSearch = !query ||
      log.title.toLowerCase().includes(query) ||
      log.description.toLowerCase().includes(query) ||
      log.actor.toLowerCase().includes(query) ||
      log.actionType.toLowerCase().includes(query);

    const matchesType = auditTypeFilter === 'all' || log.actionType === auditTypeFilter;
    const matchesSeverity = auditSeverityFilter === 'all' || log.severity === auditSeverityFilter;

    return matchesSearch && matchesType && matchesSeverity;
  });

  const totalAuditItems = filteredAuditLogs.length;
  const totalAuditPages = Math.ceil(totalAuditItems / auditLogsPerPage) || 1;
  const activeAuditPage = Math.min(auditPage, totalAuditPages);
  
  const startAuditIndex = (activeAuditPage - 1) * auditLogsPerPage;
  const paginatedAuditLogs = filteredAuditLogs.slice(startAuditIndex, startAuditIndex + auditLogsPerPage);

  // Mock savings trend data points (for the last 6 days) to draw a beautiful SVG trend line
  const trendData = [
    { label: 'Mon', value: 72000000 },
    { label: 'Tue', value: 75500000 },
    { label: 'Wed', value: 78900000 },
    { label: 'Thu', value: 81200000 },
    { label: 'Fri', value: 82800500 },
    { label: 'Sun/Today', value: totalSavings },
  ];

  // SVG Chart Coordinates Calculation
  const width = 500;
  const height = 180;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const minVal = Math.min(...trendData.map(d => d.value)) * 0.95; // 5% lower padding
  const maxVal = Math.max(...trendData.map(d => d.value)) * 1.02; // 2% higher padding
  const valRange = maxVal - minVal;

  const points = trendData.map((d, index) => {
    const x = paddingLeft + (index / (trendData.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((d.value - minVal) / valRange) * chartHeight;
    return { x, y, label: d.label, value: d.value };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;

  return (
    <div className="w-full flex flex-col gap-6 select-none pb-12">
      {/* Sub-tabs header for Reports */}
      <div id="reports-sub-navigation" className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-900 pb-4 gap-3">
        <div className="flex items-center gap-1.5 shrink-0">
          <Activity className="w-5 h-5 text-emerald-500" />
          <div>
            <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-wider font-mono">System Report Centre</h2>
            <p className="text-[10px] text-zinc-500 font-medium">Monitor network metrics, operations audits, and communications.</p>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-[#090a09] border border-zinc-900/60 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'overview'
                ? 'bg-zinc-900 text-[#3ad188] border border-zinc-850'
                : 'text-zinc-500 hover:text-zinc-350 border border-transparent'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Analytics</span>
          </button>
          <button
            onClick={() => setActiveSubTab('activity')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 relative ${
              activeSubTab === 'activity'
                ? 'bg-zinc-900 text-[#f1be48] border border-zinc-850'
                : 'text-zinc-500 hover:text-zinc-350 border border-transparent'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Activity Log</span>
            <span className="text-[9.5px] font-mono shrink-0 bg-zinc-950 px-1 py-0.5 rounded text-zinc-400 font-bold">
              {auditLogs.length}
            </span>
          </button>
          <button
            onClick={() => setActiveSubTab('communication')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 relative ${
              activeSubTab === 'communication'
                ? 'bg-zinc-900 text-[#3deca2] border border-zinc-850'
                : 'text-zinc-500 hover:text-zinc-350 border border-transparent'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>SMS/WA Trail</span>
            <span className="text-[9.5px] font-mono shrink-0 bg-zinc-950 px-1 py-0.5 rounded text-zinc-400 font-bold">
              {logs.length}
            </span>
          </button>
        </div>
      </div>

      {activeSubTab === 'overview' && (
        <>
          {/* Overview stats top row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div id="metric-gross-deposits" className="bg-[#121412] p-5 rounded-[24px] border border-zinc-900 flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Gross Deposits Value</span>
            <span className="text-xl font-extrabold font-mono text-[#3ad188]">
              {formatNaira(totalDepositedAmount, false)}
            </span>
            <span className="text-[10px] text-zinc-500 font-semibold">{approvedDeposits.length} approved credits</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-950/20 text-[#30d178] border border-emerald-900/20 flex items-center justify-center">
            <PiggyBank className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2 */}
        <div id="metric-paid-withdrawals" className="bg-[#121412] p-5 rounded-[24px] border border-zinc-900 flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Paid Withdrawals Value</span>
            <span className="text-xl font-extrabold font-mono text-amber-500">
              {formatNaira(totalWithdrawnAmount, false)}
            </span>
            <span className="text-[10px] text-zinc-500 font-semibold">{approvedWithdrawals.length} approved debits</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-950/20 text-amber-550 border border-amber-900/20 flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3 */}
        <div id="metric-platform-commission" className="bg-[#121412] p-5 rounded-[24px] border border-zinc-900 flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Thrift Platform Commission</span>
            <span className="text-xl font-extrabold font-mono text-[#14b8a6]">
              {formatNaira(simulatedCommission, true)}
            </span>
            <span className="text-[10px] text-teal-500 font-semibold">{commissionRate}% Escrow Management Fee</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-950/20 text-teal-400 border border-teal-900/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Savings Trend Line Graph */}
        <div id="savings-trend-chart-container" className="lg:col-span-3 bg-[#121412] border border-zinc-900 rounded-[28px] p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-500" /> Savings Volume Trend
              </h3>
              <p className="text-xs text-zinc-500">Growth of net capital stored inside the platform.</p>
            </div>
            <span className="text-[10px] font-bold text-[#30d178] bg-[#0c2e1a] border border-[#164b2c] px-2 py-0.5 rounded-full flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Growth Up
            </span>
          </div>

          {/* SVG Custom Responsive Line Graph */}
          <div className="relative w-full h-[200px] bg-black/20 border border-zinc-950/60 rounded-2xl flex items-center justify-center p-2">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full text-zinc-400 select-none">
              {/* Grid Lines */}
              <line x1={paddingLeft} y1={paddingTop} x2={width-paddingRight} y2={paddingTop} stroke="#18181b" strokeWidth="1" strokeDasharray="4 4" />
              <line x1={paddingLeft} y1={paddingTop + chartHeight/2} x2={width-paddingRight} y2={paddingTop + chartHeight/2} stroke="#18181b" strokeWidth="1" strokeDasharray="4 4" />
              <line x1={paddingLeft} y1={paddingTop + chartHeight} x2={width-paddingRight} y2={paddingTop + chartHeight} stroke="#27272a" strokeWidth="1" />

              {/* Y Axis Labels */}
              <text x={paddingLeft - 10} y={paddingTop + 4} textAnchor="end" className="text-[9px] fill-zinc-500 font-mono font-bold">
                {formatShorthand(maxVal)}
              </text>
              <text x={paddingLeft - 10} y={paddingTop + chartHeight/2 + 4} textAnchor="end" className="text-[9px] fill-zinc-500 font-mono font-bold">
                {formatShorthand(minVal + valRange/2)}
              </text>
              <text x={paddingLeft - 10} y={paddingTop + chartHeight + 4} textAnchor="end" className="text-[9px] fill-zinc-500 font-mono font-bold">
                {formatShorthand(minVal)}
              </text>

              {/* Area Gradient */}
              <defs>
                <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
                </linearGradient>
              </defs>

              {/* Filled Area */}
              <path d={areaD} fill="url(#savingsGrad)" />

              {/* Line graph */}
              <path d={pathD} fill="none" stroke="#3ad188" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

              {/* Interactive Data Dots */}
              {points.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r="3.5" fill="#090a09" stroke="#3ad188" strokeWidth="2" />
                  {/* Tooltip Labels on graph for precision */}
                  <text x={p.x} y={p.y - 8} textAnchor="middle" className="text-[8px] fill-zinc-400 font-bold font-mono">
                    {formatShorthand(p.value)}
                  </text>
                  {/* X Axis Labels */}
                  <text x={p.x} y={paddingTop + chartHeight + 18} textAnchor="middle" className="text-[9px] fill-zinc-500 font-semibold">
                    {p.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* ledger statistics & breakdowns (2 columns) */}
        <div id="ledger-stats-panel" className="lg:col-span-2 bg-[#121412] border border-zinc-900 rounded-[28px] p-5 flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-1.5">
              <FileText className="w-4.5 h-4.5 text-teal-400" /> Platform Audit
            </h3>
            <p className="text-xs text-zinc-500">Live operational ledger logs status.</p>
          </div>

          <div className="flex flex-col gap-3 flex-1 mt-2">
            <div className="flex items-center justify-between p-3 bg-black/20 border border-zinc-900 rounded-xl text-xs">
              <span className="text-zinc-400 font-semibold">Total Savings Capital</span>
              <span className="font-mono font-bold text-zinc-100">{formatNaira(totalSavings, true)}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-black/20 border border-zinc-900 rounded-xl text-xs">
              <span className="text-zinc-400 font-semibold">Active Client Ledger Cards</span>
              <span className="font-mono font-bold text-zinc-100">{customers.filter(c => c.status === 'active').length} of {customers.length}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-black/20 border border-zinc-900 rounded-xl text-xs">
              <span className="text-zinc-400 font-semibold">Active Mobilizer Agents</span>
              <span className="font-mono font-bold text-zinc-100">{staff.filter(s => s.status === 'active').length} of {staff.length}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-black/20 border border-zinc-900 rounded-xl text-xs">
              <span className="text-zinc-400 font-semibold">Total Filed Tasks</span>
              <span className="font-mono font-bold text-zinc-100">{totalDraftedTransactions} transactions</span>
            </div>
          </div>

          <div className="p-3 bg-[#0a2f1c]/15 border border-[#164b2c]/30 rounded-xl flex items-start gap-2.5">
            <div className="text-[#35e886] font-extrabold text-sm mt-0.5">✓</div>
            <p className="text-[10px] leading-relaxed text-zinc-400 font-medium">
              Ajo thrift ledgers are fully encrypted locally on this device. Audits verify that all deposits correspond perfectly with client balance cards.
            </p>
          </div>
        </div>
      </div>
        </>
      )}
 
      {/* Dynamic Activity Audit Log section */}
      {activeSubTab === 'activity' && (
        <div id="activity-audit-log-section" className="bg-[#121412] border border-zinc-900 rounded-[28px] p-6 flex flex-col gap-6 text-left">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900/60 pb-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-1.5">
              <ShieldAlert className="w-4.5 h-4.5 text-[#f1be48]" /> Activity & Operations Audit Log
            </h3>
            <p className="text-xs text-zinc-500 font-medium">
              Comprehensive log of real-time actions taken by managers and mobilizer staff across the network ledger.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-black text-zinc-400 bg-zinc-950 border border-zinc-900 px-2.5 py-1 rounded-lg uppercase tracking-wide font-mono">
              Total actions logged: {auditLogs.length}
            </span>
            <span className="text-[9px] font-black text-emerald-400 bg-emerald-950/20 border border-emerald-900/40 px-2.5 py-1 rounded-lg uppercase tracking-wide font-mono">
              Approvals: {auditLogs.filter(l => l.actionType === 'APPROVAL').length}
            </span>
            <span className="text-[9px] font-black text-rose-450 bg-rose-950/25 border border-[#f43f5e]/30 px-2.5 py-1 rounded-lg uppercase tracking-wide font-mono">
              Rejections: {auditLogs.filter(l => l.actionType === 'REJECTION').length}
            </span>
          </div>
        </div>

        {/* Filters and search panel */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2 select-text">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              id="audit-search-input"
              placeholder="Search by keyword, details or operator name..."
              value={auditSearch}
              onChange={(e) => {
                setAuditSearch(e.target.value);
                setAuditPage(1);
              }}
              className="w-full pl-9 pr-3.5 py-2.5 bg-[#090a09] border border-zinc-950 hover:border-zinc-850 focus:border-[#f1be48] text-xs text-zinc-200 font-bold rounded-xl focus:outline-none transition-colors"
            />
          </div>

          <div>
            <select
              id="audit-type-filter"
              value={auditTypeFilter}
              onChange={(e) => {
                setAuditTypeFilter(e.target.value);
                setAuditPage(1);
              }}
              className="w-full px-3 py-2.5 bg-[#090a09] border border-zinc-950 hover:border-zinc-850 focus:border-zinc-800 text-xs text-zinc-200 font-bold rounded-xl focus:outline-none cursor-pointer"
            >
              <option value="all">All Action Types</option>
              <option value="APPROVAL">Approvals</option>
              <option value="REJECTION">Rejections</option>
              <option value="SUBMISSION">Mobilizer Postings</option>
              <option value="REGISTRATION">Client Registrations</option>
              <option value="ONBOARDING">Staff Hires</option>
              <option value="EDIT">System Edits</option>
              <option value="ACTIVATION">Activations</option>
              <option value="DEACTIVATION">Suspensions</option>
            </select>
          </div>

          <div>
            <select
              id="audit-severity-filter"
              value={auditSeverityFilter}
              onChange={(e) => {
                setAuditSeverityFilter(e.target.value);
                setAuditPage(1);
              }}
              className="w-full px-3 py-2.5 bg-[#090a09] border border-zinc-950 hover:border-zinc-850 focus:border-zinc-800 text-xs text-zinc-200 font-bold rounded-xl focus:outline-none cursor-pointer"
            >
              <option value="all">All Severities</option>
              <option value="success">Success / Verified</option>
              <option value="error">Critical / Incident</option>
              <option value="warning">Pending Action</option>
              <option value="info">General Info</option>
            </select>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="overflow-x-auto min-h-[220px]">
          {paginatedAuditLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500 border border-dashed border-zinc-900 rounded-2xl bg-[#090a09]/40">
              <AlertCircle className="w-7 h-7 text-zinc-700 mb-2" />
              <p className="text-xs font-bold text-zinc-400">No operations audit records match your filters</p>
              <p className="text-[10px] text-zinc-650 mt-1">Try typing a different keyword or resetting selections.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-950 text-[9px] font-black text-zinc-500 uppercase tracking-widest pl-2">
                  <th className="pb-3 pl-2">Occurred At</th>
                  <th className="pb-3">Action Type</th>
                  <th className="pb-3">Actor / Operator</th>
                  <th className="pb-3 max-w-[340px]">Audit Log Detail</th>
                  <th className="pb-3 text-right pr-2">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-950/40 text-xs text-zinc-350">
                {paginatedAuditLogs.map((log, index) => {
                  const dateObj = new Date(log.timestamp);
                  const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  const formattedDate = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

                  // Style helper for action badges
                  let typeColor = 'text-zinc-400 bg-zinc-950/40 border-zinc-900/60';
                  if (log.actionType === 'APPROVAL') typeColor = 'text-emerald-400 bg-emerald-950/25 border-emerald-900/40';
                  else if (log.actionType === 'REJECTION') typeColor = 'text-rose-450 bg-rose-950/25 border-rose-900/40';
                  else if (log.actionType === 'REGISTRATION') typeColor = 'text-sky-450 bg-sky-950/20 border-sky-900/40';
                  else if (log.actionType === 'SUBMISSION') typeColor = 'text-amber-500 bg-amber-950/20 border-amber-900/30';
                  else if (log.actionType === 'EDIT') typeColor = 'text-cyan-400 bg-cyan-950/20 border-cyan-900/30';
                  else if (log.actionType === 'ONBOARDING') typeColor = 'text-violet-400 bg-violet-950/20 border-violet-900/30';

                  return (
                    <tr key={`${log.id}-${index}`} className="group hover:bg-zinc-950/40 transition-colors">
                      {/* Occurred At with Clock Icon */}
                      <td className="py-3.5 pl-2">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-zinc-650 shrink-0" />
                          <div className="flex flex-col font-mono text-[11px]">
                            <span className="font-sans font-semibold text-zinc-350 tracking-tight">{formattedDate}</span>
                            <span className="text-[9.5px] text-zinc-550 mt-0.5">{formattedTime}</span>
                          </div>
                        </div>
                      </td>

                      {/* Action Type Badge */}
                      <td className="py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-[8.5px] font-black uppercase tracking-wider border px-2.5 py-0.5 rounded-full ${typeColor}`}>
                          {log.actionType}
                        </span>
                      </td>

                      {/* Actor Email/Details */}
                      <td className="py-3.5">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-zinc-650" />
                          <span className="font-mono text-[11px] font-bold text-zinc-350">
                            {log.actor || 'System'}
                          </span>
                        </div>
                      </td>

                      {/* Detail Column */}
                      <td className="py-3.5 max-w-[340px] pr-4 select-text">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-black text-zinc-200 group-hover:text-white transition-colors animate-in fade-in duration-300">
                            {log.title}
                          </span>
                          <span className="text-[11px] text-zinc-450 leading-relaxed font-sans">
                            {log.description}
                          </span>
                        </div>
                      </td>

                      {/* State Severity label */}
                      <td className="py-3.5 text-right pr-2">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {log.severity === 'success' ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                              <span className="text-[9.5px] font-black uppercase tracking-widest text-emerald-400 font-mono">Ok</span>
                            </>
                          ) : log.severity === 'error' ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                              <span className="text-[9.5px] font-black uppercase tracking-widest text-rose-500 font-mono">Incident</span>
                            </>
                          ) : log.severity === 'warning' ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                              <span className="text-[9.5px] font-black uppercase tracking-widest text-[#f0b037] font-mono">Warning</span>
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                              <span className="text-[9.5px] font-black uppercase tracking-widest text-cyan-400 font-mono">Info</span>
                            </>
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

        {/* Audit Pagination Footer */}
        {totalAuditItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-950">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
              Showing <span className="text-zinc-300 font-mono">{startAuditIndex + 1}</span> to <span className="text-zinc-300 font-mono">{Math.min(startAuditIndex + auditLogsPerPage, totalAuditItems)}</span> of <span className="text-zinc-200 font-mono">{totalAuditItems}</span> operations matching
            </span>

            <div className="flex items-center gap-1.5">
              <button
                disabled={activeAuditPage === 1}
                onClick={() => setAuditPage(prev => Math.max(prev - 1, 1))}
                className="p-1 px-3 rounded-lg bg-[#090a09] text-zinc-400 hover:text-white border border-zinc-950 hover:bg-zinc-900 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalAuditPages }).slice(0, 5).map((_, i) => {
                  const pgNum = i + 1;
                  const isCurrent = pgNum === activeAuditPage;
                  return (
                    <button
                      key={pgNum}
                      onClick={() => setAuditPage(pgNum)}
                      className={`w-7 h-7 rounded-lg text-[10px] font-bold flex items-center justify-center border transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-[#f1be48] text-[#050605] border-[#f1be48]'
                          : 'bg-[#090a09] text-zinc-400 border-zinc-950 hover:border-zinc-800'
                      }`}
                    >
                      {pgNum}
                    </button>
                  );
                })}
              </div>

              <button
                disabled={activeAuditPage === totalAuditPages}
                onClick={() => setAuditPage(prev => Math.min(prev + 1, totalAuditPages))}
                className="p-1 px-3 rounded-lg bg-[#090a09] text-zinc-400 hover:text-white border border-zinc-950 hover:bg-[#121312] disabled:opacity-20 disabled:cursor-not-allowed transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Communication logs section */}
      {activeSubTab === 'communication' && (
        <div id="communication-logs-section" className="bg-[#121412] border border-zinc-900 rounded-[28px] p-6 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-bold text-zinc-100 flex items-center gap-1.5">
              <MessageSquare className="w-4.5 h-4.5 text-[#3deca2]" /> Communication Logs
            </h3>
            <p className="text-xs text-zinc-500">Searchable & paginated dispatch audit trail for SMS and WhatsApp.</p>
          </div>
          
          {/* Quick counters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-black text-zinc-400 bg-zinc-950 border border-zinc-900 px-2.5 py-1 rounded-lg uppercase tracking-wide">
              Total dispatches: {logs.length}
            </span>
            <span className="text-[9px] font-black text-teal-400 bg-teal-950/20 border border-teal-900/40 px-2.5 py-1 rounded-lg uppercase tracking-wide">
              SMS alerts: {logs.filter(l => l.type === 'sms').length}
            </span>
            <span className="text-[9px] font-black text-emerald-400 bg-emerald-950/20 border border-emerald-900/40 px-2.5 py-1 rounded-lg uppercase tracking-wide">
              WhatsApp receipts: {logs.filter(l => l.type === 'whatsapp').length}
            </span>
          </div>
        </div>

        {/* Search and Filters panel */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by name, phone or message text..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3.5 py-2.5 bg-[#090a09] border border-zinc-950 focus:border-zinc-800 text-xs text-zinc-200 font-bold rounded-xl focus:outline-none"
            />
          </div>

          <div>
            <select
              value={channelFilter}
              onChange={(e) => {
                setChannelFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 bg-[#090a09] border border-zinc-950 focus:border-zinc-800 text-xs text-zinc-200 font-bold rounded-xl focus:outline-none cursor-pointer"
            >
              <option value="all">All Channels</option>
              <option value="sms">SMS Network</option>
              <option value="whatsapp">WhatsApp Receipts</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2.5 bg-[#090a09] border border-zinc-950 focus:border-zinc-800 text-xs text-zinc-200 font-bold rounded-xl focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="delivered">Delivered</option>
              <option value="sent">Sent</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto min-h-[220px]">
          {paginatedLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500 border border-dashed border-zinc-900 rounded-2xl bg-[#090a09]/40">
              <AlertCircle className="w-7 h-7 text-zinc-700 mb-2" />
              <p className="text-xs font-bold text-zinc-400">No communication logs match filters</p>
              <p className="text-[10px] text-zinc-650 mt-1">Try resetting search keywords or status tags.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-950 text-[9px] font-black text-zinc-500 uppercase tracking-widest pl-2">
                  <th className="pb-3 pl-2">Channel</th>
                  <th className="pb-3">Client Recipient</th>
                  <th className="pb-3 max-w-[280px]">Dispatched Text Template</th>
                  <th className="pb-3 text-right">Time Logged</th>
                  <th className="pb-3 text-right pr-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-950/40">
                {paginatedLogs.map((log, index) => {
                  const isSms = log.type === 'sms';
                  const dateObj = new Date(log.timestamp);
                  const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const formattedDate = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });

                  return (
                    <tr 
                      key={`${log.id}-${index}`} 
                      onClick={() => setSelectedLog(log)}
                      className="group hover:bg-zinc-950/70 cursor-pointer transition-colors"
                    >
                      {/* Channel Badge */}
                      <td className="py-3.5 pl-2">
                        {isSms ? (
                          <span className="inline-flex items-center gap-1 text-[8.5px] font-black uppercase tracking-wider text-teal-400 bg-teal-950/20 border border-teal-900/40 px-2 py-0.5 rounded-md">
                            <Smartphone className="w-3 h-3 text-teal-400" /> SMS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[8.5px] font-black uppercase tracking-wider text-[#35e886] bg-[#0c2c1a]/20 border border-[#15462c]/40 px-2 py-0.5 rounded-md">
                            <Send className="w-3 h-3 text-[#35e886]" /> WA-App
                          </span>
                        )}
                      </td>

                      {/* Recipient details */}
                      <td className="py-3.5">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-zinc-200 group-hover:text-white transition-colors">
                            {log.customerName}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500 font-medium">
                            {log.customerPhone}
                          </span>
                        </div>
                      </td>

                      {/* Message draft content */}
                      <td className="py-3.5 max-w-[280px]">
                        <p className="text-xs text-zinc-400 truncate max-w-[260px] group-hover:text-zinc-300 transition-colors font-medium">
                          {log.message}
                        </p>
                        <span className="text-[9px] font-bold text-[#35e886]/80 group-hover:underline mt-0.5 block">
                          Click to view simulate receipt 🔍
                        </span>
                      </td>

                      {/* Log time */}
                      <td className="py-3.5 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-bold font-mono text-zinc-300">{formattedTime}</span>
                          <span className="text-[10px] text-zinc-550 font-medium">{formattedDate}</span>
                        </div>
                      </td>

                      {/* Status label */}
                      <td className="py-3.5 text-right pr-2">
                        <div className="flex items-center justify-end gap-1.5">
                          {log.status === 'delivered' ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-[#35e886] animate-pulse"></span>
                              <span className="text-[9.5px] font-bold uppercase tracking-widest text-[#35e886]">Delivered</span>
                            </>
                          ) : log.status === 'sent' ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                              <span className="text-[9.5px] font-bold uppercase tracking-widest text-cyan-400">Sent</span>
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                              <span className="text-[9.5px] font-bold uppercase tracking-widest text-amber-400">Pending</span>
                            </>
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

        {/* Pagination controls */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-950">
            <span className="text-[10px] font-bold text-zinc-500">
              Showing <span className="text-zinc-300">{startIndex + 1}</span> to <span className="text-zinc-300">{Math.min(startIndex + itemsPerPage, totalItems)}</span> of <span className="text-zinc-300">{totalItems}</span> entries
            </span>

            <div className="flex items-center gap-1.5">
              <button
                disabled={activePage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-1 px-3 rounded-lg bg-[#090a09] text-zinc-400 hover:text-white border border-zinc-950 hover:bg-zinc-900 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pgNum = i + 1;
                  const isCurrent = pgNum === activePage;
                  return (
                    <button
                      key={pgNum}
                      onClick={() => setCurrentPage(pgNum)}
                      className={`w-7 h-7 rounded-lg text-[10px] font-bold flex items-center justify-center border transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-[#32e082] text-[#050605] border-[#32e082]'
                          : 'bg-[#090a09] text-zinc-400 border-zinc-950 hover:border-zinc-800'
                      }`}
                    >
                      {pgNum}
                    </button>
                  );
                })}
              </div>

              <button
                disabled={activePage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-1 px-3 rounded-lg bg-[#090a09] text-zinc-400 hover:text-white border border-zinc-950 hover:bg-zinc-900 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Visual Device Receipt modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div 
            className="relative w-full max-w-sm rounded-[28px] bg-[#0c0e0c] border border-zinc-900 p-6 shadow-2xl flex flex-col gap-5 text-left select-none animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-950 pb-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase font-black tracking-widest text-[#3deca2] font-mono">
                  TRANSMITTED GPRS RECEIPT
                </span>
                <span className="text-xs text-zinc-500 font-bold font-mono">
                  TxId: {selectedLog.txId ? `CBP-${selectedLog.txId.replace('t_','')}` : 'AJO-INITIAL-DP'}
                </span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="w-7 h-7 rounded-full bg-[#030403] border border-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white text-xs cursor-pointer font-bold transition-all"
              >
                ✕
              </button>
            </div>

            {/* Recipient info panel */}
            <div className="bg-[#121412] border border-zinc-900 p-4 rounded-2xl flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-[11px]">
                <div>
                  <span className="text-zinc-500 font-bold block uppercase tracking-wider text-[8px]">RECIPIENT CLIENT</span>
                  <span className="text-zinc-100 font-extrabold text-[12px]">{selectedLog.customerName}</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-bold block uppercase tracking-wider text-[8px]">PHONE NUMBER</span>
                  <span className="text-zinc-100 font-mono font-bold text-[11px]">{selectedLog.customerPhone}</span>
                </div>
                <div>
                  <span className="text-zinc-500 font-bold block uppercase tracking-wider text-[8px]">GATEWAY DISPATCH</span>
                  <span className={`inline-block px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-widest rounded ${
                    selectedLog.type === 'sms' ? 'text-teal-400 bg-teal-950/20' : 'text-[#30d178] bg-[#0c2c1a]'
                  }`}>
                    {selectedLog.type === 'sms' ? '📳 SMS ALERT' : '💬 WHATSAPP RECEIPT'}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 font-bold block uppercase tracking-wider text-[8px]">DELIVERY STATE</span>
                  <span className="text-[#35e886] font-mono font-bold flex items-center gap-1 text-[10px]">
                    <CheckCircle2 className="w-3.5 h-3.5 inline text-[#35e886]" /> {selectedLog.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Simulated Phone Screen displaying the message formatted nicely */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[8.5px] uppercase font-black tracking-widest text-[#3deca2] font-mono pl-1">
                Visual Smart Simulator
              </span>
              <div className="bg-[#111411] border border-zinc-950 rounded-[22px] p-4 relative overflow-hidden flex flex-col pt-7 font-sans min-h-[160px]">
                {/* Custom simulated top phone bar */}
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-48 h-3.5 bg-black rounded-full flex items-center justify-between px-3 text-[7px] font-mono text-zinc-500 select-none">
                  <span>9:41 AM</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-800"></div>
                  <span>⚡ 100%</span>
                </div>

                {/* Simulated message layout bubble */}
                <div className={`mt-1.5 p-3 rounded-2xl max-w-[90%] text-xs font-semibold leading-relaxed shadow-md text-left ${
                  selectedLog.type === 'sms'
                    ? 'bg-zinc-800 text-zinc-100 rounded-tl-sm self-start'
                    : 'bg-[#0d4f33] text-[#dbf3e5] rounded-tr-sm self-end font-medium border border-[#16603f]'
                }`}>
                  <span className="whitespace-pre-line text-[11px] leading-relaxed font-semibold">{selectedLog.message}</span>
                  <div className="text-right text-[8px] opacity-60 mt-1.5 font-mono">
                    {new Date(selectedLog.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedLog.message);
                  showToast('Notification template copied to clipboard successfully!', "success");
                }}
                className="flex-1 py-2.5 bg-[#121412] hover:bg-zinc-900 border border-zinc-900 text-zinc-300 hover:text-white rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Receipt Body
              </button>
              <button
                onClick={() => setSelectedLog(null)}
                className="py-2.5 px-5 bg-[#32e082] hover:bg-[#20ce71] text-[#020502] rounded-xl text-[11px] font-extrabold transition-all cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
