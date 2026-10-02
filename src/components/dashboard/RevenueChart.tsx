import React from 'react';
import { ArrowUpRight } from 'lucide-react';

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
  // SVG Area Chart calculation
  const width = 580;
  const height = 180;
  const paddingX = 20;
  const paddingY = 20;

  const maxVal = 300000;
  const minVal = 100000;

  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * (width - 2 * paddingX);
    const y = height - paddingY - ((d.amount - minVal) / (maxVal - minVal)) * (height - 2 * paddingY);
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, curr, i, arr) => {
    if (i === 0) return `M ${curr.x} ${curr.y}`;
    const prev = arr[i - 1];
    const cpX = (prev.x + curr.x) / 2;
    return `${acc} C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Revenue Overview</h3>
          <span className="text-xs text-slate-400">Monthly</span>
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

      <div className="mt-6 relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 overflow-visible">
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={width - paddingX}
            y2={paddingY}
            stroke="#f1f5f9"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={height / 2}
            x2={width - paddingX}
            y2={height / 2}
            stroke="#f1f5f9"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={width - paddingX}
            y2={height - paddingY}
            stroke="#f1f5f9"
          />

          {/* Area fill */}
          <path d={areaD} fill="url(#revenueGradient)" />

          {/* Smooth line */}
          <path
            d={pathD}
            fill="none"
            stroke="#2563eb"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive dots */}
          {points.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r="4"
              className="fill-white stroke-blue-600 stroke-2 hover:r-6 transition-all cursor-pointer"
            />
          ))}
        </svg>

        {/* X axis labels */}
        <div className="flex justify-between items-center text-[11px] font-medium text-slate-400 mt-2 px-2">
          {data.map((d, i) => (
            <span key={i}>{d.date}</span>
          ))}
        </div>
      </div>
    </div>
  );
};
