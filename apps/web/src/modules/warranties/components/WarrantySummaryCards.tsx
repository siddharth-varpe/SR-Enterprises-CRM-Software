import React from 'react';
import { ShieldCheck, Clock, ShieldAlert, Sparkles } from 'lucide-react';
import type { WarrantyKPIs } from '../warranties.api';

export interface WarrantySummaryCardsProps {
  kpis?: WarrantyKPIs;
  isLoading?: boolean;
  activeFilter?: string;
  onFilterSelect?: (status: string) => void;
}

export const WarrantySummaryCards: React.FC<WarrantySummaryCardsProps> = ({
  kpis,
  isLoading,
  activeFilter,
  onFilterSelect,
}) => {
  const cards = [
    {
      id: 'ALL',
      title: 'Total Warranties',
      count: kpis?.totalWarranties ?? 0,
      icon: <ShieldCheck className="w-5 h-5" />,
      colorScheme: {
        bg: 'bg-indigo-50/50 hover:bg-indigo-50/80',
        activeBg: 'bg-indigo-100/70 border-indigo-500 ring-2 ring-indigo-400',
        border: 'border-indigo-100',
        iconBg: 'bg-indigo-600 text-white',
        text: 'text-indigo-900',
        badge: 'bg-indigo-100 text-indigo-800',
      },
      subtitle: 'All registered warranty records',
      badgeText: 'Active System',
    },
    {
      id: 'ACTIVE',
      title: 'Active Coverage',
      count: kpis?.activeWarranties ?? 0,
      icon: <Sparkles className="w-5 h-5" />,
      colorScheme: {
        bg: 'bg-emerald-50/50 hover:bg-emerald-50/80',
        activeBg: 'bg-emerald-100/70 border-emerald-500 ring-2 ring-emerald-400',
        border: 'border-emerald-100',
        iconBg: 'bg-emerald-600 text-white',
        text: 'text-emerald-900',
        badge: 'bg-emerald-100 text-emerald-800',
      },
      subtitle: 'Healthy active warranties',
      badgeText: '100% Covered',
    },
    {
      id: 'EXPIRING_SOON',
      title: 'Expiring Soon (<30d)',
      count: kpis?.expiringSoon ?? 0,
      icon: <Clock className="w-5 h-5" />,
      colorScheme: {
        bg: 'bg-amber-50/50 hover:bg-amber-50/80',
        activeBg: 'bg-amber-100/70 border-amber-500 ring-2 ring-amber-400',
        border: 'border-amber-100',
        iconBg: 'bg-amber-600 text-white',
        text: 'text-amber-900',
        badge: 'bg-amber-100 text-amber-800',
      },
      subtitle: 'Renewal outreach priority',
      badgeText: 'Action Required',
    },
    {
      id: 'EXPIRED',
      title: 'Expired / Void',
      count: (kpis?.expiredWarranties ?? 0) + (kpis?.voidWarranties ?? 0),
      icon: <ShieldAlert className="w-5 h-5" />,
      colorScheme: {
        bg: 'bg-rose-50/50 hover:bg-rose-50/80',
        activeBg: 'bg-rose-100/70 border-rose-500 ring-2 ring-rose-400',
        border: 'border-rose-100',
        iconBg: 'bg-rose-600 text-white',
        text: 'text-rose-900',
        badge: 'bg-rose-100 text-rose-800',
      },
      subtitle: 'Lapsed or voided coverage',
      badgeText: 'Chargeable Service',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const isSelected = activeFilter === card.id;

        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onFilterSelect?.(card.id)}
            className={`relative overflow-hidden text-left rounded-2xl border p-5 transition-all duration-200 shadow-xs cursor-pointer ${
              isSelected ? card.colorScheme.activeBg : `${card.colorScheme.bg} ${card.colorScheme.border}`
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-700 block tracking-wide uppercase">
                  {card.title}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-extrabold tracking-tight ${card.colorScheme.text}`}>
                    {isLoading ? (
                      <span className="inline-block w-8 h-6 bg-slate-200 rounded animate-pulse" />
                    ) : (
                      card.count
                    )}
                  </span>
                </div>
              </div>

              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs ${card.colorScheme.iconBg}`}>
                {card.icon}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-200/50 text-xs">
              <span className="text-slate-700 font-medium truncate max-w-[130px]">{card.subtitle}</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${card.colorScheme.badge}`}>
                {card.badgeText}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
