import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Check, Edit2, Layers, Calendar, ChevronRight, Eye } from 'lucide-react';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { useSocket } from '../context/SocketContext';
import { SubscriptionPlan, Subscription } from '../types';

export const SubscriptionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { refreshKey } = useSocket();

  const [activeTab, setActiveTab] = useState<'plans' | 'active' | 'history'>('plans');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit / Create plan modal
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState(999);
  const [planFeatures, setPlanFeatures] = useState('');
  const [planMaxUsers, setPlanMaxUsers] = useState(10);
  const [planMaxProducts, setPlanMaxProducts] = useState(5000);
  const [planStatus, setPlanStatus] = useState<'active' | 'inactive'>('active');
  const [modalLoading, setModalLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [plansRes, subsRes] = await Promise.all([
        api.getPlans(),
        api.getSubscriptions(),
      ]);
      if (plansRes.success) setPlans(plansRes.plans);
      if (subsRes.success) setSubscriptions(subsRes.subscriptions);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setPlanName('');
    setPlanPrice(499);
    setPlanFeatures('3 Staff\n1,000 Products\nPOS');
    setPlanMaxUsers(3);
    setPlanMaxProducts(1000);
    setPlanStatus('active');
    setPlanModalOpen(true);
  };

  const handleOpenEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setPlanName(plan.name);
    setPlanPrice(plan.price);
    setPlanFeatures(plan.features.join('\n'));
    setPlanMaxUsers(plan.maxUsers);
    setPlanMaxProducts(plan.maxProducts);
    setPlanStatus(plan.status);
    setPlanModalOpen(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    const featuresArr = planFeatures.split('\n').map((f) => f.trim()).filter(Boolean);

    try {
      if (editingPlan) {
        await api.updatePlan(editingPlan._id, {
          name: planName,
          price: planPrice,
          features: featuresArr,
          maxUsers: planMaxUsers,
          maxProducts: planMaxProducts,
          status: planStatus,
        });
      } else {
        await api.createPlan({
          name: planName,
          price: planPrice,
          billingCycle: 'monthly',
          features: featuresArr,
          maxUsers: planMaxUsers,
          maxProducts: planMaxProducts,
          status: planStatus,
        });
      }
      setPlanModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header matching screenshot 4 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subscriptions</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage plans and active subscriptions</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Plan</span>
        </button>
      </div>

      {/* Tabs matching screenshot 4 */}
      <div className="border-b border-slate-200 flex items-center gap-8 text-xs font-semibold">
        {(
          [
            { key: 'plans', label: 'Plans' },
            { key: 'active', label: `Active Subscriptions (${subscriptions.filter((s) => s.status === 'active').length})` },
            { key: 'history', label: 'History' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 relative transition-colors ${
              activeTab === tab.key
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Plans View (Cards + Recent Subscriptions Table) matching screenshot 4 */}
      {activeTab === 'plans' && (
        <div className="space-y-8">
          {/* 3 Plan Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((p) => {
              const isPro = p.name.toLowerCase() === 'pro';
              return (
                <div
                  key={p._id}
                  className={`bg-white rounded-2xl border p-6 shadow-xs flex flex-col justify-between transition-all ${
                    isPro
                      ? 'border-blue-500/60 ring-1 ring-blue-500/30'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                      <StatusBadge status={p.status} size="sm" />
                    </div>

                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-slate-900">৳{p.price}</span>
                      <span className="text-xs text-slate-400">/ month</span>
                    </div>

                    <ul className="mt-6 space-y-3 text-xs text-slate-600">
                      {p.features.map((feature, fIdx) => (
                        <li key={fIdx} className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className={`w-full py-2 px-3 text-xs font-semibold rounded-xl transition-colors ${
                        isPro
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200'
                      }`}
                    >
                      Edit Plan
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Subscriptions Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Recent Subscriptions</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-3.5">Shop</th>
                    <th className="px-4 py-3.5">Plan</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Expires</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subscriptions.slice(0, 6).map((sub) => (
                    <tr key={sub._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{sub.storeName}</td>
                      <td className="px-4 py-4 font-semibold text-slate-700">{sub.planName}</td>
                      <td className="px-4 py-4">
                        <StatusBadge status={sub.status} size="sm" />
                      </td>
                      <td className="px-4 py-4 text-slate-500">
                        {new Date(sub.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(`/shops/${sub.storeId}`)}
                          className="px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Active Subscriptions Tab */}
      {activeTab === 'active' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Active Store Subscriptions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Shop</th>
                  <th className="px-4 py-3.5">Owner</th>
                  <th className="px-4 py-3.5">Plan</th>
                  <th className="px-4 py-3.5">Billing</th>
                  <th className="px-4 py-3.5">Started</th>
                  <th className="px-4 py-3.5">Expires</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions
                  .filter((s) => s.status === 'active')
                  .map((sub) => (
                    <tr key={sub._id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-4 font-bold text-slate-900">{sub.storeName}</td>
                      <td className="px-4 py-4 text-slate-600">{sub.ownerName}</td>
                      <td className="px-4 py-4 font-semibold text-blue-600">{sub.planName}</td>
                      <td className="px-4 py-4 text-slate-600 font-mono">৳{sub.price}/mo</td>
                      <td className="px-4 py-4 text-slate-500">
                        {new Date(sub.startDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 font-medium text-slate-700">
                        {new Date(sub.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(`/shops/${sub.storeId}`)}
                          className="px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">All Subscription Logs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Shop</th>
                  <th className="px-4 py-3.5">Plan</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Period</th>
                  <th className="px-6 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((sub) => (
                  <tr key={sub._id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-4 font-bold text-slate-900">{sub.storeName}</td>
                    <td className="px-4 py-4">{sub.planName}</td>
                    <td className="px-4 py-4">
                      <StatusBadge status={sub.status} size="sm" />
                    </td>
                    <td className="px-4 py-4 text-slate-500">
                      {new Date(sub.startDate).toLocaleDateString()} –{' '}
                      {new Date(sub.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/shops/${sub.storeId}`)}
                        className="text-xs text-blue-600 font-semibold hover:underline"
                      >
                        Shop Info
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit / Create Plan Modal */}
      <Modal
        isOpen={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        title={editingPlan ? `Edit ${editingPlan.name} Plan` : 'Create New Plan'}
      >
        <form onSubmit={handleSavePlan} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Plan Name</label>
            <input
              type="text"
              required
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              placeholder="e.g. Starter"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Monthly Price (৳)
            </label>
            <input
              type="number"
              required
              value={planPrice}
              onChange={(e) => setPlanPrice(Number(e.target.value))}
              placeholder="999"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Features (one per line)
            </label>
            <textarea
              rows={4}
              value={planFeatures}
              onChange={(e) => setPlanFeatures(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-hidden resize-none font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Max Users</label>
              <input
                type="number"
                value={planMaxUsers}
                onChange={(e) => setPlanMaxUsers(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Max Products
              </label>
              <input
                type="number"
                value={planMaxProducts}
                onChange={(e) => setPlanMaxProducts(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
            <select
              value={planStatus}
              onChange={(e) => setPlanStatus(e.target.value as any)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setPlanModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={modalLoading}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
            >
              {modalLoading ? 'Saving...' : 'Save Plan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
