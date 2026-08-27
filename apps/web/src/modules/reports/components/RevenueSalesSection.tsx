import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { InteractiveAreaLineChart } from '../charts/InteractiveAreaLineChart';
import { formatCurrency, formatNumber } from '../../../lib/formatters';
import type { ChartDataPoint, ChartTimeframe } from '../reports.types';
import type { AnalyticsOverview } from '@crm/types';

interface RevenueSalesSectionProps {
  overview?: AnalyticsOverview;
  chartData?: ChartDataPoint[];
}

export const RevenueSalesSection: React.FC<RevenueSalesSectionProps> = ({ overview, chartData }) => {
  const [metricMode, setMetricMode] = useState<'revenue' | 'sales' | 'both'>('both');
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('30D');

  // Convert real backend revenue trend if available
  const realChartData: ChartDataPoint[] = overview?.revenue?.revenueTrend?.length
    ? overview.revenue.revenueTrend.map((r: any) => ({
        date: r.date,
        revenue: r.billed ?? 0,
        sales: r.collected ?? 0,
      }))
    : [];

  const activeData = chartData && chartData.length > 0 ? chartData : realChartData;

  const grossBilled = overview?.revenue?.grossBilled ?? 0;
  const billedDelta = overview?.kpis?.grossBilled?.deltaPercentage ?? 0;
  const salesCount = overview?.sales?.salesCount ?? 0;
  const salesDelta = overview?.sales?.comparison?.count?.deltaPercentage ?? 0;
  const avgSaleValue = overview?.sales?.averageSaleValue ?? 0;
  const serviceSlaRate = overview?.services?.completionRate ?? 0;
  const outstandingAmount = overview?.revenue?.outstandingAmount ?? 0;
  const outstandingDelta = overview?.kpis?.outstandingAmount?.deltaPercentage ?? 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
      {/* Left Area/Line Chart Card (8 cols) */}
      <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 sm:p-5 flex flex-col justify-between">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Revenue &amp; Sales Overview</h2>
            <p className="text-xs text-slate-500 font-normal">
              Track business earnings trajectory and sales unit velocity
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Metric Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setMetricMode('revenue')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  metricMode === 'revenue' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Revenue
              </button>
              <button
                type="button"
                onClick={() => setMetricMode('sales')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  metricMode === 'sales' ? 'bg-white text-purple-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sales
              </button>
              <button
                type="button"
                onClick={() => setMetricMode('both')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  metricMode === 'both' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Both
              </button>
            </div>

            {/* Timeframe selector */}
            <div className="flex items-center bg-slate-50 p-0.5 rounded-lg border border-slate-200 text-[11px] font-medium text-slate-600">
              {(['7D', '30D', '3M', '6M', '1Y'] as ChartTimeframe[]).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe(tf)}
                  className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                    timeframe === tf ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Legend Indicators */}
        <div className="flex items-center gap-4 pt-3 pb-1 text-xs">
          {(metricMode === 'revenue' || metricMode === 'both') && (
            <div className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span>Revenue (₹)</span>
            </div>
          )}
          {(metricMode === 'sales' || metricMode === 'both') && (
            <div className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
              <span>Sales (Units)</span>
            </div>
          )}
        </div>

        {/* Interactive SVG Chart */}
        <div className="pt-2 flex-1 flex items-center">
          <InteractiveAreaLineChart data={activeData} metricMode={metricMode} height={250} />
        </div>
      </div>

      {/* Right Performance Summary Card (4 cols) */}
      <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 sm:p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Performance Summary</h3>
              <p className="text-[11px] text-slate-400">Core operational metrics</p>
            </div>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
              LIVE DATA
            </span>
          </div>

          <div className="space-y-3">
            {/* 1. Gross Revenue */}
            <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Gross Revenue</span>
                  <span className="text-xs font-bold text-slate-900 block">{formatCurrency(grossBilled)}</span>
                </div>
              </div>
              <div className={`flex items-center gap-0.5 text-xs font-semibold ${billedDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {billedDelta >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                <span>{billedDelta >= 0 ? `+${billedDelta}%` : `${billedDelta}%`}</span>
              </div>
            </div>

            {/* 2. Sales Orders */}
            <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Sales Orders</span>
                  <span className="text-xs font-bold text-slate-900 block">{formatNumber(salesCount)} Units</span>
                </div>
              </div>
              <div className={`flex items-center gap-0.5 text-xs font-semibold ${salesDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {salesDelta >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                <span>{salesDelta >= 0 ? `+${salesDelta}%` : `${salesDelta}%`}</span>
              </div>
            </div>

            {/* 3. Average Order Value */}
            <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Avg. Order Value</span>
                  <span className="text-xs font-bold text-slate-900 block">{formatCurrency(avgSaleValue)}</span>
                </div>
              </div>
              <div className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>+0.0%</span>
              </div>
            </div>

            {/* 4. Service SLA Rate */}
            <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Service SLA Rate</span>
                  <span className="text-xs font-bold text-slate-900 block">{serviceSlaRate}%</span>
                </div>
              </div>
              <div className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>Active</span>
              </div>
            </div>

            {/* 5. Outstanding Amount */}
            <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Outstanding Amount</span>
                  <span className="text-xs font-bold text-slate-900 block">{formatCurrency(outstandingAmount)}</span>
                </div>
              </div>
              <div className={`flex items-center gap-0.5 text-xs font-semibold ${outstandingDelta <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {outstandingDelta <= 0 ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                <span>{outstandingDelta <= 0 ? `${outstandingDelta}%` : `+${outstandingDelta}%`}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>Realized Collection: {overview?.revenue?.collectionRate ?? 0}%</span>
          <span className="font-semibold text-slate-700">Authoritative Ledger</span>
        </div>
      </div>
    </div>
  );
};

