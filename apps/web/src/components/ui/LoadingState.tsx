import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data...',
  size = 'md',
  className,
}) => {
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-7 h-7',
    lg: 'w-10 h-10',
  };

  return (
    <div
      role="status"
      className={cn('flex flex-col items-center justify-center p-8 gap-3 text-slate-500', className)}
    >
      <Loader2 className={cn('animate-spin text-primary-600', iconSizes[size])} />
      {message && <p className="text-xs font-medium text-slate-600">{message}</p>}
      <span className="sr-only">Loading</span>
    </div>
  );
};
