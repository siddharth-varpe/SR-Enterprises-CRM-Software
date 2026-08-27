import React from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  totalItems?: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  pageSize = 10,
  onPageSizeChange,
  totalItems,
}) => {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = totalItems ? Math.min(currentPage * pageSize, totalItems) : currentPage * pageSize;

  return (
    <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 select-none">
      {/* Left: Showing info */}
      <div className="text-slate-600 font-medium">
        Showing <span className="font-bold text-slate-900">{startItem}</span> to{' '}
        <span className="font-bold text-slate-900">{endItem}</span>
        {totalItems !== undefined && (
          <>
            {' '}of <span className="font-bold text-slate-900">{totalItems}</span> records
          </>
        )}
      </div>

      {/* Right: Pagination buttons & Page-size selector */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Page size dropdown */}
        {onPageSizeChange && (
          <div className="relative">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Items per page"
              className="h-8 pl-2.5 pr-6 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}

        {/* Previous Button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Page status */}
        <div className="px-2 font-semibold text-slate-700">
          Page {currentPage} of {Math.max(1, totalPages)}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
