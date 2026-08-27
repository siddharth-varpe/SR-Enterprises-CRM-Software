import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/Button';
import { useCustomersQuery } from '../../customers/customer.api';
import { useInvoices, type InvoiceSummaryData } from '../../invoices/invoices.api';
import { useCreateReminder } from '../reminders.api';
import {
  X,
  Bell,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface CreateReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCustomerId?: string;
  initialInvoiceId?: string;
  onSuccess?: () => void;
}

export const CreateReminderModal: React.FC<CreateReminderModalProps> = ({
  isOpen,
  onClose,
  initialCustomerId,
  initialInvoiceId,
  onSuccess,
}) => {
  const [customerId, setCustomerId] = useState<string>(initialCustomerId || '');
  const [invoiceId, setInvoiceId] = useState<string>(initialInvoiceId || '');
  const [reminderType, setReminderType] = useState<'PAYMENT_FOLLOW_UP' | 'OVERDUE_PAYMENT' | 'INVOICE_DUE' | 'SERVICE_DUE' | 'CUSTOMER_FOLLOW_UP'>('PAYMENT_FOLLOW_UP');
  const [reminderDate, setReminderDate] = useState<string>(new Date().toISOString().split('T')[0] ?? '');
  const [reminderTime, setReminderTime] = useState<string>('10:00 AM');
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Queries
  const { data: customersData } = useCustomersQuery({
    page: 1,
    limit: 200,
    status: 'ACTIVE',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const { data: invoicesData } = useInvoices({
    limit: 100,
    customerId: customerId || undefined,
  });

  const createMutation = useCreateReminder();

  useEffect(() => {
    if (initialCustomerId) setCustomerId(initialCustomerId);
    if (initialInvoiceId) setInvoiceId(initialInvoiceId);
  }, [initialCustomerId, initialInvoiceId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerId) {
      setError('Please select a customer for this follow-up reminder');
      return;
    }

    if (!reminderDate) {
      setError('Please select a scheduled date');
      return;
    }

    try {
      await createMutation.mutateAsync({
        customerId,
        invoiceId: invoiceId || undefined,
        reminderType,
        reminderDate: new Date(reminderDate).toISOString(),
        reminderTime: reminderTime || undefined,
        priority,
        notes: notes.trim() || undefined,
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to create reminder');
    }
  };

  const customerList = customersData?.data || [];
  const invoiceList = invoicesData?.data || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-fast">
      <div className="bg-white rounded-xl shadow-modal w-full max-w-lg border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Schedule Follow-up Reminder</h2>
              <p className="text-xs text-slate-500">Track payment calls and customer follow-up actions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Customer Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Customer <span className="text-rose-500">*</span>
            </label>
            <select
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setInvoiceId(''); // reset invoice
              }}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              required
            >
              <option value="">-- Select Customer --</option>
              {customerList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} ({c.phone}) — {c.customerNumber}
                </option>
              ))}
            </select>
          </div>

          {/* Related Invoice (Optional) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Related Invoice <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <select
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            >
              <option value="">-- No specific invoice (Direct follow-up) --</option>
              {invoiceList.map((inv: InvoiceSummaryData) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} — Bal: ₹{inv.outstandingAmount} [{inv.status}]
                </option>
              ))}
            </select>
          </div>

          {/* Reminder Type & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Reminder Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={reminderType}
                onChange={(e) => setReminderType(e.target.value as any)}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                required
              >
                <option value="PAYMENT_FOLLOW_UP">Payment Follow-up</option>
                <option value="OVERDUE_PAYMENT">Overdue Payment</option>
                <option value="INVOICE_DUE">Invoice Due</option>
                <option value="SERVICE_DUE">Service Due</option>
                <option value="CUSTOMER_FOLLOW_UP">General Customer Follow-up</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Priority <span className="text-rose-500">*</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                required
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          {/* Scheduled Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Scheduled Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={reminderDate}
                onChange={(e) => setReminderDate(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Preferred Time <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                placeholder="e.g. 10:30 AM / 4:00 PM"
                className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Follow-up Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Follow-up Agenda / Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Customer promised to transfer balance payment on Friday morning"
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
              isLoading={createMutation.isPending}
              leftIcon={<CheckCircle className="w-4 h-4" />}
            >
              Schedule Reminder
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
