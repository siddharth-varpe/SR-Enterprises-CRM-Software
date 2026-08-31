import React from 'react';
import { cn } from '../../../lib/utils';

export interface RentalStatusBadgeProps {
  status: string;
  type?: 'rental' | 'payment' | 'deposit';
  className?: string;
}

export const RentalStatusBadge: React.FC<RentalStatusBadgeProps> = ({
  status,
  type = 'rental',
  className,
}) => {
  const normalized = (status || '').toUpperCase();

  let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';
  let label = status;

  if (type === 'rental') {
    switch (normalized) {
      case 'ACTIVE':
        badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200/90';
        dotColor = 'bg-emerald-500';
        label = 'Active';
        break;
      case 'PAYMENT_DUE':
        badgeClass = 'bg-amber-50 text-amber-900 border-amber-200/90';
        dotColor = 'bg-amber-500 animate-pulse';
        label = 'Payment Due';
        break;
      case 'OVERDUE':
        badgeClass = 'bg-rose-50 text-rose-900 border-rose-200/90';
        dotColor = 'bg-rose-500 animate-pulse';
        label = 'Overdue';
        break;
      case 'RETURNED':
        badgeClass = 'bg-slate-100 text-slate-700 border-slate-300';
        dotColor = 'bg-slate-400';
        label = 'Returned';
        break;
      case 'COMPLETED':
        badgeClass = 'bg-indigo-50 text-indigo-800 border-indigo-200/90';
        dotColor = 'bg-indigo-500';
        label = 'Completed';
        break;
      case 'SUSPENDED':
        badgeClass = 'bg-orange-50 text-orange-800 border-orange-200/90';
        dotColor = 'bg-orange-500';
        label = 'Suspended';
        break;
      case 'TERMINATED':
        badgeClass = 'bg-zinc-100 text-zinc-700 border-zinc-300';
        dotColor = 'bg-zinc-400';
        label = 'Terminated';
        break;
      default:
        label = status.replace(/_/g, ' ');
    }
  } else if (type === 'payment') {
    switch (normalized) {
      case 'PAID':
        badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200/90';
        dotColor = 'bg-emerald-500';
        label = 'Paid';
        break;
      case 'PARTIALLY_PAID':
        badgeClass = 'bg-amber-50 text-amber-900 border-amber-200/90';
        dotColor = 'bg-amber-500';
        label = 'Partial';
        break;
      case 'DUE':
        badgeClass = 'bg-amber-50 text-amber-900 border-amber-200/90';
        dotColor = 'bg-amber-500';
        label = 'Due';
        break;
      case 'OVERDUE':
        badgeClass = 'bg-rose-50 text-rose-900 border-rose-200/90';
        dotColor = 'bg-rose-500';
        label = 'Overdue';
        break;
      case 'NOT_PAID':
        badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
        dotColor = 'bg-slate-400';
        label = 'Not Paid';
        break;
      default:
        label = status.replace(/_/g, ' ');
    }
  } else if (type === 'deposit') {
    switch (normalized) {
      case 'COLLECTED':
        badgeClass = 'bg-teal-50 text-teal-800 border-teal-200/90';
        dotColor = 'bg-teal-500';
        label = 'Deposit Collected';
        break;
      case 'NOT_COLLECTED':
        badgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
        dotColor = 'bg-slate-400';
        label = 'No Deposit';
        break;
      case 'FULLY_REFUNDED':
        badgeClass = 'bg-blue-50 text-blue-800 border-blue-200/90';
        dotColor = 'bg-blue-500';
        label = 'Deposit Refunded';
        break;
      case 'PARTIALLY_REFUNDED':
        badgeClass = 'bg-purple-50 text-purple-800 border-purple-200/90';
        dotColor = 'bg-purple-500';
        label = 'Partial Refund';
        break;
      case 'FORFEITED_ADJUSTED':
        badgeClass = 'bg-rose-50 text-rose-800 border-rose-200/90';
        dotColor = 'bg-rose-500';
        label = 'Deposit Adjusted';
        break;
      default:
        label = status.replace(/_/g, ' ');
    }
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border shadow-2xs font-mono tracking-tight shrink-0',
        badgeClass,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColor)} />
      <span>{label}</span>
    </span>
  );
};
