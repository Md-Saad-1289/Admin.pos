import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const s = (status || '').toLowerCase();

  let styles = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  if (s === 'active' || s === 'approved' || s === 'resolved') {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
    dotColor = 'bg-emerald-500';
  } else if (s === 'suspended' || s === 'rejected') {
    styles = 'bg-rose-50 text-rose-700 border-rose-200/60';
    dotColor = 'bg-rose-500';
  } else if (s === 'pending' || s === 'expiring') {
    styles = 'bg-amber-50 text-amber-700 border-amber-200/60';
    dotColor = 'bg-amber-500';
  } else if (s === 'expired' || s === 'inactive') {
    styles = 'bg-slate-100 text-slate-600 border-slate-200';
    dotColor = 'bg-slate-400';
  } else if (s === 'open') {
    styles = 'bg-blue-50 text-blue-700 border-blue-200/60';
    dotColor = 'bg-blue-500';
  } else if (s === 'in progress') {
    styles = 'bg-sky-50 text-sky-700 border-sky-200/60';
    dotColor = 'bg-sky-500';
  } else if (s === 'high') {
    styles = 'bg-red-50 text-red-700 border-red-200/60';
    dotColor = 'bg-red-500';
  } else if (s === 'medium') {
    styles = 'bg-amber-50 text-amber-700 border-amber-200/60';
    dotColor = 'bg-amber-500';
  } else if (s === 'low') {
    styles = 'bg-slate-100 text-slate-700 border-slate-200';
    dotColor = 'bg-slate-400';
  }

  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${styles} ${padding}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      <span>{label}</span>
    </span>
  );
};
