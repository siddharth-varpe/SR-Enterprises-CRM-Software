import React from 'react';
import { SearchInput } from '../../../components/ui/SearchInput';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { Plus, RotateCcw } from 'lucide-react';
import type { ServiceQueryFilter } from '@crm/validation';

export interface ServiceToolbarProps {
  filters: Partial<ServiceQueryFilter>;
  onFilterChange: (updates: Partial<ServiceQueryFilter>) => void;
  onResetFilters: () => void;
  onOpenScheduleModal: () => void;
}

export const ServiceToolbar: React.FC<ServiceToolbarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  onOpenScheduleModal,
}) => {
  const statusTabs = [
    { id: 'ALL', label: 'All Services' },
    { id: 'SCHEDULED', label: 'Scheduled' },
    { id: 'ASSIGNED', label: 'Assigned' },
    { id: 'IN_PROGRESS', label: 'In Progress' },
    { id: 'COMPLETED', label: 'Completed' },
    { id: 'CANCELLED', label: 'Cancelled' },
  ];

  const currentStatus = filters.status || 'ALL';

  const hasActiveFilters = Boolean(
    filters.search ||
      (filters.status && filters.status !== 'ALL') ||
      (filters.classification && filters.classification !== 'ALL') ||
      (filters.location && filters.location !== 'ALL') ||
      (filters.priority && filters.priority !== 'ALL') ||
      filters.targetDate
  );

  return (
    <div className="space-y-4">
      {/* Top Status Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-1 border-b border-slate-200/90">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {statusTabs.map((tab) => {
            const isActive = currentStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onFilterChange({ status: tab.id as any, page: 1 })}
                className={`px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Schedule Service Primary CTA */}
        <Button
          onClick={onOpenScheduleModal}
          size="sm"
          className="bg-primary-600 hover:bg-primary-700 text-white font-bold shrink-0 shadow-2xs rounded-xl"
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Schedule Service
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search Input */}
        <div className="w-full lg:w-96">
          <SearchInput
            placeholder="Search by SRV #, customer, phone, serial #, or technician..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
            onClear={() => onFilterChange({ search: '', page: 1 })}
          />
        </div>

        {/* Multi-criteria Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end">
          {/* Classification Filter (General vs Warranty) */}
          <div className="w-40 sm:w-44">
            <Select
              options={[
                { value: 'ALL', label: 'All Classifications' },
                { value: 'WARRANTY', label: 'Warranty Services' },
                { value: 'GENERAL', label: 'General Services' },
              ]}
              value={filters.classification || 'ALL'}
              onChange={(e) => onFilterChange({ classification: e.target.value as any, page: 1 })}
            />
          </div>

          {/* Location Category Filter (Doorstep vs In-Shop) */}
          <div className="w-36 sm:w-40">
            <Select
              options={[
                { value: 'ALL', label: 'All Locations' },
                { value: 'DOORSTEP', label: 'Doorstep Visit' },
                { value: 'IN_SHOP', label: 'In-Shop Repair' },
              ]}
              value={filters.location || 'ALL'}
              onChange={(e) => onFilterChange({ location: e.target.value as any, page: 1 })}
            />
          </div>

          {/* Priority Filter */}
          <div className="w-36 sm:w-38">
            <Select
              options={[
                { value: 'ALL', label: 'All Priorities' },
                { value: 'URGENT', label: 'Urgent' },
                { value: 'HIGH', label: 'High' },
                { value: 'NORMAL', label: 'Normal' },
                { value: 'LOW', label: 'Low' },
              ]}
              value={filters.priority || 'ALL'}
              onChange={(e) => onFilterChange({ priority: e.target.value as any, page: 1 })}
            />
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onResetFilters}
              className="text-xs text-slate-600 hover:text-slate-900 border-slate-200"
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              title="Reset all filters"
            >
              Reset
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
