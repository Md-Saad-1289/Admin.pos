import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

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
  const chartData = [
    { name: 'Active', value: active, color: '#10b981' },
    { name: 'Expiring', value: expiring, color: '#f59e0b' },
    { name: 'Expired', value: expired, color: '#ef4444' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Subscription Status</h3>
        <span className="text-xs text-slate-400 font-medium">Real-time</span>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-center justify-around gap-6">
        {/* Recharts Pie/Donut Chart */}
        <div className="relative w-44 h-44 flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0];
                    return (
                      <div className="bg-slate-900 text-white px-3 py-1.5 rounded-lg shadow-lg text-xs">
                        <span className="font-medium text-slate-300">{data.name}: </span>
                        <span className="font-bold text-white">{Number(data.value).toLocaleString()}</span>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={72}
                paddingAngle={4}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-xl font-bold text-slate-900 leading-tight">
              {total.toLocaleString()}
            </span>
            <span className="text-[11px] font-medium text-slate-400">Total</span>
          </div>
        </div>

        {/* Legend */}
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
