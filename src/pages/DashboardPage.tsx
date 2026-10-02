import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  CheckCircle,
  CreditCard,
  Clock,
  ArrowUpRight,
  ChevronDown,
  ShoppingBag,
} from 'lucide-react';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { RevenueChart } from '../components/dashboard/RevenueChart';
import { SubscriptionDonut } from '../components/dashboard/SubscriptionDonut';
import { PaymentDetailsModal } from '../components/payments/PaymentDetailsModal';
import { useSocket } from '../context/SocketContext';
import { Payment } from '../types';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshKey } = useSocket();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const fetchDashboard = async () => {
    try {
      const res = await api.getDashboard();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [refreshKey]);

  const handleReviewPayment = (payment: any) => {
    setSelectedPayment(payment);
    setPaymentModalOpen(true);
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = data?.stats || {
    totalShops: 0,
    activeShops: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
  };

  const statCards = [
    {
      title: 'Total Shops',
      value: stats.totalShops.toLocaleString(),
      growth: '8.4%',
      icon: Store,
      iconBg: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Active Shops',
      value: stats.activeShops.toLocaleString(),
      growth: '6.2%',
      icon: CheckCircle,
      iconBg: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Monthly Revenue',
      value: `৳${stats.monthlyRevenue.toLocaleString()}`,
      growth: '12.9%',
      icon: CreditCard,
      iconBg: 'bg-indigo-50 text-indigo-600',
    },
    {
      title: 'Pending Payments',
      value: stats.pendingPayments.toLocaleString(),
      badgeText: 'Needs review',
      badgeColor: 'text-amber-700 bg-amber-50 border-amber-200/60',
      icon: Clock,
      iconBg: 'bg-amber-50 text-amber-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">Monitor your ShopPOS platform</p>
        </div>

        {/* Date Filter selector matching screenshot */}
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs">
            <span>Last 30 days</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* 4 Stat Cards matching screenshot 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{card.title}</span>
                <div className={`p-2 rounded-xl ${card.iconBg}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <span className="text-2xl font-bold tracking-tight text-slate-900">
                  {card.value}
                </span>

                {card.growth ? (
                  <span className="inline-flex items-center text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/60">
                    <ArrowUpRight className="w-3 h-3 mr-0.5" />
                    {card.growth}
                  </span>
                ) : (
                  <span
                    className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border ${card.badgeColor}`}
                  >
                    ↑ {card.badgeText}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid: Revenue Overview & Subscription Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart
            amount={stats.monthlyRevenue}
            growth={12.5}
            data={data?.revenueChart}
          />
        </div>
        <div className="lg:col-span-1">
          <SubscriptionDonut
            total={data?.subscriptionBreakdown?.total || 1284}
            active={data?.subscriptionBreakdown?.active || 1176}
            expiring={data?.subscriptionBreakdown?.expiring || 42}
            expired={data?.subscriptionBreakdown?.expired || 66}
          />
        </div>
      </div>

      {/* Bottom 2 Tables Row: Recent Shops & Pending Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Shops Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Recent Shops</h3>
            <button
              onClick={() => navigate('/shops')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View all
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3">Shop</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {(data?.recentShops || []).map((shop: any) => (
                  <tr
                    key={shop._id}
                    onClick={() => navigate(`/shops/${shop._id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-3.5 font-semibold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[11px]">
                          {shop.name.charAt(0)}
                        </div>
                        <span>{shop.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{shop.ownerName}</td>
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-slate-700">{shop.planName}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge status={shop.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Payments Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Pending Payments</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Action required
              </span>
            </div>
            <button
              onClick={() => navigate('/payments')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View all
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3">Shop</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {(data?.pendingPayments || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                      No pending payments to review
                    </td>
                  </tr>
                ) : (
                  (data?.pendingPayments || []).map((payment: any) => (
                    <tr key={payment._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-semibold text-slate-900">
                        {payment.storeName}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        ৳{payment.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                          {payment.method}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          onClick={() => handleReviewPayment(payment)}
                          className="px-3 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Review Payment Modal */}
      <PaymentDetailsModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        payment={selectedPayment}
        onPaymentProcessed={fetchDashboard}
      />
    </div>
  );
};
