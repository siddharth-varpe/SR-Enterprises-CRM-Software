import React from 'react';
import { Repeat, AlertTriangle, Clock, ShieldCheck, IndianRupee } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../../lib/formatters';
import type { RentalSummaryStats } from '../rentals.api';

export interface RentalKpiCardsProps {
  summary?: RentalSummaryStats;
  isLoading?: boolean;
}

export const RentalKpiCards: React.FC<RentalKpiCardsProps> = ({ summary, isLoading }) => {
  const activeCount = summary?.totalActive ?? 0;
  const dueCount = summary?.totalDue ?? 0;
  const overdueCount = summary?.totalOverdue ?? 0;
  const monthlyRunRate = summary?.monthlyRunRate ?? 0;
  const totalDeposits = summary?.totalDepositsHeld ?? 0;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs animate-pulse">
            <div className="h-3 w-20 bg-slate-200 rounded mb-2" />
            <div className="h-6 w-28 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
      {/* 1. Active Rentals */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors">
        <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
          <Repeat className="w-3.5 h-3.5 text-primary-600" />
          <span>Active Rented Machines</span>
        </div>
        <div className="text-xl font-extrabold text-slate-900 mt-1 font-mono">
          {formatNumber(activeCount)} <span className="text-xs font-normal text-slate-500 font-sans">Units</span>
        </div>
        <div className="text-[11px] text-emerald-600 font-mono mt-0.5">
          Live active customer subscriptions
        </div>
      </div>

      {/* 2. Monthly Rental Run Rate */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors">
        <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
          <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
          <span>Monthly Rental Revenue</span>
        </div>
        <div className="text-xl font-extrabold text-emerald-950 mt-1 font-mono">
          {formatCurrency(monthlyRunRate)}
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5">
          Recurring monthly run rate
        </div>
      </div>

      {/* 3. Due & Overdue Subscriptions */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors">
        <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
          {overdueCount > 0 ? (
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          ) : (
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          )}
          <span>Payment Due / Overdue</span>
        </div>
        <div className="text-xl font-extrabold text-slate-900 mt-1 font-mono">
          {dueCount + overdueCount > 0 ? (
            <span className={overdueCount > 0 ? 'text-rose-700' : 'text-amber-700'}>
              {dueCount + overdueCount} <span className="text-xs font-normal text-slate-500 font-sans">({overdueCount} overdue)</span>
            </span>
          ) : (
            <span className="text-emerald-700">0 Due</span>
          )}
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5">
          Awaiting rental collections
        </div>
      </div>

      {/* 4. Security Deposits Held */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-colors">
        <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          <span>Security Deposits Held</span>
        </div>
        <div className="text-xl font-extrabold text-teal-950 mt-1 font-mono">
          {formatCurrency(totalDeposits)}
        </div>
        <div className="text-[11px] text-teal-700 mt-0.5 font-mono">
          Safe refundable collateral
        </div>
      </div>
    </div>
  );
};
