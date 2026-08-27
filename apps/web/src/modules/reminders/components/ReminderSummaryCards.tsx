import React from 'react';
import { Card, CardContent } from '../../../components/ui/Card';
import type { ReminderKPIs } from '../reminders.api';
import {
  Bell,
  Clock,
  AlertTriangle,
} from 'lucide-react';

interface ReminderSummaryCardsProps {
  kpis?: ReminderKPIs;
  isLoading?: boolean;
}

export const ReminderSummaryCards: React.FC<ReminderSummaryCardsProps> = ({ kpis, isLoading }) => {
  const cards = [
    {
      title: 'Total Follow-ups',
      value: kpis?.totalReminders?.toString() || '0',
      subtitle: 'All recorded customer reminders',
      icon: Bell,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-100',
    },
    {
      title: 'Pending Reminders',
      value: kpis?.pendingCount?.toString() || '0',
      subtitle: 'Awaiting customer follow-up',
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100',
    },
    {
      title: 'Due Today',
      value: kpis?.dueTodayCount?.toString() || '0',
      subtitle: 'Action items scheduled today',
      icon: AlertTriangle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-100',
    },
    {
      title: 'Overdue / Missed',
      value: kpis?.overdueCount?.toString() || '0',
      subtitle: 'Past scheduled follow-up date',
      icon: AlertTriangle,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Card key={idx} className={`border ${card.borderColor} shadow-subtle hover:shadow-card transition-shadow`}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-500">{card.title}</p>
                {isLoading ? (
                  <div className="h-7 w-20 bg-slate-100 animate-pulse rounded" />
                ) : (
                  <p className="text-xl font-bold text-slate-900 tracking-tight">{card.value}</p>
                )}
                <p className="text-[11px] text-slate-400">{card.subtitle}</p>
              </div>
              <div className={`p-3 rounded-xl ${card.bgColor} ${card.color} shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
