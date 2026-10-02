import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';

interface ChangePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  shopName: string;
  currentPlanId?: string;
  onPlanChanged: () => void;
}

export const ChangePlanModal: React.FC<ChangePlanModalProps> = ({
  isOpen,
  onClose,
  shopId,
  shopName,
  currentPlanId = 'plan_pro',
  onPlanChanged,
}) => {
  const [selectedPlan, setSelectedPlan] = useState(currentPlanId);
  const [durationDays, setDurationDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.updateShopSubscription(shopId, {
        planId: selectedPlan,
        days: durationDays,
      });
      if (res.success) {
        onPlanChanged();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update subscription');
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    { id: 'plan_basic', name: 'Basic', price: '৳499', features: '2 Staff, 500 Products' },
    { id: 'plan_pro', name: 'Pro', price: '৳999', features: '10 Staff, 5,000 Products' },
    { id: 'plan_enterprise', name: 'Enterprise', price: '৳1,999', features: 'Unlimited Staff & Products' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Change Subscription for ${shopName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs bg-red-50 text-red-600 rounded-xl border border-red-200">
            {error}
          </div>
        )}

        <div className="space-y-2.5">
          <label className="block text-xs font-semibold text-slate-700">Select Plan</label>
          <div className="space-y-2">
            {plans.map((p) => (
              <label
                key={p.id}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedPlan === p.id
                    ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-600'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="plan"
                    checked={selectedPlan === p.id}
                    onChange={() => setSelectedPlan(p.id)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900">{p.name} Plan</p>
                    <p className="text-[11px] text-slate-500">{p.features}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-600">{p.price}/mo</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Subscription Duration
          </label>
          <select
            value={durationDays}
            onChange={(e) => setDurationDays(Number(e.target.value))}
            className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden"
          >
            <option value={30}>30 Days (1 Month)</option>
            <option value={90}>90 Days (3 Months)</option>
            <option value={180}>180 Days (6 Months)</option>
            <option value={365}>365 Days (1 Year)</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-xs transition-colors"
          >
            {loading ? 'Saving...' : 'Apply Subscription'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
