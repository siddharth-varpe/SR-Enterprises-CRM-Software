import React, { forwardRef, useId } from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      containerClassName,
      label,
      error,
      helperText,
      id: customId,
      disabled,
      required,
      rows = 3,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const textareaId = customId || generatedId;
    const errorId = `${textareaId}-error`;
    const helperId = `${textareaId}-helper`;

    return (
      <div className={cn('w-full space-y-1.5', containerClassName)}>
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            {label} {required && <span className="text-danger-600">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={cn(
            'w-full rounded-btn border bg-white p-3 text-sm text-slate-900 transition-colors duration-fast placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed',
            error
              ? 'border-danger-500 text-danger-900 focus:ring-danger-500'
              : 'border-slate-300 hover:border-slate-400',
            className
          )}
          {...props}
        />

        {error && (
          <p id={errorId} role="alert" className="text-xs text-danger-600 font-medium">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p id={helperId} className="text-xs text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
