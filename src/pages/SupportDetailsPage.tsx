import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, MessageSquare, User, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { SupportTicket } from '../types';

export const SupportDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { admin } = useAuth();
  const { refreshKey } = useSocket();

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchTicket = async () => {
    if (!id) return;
    try {
      const res = await api.getSupportTicketDetails(id);
      if (res.success) {
        setTicket(res.ticket);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [id, refreshKey]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !replyMessage.trim()) return;

    setSending(true);
    try {
      const res = await api.replySupportTicket(id, replyMessage.trim());
      if (res.success) {
        setReplyMessage('');
        fetchTicket();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      const res = await api.updateSupportTicket(id, { status: newStatus });
      if (res.success) {
        fetchTicket();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || !ticket) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button matching screenshot 7b */}
      <div>
        <button
          onClick={() => navigate('/support')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Tickets</span>
        </button>
      </div>

      {/* Ticket Header card matching screenshot 7b */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900">{ticket.subject}</h2>
            <StatusBadge status={ticket.priority} size="sm" />
            <StatusBadge status={ticket.status} size="sm" />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {ticket.storeName} • {ticket.ownerName}
          </p>
        </div>

        {/* Status selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Status:</span>
          <select
            value={ticket.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl"
          >
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Messages Thread matching screenshot 7b */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-6">
        <div className="space-y-4">
          {ticket.replies.map((reply) => {
            const isAdmin = reply.senderRole === 'admin';
            const dateStr = new Date(reply.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={reply.id}
                className={`p-4 rounded-2xl border ${
                  isAdmin
                    ? 'bg-blue-50/50 border-blue-100/80 ml-4 sm:ml-12'
                    : 'bg-slate-50/80 border-slate-100 mr-4 sm:mr-12'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isAdmin
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-300 text-slate-700'
                      }`}
                    >
                      {isAdmin ? 'A' : 'O'}
                    </div>
                    <span className="text-xs font-bold text-slate-900">
                      {reply.senderName} {isAdmin ? '(Admin)' : '(Owner)'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">{dateStr}</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {reply.message}
                </p>
              </div>
            );
          })}
        </div>

        {/* Reply Box matching screenshot 7b */}
        <form onSubmit={handleSendReply} className="pt-4 border-t border-slate-100 space-y-3">
          <textarea
            rows={3}
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            placeholder="Write a reply..."
            className="w-full px-4 py-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all"
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={sending || !replyMessage.trim()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sending ? 'Sending...' : 'Send Reply'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
