import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useCustomerFinancialSummaryQuery } from '../customer.api';
import { useAuth } from '../../../providers/AuthBoundary';
import { IndianRupee, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

export interface CustomerFinancialPanelProps {
  customerId: string;
}

export const CustomerFinancialPanel: React.FC<CustomerFinancialPanelProps> = ({ customerId }) => {
  const { hasPermission } = useAuth();
  const canViewFinancials = hasPermission('invoices.view') || hasPermission('payments.view');

  const { data: summary, isLoading, isError } = useCustomerFinancialSummaryQuery(customerId);

  if (!canViewFinancials) {
    return (
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-sm">Financial Position</CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center text-xs text-slate-400">
          Financial information is restricted to authorized billing administrators.
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-slate-200 space-y-3 p-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </Card>
    );
  }

  if (isError || !summary) {
    return (
      <Card className="border-slate-200 p-5 text-center text-xs text-slate-500">
        Financial records temporarily unavailable.
      </Card>
    );
  }

  const outstandingNum = parseFloat(summary.outstanding || '0');
  const overdueNum = parseFloat(summary.overdue || '0');

  return (
    <Card className="border-slate-200 shadow-card overflow-hidden">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100">
        <div>
          <CardTitle className="text-sm flex items-center gap-1.5">
            <IndianRupee className="w-4 h-4 text-primary-600" />
            <span>Financial Position</span>
          </CardTitle>
          <span className="text-[11px] text-slate-500 block">Authoritative Ledger Read Model</span>
        </div>
        <StatusBadge status={summary.paymentHealth} />
      </CardHeader>

      <CardContent className="p-5 space-y-4">
        {/* Outstanding Balance Highlight Box */}
        <div
          className={`p-4 rounded-btn border text-center space-y-1 ${
            overdueNum > 0
              ? 'bg-rose-50 border-rose-200 text-rose-950'
              : outstandingNum > 0
              ? 'bg-amber-50 border-amber-200 text-amber-950'
              : 'bg-emerald-50 border-emerald-200 text-emerald-950'
          }`}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wider block opacity-80">
            {overdueNum > 0 ? 'Overdue Balance' : 'Current Outstanding'}
          </span>
          <div className="text-2xl font-bold tracking-tight">
            ₹{outstandingNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          {overdueNum > 0 && (
            <div className="flex items-center justify-center gap-1 text-xs text-rose-700 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>₹{overdueNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })} past due date</span>
            </div>
          )}
        </div>

        {/* Breakdown Items */}
        <div className="divide-y divide-slate-100 text-xs">
          <div className="py-2.5 flex items-center justify-between">
            <span className="text-slate-600">Total Invoiced</span>
            <span className="font-semibold text-slate-900">
              ₹{parseFloat(summary.totalBilled || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <span className="text-slate-600">Total Collected</span>
            <span className="font-semibold text-emerald-600">
              ₹{parseFloat(summary.totalPaid || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          {summary.lastPaymentDate && (
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-600 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Last Payment</span>
              </span>
              <div className="text-right">
                <span className="font-semibold text-slate-900 block">
                  ₹{parseFloat(summary.lastPaymentAmount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(summary.lastPaymentDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Clean Ledger Audit Guarantee Badge */}
        <div className="p-2.5 rounded bg-slate-50 border border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
          <CheckCircle className="w-4 h-4 text-primary-600 shrink-0" />
          <span>Synced with PostgreSQL ledger</span>
        </div>
      </CardContent>
    </Card>
  );
};
