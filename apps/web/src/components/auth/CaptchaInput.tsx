import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface CaptchaInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export const CaptchaInput: React.FC<CaptchaInputProps> = ({
  value,
  onChange,
  error,
  disabled = false,
  className,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Force uppercase and remove spaces, max 5 chars
    const cleaned = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
    onChange(cleaned);
  };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor="captcha-input" className="text-xs font-semibold text-slate-700">
        Enter Captcha
      </label>

      <div className="relative">
        {/* Left Shield Icon */}
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
          <ShieldCheck className="w-5 h-5" />
        </div>

        {/* Input Field */}
        <input
          id="captcha-input"
          type="text"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder="Enter the captcha above"
          maxLength={5}
          autoComplete="off"
          spellCheck="false"
          aria-invalid={!!error}
          aria-describedby={error ? 'captcha-error' : undefined}
          className={cn(
            'w-full h-12 pl-12 pr-4 bg-white rounded-xl border text-sm font-bold font-mono text-slate-900 tracking-widest placeholder:text-slate-400 placeholder:tracking-normal placeholder:font-sans placeholder:font-normal transition-all duration-150',
            'border-slate-200/90 hover:border-slate-300 focus:border-primary-600 focus:ring-2 focus:ring-primary-500/20 focus:outline-none shadow-2xs',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            disabled && 'bg-slate-100 cursor-not-allowed opacity-75'
          )}
        />
      </div>

      {error && (
        <span id="captcha-error" role="alert" className="text-xs font-semibold text-red-600">
          {error}
        </span>
      )}
    </div>
  );
};
