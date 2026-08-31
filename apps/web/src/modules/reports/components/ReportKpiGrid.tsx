import React from 'react';
import {
  DollarSign,
  ShoppingBag,
  Users,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { Sparkline } from '../charts/Sparkline';
import type { KpiMetric } from '../reports.types';

interface ReportKpiGridProps {
  kpis?: Partial<Record<'revenue' | 'sales' | 'customers' | 'services' | 'outstanding', Partial<KpiMetric>>>;
}

export const ReportKpiGrid: React.FC<ReportKpiGridProps> = ({ kpis }) => {
  const revenue = kpis?.revenue;
  const sales = kpis?.sales;
  const customers = kpis?.customers;
  const services = kpis?.services;
  const outstanding = kpis?.outstanding;

  const renderDelta = (delta?: number | null, isOutstanding = false) => {
    if (delta === null || delta === undefined) {
      return (
        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 font-mono">
          <Minus className="w-3 h-3 text-slate-400" />
          <span>New</span>
        </div>
      );
    }

    // For outstanding payments, negative delta is good (downward)
    const isPositive = isOutstanding ? delta <= 0 : delta >= 0;
    const isNeutral = delta === 0;

    if (isNeutral) {
      return (
        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 font-mono">
          <Minus className="w-3 h-3 text-slate-400" />
          <span>0.0%</span>
        </div>
      );
    }

    return (
      <div
        className={`flex items-center gap-1 text-[11px] font-semibold font-mono ${
          isPositive ? 'text-emerald-600' : 'text-rose-600'
        }`}
      >
        {delta > 0 ? (
          <ArrowUpRight className="w-3.5 h-3.5" />
        ) : (
          <ArrowDownRight className="w-3.5 h-3.5" />
        )}
        <span>
          {delta > 0 ? `+${delta}%` : `${delta}%`}
        </span>
        <span className="text-slate-400 font-normal text-[10px] hidden sm:inline">vs prev</span>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
      {/* 1. Total Revenue */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-primary-600 border border-sky-100 flex items-center justify-center shadow-2xs">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 font-medium block">Total Revenue</span>
            <span className="text-lg font-extrabold text-slate-900 tracking-tight block font-mono">
              {revenue?.value || '₹ 0'}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          {renderDelta(revenue?.deltaPercentage)}
          <Sparkline data={revenue?.sparklineData || [0, 0, 0, 0]} color="#0284C7" width={55} height={20} />
        </div>
      </div>

      {/* 2. Total Sales */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shadow-2xs">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 font-medium block">Total Sales</span>
            <span className="text-lg font-extrabold text-slate-900 tracking-tight block font-mono">
              {sales?.value || '0'}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          {renderDelta(sales?.deltaPercentage)}
          <Sparkline data={sales?.sparklineData || [0, 0, 0, 0]} color="#9333EA" width={55} height={20} />
        </div>
      </div>

      {/* 3. Total Customers */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shadow-2xs">
            <Users className="w-5 h-5" />
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 font-medium block">Total Customers</span>
            <span className="text-lg font-extrabold text-slate-900 tracking-tight block font-mono">
              {customers?.value || '0'}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          {renderDelta(customers?.deltaPercentage)}
          <Sparkline data={customers?.sparklineData || [0, 0, 0, 0]} color="#4F46E5" width={55} height={20} />
        </div>
      </div>

      {/* 4. Services Completed */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shadow-2xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 font-medium block">Services Completed</span>
            <span className="text-lg font-extrabold text-slate-900 tracking-tight block font-mono">
              {services?.value || '0'}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          {renderDelta(services?.deltaPercentage)}
          <Sparkline data={services?.sparklineData || [0, 0, 0, 0]} color="#10B981" width={55} height={20} />
        </div>
      </div>

      {/* 5. Outstanding Payments */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shadow-2xs">
            <Clock className="w-5 h-5" />
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 font-medium block">Outstanding Balance</span>
            <span className="text-lg font-extrabold text-slate-900 tracking-tight block font-mono">
              {outstanding?.value || '₹ 0'}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          {renderDelta(outstanding?.deltaPercentage, true)}
          <Sparkline data={outstanding?.sparklineData || [0, 0, 0, 0]} color="#F59E0B" width={55} height={20} />
        </div>
      </div>
    </div>
  );
};
