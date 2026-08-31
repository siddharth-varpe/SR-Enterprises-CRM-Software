import React from 'react';
import { RotateCw } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface CaptchaDisplayProps {
  svg: string;
  loading?: boolean;
  onRefresh: () => void;
  className?: string;
}

export const CaptchaDisplay: React.FC<CaptchaDisplayProps> = ({
  svg,
  loading = false,
  onRefresh,
  className,
}) => {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-xs font-semibold text-slate-700">Captcha Challenge</label>

      <div className="flex items-center gap-3">
        {/* Visual Captcha Box */}
        <div className="flex-1 h-14 bg-white border border-slate-200/90 rounded-xl flex items-center justify-center p-1 overflow-hidden shadow-2xs select-none">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <RotateCw className="w-4 h-4 animate-spin text-primary-600" />
              <span>Generating challenge...</span>
            </div>
          ) : svg ? (
            <div
              className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:border-none [&>svg]:bg-transparent"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <div className="text-xs text-slate-400 font-medium">Loading challenge...</div>
          )}
        </div>

        {/* 1-Click Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          aria-label="Refresh captcha"
          title="Refresh captcha"
          className="p-3 text-primary-600 hover:text-primary-700 hover:bg-sky-50 active:scale-95 rounded-xl border border-sky-200/90 transition-all duration-150 cursor-pointer disabled:opacity-50 shrink-0 shadow-2xs"
        >
          <RotateCw className={cn('w-5 h-5', loading && 'animate-spin')} />
        </button>
      </div>
    </div>
  );
};
