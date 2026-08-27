import React from 'react';
import {
  DollarSign,
  ShoppingBag,
  Users,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Sparkline } from '../charts/Sparkline';
import type { KpiMetric } from '../reports.types';

interface ReportKpiGridProps {
  kpis?: Partial<Record<'revenue' | 'sales' | 'customers' | 'services' | 'outstanding', Partial<KpiMetric>>>;
}

export const DEFAULT_REPORT_KPIS: Record<string, KpiMetric> = {
  revenue: {
    title: 'Total Revenue',
    value: '₹ 8,75,450',
    rawValue: 875450,
    deltaPercentage: 12.4,
    deltaLabel: 'vs previous period',
    trend: 'up',
    colorVariant: 'blue',
    sparklineData: [45, 52, 68, 72, 85, 95],
  },
  sales: {
    title: 'Total Sales',
    value: '56',
    rawValue: 56,
    deltaPercentage: 18.6,
    deltaLabel: 'vs previous period',
    trend: 'up',
    colorVariant: 'purple',
    sparklineData: [6, 7, 9, 10, 12, 14],
  },
  customers: {
    title: 'Total Customers',
    value: '632',
    rawValue: 632,
    deltaPercentage: 8.2,
    deltaLabel: 'vs previous period',
    trend: 'up',
    colorVariant: 'indigo',
    sparklineData: [21, 23, 24, 25, 27, 28],
  },
  services: {
    title: 'Services Completed',
    value: '48',
    rawValue: 48,
    deltaPercentage: 20.4,
    deltaLabel: 'vs previous period',
    trend: 'up',
    colorVariant: 'emerald',
    sparklineData: [8, 12, 16, 18, 22, 24],
  },
  outstanding: {
    title: 'Outstanding Payments',
    value: '₹ 4,250',
    rawValue: 4250,
    deltaPercentage: -8.5,
    deltaLabel: 'vs previous period',
    trend: 'down',
    colorVariant: 'orange',
    sparklineData: [65, 58, 50, 48, 45, 42],
  },
};

export const ReportKpiGrid: React.FC<ReportKpiGridProps> = ({ kpis }) => {
  const data = {
    revenue: { ...DEFAULT_REPORT_KPIS.revenue, ...kpis?.revenue },
    sales: { ...DEFAULT_REPORT_KPIS.sales, ...kpis?.sales },
    customers: { ...DEFAULT_REPORT_KPIS.customers, ...kpis?.customers },
    services: { ...DEFAULT_REPORT_KPIS.services, ...kpis?.services },
    outstanding: { ...DEFAULT_REPORT_KPIS.outstanding, ...kpis?.outstanding },
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {/* 1. Total Revenue */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 font-medium block">{data.revenue.title}</span>
            <span className="text-lg font-bold text-slate-900 tracking-tight block">{data.revenue.value}</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+{data.revenue.deltaPercentage}%</span>
            <span className="text-slate-400 font-normal text-[10px] hidden sm:inline">{data.revenue.deltaLabel}</span>
          </div>
          <Sparkline data={data.revenue.sparklineData ?? []} color="#3B82F6" width={55} height={20} />
        </div>
      </div>

      {/* 2. Total Sales */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 font-medium block">{data.sales.title}</span>
            <span className="text-lg font-bold text-slate-900 tracking-tight block">{data.sales.value}</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+{data.sales.deltaPercentage}%</span>
            <span className="text-slate-400 font-normal text-[10px] hidden sm:inline">{data.sales.deltaLabel}</span>
          </div>
          <Sparkline data={data.sales.sparklineData ?? []} color="#8B5CF6" width={55} height={20} />
        </div>
      </div>

      {/* 3. Total Customers */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 font-medium block">{data.customers.title}</span>
            <span className="text-lg font-bold text-slate-900 tracking-tight block">{data.customers.value}</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+{data.customers.deltaPercentage}%</span>
            <span className="text-slate-400 font-normal text-[10px] hidden sm:inline">{data.customers.deltaLabel}</span>
          </div>
          <Sparkline data={data.customers.sparklineData ?? []} color="#6366F1" width={55} height={20} />
        </div>
      </div>

      {/* 4. Services Completed */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 font-medium block">{data.services.title}</span>
            <span className="text-lg font-bold text-slate-900 tracking-tight block">{data.services.value}</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+{data.services.deltaPercentage}%</span>
            <span className="text-slate-400 font-normal text-[10px] hidden sm:inline">{data.services.deltaLabel}</span>
          </div>
          <Sparkline data={data.services.sparklineData ?? []} color="#10B981" width={55} height={20} />
        </div>
      </div>

      {/* 5. Outstanding Payments */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 font-medium block">{data.outstanding.title}</span>
            <span className="text-lg font-bold text-slate-900 tracking-tight block">{data.outstanding.value}</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
            {/* Outstanding decreasing is a positive business development */}
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>{data.outstanding.deltaPercentage}%</span>
            <span className="text-slate-400 font-normal text-[10px] hidden sm:inline">{data.outstanding.deltaLabel}</span>
          </div>
          <Sparkline data={data.outstanding.sparklineData ?? []} color="#F97316" width={55} height={20} />
        </div>
      </div>
    </div>
  );
};
