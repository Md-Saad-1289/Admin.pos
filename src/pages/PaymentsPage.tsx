import React, { useState, useEffect } from 'react';
import { Search, Download, CreditCard, ChevronLeft, ChevronRight, Eye, Plus } from 'lucide-react';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { PaymentDetailsModal } from '../components/payments/PaymentDetailsModal';
import { RecordPaymentModal } from '../components/payments/RecordPaymentModal';
import { useSocket } from '../context/SocketContext';
import { Payment, Store } from '../types';

export const PaymentsPage: React.FC = () => {
  const { refreshKey } = useSocket();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [shops, setShops] = useState<Store[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [methodFilter, setMethodFilter] = useState('All Method');

  // Modal
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [recordModalOpen, setRecordModalOpen] = useState(false);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const [payRes, shopsRes] = await Promise.all([
        api.getPayments({
          search,
          status: statusFilter,
          method: methodFilter,
          page,
          limit: 10,
        }),
        api.getShops({ limit: 100 }),
      ]);
      if (payRes.success) {
        setPayments(payRes.payments);
        setTotal(payRes.total);
        setTotalPages(payRes.totalPages);
      }
      if (shopsRes.success) {
        setShops(shopsRes.shops);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [page, statusFilter, methodFilter, refreshKey]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchPayments();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleOpenPayment = (payment: Payment) => {
    setSelectedPayment(payment);
    setDetailsModalOpen(true);
  };

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Shop,Transaction ID,Amount,Method,Status,Date']
        .concat(
          payments.map(
            (p) =>
              `"${p.storeName}","${p.transactionId}","${p.amount}","${p.method}","${p.status}","${p.createdAt}"`
          )
        )
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `shoppos_payments_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header matching screenshot 5 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payments</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage payment approvals and transactions
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => setRecordModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Payment</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Filter Bar matching screenshot 5 */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transaction..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="All Status">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="All Method">All Method</option>
            <option value="bKash">bKash</option>
            <option value="Nagad">Nagad</option>
            <option value="Card">Card</option>
            <option value="Bank">Bank</option>
          </select>
        </div>
      </div>

      {/* Table matching screenshot 5 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-3.5">Shop</th>
                <th className="px-4 py-3.5">Transaction ID</th>
                <th className="px-4 py-3.5">Amount</th>
                <th className="px-4 py-3.5">Method</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const dateStr = new Date(p.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: '2-digit',
                    year: 'numeric',
                  });

                  return (
                    <tr
                      key={p._id}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      onClick={() => handleOpenPayment(p)}
                    >
                      <td className="px-6 py-4 font-bold text-slate-900">{p.storeName}</td>
                      <td className="px-4 py-4 font-mono font-semibold text-slate-700">
                        {p.transactionId}
                      </td>
                      <td className="px-4 py-4 font-bold text-slate-900">
                        ৳{p.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-700">
                          <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                          {p.method}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={p.status} size="sm" />
                      </td>
                      <td className="px-4 py-4 text-slate-500">{dateStr}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPayment(p);
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

        {/* Pagination matching screenshot 5 */}
        <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((pNum) => (
              <button
                key={pNum}
                onClick={() => setPage(pNum)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                  page === pNum
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {pNum}
              </button>
            ))}

            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Showing {payments.length > 0 ? (page - 1) * 10 + 1 : 0}-{Math.min(page * 10, total)} of{' '}
            {total.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Payment Details Modal (Approval / Rejection Workflow) */}
      <PaymentDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        payment={selectedPayment}
        onPaymentProcessed={fetchPayments}
      />

      {/* Record Manual Payment Modal */}
      <RecordPaymentModal
        isOpen={recordModalOpen}
        onClose={() => setRecordModalOpen(false)}
        shops={shops}
        onPaymentRecorded={fetchPayments}
      />
    </div>
  );
};
