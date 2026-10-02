import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

export const ToastNotification: React.FC = () => {
  const { toast, dismissToast } = useSocket();

  if (!toast) return null;

  const isSuccess = toast.type === 'payment' && toast.title.includes('Approved');
  const isDanger = toast.type === 'shop' && toast.title.includes('Suspended');

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-bounce-in shadow-xl">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-lg flex items-start gap-3.5">
        <div
          className={`shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
            isSuccess
              ? 'bg-emerald-100 text-emerald-600'
              : isDanger
              ? 'bg-rose-100 text-rose-600'
              : 'bg-blue-100 text-blue-600'
          }`}
        >
          {isSuccess ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : isDanger ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <Info className="w-5 h-5" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{toast.message}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">{toast.timestamp}</span>
        </div>

        <button
          onClick={dismissToast}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
