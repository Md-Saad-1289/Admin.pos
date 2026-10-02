import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { StatusBadge } from '../common/StatusBadge';
import { Payment } from '../../types';
import { api } from '../../services/api';
import { Store, CreditCard, ShieldCheck } from 'lucide-react';

interface PaymentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  onPaymentProcessed: () => void;
}

export const PaymentDetailsModal: React.FC<PaymentDetailsModalProps> = ({
  isOpen,
  onClose,
  payment,
  onPaymentProcessed,
}) => {
  const [showConfirmApprove, setShowConfirmApprove] = useState(false);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState('Transaction verification failed');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!payment) return null;

  const handleApprove = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.approvePayment(payment._id);
      if (res.success) {
        setShowConfirmApprove(false);
        onPaymentProcessed();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to approve payment');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.rejectPayment(payment._id, rejectReason);
      if (res.success) {
        setShowRejectReason(false);
        onPaymentProcessed();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reject payment');
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = new Date(payment.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <>
      <Modal isOpen={isOpen && !showConfirmApprove} onClose={onClose} title="Payment Details" maxWidth="md">
        <div className="space-y-6">
          {error && (
            <div className="p-3 text-xs bg-red-50 text-red-600 rounded-xl border border-red-200">
              {error}
            </div>
          )}

          {/* Shop Card Header matching screenshot */}
          <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{payment.storeName || 'Green Mart'}</h4>
                <p className="text-xs text-slate-500">{payment.planName || 'Pro Plan'}</p>
              </div>
            </div>
            <StatusBadge status={payment.status} />
          </div>

          {/* Payment Attributes Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50/60 rounded-xl border border-slate-100">
              <p className="text-slate-400 font-medium mb-1">Amount</p>
              <p className="text-lg font-bold text-slate-900">৳{payment.amount.toLocaleString()}</p>
            </div>

            <div className="p-3.5 bg-slate-50/60 rounded-xl border border-slate-100">
              <p className="text-slate-400 font-medium mb-1">Payment Method</p>
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>{payment.method}</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50/60 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
              <p className="text-slate-400 font-medium mb-1">Transaction ID</p>
              <p className="font-mono font-semibold text-slate-800 text-xs">{payment.transactionId}</p>
            </div>

            <div className="p-3.5 bg-slate-50/60 rounded-xl border border-slate-100 col-span-2 sm:col-span-1">
              <p className="text-slate-400 font-medium mb-1">Submitted</p>
              <p className="font-medium text-slate-700 text-xs">{formattedDate}</p>
            </div>
          </div>

          {/* Reject Reason input if activated */}
          {showRejectReason && (
            <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-xl space-y-2">
              <label className="block text-xs font-semibold text-red-800">
                Reason for rejection:
              </label>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-red-300 rounded-lg text-slate-800 outline-hidden focus:ring-1 focus:ring-red-500"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowRejectReason(false)}
                  className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleReject}
                  className="px-3 py-1 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          )}

          {/* Action buttons matching screenshot */}
          {payment.status === 'pending' && !showRejectReason && (
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRejectReason(true)}
                className="px-5 py-2.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmApprove(true)}
                className="flex-1 px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                Approve Payment
              </button>
            </div>
          )}

          {payment.status !== 'pending' && (
            <div className="pt-2 text-center text-xs text-slate-500 italic">
              This payment has already been {payment.status}.
            </div>
          )}
        </div>
      </Modal>

      {/* Confirmation Dialog matching screenshot 6 */}
      <ConfirmDialog
        isOpen={showConfirmApprove}
        onClose={() => setShowConfirmApprove(false)}
        onConfirm={handleApprove}
        title="Approve Payment?"
        description="This will activate the shop's subscription and update the plan status."
        confirmText="Approve Payment"
        cancelText="Cancel"
        variant="primary"
        loading={loading}
      />
    </>
  );
};
