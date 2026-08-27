import React from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Button } from '../../../components/ui/Button';
import { ShieldCheck, ShieldAlert, Cpu, Clock, ArrowUpRight } from 'lucide-react';
import type { WarrantyItem } from '../warranties.api';

export interface WarrantyTableProps {
  warranties: WarrantyItem[];
  isLoading?: boolean;
  onOpenExtendModal?: (warranty: WarrantyItem) => void;
}

export const WarrantyTable: React.FC<WarrantyTableProps> = ({
  warranties,
  isLoading,
  onOpenExtendModal,
}) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-12 text-center text-slate-500">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-xs font-medium">Loading warranty records...</span>
      </div>
    );
  }

  if (warranties.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-12 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">No Warranty Records Found</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          No warranties match the selected status, category, or search filters.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              <th className="py-3.5 px-4">Warranty Number</th>
              <th className="py-3.5 px-4">Customer</th>
              <th className="py-3.5 px-4">Machine & Serial Number</th>
              <th className="py-3.5 px-4">Warranty Type</th>
              <th className="py-3.5 px-4">Start / Expiry Date</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {warranties.map((w) => {
              const now = new Date();
              const endDate = new Date(w.endDate);
              const isExpired = endDate < now;
              const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const isExpiringSoon = daysLeft > 0 && daysLeft <= 30;

              return (
                <tr key={w.id} className="hover:bg-slate-50/70 transition-colors group">
                  {/* Warranty Number */}
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-primary-600 shrink-0" />
                      <span>{w.warrantyNumber}</span>
                    </div>
                  </td>

                  {/* Customer */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-0.5">
                      <button
                        onClick={() => navigate(`/customers/${w.customerId}`)}
                        className="font-bold text-slate-900 hover:text-primary-600 hover:underline text-left flex items-center gap-1"
                      >
                        {w.customerName}
                        <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                      <div className="text-[11px] text-slate-500 font-mono">{w.customerPhone}</div>
                    </div>
                  </td>

                  {/* Machine & Serial */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-0.5 max-w-[200px]">
                      <div className="font-semibold text-slate-800 truncate flex items-center gap-1">
                        <Cpu className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{w.productName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        SN: {w.serialNumber || 'Non-serialized Unit'}
                      </div>
                    </div>
                  </td>

                  {/* Warranty Type */}
                  <td className="py-3.5 px-4">
                    <span className="font-medium text-slate-700">
                      {w.warrantyType.replace(/_/g, ' ')}
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      Duration: {w.durationMonths} months
                    </span>
                  </td>

                  {/* Dates */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-0.5 font-mono text-[11px]">
                      <div className="text-slate-500">
                        From: {new Date(w.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <div className={`font-bold ${isExpired ? 'text-rose-600' : isExpiringSoon ? 'text-amber-600' : 'text-slate-800'}`}>
                        Until: {endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4">
                    {w.status === 'VOID' || w.status === 'CANCELLED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <ShieldAlert className="w-3 h-3" />
                        Void / Voided
                      </span>
                    ) : isExpired ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        Expired
                      </span>
                    ) : isExpiringSoon ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
                        <Clock className="w-3 h-3" />
                        Expiring ({daysLeft}d)
                      </span>
                    ) : (
                      <StatusBadge status="active" label="Active Coverage" />
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenExtendModal?.(w)}
                        className="text-xs text-primary-600 hover:text-primary-800 hover:bg-primary-50"
                      >
                        Manage
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
