import React from 'react';

interface SubscriptionDonutProps {
  total: number;
  active: number;
  expiring: number;
  expired: number;
}

export const SubscriptionDonut: React.FC<SubscriptionDonutProps> = ({
  total = 1284,
  active = 1176,
  expiring = 42,
  expired = 66,
}) => {
  // SVG Donut calculation
  const radius = 64;
  const strokeWidth = 18;
  const circumference = 2 * Math.PI * radius;

  const activePct = active / (total || 1);
  const expiringPct = expiring / (total || 1);
  const expiredPct = expired / (total || 1);

  const activeStroke = activePct * circumference;
  const expiringStroke = expiringPct * circumference;
  const expiredStroke = expiredPct * circumference;

  const activeOffset = 0;
  const expiringOffset = -activeStroke;
  const expiredOffset = -(activeStroke + expiringStroke);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Subscription Status</h3>
        <span className="text-xs text-slate-400">Current</span>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-center justify-around gap-6">
        {/* SVG Donut */}
        <div className="relative flex items-center justify-center">
          <svg className="w-40 h-40 -rotate-90 transform" viewBox="0 0 160 160">
            {/* Background ring */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
              fill="transparent"
            />

            {/* Active arc */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="#10b981"
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={`${activeStroke} ${circumference}`}
              strokeDashoffset={activeOffset}
              strokeLinecap="round"
            />

            {/* Expiring arc */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="#f59e0b"
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={`${expiringStroke} ${circumference}`}
              strokeDashoffset={expiringOffset}
            />

            {/* Expired arc */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="#ef4444"
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={`${expiredStroke} ${circumference}`}
              strokeDashoffset={expiredOffset}
            />
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xl font-bold text-slate-900 leading-tight">
              {total.toLocaleString()}
            </span>
            <span className="text-[11px] font-medium text-slate-400">Total</span>
          </div>
        </div>

        {/* Legend matching screenshot */}
        <div className="flex flex-col gap-3 min-w-[140px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-600 font-medium">Active</span>
            </div>
            <span className="text-xs font-semibold text-slate-900">{active.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-xs text-slate-600 font-medium">Expiring</span>
            </div>
            <span className="text-xs font-semibold text-slate-900">{expiring.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-xs text-slate-600 font-medium">Expired</span>
            </div>
            <span className="text-xs font-semibold text-slate-900">{expired.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
