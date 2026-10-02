import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Headphones, MessageSquare, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { NewTicketModal } from '../components/support/NewTicketModal';
import { useSocket } from '../context/SocketContext';
import { SupportTicket, Store } from '../types';

export const SupportPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshKey } = useSocket();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [shops, setShops] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [priorityFilter, setPriorityFilter] = useState('All Priority');

  // Modal
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const [ticketsRes, shopsRes] = await Promise.all([
        api.getSupportTickets({
          search,
          status: statusFilter,
          priority: priorityFilter,
        }),
        api.getShops({ limit: 100 }),
      ]);
      if (ticketsRes.success) setTickets(ticketsRes.tickets);
      if (shopsRes.success) setShops(shopsRes.shops);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter, refreshKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTickets();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-6">
      {/* Header matching screenshot 7 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Support</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage support tickets and customer issues
          </p>
        </div>

        <button
          onClick={() => setNewTicketModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Ticket</span>
        </button>
      </div>

      {/* Filter Bar matching screenshot 7 */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="All Status">All Status</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="All Priority">All Priority</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Tickets Table matching screenshot 7 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-3.5">Subject</th>
                <th className="px-4 py-3.5">Shop</th>
                <th className="px-4 py-3.5">Owner</th>
                <th className="px-4 py-3.5">Priority</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Created</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading tickets...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No tickets found matching your filters.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => {
                  const dateStr = new Date(t.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: '2-digit',
                    year: 'numeric',
                  });

                  return (
                    <tr
                      key={t._id}
                      onClick={() => navigate(`/support/${t._id}`)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-slate-400" />
                          <span>{t.subject}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-medium text-slate-800">{t.storeName}</td>
                      <td className="px-4 py-4 text-slate-600">{t.ownerName}</td>
                      <td className="px-4 py-4">
                        <StatusBadge status={t.priority} size="sm" />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={t.status} size="sm" />
                      </td>
                      <td className="px-4 py-4 text-slate-500">{dateStr}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/support/${t._id}`);
                          }}
                          className="px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Ticket Modal */}
      <NewTicketModal
        isOpen={newTicketModalOpen}
        onClose={() => setNewTicketModalOpen(false)}
        shops={shops}
        onTicketCreated={fetchTickets}
      />
    </div>
  );
};
