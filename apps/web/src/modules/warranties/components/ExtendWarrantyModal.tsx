import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { useUpdateWarrantyMutation, type WarrantyItem } from '../warranties.api';
import { useToast } from '../../../providers/ToastProvider';
import { Clock, AlertTriangle } from 'lucide-react';

export interface ExtendWarrantyModalProps {
  isOpen: boolean;
  onClose: () => void;
  warranty: WarrantyItem | null;
}

export const ExtendWarrantyModal: React.FC<ExtendWarrantyModalProps> = ({
  isOpen,
  onClose,
  warranty,
}) => {
  const toast = useToast();
  const updateMutation = useUpdateWarrantyMutation();

  const [extensionMonths, setExtensionMonths] = useState(12);
  const [status, setStatus] = useState<'ACTIVE' | 'VOID' | 'EXPIRED'>('ACTIVE');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (warranty) {
      setStatus(warranty.status === 'VOID' || warranty.status === 'CANCELLED' ? 'VOID' : 'ACTIVE');
    }
  }, [warranty]);

  if (!warranty) return null;

  const currentEndDate = new Date(warranty.endDate);
  const newEndDate = new Date(currentEndDate);
  newEndDate.setMonth(newEndDate.getMonth() + extensionMonths);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateMutation.mutateAsync({
        id: warranty.id,
        data: {
          status,
          endDate: status === 'ACTIVE' ? newEndDate.toISOString() : undefined,
          durationMonths: warranty.durationMonths + extensionMonths,
          notes: notes || undefined,
          reason: notes || (status === 'VOID' ? 'Policy voided by administrator' : 'Warranty term extension'),
        },
      });

      toast.success('Warranty coverage updated successfully');
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update warranty');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Manage Warranty Policy: ${warranty.warrantyNumber}`} size="md">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Header Summary */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
          <div className="font-bold text-slate-900">{warranty.customerName}</div>
          <div className="text-slate-500 font-mono">
            Machine: {warranty.productName} (SN: {warranty.serialNumber || 'N/A'})
          </div>
          <div className="text-slate-500">
            Current Expiry Date:{' '}
            <span className="font-bold text-slate-800 font-mono">
              {currentEndDate.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Status Option */}
        <div>
          <label className="block font-bold text-slate-700 mb-1">Policy Action / Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-xs font-semibold"
          >
            <option value="ACTIVE">Extend Active Coverage (+ Months)</option>
            <option value="VOID">Void / Cancel Policy</option>
            <option value="EXPIRED">Mark as Expired</option>
          </select>
        </div>

        {/* Extension Months Selector (if Active) */}
        {status === 'ACTIVE' && (
          <div className="space-y-3 p-3 bg-emerald-50/50 border border-emerald-200/70 rounded-xl">
            <div>
              <label className="block font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                Add Coverage Extension
              </label>
              <select
                value={extensionMonths}
                onChange={(e) => setExtensionMonths(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-emerald-300 text-xs bg-white"
              >
                <option value={3}>+ 3 Months Extension</option>
                <option value={6}>+ 6 Months Extension</option>
                <option value={12}>+ 12 Months (1 Year AMC)</option>
                <option value={24}>+ 24 Months (2 Years AMC)</option>
              </select>
            </div>

            <div className="text-emerald-800 font-mono text-[11px] pt-1">
              New Expiry Date:{' '}
              <span className="font-extrabold text-emerald-950">
                {newEndDate.toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        )}

        {status === 'VOID' && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>Warning: Voiding this warranty will immediately lapse all parts and labour coverage.</span>
          </div>
        )}

        {/* Reason / Notes */}
        <div>
          <label className="block font-bold text-slate-700 mb-1">Reason / Modification Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-xs"
            placeholder="e.g. Annual AMC renewal paid, or customer requested void..."
          />
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            type="submit"
            isLoading={updateMutation.isPending}
            className="bg-primary-600 hover:bg-primary-700 text-white font-bold"
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};
