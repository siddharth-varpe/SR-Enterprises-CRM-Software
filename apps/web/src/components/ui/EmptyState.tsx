import React from 'react';
import { PackageOpen } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 lg:p-12 text-center rounded-card border border-dashed border-slate-300 bg-slate-50/60',
        className
      )}
    >
      <div className="w-12 h-12 rounded-xl bg-slate-100/90 border border-slate-200/80 flex items-center justify-center text-slate-400 mb-3.5">
        {icon || <PackageOpen className="w-6 h-6 text-slate-400" />}
      </div>

      <h4 className="text-base font-display font-bold text-slate-900 mb-1 tracking-tight">{title}</h4>
      {description && <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed font-medium">{description}</p>}

      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
