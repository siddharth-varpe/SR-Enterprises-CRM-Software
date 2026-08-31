import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';
import { Button } from './Button';

export interface ColumnDef<T> {
  key: string;
  header: React.ReactNode;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (row: T, index: number) => string | number;
  isLoading?: boolean;
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  pagination?: PaginationState;
  onPageChange?: (page: number) => void;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  isLoading = false,
  sort,
  onSortChange,
  pagination,
  onPageChange,
  onRowClick,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items matching your criteria.',
  emptyActionLabel,
  onEmptyAction,
  className,
}: DataTableProps<T>) {
  const handleHeaderClick = (col: ColumnDef<T>) => {
    if (!col.sortable || !onSortChange) return;

    if (sort?.column === col.key) {
      onSortChange({
        column: col.key,
        direction: sort.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      onSortChange({
        column: col.key,
        direction: 'asc',
      });
    }
  };

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 1;
  const startItem = pagination ? (pagination.page - 1) * pagination.pageSize + 1 : 1;
  const endItem = pagination ? Math.min(pagination.page * pagination.pageSize, pagination.total) : data.length;

  return (
    <div className={cn('w-full bg-white rounded-card border border-slate-200/90 shadow-2xs overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200/90 bg-slate-50/90 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              {columns.map((col) => {
                const isSorted = sort?.column === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    style={col.width ? { width: col.width } : undefined}
                    onClick={() => handleHeaderClick(col)}
                    className={cn(
                      'px-4 py-3.5 select-none',
                      col.align === 'center' && 'text-center',
                      col.align === 'right' && 'text-right',
                      col.sortable && 'cursor-pointer hover:bg-slate-100/80 transition-colors'
                    )}
                  >
                    <div
                      className={cn(
                        'inline-flex items-center gap-1.5',
                        col.align === 'center' && 'justify-center',
                        col.align === 'right' && 'justify-end'
                      )}
                    >
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="text-slate-400">
                          {isSorted ? (
                            sort?.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-primary-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-primary-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              // Skeleton loading rows
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={`skeleton-${rIdx}`}>
                  {columns.map((_col, cIdx) => (
                    <td key={`skeleton-cell-${cIdx}`} className="px-4 py-3.5">
                      <Skeleton className="h-4 w-full max-w-[120px]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty Table View
              <tr>
                <td colSpan={columns.length} className="p-8 text-center">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    actionLabel={emptyActionLabel}
                    onAction={onEmptyAction}
                  />
                </td>
              </tr>
            ) : (
              // Actual Data Rows
              data.map((row, rIdx) => (
                <tr
                  key={keyExtractor(row, rIdx)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'transition-colors duration-fast text-slate-800 text-xs lg:text-sm font-medium',
                    onRowClick ? 'cursor-pointer hover:bg-slate-50/90 active:bg-slate-100/70' : 'hover:bg-slate-50/50'
                  )}
                >
                  {columns.map((col) => {
                    const cellValue = (row as any)[col.key];
                    return (
                      <td
                        key={`${keyExtractor(row, rIdx)}-${col.key}`}
                        className={cn(
                          'px-4 py-3.5',
                          col.align === 'center' && 'text-center',
                          col.align === 'right' && 'text-right'
                        )}
                      >
                        {col.render ? col.render(row, rIdx) : cellValue !== undefined ? String(cellValue) : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Pagination Bar */}
      {pagination && pagination.total > 0 && (
        <div className="px-4 py-3 border-t border-slate-200/80 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing <span className="font-bold text-slate-900">{startItem}</span> to{' '}
            <span className="font-bold text-slate-900">{endItem}</span> of{' '}
            <span className="font-bold text-slate-900">{pagination.total}</span> entries
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1 || isLoading}
              onClick={() => onPageChange?.(pagination.page - 1)}
              aria-label="Previous page"
              className="px-2 py-1 h-8"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <span className="px-2 font-semibold text-slate-700 font-mono text-[11px]">
              Page {pagination.page} of {totalPages || 1}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= totalPages || isLoading}
              onClick={() => onPageChange?.(pagination.page + 1)}
              aria-label="Next page"
              className="px-2 py-1 h-8"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
