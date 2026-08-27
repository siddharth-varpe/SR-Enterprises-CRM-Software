import React from 'react';
import { cn } from '../../lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rectangular' | 'circular' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rectangular',
  ...props
}) => {
  return (
    <div
      className={cn(
        'animate-pulse bg-slate-200/80',
        variant === 'circular' && 'rounded-full',
        variant === 'text' && 'rounded h-4 w-full',
        variant === 'rectangular' && 'rounded-btn',
        className
      )}
      {...props}
    />
  );
};
