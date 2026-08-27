import React from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

export interface CustomerPaginationProps {
  currentPage?: number;
  totalCustomers?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export const CustomerPagination: React.FC<CustomerPaginationProps> = ({
  currentPage = 1,
  totalCustomers = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalCustomers / pageSize));
  const page = Math.min(Math.max(1, currentPage), totalPages);

  const fromRecord = totalCustomers === 0 ? 0 : (page - 1) * pageSize + 1;
  const toRecord = Math.min(page * pageSize, totalCustomers);

  const handlePageClick = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === page) return;
    onPageChange?.(newPage);
  };

  const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    onPageSizeChange?.(newSize);
  };

  // Generate page numbers with ellipsis window
  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];
    pages.push(1);

    if (page > 3) {
      pages.push('...');
    }

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    for (let i = start; i <= end; i++) {
      if (!pages.includes(i)) {
        pages.push(i);
      }
    }

    if (page < totalPages - 2) {
      pages.push('...');
    }

    if (!pages.includes(totalPages)) {
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 select-none">
      {/* Left: Showing info */}
      <div className="text-slate-600 font-medium">
        Showing <span className="font-bold text-slate-900">{fromRecord}</span> to{' '}
        <span className="font-bold text-slate-900">{toRecord}</span> of{' '}
        <span className="font-bold text-slate-900">{totalCustomers}</span> customers
      </div>

      {/* Right: Pagination buttons & Page-size selector */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Page size dropdown */}
        <div className="relative">
          <select
            value={pageSize}
            onChange={handleSizeChange}
            aria-label="Items per page"
            className="h-8 pl-2.5 pr-6 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#1E88E5]"
          >
            <option value={10}>10 / page</option>
            <option value={20}>20 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
          <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Previous Button */}
        <button
          type="button"
          onClick={() => handlePageClick(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="w-5 text-center text-slate-400 font-bold">
                  ...
                </span>
              );
            }

            const pNum = Number(p);
            const isActive = pNum === page;

            return (
              <button
                key={`page-${pNum}`}
                type="button"
                onClick={() => handlePageClick(pNum)}
                aria-label={`Page ${pNum}`}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center ${
                  isActive
                    ? 'bg-[#1E88E5] text-white shadow-xs'
                    : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                {pNum}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => handlePageClick(page + 1)}
          disabled={page >= totalPages}
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
