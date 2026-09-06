import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Megaphone, 
  Send, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Users, 
  ShieldCheck,
  MessageSquare,
  AlertCircle,
  Loader2,
  Trash2,
  Check,
  X,
  History,
  FileText
} from 'lucide-react';
import { DashboardState, Announcement } from '../types';
import { format } from 'date-fns';

interface BroadcastTabProps {
  state: DashboardState;
  userRole: 'Manager' | 'Supervisor' | 'Collector' | 'Viewer';
  onDirectBroadcast: (message: string) => Promise<void>;
  onRequestBroadcast: (message: string, sender: { id: string; name: string; role: string }) => Promise<void>;
  onApproveBroadcast: (id: string, managerName: string) => Promise<void>;
  onDeclineBroadcast: (id: string) => Promise<void>;
}

export default function BroadcastTab({
  state,
  userRole,
  onDirectBroadcast,
  onRequestBroadcast,
  onApproveBroadcast,
  onDeclineBroadcast
}: BroadcastTabProps) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const isManager = userRole === 'Manager';

  const announcements = state.announcements || [];
  const pendingRequests = announcements.filter(a => a.status === 'pending');
  const broadcastHistory = announcements.filter(a => a.status !== 'pending');

  const totalRecipients = state.customers.length + state.staff.length;

  const handleSend = async () => {
    if (!message.trim()) return;
    setIsSending(true);
    try {
      if (isManager) {
        await onDirectBroadcast(message);
      } else {
        await onRequestBroadcast(message, {
          id: 'CURRENT_STAFF_ID', // In real app we'd get this from context
          name: state.settings.profileName || 'Staff Member',
          role: userRole
        });
      }
      setMessage('');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#0d0f0d] border border-zinc-900 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Users className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Total Recipients</p>
            <p className="text-2xl font-black text-zinc-100">{totalRecipients.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-[#0d0f0d] border border-zinc-900 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
            <Clock className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Pending Requests</p>
            <p className="text-2xl font-black text-zinc-100">{pendingRequests.length}</p>
          </div>
        </div>

        <div className="bg-[#0d0f0d] border border-zinc-900 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <Megaphone className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Broadcasts Sent</p>
            <p className="text-2xl font-black text-zinc-100">{announcements.filter(a => a.status === 'sent').length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose Section */}
        <div className="bg-[#0d0f0d] border border-zinc-900 rounded-2xl overflow-hidden flex flex-col h-full">
          {/* ... compose content ... */}
          <div className="px-6 py-4 border-b border-zinc-900 bg-[#090b09] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-zinc-100">Compose Broadcast</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${isManager ? 'bg-emerald-950 text-emerald-400 border-emerald-900' : 'bg-amber-950 text-amber-400 border-amber-900'}`}>
                {isManager ? 'DIRECT DISPATCH' : 'REQUEST APPROVAL'}
              </span>
            </div>
          </div>
          <div className="p-6 flex-1 flex flex-col gap-4">
            <div className="flex-1 min-h-[150px] relative group">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your announcement message here..."
                className="w-full h-full bg-black/40 border border-zinc-850 rounded-xl p-4 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 transition-all resize-none font-sans"
              />
              <div className="absolute bottom-3 right-3 text-[10px] text-zinc-600 font-mono">
                {message.length} characters
              </div>
            </div>
            
            <div className="p-4 bg-zinc-950/50 rounded-xl border border-zinc-900 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                {isManager 
                  ? "As a Manager, your message will be dispatched immediately to all registered customers and staff members via SMS." 
                  : "Your message will be sent to the Manager for review. Once approved, it will be dispatched to all customers and staff."}
              </p>
            </div>

            <button
              onClick={handleSend}
              disabled={isSending || !message.trim()}
              className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
                !message.trim() || isSending
                  ? 'bg-zinc-850 text-zinc-600 cursor-not-allowed border border-zinc-800'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/10'
              }`}
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isManager ? <Send className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                  {isManager ? 'Dispatch Broadcast Now' : 'Submit Request for Approval'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Approvals/History Section */}
        <div className="flex flex-col gap-6">
          {/* Pending Approvals (Manager Only) */}
          {isManager && (
            <div className="bg-[#0d0f0d] border border-zinc-900 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-6 py-4 border-b border-zinc-900 bg-[#090b09] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-zinc-100">Pending Requests</h3>
                </div>
                <span className="bg-amber-950 text-amber-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  {pendingRequests.length} Needs Review
                </span>
              </div>
              <div className="p-4 max-h-[350px] overflow-y-auto no-scrollbar">
                {pendingRequests.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3 text-zinc-600">
                    <CheckCircle2 className="w-10 h-10 opacity-20" />
                    <p className="text-xs font-semibold">No pending broadcast requests</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingRequests.map((req) => (
                      <motion.div
                        key={req.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 flex flex-col gap-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-[10px] font-bold text-zinc-400 border border-zinc-800">
                              {(req.senderName || 'Unknown').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-black text-zinc-100">{req.senderName || 'Unknown Sender'}</p>
                              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-tighter">{req.senderRole || 'Staff'}</p>
                            </div>
                          </div>
                          <p className="text-[10px] text-zinc-600 font-mono">
                            {req.timestamp ? format(new Date(req.timestamp), 'h:mm a') : 'N/A'}
                          </p>
                        </div>

                        <div className="p-3 bg-black/40 rounded-lg border border-zinc-900 text-xs text-zinc-400 italic">
                          "{req.message}"
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => onApproveBroadcast(req.id, state.settings.profileName || 'Manager')}
                            className="flex-1 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-500 border border-emerald-500/20 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve & Send
                          </button>
                          <button
                            onClick={() => onDeclineBroadcast(req.id)}
                            className="py-2 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                          >
                            <X className="w-3.5 h-3.5" /> Decline
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {!isManager && (
            <div className="bg-[#0d0f0d] border border-zinc-900 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 h-full">
              <ShieldCheck className="w-12 h-12 text-zinc-800" />
              <div>
                <h4 className="text-zinc-400 font-bold text-sm">Supervisor Privileges Required</h4>
                <p className="text-xs text-zinc-600 mt-1 max-w-[200px]">Only managers can directly dispatch broadcasts or review incoming requests.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
