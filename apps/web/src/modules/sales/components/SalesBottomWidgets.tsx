import React from 'react';
import { Package, Clock, Users, Target, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface SalesBottomWidgetsProps {
  stats?: {
    fastMovingCount: number;
    pendingToday: number;
    totalCustomers: number;
    revenueTargetAchieved: number;
  };
}

export const SalesBottomWidgets: React.FC<SalesBottomWidgetsProps> = ({ stats }) => {
  const fastMoving = stats?.fastMovingCount ?? 0;
  const pendingToday = stats?.pendingToday ?? 0;
  const totalCustomers = stats?.totalCustomers ?? 0;
  const targetPct = stats?.revenueTargetAchieved ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. Fast Moving */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex items-center justify-between cursor-pointer group">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">Fast Moving</span>
            <span className="text-sm font-bold text-slate-900 block">{fastMoving} Products</span>
            <div className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 mt-0.5">
              <ArrowUpRight className="w-3 h-3" />
              <span>{fastMoving > 0 ? '18%' : '0%'}</span>
              <span className="text-slate-400 font-normal">vs prev period</span>
            </div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
      </div>

      {/* 2. Pending Today */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex items-center justify-between cursor-pointer group">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">Pending Today</span>
            <span className="text-sm font-bold text-slate-900 block">{pendingToday} Orders</span>
            <div className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 mt-0.5">
              <ArrowUpRight className="w-3 h-3" />
              <span>{pendingToday > 0 ? 'Live' : '0'}</span>
              <span className="text-slate-400 font-normal">active</span>
            </div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
      </div>

      {/* 3. Total Customers */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex items-center justify-between cursor-pointer group">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">Active Customers</span>
            <span className="text-sm font-bold text-slate-900 block">{totalCustomers}</span>
            <div className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 mt-0.5">
              <ArrowUpRight className="w-3 h-3" />
              <span>{totalCustomers > 0 ? '100%' : '0%'}</span>
              <span className="text-slate-400 font-normal">filtered</span>
            </div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
      </div>

      {/* 4. Revenue Target */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200/80 shadow-xs hover:shadow-sm transition-all flex items-center justify-between cursor-pointer group">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <span className="text-[11px] text-slate-400 font-medium block">Revenue Target</span>
            <span className="text-sm font-bold text-slate-900 block">₹ 10,00,000</span>
            <div className="mt-1 flex items-center gap-2">
              <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, targetPct)}%` }} />
              </div>
              <span className="text-[10px] font-semibold text-slate-500 whitespace-nowrap">{targetPct}% Achieved</span>
            </div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors shrink-0" />
      </div>
    </div>
  );
};
