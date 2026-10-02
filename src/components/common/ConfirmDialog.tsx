import React from 'react';
import { Modal } from './Modal';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger' | 'warning' | 'success';
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  loading = false,
}) => {
  const iconConfig = {
    primary: {
      bg: 'bg-blue-50 text-blue-600',
      icon: <Info className="w-8 h-8" />,
      btn: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    danger: {
      bg: 'bg-red-50 text-red-600',
      icon: <AlertTriangle className="w-8 h-8" />,
      btn: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
      bg: 'bg-amber-50 text-amber-600',
      icon: <AlertCircle className="w-8 h-8" />,
      btn: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    success: {
      bg: 'bg-emerald-50 text-emerald-600',
      icon: <CheckCircle className="w-8 h-8" />,
      btn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
  }[variant];

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="sm">
      <div className="text-center pt-2 pb-4">
        {/* Circle Icon matching screenshot */}
        <div
          className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full ${iconConfig.bg} mb-5`}
        >
          {iconConfig.icon}
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed px-4">{description}</p>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`w-full px-4 py-2.5 text-sm font-semibold rounded-xl shadow-xs transition-colors ${iconConfig.btn} flex items-center justify-center`}
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
