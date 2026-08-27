import React from 'react';
import { ShoppingCart } from 'lucide-react';

export interface RecentSaleItem {
  id: string;
  customerName: string;
  amount: string;
  invoiceNo: string;
  time: string;
  iconVariant: 'emerald' | 'blue';
}

interface RecentSalesWidgetProps {
  recentSales?: RecentSaleItem[];
  onViewAll?: () => void;
  onSelectSale?: (id: string) => void;
}

export const RecentSalesWidget: React.FC<RecentSalesWidgetProps> = ({
  recentSales = [],
  onViewAll,
  onSelectSale,
}) => {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-900">Recent Sales</h3>
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline cursor-pointer"
        >
          View All
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {recentSales.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No recent sales recorded
          </div>
        ) : (
          recentSales.map((sale) => (
            <div
              key={sale.id}
              onClick={() => onSelectSale?.(sale.id)}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                    sale.iconVariant === 'emerald'
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                      : 'bg-blue-50 text-blue-600 border-blue-100'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">{sale.customerName}</span>
                  <span className="text-[11px] text-slate-500 font-medium block">
                    <span className="font-semibold text-slate-700">{sale.amount}</span> • {sale.invoiceNo}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-400 font-medium block">{sale.time}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
