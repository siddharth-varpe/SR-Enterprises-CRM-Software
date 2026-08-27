import React, { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { useCancelPayment } from '../payments.api';
import { formatINR } from '../../../lib/formatters';
import type { PaymentItem } from '../payments.api';
import { X, AlertTriangle, Ban } from 'lucide-react';

interface CancelPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentItem | null;
  onSuccess?: () => void;
}

export const CancelPaymentModal: React.FC<CancelPaymentModalProps> = ({
  isOpen,
  onClose,
  payment,
  onSuccess,
}) => {
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const cancelMutation = useCancelPayment();

  if (!isOpen || !payment) return null;

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reason.trim() || reason.trim().length < 3) {
      setError('Please provide a valid cancellation reason (min 3 characters)');
      return;
    }

    try {
      await cancelMutation.mutateAsync({
        id: payment.id,
        payload: { reason: reason.trim() },
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to cancel payment');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-fast">
      <div className="bg-white rounded-xl shadow-modal w-full max-w-md border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-2 text-rose-700">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="text-sm font-semibold">Cancel / Reverse Payment</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCancel} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <p className="text-slate-500">Payment Reference: <strong className="text-slate-900 font-mono">{payment.paymentNumber}</strong></p>
            <p className="text-slate-500">Customer: <strong className="text-slate-900">{payment.customerName}</strong></p>
            <p className="text-slate-500">Amount: <strong className="text-slate-900 font-mono">{formatINR(payment.amount)}</strong></p>
            <p className="text-slate-500">Invoice: <strong className="text-slate-900 font-mono">{payment.invoiceNumber}</strong></p>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Cancelling this payment will adjust the invoice outstanding balance accordingly and create an audit log. This action cannot be undone.
          </p>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Reason for Cancellation <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Cheque bounced / BACS transfer failed / duplicate entry by operator"
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              required
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Go Back
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              isLoading={cancelMutation.isPending}
              leftIcon={<Ban className="w-4 h-4" />}
            >
              Confirm Cancellation
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
