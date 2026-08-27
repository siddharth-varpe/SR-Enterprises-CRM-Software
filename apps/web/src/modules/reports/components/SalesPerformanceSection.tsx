import React from 'react';
import { TrendingUp, ShoppingBag, Package } from 'lucide-react';
import { HorizontalBarChart, type HorizontalBarItem } from '../charts/HorizontalBarChart';
import { InteractiveAreaLineChart } from '../charts/InteractiveAreaLineChart';
import { formatCurrency, formatNumber } from '../../../lib/formatters';
import type { ChartDataPoint } from '../reports.types';
import type { SalesAnalytics } from '@crm/types';

interface SalesPerformanceSectionProps {
  salesData?: SalesAnalytics;
  salesTrendData?: ChartDataPoint[];
}

const COLOR_CLASSES = [
  'bg-blue-600',
  'bg-indigo-600',
  'bg-emerald-600',
  'bg-purple-600',
  'bg-amber-600',
  'bg-slate-600',
];

export const SalesPerformanceSection: React.FC<SalesPerformanceSectionProps> = ({
  salesData,
  salesTrendData,
}) => {
  const trendData: ChartDataPoint[] = salesTrendData && salesTrendData.length > 0
    ? salesTrendData
    : (salesData?.salesTrend?.map((t: any) => ({
        date: t.date,
        revenue: t.value ?? 0,
        sales: t.secondaryValue ?? 0,
      })) ?? []);

  const totalProductRev = salesData?.salesByProduct?.reduce((sum, p) => sum + (p.totalAmount || 0), 0) || 1;
  const productBars: HorizontalBarItem[] = salesData?.salesByProduct?.length
    ? salesData.salesByProduct.slice(0, 6).map((p, idx) => ({
        id: `p-${idx}`,
        label: p.productName || 'RO Machine',
        sublabel: 'Product Sale',
        value: p.totalAmount || 0,
        formattedValue: formatCurrency(p.totalAmount || 0),
        secondaryFormattedValue: `${formatNumber(p.count || 0)} units`,
        percentage: Math.round(((p.totalAmount || 0) / totalProductRev) * 100),
        colorClass: COLOR_CLASSES[idx % COLOR_CLASSES.length] || 'bg-blue-600',
      }))
    : [];

  const growth = salesData?.comparison?.count?.deltaPercentage ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
          <ShoppingBag className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">Sales Performance</h2>
          <p className="text-xs text-slate-500">Sales volume dynamics and product revenue distribution</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left: Weekly Sales Velocity Trend (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Sales Order Velocity</h3>
              <p className="text-[11px] text-slate-400">Weekly completed order counts</p>
            </div>
            <span className={`text-xs font-semibold flex items-center gap-0.5 ${growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              <TrendingUp className="w-3.5 h-3.5" /> {growth >= 0 ? `+${growth}% Growth` : `${growth}% Growth`}
            </span>
          </div>

          <div className="pt-2 flex-1 flex items-center">
            <InteractiveAreaLineChart data={trendData} metricMode="sales" height={220} />
          </div>
        </div>

        {/* Right: Sales by Product Category Bar Chart (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Sales by Product</h3>
                <p className="text-[11px] text-slate-400">Revenue ranking by item category</p>
              </div>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">{productBars.length} Products Active</span>
          </div>

          <HorizontalBarChart items={productBars} />
        </div>
      </div>
    </div>
  );
};

