import React from 'react';
import { cn } from '../../lib/utils';

export type BadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  pill?: boolean;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  pill = true,
  dot = false,
  children,
  ...props
}) => {
  const variants: Record<BadgeVariant, string> = {
    neutral: 'bg-slate-100 text-slate-800 border-slate-200/90',
    primary: 'bg-sky-50 text-sky-800 border-sky-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-50 text-amber-900 border-amber-200',
    danger: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-teal-50 text-teal-800 border-teal-200',
  };

  const dotColors: Record<BadgeVariant, string> = {
    neutral: 'bg-slate-500',
    primary: 'bg-sky-600',
    success: 'bg-emerald-600',
    warning: 'bg-amber-600',
    danger: 'bg-red-600',
    info: 'bg-teal-600',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-semibold border transition-colors select-none',
        pill ? 'rounded-full' : 'rounded-md',
        variants[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} />}
      {children}
    </span>
  );
};
