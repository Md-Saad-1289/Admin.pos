import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface RevenueChartProps {
  amount: number;
  growth: number;
  data?: Array<{ date: string; amount: number }>;
}

export const RevenueChart: React.FC<RevenueChartProps> = ({
  amount = 248500,
  growth = 12.5,
  data = [
    { date: 'Oct 1', amount: 180000 },
    { date: 'Oct 5', amount: 195000 },
    { date: 'Oct 10', amount: 210000 },
    { date: 'Oct 15', amount: 202000 },
    { date: 'Oct 20', amount: 228000 },
    { date: 'Oct 25', amount: 239000 },
    { date: 'Oct 30', amount: 248500 },
  ],
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Revenue Overview</h3>
          <span className="text-xs text-slate-400 font-medium">Monthly Analytics</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2.5">
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            ৳{amount.toLocaleString()}
          </span>
          <span className="inline-flex items-center text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
            {growth}% vs last 30 days
          </span>
        </div>
      </div>

      <div className="mt-6 w-full h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="date"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `৳${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-slate-900 text-white px-3 py-2 rounded-xl shadow-lg text-xs">
                      <p className="text-slate-400 font-medium">{label}</p>
                      <p className="font-bold text-sm text-blue-400">
                        ৳{Number(payload[0].value).toLocaleString()}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#2563eb"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#revenueGrad)"
              activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
