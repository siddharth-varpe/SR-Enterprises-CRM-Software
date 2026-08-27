import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../../../components/ui/Button';
import { useInvoices, useInvoiceQuery, type InvoiceSummaryData } from '../../invoices/invoices.api';
import { useRecordPayment } from '../payments.api';
import { formatINR } from '../../../lib/formatters';
import {
  X,
  CreditCard,
  CheckCircle,
  AlertCircle,
  FileText,
  User,
  Sparkles,
} from 'lucide-react';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialInvoiceId?: string;
  onSuccess?: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  initialInvoiceId,
  onSuccess,
}) => {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(initialInvoiceId || '');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER'>('CASH');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0] ?? '');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [nextPaymentDueDate, setNextPaymentDueDate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Fetch unpaid / partially paid invoices
  const { data: invoicesData } = useInvoices({
    limit: 100,
  });

  // Direct fetch for specifically selected invoice
  const { data: directInvoiceData } = useInvoiceQuery(selectedInvoiceId || undefined);

  const recordPaymentMutation = useRecordPayment();

  const selectedInvoice = useMemo(() => {
    if (directInvoiceData) return directInvoiceData;
    return (invoicesData?.data || []).find((inv: InvoiceSummaryData) => inv.id === selectedInvoiceId);
  }, [directInvoiceData, invoicesData, selectedInvoiceId]);

  // Combine and deduplicate eligible invoices
  const eligibleInvoices = useMemo(() => {
    const list: any[] = (invoicesData?.data || []).filter(
      (inv: InvoiceSummaryData) => inv.status === 'ISSUED' || inv.status === 'PARTIALLY_PAID' || inv.status === 'OVERDUE'
    );
    if (selectedInvoice && !list.some((inv) => inv.id === selectedInvoice.id)) {
      list.unshift(selectedInvoice);
    }
    return list;
  }, [invoicesData, selectedInvoice]);

  useEffect(() => {
    if (initialInvoiceId) {
      setSelectedInvoiceId(initialInvoiceId);
    }
  }, [initialInvoiceId, isOpen]);

  const rawOutstanding = selectedInvoice
    ? parseFloat(
        selectedInvoice.outstandingAmount ||
          String(
            parseFloat(selectedInvoice.totalAmount || '0') -
              parseFloat(selectedInvoice.paidAmount || '0')
          )
      )
    : 0;
  const outstanding = Math.max(0, Number.isFinite(rawOutstanding) ? rawOutstanding : 0);
  const numAmount = parseFloat(amount) || 0;
  const isPartial = selectedInvoice && outstanding > 0 && numAmount < outstanding - 0.01;

  useEffect(() => {
    if (selectedInvoice && outstanding > 0) {
      setAmount((prev) => (!prev || prev === '0' || prev === '0.00' ? outstanding.toFixed(2) : prev));
      if (!nextPaymentDueDate) {
        const future = new Date();
        future.setDate(future.getDate() + 14);
        setNextPaymentDueDate(future.toISOString().split('T')[0] ?? '');
      }
    }
  }, [selectedInvoiceId, selectedInvoice, outstanding]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedInvoiceId) {
      setError('Please select an invoice to record payment against');
      return;
    }

    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Payment amount must be strictly greater than 0');
      return;
    }

    if (selectedInvoice && outstanding > 0) {
      if (numAmount > outstanding + 0.001) {
        setError(`Payment amount (${formatINR(numAmount)}) cannot exceed outstanding balance (${formatINR(outstanding)})`);
        return;
      }
    }

    if (isPartial && !nextPaymentDueDate) {
      setError('Please specify the next payment due date for the remaining balance.');
      return;
    }

    try {
      await recordPaymentMutation.mutateAsync({
        invoiceId: selectedInvoiceId,
        amount: numAmount,
        paymentMethod,
        paymentDate: paymentDate ? new Date(paymentDate).toISOString() : new Date().toISOString(),
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        nextPaymentDueDate: isPartial && nextPaymentDueDate ? new Date(nextPaymentDueDate).toISOString() : undefined,
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to record payment');
    }
  };

  const invoiceTotal = selectedInvoice ? parseFloat(selectedInvoice.totalAmount || '0') : 0;
  const alreadyPaid = selectedInvoice ? parseFloat(selectedInvoice.paidAmount || '0') : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-fast">
      <div className="bg-white rounded-xl shadow-modal w-full max-w-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Record Customer Payment</h2>
              <p className="text-xs text-slate-500">Post a verified collection against an issued invoice</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Invoice Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Select Invoice <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedInvoiceId}
              onChange={(e) => setSelectedInvoiceId(e.target.value)}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              required
            >
              <option value="">-- Choose Outstanding Invoice --</option>
              {eligibleInvoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} — {inv.customerName} (Bal: {formatINR(inv.outstandingAmount)}) [{inv.status}]
                </option>
              ))}
            </select>
          </div>

          {/* Selected Invoice Ledger Summary Card */}
          {selectedInvoice && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{selectedInvoice.customerName}</span>
                  <span className="text-slate-400 text-[11px]">({selectedInvoice.customerPhone})</span>
                </div>
                <div className="flex items-center gap-1 font-mono font-semibold text-slate-900">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  {selectedInvoice.invoiceNumber}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-0.5">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Total Amount</p>
                  <p className="text-xs font-bold font-mono text-slate-800">{formatINR(invoiceTotal)}</p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Paid so far</p>
                  <p className="text-xs font-bold font-mono text-emerald-600">{formatINR(alreadyPaid)}</p>
                </div>
                <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
                  <p className="text-[10px] text-amber-700 uppercase font-semibold">Outstanding</p>
                  <p className="text-xs font-bold font-mono text-amber-700">{formatINR(outstanding)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Payment Amount + Quick Helper */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Payment Amount (₹) <span className="text-rose-500">*</span>
              </label>
              {selectedInvoice && outstanding > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(outstanding.toFixed(2))}
                  className="text-[11px] text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Fill Full Balance ({formatINR(outstanding)})
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">
                ₹
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={outstanding > 0 ? outstanding : undefined}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-8 pr-3 py-2 text-sm font-mono font-semibold bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                required
              />
            </div>
          </div>

          {/* Payment Method & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Payment Method <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                required
              >
                <option value="CASH">Cash</option>
                <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                <option value="CARD">Debit / Credit Card</option>
                <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS)</option>
                <option value="CHEQUE">Cheque</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Payment Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Next Payment Due Date (For Partial Payments) */}
          {isPartial && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                <span>Next Payment Due Date (For Remaining Balance: {formatINR(outstanding - numAmount)})</span>
                <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded uppercase">Partial Payment</span>
              </div>
              <input
                type="date"
                value={nextPaymentDueDate}
                min={paymentDate}
                onChange={(e) => setNextPaymentDueDate(e.target.value)}
                className="w-full text-xs bg-white border border-amber-300 rounded-md px-3 py-1.5 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                required={isPartial}
              />
              <p className="text-[11px] text-amber-800">
                This date will automatically update the invoice schedule for the remaining balance.
              </p>
            </div>
          )}

          {/* Reference / Transaction ID */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Reference / Transaction ID <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. UPI Ref / UTR / Cheque Number #45892"
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 font-mono"
            />
          </div>

          {/* Internal Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Notes / Remarks <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received advance cash payment during filter replacement visit"
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={recordPaymentMutation.isPending}
              leftIcon={<CheckCircle className="w-4 h-4" />}
            >
              Confirm & Post Payment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
