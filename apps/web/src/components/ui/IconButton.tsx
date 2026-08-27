import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import type { ButtonVariant } from './Button';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = 'ghost', size = 'md', 'aria-label': ariaLabel, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-btn transition-colors duration-fast focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none select-none';

    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-card',
      secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300 border border-slate-200',
      outline: 'bg-transparent border border-slate-300 text-slate-700 hover:bg-slate-50 active:bg-slate-100',
      ghost: 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200',
      destructive: 'bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-800 shadow-card',
      link: 'bg-transparent text-primary-600 hover:underline',
    };

    const sizes = {
      sm: 'w-7 h-7 text-xs p-1',
      md: 'w-9 h-9 text-sm p-2',
      lg: 'w-11 h-11 text-base p-2.5',
    };

    return (
      <button
        ref={ref}
        aria-label={ariaLabel}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
