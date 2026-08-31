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
        bg: 'bg-white hover:bg-slate-50',
        activeBg: 'bg-sky-50/80 border-sky-500 ring-2 ring-sky-400/50',
        border: 'border-slate-200/90',
        iconBg: 'bg-sky-600 text-white',
        text: 'text-slate-900',
        badge: 'bg-sky-100 text-sky-800 font-mono',
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
        bg: 'bg-white hover:bg-slate-50',
        activeBg: 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-400/50',
        border: 'border-slate-200/90',
        iconBg: 'bg-emerald-600 text-white',
        text: 'text-emerald-950',
        badge: 'bg-emerald-100 text-emerald-800 font-mono',
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
        bg: 'bg-white hover:bg-slate-50',
        activeBg: 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-400/50',
        border: 'border-slate-200/90',
        iconBg: 'bg-amber-600 text-white',
        text: 'text-amber-950',
        badge: 'bg-amber-100 text-amber-800 font-mono',
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
        bg: 'bg-white hover:bg-slate-50',
        activeBg: 'bg-rose-50/80 border-rose-500 ring-2 ring-rose-400/50',
        border: 'border-slate-200/90',
        iconBg: 'bg-rose-600 text-white',
        text: 'text-rose-950',
        badge: 'bg-rose-100 text-rose-800 font-mono',
      },
      subtitle: 'Lapsed or voided coverage',
      badgeText: 'Chargeable Service',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 select-none">
      {cards.map((card) => {
        const isSelected = activeFilter === card.id;

        return (
          <button
            key={card.id}
            type="button"
            onClick={() => onFilterSelect?.(card.id)}
            className={`relative overflow-hidden text-left rounded-xl border p-5 transition-all duration-150 shadow-2xs hover:shadow-elevated cursor-pointer ${
              isSelected ? card.colorScheme.activeBg : `${card.colorScheme.bg} ${card.colorScheme.border}`
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10.5px] font-bold text-slate-500 block tracking-wider uppercase font-mono">
                  {card.title}
                </span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-2xl sm:text-3xl font-display font-extrabold tracking-tight ${card.colorScheme.text}`}>
                    {isLoading ? (
                      <span className="inline-block w-8 h-6 bg-slate-200 rounded animate-pulse" />
                    ) : (
                      card.count
                    )}
                  </span>
                </div>
              </div>

              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-2xs shrink-0 ${card.colorScheme.iconBg}`}>
                {card.icon}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-medium truncate max-w-[130px]">{card.subtitle}</span>
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
