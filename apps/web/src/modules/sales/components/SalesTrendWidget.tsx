import React, { useState } from 'react';
import { ChevronDown, ArrowUpRight } from 'lucide-react';

interface SalesTrendItem {
  label: string;
  fullDate?: string;
  amount: number;
  count?: number;
}

interface SalesTrendWidgetProps {
  trend?: SalesTrendItem[];
  totalSales?: string;
  totalSalesTrend?: string;
  period?: string;
  onPeriodChange?: (period: string) => void;
}

export const SalesTrendWidget: React.FC<SalesTrendWidgetProps> = ({
  trend = [],
  totalSales = '₹ 0.00',
  totalSalesTrend = '0%',
  period = 'this_month',
  onPeriodChange,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Dynamic max and axis calculation
  const maxVal = Math.max(0, ...trend.map((t) => t.amount || 0));
  let maxAxis = 5000;
  if (maxVal > 0) {
    if (maxVal > 100000) maxAxis = Math.ceil(maxVal / 25000) * 25000;
    else if (maxVal > 50000) maxAxis = Math.ceil(maxVal / 10000) * 10000;
    else if (maxVal > 10000) maxAxis = Math.ceil(maxVal / 5000) * 5000;
    else if (maxVal > 5000) maxAxis = Math.ceil(maxVal / 2500) * 2500;
    else if (maxVal > 1000) maxAxis = Math.ceil(maxVal / 1000) * 1000;
    else maxAxis = Math.ceil(maxVal / 500) * 500;
  }

  const formatTick = (num: number) => {
    if (num >= 100000) return `₹${(num / 100000).toFixed(num % 100000 === 0 ? 0 : 1)}L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}K`;
    if (num === 0) return '₹0';
    return `₹${Math.round(num)}`;
  };

  const yTicks = [
    formatTick(maxAxis),
    formatTick(maxAxis * 0.5),
    '₹0',
  ];

  // Map points to SVG coordinates (width 320, height 120, plot area x: 40..310, y: 15..105)
  const plotWidth = 270;
  const startX = 40;
  const bottomY = 105;
  const topY = 15;
  const plotHeight = bottomY - topY;

  const points = trend.map((t, idx) => {
    const x = trend.length > 1 ? startX + (idx / (trend.length - 1)) * plotWidth : startX + plotWidth / 2;
    const ratio = maxAxis > 0 ? Math.min(1, Math.max(0, (t.amount || 0) / maxAxis)) : 0;
    const y = bottomY - ratio * plotHeight;
    return {
      ...t,
      x,
      y,
    };
  });

  // Default active point to the last non-zero sale point, or the last element
  const nonZeroIndices = points.map((p, i) => (p.amount > 0 ? i : -1)).filter((i) => i >= 0);
  const defaultIdx = nonZeroIndices.length > 0 ? nonZeroIndices[nonZeroIndices.length - 1] : points.length - 1;
  const activeIdx = hoveredIdx !== null ? hoveredIdx : (defaultIdx >= 0 ? defaultIdx : 0);
  const activePoint = points[activeIdx];

  // Smooth Bezier Curve Path
  let linePath = '';
  let areaPath = '';

  if (points.length === 1) {
    linePath = `M ${startX} ${points[0].y.toFixed(1)} L ${startX + plotWidth} ${points[0].y.toFixed(1)}`;
    areaPath = `M ${startX} ${points[0].y.toFixed(1)} L ${startX + plotWidth} ${points[0].y.toFixed(1)} L ${startX + plotWidth} ${bottomY} L ${startX} ${bottomY} Z`;
  } else if (points.length > 1) {
    linePath = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 >= points.length ? points.length - 1 : i + 2];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      let cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      let cp2y = p2.y - (p3.y - p1.y) / 6;

      cp1y = Math.min(bottomY, Math.max(topY, cp1y));
      cp2y = Math.min(bottomY, Math.max(topY, cp2y));

      linePath += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${bottomY} L ${points[0].x.toFixed(1)} ${bottomY} Z`;
  }

  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-900">Sales Trend</h3>
        <div className="relative">
          <select
            value={period || 'this_month'}
            onChange={(e) => onPeriodChange?.(e.target.value)}
            className="appearance-none bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-[11px] rounded-md px-2.5 py-1 pr-6 border border-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="this_month">This Month</option>
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="last_month">Last Month</option>
            <option value="this_quarter">This Quarter</option>
            <option value="this_year">This Year</option>
          </select>
          <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Main Metric Stat */}
      <div className="flex items-baseline gap-2.5 mb-2">
        <span className="text-xl font-bold text-slate-900 tracking-tight">{totalSales}</span>
        <div className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>{totalSalesTrend}</span>
          <span className="text-slate-400 font-normal text-[10px]">vs prev period</span>
        </div>
      </div>

      {/* Active Point Floating Tooltip */}
      {activePoint && (
        <div className="flex items-center justify-between bg-blue-50/70 border border-blue-100 px-2.5 py-1 rounded-lg text-xs mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="font-semibold text-slate-700 text-[11px]">{activePoint.fullDate || activePoint.label}:</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-blue-700 text-[11px]">
              ₹ {activePoint.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            {activePoint.count !== undefined && (
              <span className="text-[10px] text-slate-500 font-medium bg-white px-1.5 py-0.2 rounded border border-blue-100">
                {activePoint.count} {activePoint.count === 1 ? 'order' : 'orders'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Responsive SVG Chart */}
      <div className="relative w-full h-36 pt-1">
        <svg className="w-full h-full overflow-visible" viewBox="0 0 320 120" preserveAspectRatio="none">
          <defs>
            <linearGradient id="salesTrendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Grid lines & Dynamic Y Axis Ticks */}
          <line x1={startX} y1={topY} x2={startX + plotWidth} y2={topY} stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
          <text x="4" y={topY + 3} fill="#94A3B8" fontSize="9" fontWeight="500" fontFamily="sans-serif">
            {yTicks[0]}
          </text>

          <line x1={startX} y1={topY + plotHeight / 2} x2={startX + plotWidth} y2={topY + plotHeight / 2} stroke="#F1F5F9" strokeWidth="1" strokeDasharray="3 3" />
          <text x="4" y={topY + plotHeight / 2 + 3} fill="#94A3B8" fontSize="9" fontWeight="500" fontFamily="sans-serif">
            {yTicks[1]}
          </text>

          <line x1={startX} y1={bottomY} x2={startX + plotWidth} y2={bottomY} stroke="#E2E8F0" strokeWidth="1" />
          <text x="4" y={bottomY + 3} fill="#94A3B8" fontSize="9" fontWeight="500" fontFamily="sans-serif">
            {yTicks[2]}
          </text>

          {/* Area Gradient Fill */}
          {areaPath && <path d={areaPath} fill="url(#salesTrendGradient)" />}

          {/* Spline Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#2563EB"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Interactive Dots and Trigger Zones */}
          {points.map((p, idx) => {
            const isHovered = activeIdx === idx;
            return (
              <g key={idx} className="cursor-pointer">
                {/* Invisible larger hover hit target */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="12"
                  fill="transparent"
                  onMouseEnter={() => setHoveredIdx(idx)}
                />
                {/* Active halo */}
                {isHovered && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="6.5"
                    fill="#3B82F6"
                    opacity="0.3"
                    className="animate-ping"
                  />
                )}
                {/* Core Dot */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isHovered ? '4.5' : p.amount > 0 ? '3.5' : '2'}
                  fill={isHovered ? '#1D4ED8' : p.amount > 0 ? '#3B82F6' : '#94A3B8'}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
              </g>
            );
          })}
        </svg>

        {/* X Axis Date Labels */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 pl-9 pr-1 mt-1">
          {points.length > 0 ? (
            points.map((p, i) => (
              <span
                key={i}
                className={`transition-colors cursor-pointer ${
                  activeIdx === i ? 'text-blue-600 font-bold' : 'hover:text-slate-700'
                }`}
                onMouseEnter={() => setHoveredIdx(i)}
              >
                {p.label}
              </span>
            ))
          ) : (
            <span>No activity</span>
          )}
        </div>
      </div>
    </div>
  );
};
