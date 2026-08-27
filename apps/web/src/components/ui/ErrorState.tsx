import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  code?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load content',
  message = 'An unexpected error occurred while communicating with the server. Please try again.',
  code,
  onRetry,
  className,
}) => {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center p-8 lg:p-12 text-center rounded-card border border-danger-200 bg-danger-50/30',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-danger-100 flex items-center justify-center text-danger-600 mb-3.5">
        <AlertTriangle className="w-6 h-6" />
      </div>

      <h4 className="text-base font-semibold text-slate-900 mb-1">{title}</h4>
      <p className="text-xs text-slate-600 max-w-sm mb-2 leading-relaxed">{message}</p>

      {code && (
        <span className="font-mono text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200 mb-4">
          Reference Code: {code}
        </span>
      )}

      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Try Again
        </Button>
      )}
    </div>
  );
};
