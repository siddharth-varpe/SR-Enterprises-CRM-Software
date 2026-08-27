import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { SearchInput } from '../../components/ui/SearchInput';
import { Select } from '../../components/ui/Select';
import { DataTable, type ColumnDef } from '../../components/ui/DataTable';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useInvoicesQuery, type InvoiceSummaryData } from './invoices.api';
import { FileText, Eye, Calendar, User, ArrowUpRight } from 'lucide-react';
import type { InvoiceQueryFilter } from '@crm/validation';

export const InvoiceDirectory: React.FC = () => {
  const navigate = useNavigate();

  const [filters, setFilters] = useState<Partial<InvoiceQueryFilter>>({
    page: 1,
    limit: 10,
    search: '',
    status: undefined,
    sortBy: 'invoiceDate',
    sortOrder: 'desc',
  });

  const { data: response, isLoading } = useInvoicesQuery(filters);

  const invoices = response?.data || [];
  const pagination = response?.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };

  const columns: ColumnDef<InvoiceSummaryData>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      render: (row: InvoiceSummaryData) => (
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div
              className="font-bold text-slate-900 hover:text-primary-600 cursor-pointer flex items-center gap-1"
              onClick={() => navigate(`/invoices/${row.id}`)}
            >
              {row.invoiceNumber}
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              {new Date(row.invoiceDate).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (row: InvoiceSummaryData) => (
        <div>
          <div
            className="font-medium text-slate-900 hover:text-primary-600 cursor-pointer flex items-center gap-1"
            onClick={() => navigate(`/customers/${row.customerId}`)}
          >
            <User className="w-3.5 h-3.5 text-slate-400" />
            {row.customerName}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {row.customerPhone} • <span className="font-mono text-[11px]">{row.customerNumber}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (row: InvoiceSummaryData) => {
        const isOverdue = new Date(row.dueDate) < new Date() && parseFloat(row.outstandingAmount) > 0;
        return (
          <div className="text-xs">
            <div className={`font-medium ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-700'}`}>
              {new Date(row.dueDate).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </div>
            {isOverdue && <span className="text-[10px] text-red-500 font-semibold uppercase">Overdue</span>}
          </div>
        );
      },
    },
    {
      key: 'totalAmount',
      header: 'Total Billed',
      render: (row: InvoiceSummaryData) => (
        <div className="font-bold text-slate-900 font-mono text-xs">
          ₹{parseFloat(row.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
      ),
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      render: (row: InvoiceSummaryData) => {
        const outstanding = parseFloat(row.outstandingAmount);
        return (
          <div
            className={`font-mono text-xs font-semibold ${
              outstanding > 0 ? 'text-amber-700' : 'text-emerald-600'
            }`}
          >
            {outstanding > 0 ? `₹${outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'Paid in Full'}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: InvoiceSummaryData) => {
        return <StatusBadge status={row.status} />;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: InvoiceSummaryData) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/invoices/${row.id}`)}
            leftIcon={<Eye className="w-3.5 h-3.5 text-slate-500" />}
          >
            View
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <PageHeader
        title="Invoices & Billing"
        description="Authoritative GST tax invoices, billing snapshots, and outstanding receivables."
        breadcrumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Invoices' }]}
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="w-full md:w-96">
          <SearchInput
            placeholder="Search invoice #, customer name, or phone..."
            value={filters.search || ''}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
            onClear={() => setFilters((prev) => ({ ...prev, search: '', page: 1 }))}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="w-44">
            <Select
              options={[
                { value: '', label: 'All Invoices' },
                { value: 'ISSUED', label: 'Not Paid' },
                { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
                { value: 'PAID', label: 'Paid' },
                { value: 'OVERDUE', label: 'Overdue' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
              value={filters.status || ''}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  status: (e.target.value as any) || undefined,
                  page: 1,
                }))
              }
            />
          </div>

          <div className="w-44">
            <Select
              options={[
                { value: 'invoiceDate:desc', label: 'Newest Invoices' },
                { value: 'invoiceDate:asc', label: 'Oldest Invoices' },
                { value: 'totalAmount:desc', label: 'Highest Amount' },
                { value: 'totalAmount:asc', label: 'Lowest Amount' },
              ]}
              value={`${filters.sortBy || 'invoiceDate'}:${filters.sortOrder || 'desc'}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split(':');
                setFilters((prev) => ({ ...prev, sortBy: sortBy as any, sortOrder: sortOrder as any, page: 1 }));
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <DataTable<InvoiceSummaryData>
          columns={columns}
          data={invoices}
          isLoading={isLoading}
          keyExtractor={(item) => item.id}
          pagination={{
            page: pagination.page,
            pageSize: pagination.limit || 10,
            total: pagination.total,
          }}
          onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
          emptyTitle="No invoices found"
          emptyDescription={
            filters.search || filters.status
              ? 'No invoices match the current search or filters.'
              : 'Invoices are automatically generated when sales orders are confirmed.'
          }
        />
      </div>
    </div>
  );
};
