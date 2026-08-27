import { Search, Plus, Filter, Clock } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export interface WarrantyToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  typeFilter: string;
  onTypeFilterChange: (type: string) => void;
  expiringOnly: boolean;
  onExpiringOnlyChange: (val: boolean) => void;
  onOpenCreateModal: () => void;
}

export const WarrantyToolbar: React.FC<WarrantyToolbarProps> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  expiringOnly,
  onExpiringOnlyChange,
  onOpenCreateModal,
}) => {
  const statusTabs = [
    { id: 'ALL', label: 'All Warranties' },
    { id: 'ACTIVE', label: 'Active' },
    { id: 'EXPIRING_SOON', label: 'Expiring Soon' },
    { id: 'EXPIRED', label: 'Expired' },
    { id: 'VOID', label: 'Void / Cancelled' },
  ];

  return (
    <div className="space-y-4">
      {/* Top Segmented Status Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/90 pb-2 overflow-x-auto">
        {statusTabs.map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onStatusFilterChange(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs">
        {/* Left Side: Search & Filters */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search warranty #, customer name, phone, serial..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 placeholder:text-slate-400 bg-slate-50/50"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={typeFilter}
              onChange={(e) => onTypeFilterChange(e.target.value)}
              className="py-1.5 px-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="ALL">All Types</option>
              <option value="STANDARD_MACHINE">Standard Machine Warranty</option>
              <option value="EXTENDED_MACHINE">Extended AMC Warranty</option>
              <option value="SPARE_PART">Spare Part Warranty</option>
              <option value="MANUFACTURER">Manufacturer Warranty</option>
              <option value="SELLER">Seller Warranty</option>
              <option value="SERVICE">Service Warranty</option>
            </select>
          </div>

          {/* Expiring Soon Toggle */}
          <button
            type="button"
            onClick={() => onExpiringOnlyChange(!expiringOnly)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              expiringOnly
                ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Expiring in 30 Days</span>
          </button>
        </div>

        {/* Right Side: Register Warranty CTA */}
        <div className="flex items-center gap-2 justify-end">
          <Button
            size="sm"
            onClick={onOpenCreateModal}
            className="bg-primary-600 hover:bg-primary-700 text-white font-bold shadow-xs whitespace-nowrap"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Register Warranty
          </Button>
        </div>
      </div>
    </div>
  );
};
