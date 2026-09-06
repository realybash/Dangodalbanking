import React, { useState } from 'react';
import { 
  MessageSquare, 
  Search, 
  Smartphone, 
  History, 
  Filter, 
  Clock, 
  CheckCircle2, 
  ShieldCheck,
  AlertCircle,
  FileText,
  Copy,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { AlertLog, DashboardState } from '../types';

interface ActivityLogsTabProps {
  state: DashboardState;
}

export const ActivityLogsTab: React.FC<ActivityLogsTabProps> = ({ state }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'sms' | 'whatsapp'>('All');
  const [selectedLog, setSelectedLog] = useState<AlertLog | null>(null);

  const alerts = state.alerts || [];

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = 
      alert.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.customerPhone.includes(searchQuery) ||
      alert.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'All' || alert.type === filterType;
    
    return matchesSearch && matchesType;
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Audit Log View</h2>
          </div>
          <p className="text-sm text-zinc-500 font-medium">Real-time status monitor for every SMS and WhatsApp message dispatched via gateway.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Total Dispatches</span>
              <span className="text-sm font-black text-white font-mono">{alerts.length}</span>
            </div>
            <div className="w-px h-8 bg-zinc-800"></div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Success Rate</span>
              <span className={`text-sm font-black font-mono ${
                alerts.length > 0 
                  ? (alerts.filter(a => a.status === 'delivered' || a.status === 'sent').length / alerts.length * 100) > 90 ? 'text-emerald-500' : 'text-rose-500'
                  : 'text-zinc-500'
              }`}>
                {alerts.length > 0 
                  ? `${Math.round((alerts.filter(a => a.status === 'delivered' || a.status === 'sent').length / alerts.length) * 100)}%`
                  : '-%'
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-8 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-600" />
          <input 
            type="text"
            placeholder="Search logs by customer, phone, or message content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-4 bg-[#0a0c0a] text-sm font-bold text-white border border-zinc-900 rounded-2xl focus:outline-none focus:border-amber-500 transition-all placeholder-zinc-700"
          />
        </div>
        <div className="md:col-span-4 flex gap-2">
          {(['All', 'sms', 'whatsapp'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`flex-1 h-12 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                filterType === type 
                ? 'bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/10' 
                : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:text-white'
              }`}
            >
              {type === 'All' ? 'Everything' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Logs List */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          {filteredAlerts.length === 0 ? (
            <div className="p-12 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-[32px] text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-zinc-900/50 flex items-center justify-center text-zinc-700">
                <FileText className="w-8 h-8" />
              </div>
              <p className="text-zinc-600 font-black uppercase text-xs tracking-widest">No matching logs in database</p>
            </div>
          ) : (
            filteredAlerts.map((log) => (
              <div 
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className={`p-5 rounded-[24px] border transition-all cursor-pointer group flex items-start gap-4 ${
                  selectedLog?.id === log.id 
                  ? 'bg-amber-500/5 border-amber-500 shadow-xl' 
                  : 'bg-[#0a0c0a] border-zinc-900 hover:border-zinc-800'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-colors ${
                  log.status === 'failed'
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                  : log.type === 'sms' 
                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' 
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                }`}>
                  {log.type === 'sms' ? <Smartphone className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-black text-sm text-white truncate group-hover:text-amber-500 transition-colors">
                        {log.customerName}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter shrink-0 ${
                        log.status === 'delivered' || log.status === 'sent' ? 'bg-emerald-500/10 text-emerald-500' :
                        log.status === 'failed' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded-md">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{log.customerPhone}</span>
                    <span className="text-zinc-800">•</span>
                    <span className="text-[10px] font-black text-amber-500/60 uppercase tracking-widest">{log.type} GATEWAY</span>
                  </div>
                  <p className="text-xs text-zinc-500 line-clamp-1 mt-1 font-medium italic">
                    "{log.message}"
                  </p>
                </div>

                <ChevronRight className={`w-5 h-5 mt-3 transition-transform ${selectedLog?.id === log.id ? 'text-amber-500 translate-x-1' : 'text-zinc-800'}`} />
              </div>
            ))
          )}
        </div>

        {/* Inspector Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 flex flex-col gap-6">
            {!selectedLog ? (
              <div className="p-10 bg-zinc-900/20 border border-zinc-900 rounded-[32px] text-center">
                <div className="w-14 h-14 rounded-full bg-zinc-900/50 flex items-center justify-center text-zinc-700 mx-auto mb-4">
                  <Search className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-white uppercase tracking-widest mb-2">Log Inspector</h4>
                <p className="text-xs text-zinc-600 font-medium">Select a transmission from the list to view full payload and metadata.</p>
              </div>
            ) : (
              <div className="bg-[#0a0c0a] border border-zinc-900 rounded-[32px] overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in duration-300">
                <div className={`h-1.5 w-full ${selectedLog.type === 'sms' ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
                <div className="p-8 flex flex-col gap-8">
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">DELIVERY RECEIPT</span>
                    <h3 className="text-xl font-black text-white leading-tight">Dispatch Metadata</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-zinc-900/30 rounded-2xl border border-zinc-900 flex flex-col gap-1">
                      <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">GATEWAY</span>
                      <span className="text-[10px] font-black text-white uppercase">{selectedLog.type} TRANSIT</span>
                    </div>
                    <div className="p-4 bg-zinc-900/30 rounded-2xl border border-zinc-900 flex flex-col gap-1">
                      <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">STATUS</span>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          selectedLog.status === 'delivered' || selectedLog.status === 'sent' ? 'bg-emerald-500' : 
                          selectedLog.status === 'failed' ? 'bg-rose-500' : 'bg-amber-500'
                        } ${selectedLog.status === 'pending' ? 'animate-pulse' : ''}`}></div>
                        <span className={`text-[10px] font-black uppercase ${
                          selectedLog.status === 'delivered' || selectedLog.status === 'sent' ? 'text-emerald-500' : 
                          selectedLog.status === 'failed' ? 'text-rose-500' : 'text-amber-500'
                        }`}>
                          {selectedLog.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedLog.errorCode && (
                    <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-3 h-3 text-rose-500" />
                        <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest">ERROR CODE</span>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-rose-200 uppercase">{selectedLog.errorCode}</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">PAYLOAD MESSAGE</span>
                      <div className="p-5 bg-zinc-900/50 border border-zinc-900 rounded-2xl text-xs text-zinc-300 font-medium leading-relaxed italic relative group">
                        {selectedLog.message}
                        <button 
                          onClick={() => copyToClipboard(selectedLog.message)}
                          className="absolute right-3 top-3 p-2 bg-zinc-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-zinc-800 text-zinc-400 hover:text-white"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-4 border-t border-zinc-900">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-black text-zinc-600 uppercase">RECIPIENT</span>
                        <span className="font-black text-white">{selectedLog.customerName}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-black text-zinc-600 uppercase">PHONE CONTACTED</span>
                        <span className="font-mono text-amber-500">{selectedLog.customerPhone}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-black text-zinc-600 uppercase">DISPATCH TIME</span>
                        <span className="font-black text-zinc-300">{new Date(selectedLog.timestamp).toLocaleString()}</span>
                      </div>
                      {selectedLog.deliveryTimestamp && (
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-black text-zinc-600 uppercase">DELIVERY TIME</span>
                          <span className="font-black text-emerald-500">{new Date(selectedLog.deliveryTimestamp).toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-black text-zinc-600 uppercase">AUDIT ID</span>
                        <span className="font-mono text-zinc-500">{selectedLog.id}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => copyToClipboard(JSON.stringify(selectedLog, null, 2))}
                    className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 font-black text-[9px] uppercase tracking-[0.2em] rounded-2xl transition-all flex items-center justify-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Copy Raw Audit Data
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
