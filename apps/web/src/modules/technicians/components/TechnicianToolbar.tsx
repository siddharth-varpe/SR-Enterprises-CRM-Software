import React from 'react';
import { Search, Plus, Filter, RefreshCw } from 'lucide-react';

export interface TechnicianToolbarProps {
  search: string;
  onSearchChange: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  onCreateClick: () => void;
  onRefresh?: () => void;
  isFetching?: boolean;
}

export const TechnicianToolbar: React.FC<TechnicianToolbarProps> = ({
  search,
  onSearchChange,
  status,
  onStatusChange,
  onCreateClick,
  onRefresh,
  isFetching,
}) => {
  const statusTabs = [
    { id: 'ALL', label: 'All Technicians' },
    { id: 'ACTIVE', label: 'Active & Available' },
    { id: 'ON_LEAVE', label: 'On Leave' },
    { id: 'INACTIVE', label: 'Inactive' },
  ];

  return (
    <div className="space-y-4">
      {/* Top row: search + action button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search technician by name, phone, email, address..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full w-4 h-4 flex items-center justify-center cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isFetching}
              title="Refresh technicians"
              className="p-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          )}

          <button
            type="button"
            onClick={onCreateClick}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Technician</span>
          </button>
        </div>
      </div>

      {/* Bottom row: Status tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-slate-100">
        <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 flex-shrink-0" />
        {statusTabs.map((tab) => {
          const isActive = status === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onStatusChange(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100/70 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
