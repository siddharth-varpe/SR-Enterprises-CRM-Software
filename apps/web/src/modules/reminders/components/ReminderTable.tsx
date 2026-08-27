import React from 'react';
import { Card } from '../../../components/ui/Card';
import { Pagination } from '../../../components/ui/Pagination';
import { formatDate } from '../../../lib/formatters';
import type { ReminderItem } from '../reminders.api';
import {
  Bell,
  CheckCircle2,
  Calendar,
  User,
  Phone,
  FileText,
  AlertTriangle,
  Clock,
  Ban,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface ReminderTableProps {
  reminders: ReminderItem[];
  isLoading: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
  onComplete: (reminder: ReminderItem) => void;
  onCancel: (reminder: ReminderItem) => void;
}

export const ReminderTable: React.FC<ReminderTableProps> = ({
  reminders,
  isLoading,
  pagination,
  onPageChange,
  onComplete,
  onCancel,
}) => {
  const getPriorityBadge = (priority: ReminderItem['priority']) => {
    switch (priority) {
      case 'URGENT':
        return <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 uppercase">Urgent</span>;
      case 'HIGH':
        return <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase">High</span>;
      case 'NORMAL':
        return <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">Normal</span>;
      case 'LOW':
        return <span className="text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded">Low</span>;
    }
  };

  const getTypeBadge = (type: ReminderItem['reminderType']) => {
    switch (type) {
      case 'PAYMENT_FOLLOW_UP':
        return <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Payment Follow-up</span>;
      case 'OVERDUE_PAYMENT':
        return <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">Overdue Payment</span>;
      case 'INVOICE_DUE':
        return <span className="text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">Invoice Due</span>;
      case 'SERVICE_DUE':
        return <span className="text-[11px] font-medium text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-100">Service Due</span>;
      default:
        return <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">Customer Follow-up</span>;
    }
  };

  const getStatusBadge = (status: ReminderItem['status'], reminderDate: string) => {
    const isOverdue = new Date(reminderDate) < new Date() && status === 'PENDING';
    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle className="w-3 h-3" />
          Overdue
        </span>
      );
    }

    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <Card className="border border-slate-200 shadow-subtle overflow-hidden">
        <div className="p-8 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading reminder tasks...</p>
        </div>
      </Card>
    );
  }

  if (reminders.length === 0) {
    return (
      <Card className="border border-slate-200 shadow-subtle overflow-hidden">
        <div className="p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">No reminders found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            All customer follow-up actions and payment reminders are up to date. Schedule a new reminder to track pending calls.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200 shadow-subtle overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="py-3 px-4">Reminder # / Type</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Related Invoice</th>
              <th className="py-3 px-4">Scheduled Date</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {reminders.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                {/* Reminder # & Type */}
                <td className="py-3.5 px-4 font-medium text-slate-900">
                  <div className="space-y-1">
                    <p className="font-mono text-xs font-semibold text-primary-700">{r.reminderNumber}</p>
                    <div>{getTypeBadge(r.reminderType)}</div>
                    {r.notes && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 italic">{r.notes}</p>
                    )}
                  </div>
                </td>

                {/* Customer */}
                <td className="py-3.5 px-4">
                  <div className="space-y-0.5">
                    <Link
                      to={`/customers/${r.customerId}`}
                      className="font-medium text-slate-900 hover:text-primary-600 flex items-center gap-1"
                    >
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {r.customerName}
                    </Link>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {r.customerPhone}
                    </div>
                  </div>
                </td>

                {/* Invoice */}
                <td className="py-3.5 px-4">
                  {r.invoiceId ? (
                    <Link
                      to={`/invoices/${r.invoiceId}`}
                      className="font-mono text-xs font-semibold text-slate-800 hover:text-primary-600 flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      {r.invoiceNumber}
                    </Link>
                  ) : (
                    <span className="text-slate-400 text-[11px]">Direct Customer</span>
                  )}
                </td>

                {/* Scheduled Date & Time */}
                <td className="py-3.5 px-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 font-medium text-slate-900">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatDate(r.reminderDate)}
                    </div>
                    {r.reminderTime && (
                      <p className="text-[11px] text-slate-500 font-mono">{r.reminderTime}</p>
                    )}
                  </div>
                </td>

                {/* Priority */}
                <td className="py-3.5 px-4">
                  {getPriorityBadge(r.priority)}
                </td>

                {/* Status */}
                <td className="py-3.5 px-4">
                  {getStatusBadge(r.status, r.reminderDate)}
                </td>

                {/* Actions */}
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {r.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => onComplete(r)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-semibold text-xs shadow-2xs transition-colors"
                          title="Mark Follow-up Completed"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Complete
                        </button>
                        <button
                          onClick={() => onCancel(r)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Cancel Reminder"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="border-t border-slate-200 px-4 py-3 bg-white">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={onPageChange}
            totalItems={pagination.total}
            pageSize={pagination.limit}
          />
        </div>
      )}
    </Card>
  );
};
