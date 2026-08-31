import React from 'react';
import {
  Calendar,
  RefreshCw,
  Download,
  ChevronDown,
  Layers,
  TrendingUp,
  Users,
  Wrench,
  FileText,
  WalletCards,
  Package,
  HardHat,
} from 'lucide-react';
import type { ReportFilterState, ReportType, CompareOption } from '../reports.types';

interface ReportControlBarProps {
  filters: ReportFilterState;
  onFilterChange: (updates: Partial<ReportFilterState>) => void;
  onRefresh: () => void;
  onExport: () => void;
  isRefreshing?: boolean;
}

const REPORT_TABS: { id: ReportType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: Layers },
  { id: 'sales', label: 'Sales', icon: TrendingUp },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'services', label: 'Services', icon: Wrench },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'payments', label: 'Payments', icon: WalletCards },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'technicians', label: 'Technicians', icon: HardHat },
];

export const ReportControlBar: React.FC<ReportControlBarProps> = ({
  filters,
  onFilterChange,
  onRefresh,
  onExport,
  isRefreshing = false,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3 space-y-3">
      {/* Top Row: Report Type Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-100">
        {REPORT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = filters.reportType === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onFilterChange({ reportType: tab.id })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer font-sans ${
                isActive
                  ? 'bg-sky-50 text-sky-800 border border-sky-200/80 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary-600' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom Controls Row: Date Range, Compare With, Custom Dates & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
        {/* Left Side: Date Range & Comparison Selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Preset Dropdown */}
          <div className="relative">
            <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl px-3 py-1.5 border border-slate-200 shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <select
                value={filters.datePreset}
                onChange={(e) => onFilterChange({ datePreset: e.target.value as any })}
                className="appearance-none bg-transparent font-mono text-xs text-slate-800 pr-5 focus:outline-none cursor-pointer"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="7D">This Week (7D)</option>
                <option value="last_week">Last Week</option>
                <option value="this_month">This Month</option>
                <option value="previous_month">Last Month</option>
                <option value="this_quarter">This Quarter</option>
                <option value="this_year">This Year</option>
                <option value="custom">Custom Range</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Custom Date Range Inputs if "custom" selected */}
          {filters.datePreset === 'custom' && (
            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs shadow-2xs animate-in fade-in">
              <input
                type="date"
                value={filters.customStartDate || ''}
                onChange={(e) => onFilterChange({ customStartDate: e.target.value })}
                className="bg-white text-slate-800 font-mono text-xs px-2.5 py-1 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <span className="text-slate-400 text-xs font-mono">to</span>
              <input
                type="date"
                value={filters.customEndDate || ''}
                onChange={(e) => onFilterChange({ customEndDate: e.target.value })}
                className="bg-white text-slate-800 font-mono text-xs px-2.5 py-1 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
          )}

          {/* Compare With Dropdown */}
          <div className="relative">
            <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs rounded-xl px-3 py-1.5 border border-slate-200 shadow-2xs">
              <span className="text-[11px] text-slate-400 font-sans">Compare:</span>
              <select
                value={filters.compareWith}
                onChange={(e) => onFilterChange({ compareWith: e.target.value as CompareOption })}
                className="appearance-none bg-transparent font-medium text-xs text-slate-700 pr-5 focus:outline-none cursor-pointer font-sans"
              >
                <option value="previous_period">Previous Period</option>
                <option value="previous_month">Previous Month</option>
                <option value="previous_year">Previous Year</option>
                <option value="none">None</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Right Side: Refresh and Quick Export */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh analytics data"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors shadow-2xs cursor-pointer font-sans"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isRefreshing ? 'animate-spin text-primary-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors shadow-2xs cursor-pointer font-sans"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export</span>
          </button>
        </div>
      </div>
    </div>
  );
};
