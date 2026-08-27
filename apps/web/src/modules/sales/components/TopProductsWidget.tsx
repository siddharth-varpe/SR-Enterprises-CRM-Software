import React from 'react';
import { ChevronDown, Shield, Package } from 'lucide-react';

export interface TopProductItem {
  id: string;
  name: string;
  amount: string;
  amountRaw?: number;
  count?: number;
  percentage: number;
  type: 'ro' | 'filter';
}

interface TopProductsWidgetProps {
  products?: TopProductItem[];
  period?: string;
  onPeriodChange?: (period: string) => void;
}

export const TopProductsWidget: React.FC<TopProductsWidgetProps> = ({
  products = [],
  period = 'this_month',
  onPeriodChange,
}) => {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-900">Top Products</h3>
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

      {/* List */}
      <div className="space-y-3.5">
        {products.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No product sales in this period
          </div>
        ) : (
          products.map((prod) => (
            <div key={prod.id} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-50/80 border border-blue-100 flex items-center justify-center shrink-0">
                    {prod.type === 'ro' ? (
                      <Package className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Shield className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-slate-900 truncate block">{prod.name}</span>
                    {prod.count !== undefined && (
                      <span className="text-[10px] text-slate-500 font-normal">
                        {prod.count} {prod.count === 1 ? 'unit' : 'units'} sold
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-slate-900">{prod.amount}</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                    {prod.percentage}%
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    prod.type === 'ro'
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-600'
                  }`}
                  style={{ width: `${Math.max(4, Math.min(100, prod.percentage))}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
