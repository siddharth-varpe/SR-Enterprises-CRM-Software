import React from 'react';
import { BarChart3, Download, Calendar } from 'lucide-react';

interface ReportsHeaderProps {
  dateLabel: string;
  onExportClick: () => void;
  onDateClick?: () => void;
}

export const ReportsHeader: React.FC<ReportsHeaderProps> = ({
  dateLabel,
  onExportClick,
  onDateClick,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Left Title & Subtitle */}
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-2xl bg-sky-50 text-primary-600 border border-sky-100 flex items-center justify-center shadow-2xs shrink-0">
          <BarChart3 className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight font-display">Reports</h1>
            <span className="text-xs text-slate-400 font-mono hidden md:inline">
              &amp; Analytics
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-sans mt-0.5">
            Real-time business performance, customer activity, sales velocity, service SLAs, and revenue metrics.
          </p>
        </div>
      </div>

      {/* Right Actions: Export & Date Range Indicator */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onDateClick}
          className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200/90 shadow-2xs transition-colors cursor-pointer font-mono"
        >
          <Calendar className="w-4 h-4 text-slate-500" />
          <span>{dateLabel}</span>
        </button>

        <button
          type="button"
          onClick={onExportClick}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors cursor-pointer font-sans"
        >
          <Download className="w-4 h-4" />
          <span>Export Report</span>
        </button>
      </div>
    </div>
  );
};
