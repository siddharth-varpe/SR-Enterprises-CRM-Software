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
        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shadow-xs shrink-0">
          <BarChart3 className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reports</h1>
            <span className="text-xs text-slate-400 font-normal hidden md:inline">
              &amp; Analytics
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-normal">
            Track business performance, customer activity, sales, services and revenue.
          </p>
        </div>
      </div>

      {/* Right Actions: Export & Date Range Indicator */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={onDateClick}
          className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg border border-slate-200 shadow-2xs transition-colors cursor-pointer"
        >
          <Calendar className="w-4 h-4 text-slate-500" />
          <span>{dateLabel}</span>
        </button>

        <button
          type="button"
          onClick={onExportClick}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Export Report</span>
        </button>
      </div>
    </div>
  );
};
