import React, { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { useCompleteReminder } from '../reminders.api';
import type { ReminderItem } from '../reminders.api';
import { X, CheckCircle2 } from 'lucide-react';
import { formatDate } from '../../../lib/formatters';

interface CompleteReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminder: ReminderItem | null;
  onSuccess?: () => void;
}

export const CompleteReminderModal: React.FC<CompleteReminderModalProps> = ({
  isOpen,
  onClose,
  reminder,
  onSuccess,
}) => {
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const completeMutation = useCompleteReminder();

  if (!isOpen || !reminder) return null;

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await completeMutation.mutateAsync({
        id: reminder.id,
        payload: {
          notes: notes.trim() || undefined,
        },
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to complete reminder');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-fast">
      <div className="bg-white rounded-xl shadow-modal w-full max-w-md border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-emerald-50/60">
          <div className="flex items-center gap-2 text-emerald-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-semibold">Mark Follow-up Completed</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleComplete} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Reminder:</span>
              <strong className="font-mono text-slate-900">{reminder.reminderNumber}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Customer:</span>
              <strong className="text-slate-900">{reminder.customerName}</strong>
            </div>
            {reminder.invoiceNumber && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Invoice Ref:</span>
                <strong className="font-mono text-slate-900">{reminder.invoiceNumber}</strong>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Scheduled Date:</span>
              <span className="text-slate-700 font-medium">{formatDate(reminder.reminderDate)}</span>
            </div>
            {reminder.notes && (
              <div className="pt-1 text-slate-600 italic border-t border-slate-200/80">
                "{reminder.notes}"
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Outcome / Resolution Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Spoke with customer. Promised UPI transfer tomorrow / Full payment received via Cash."
              className="w-full text-xs bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={completeMutation.isPending}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Complete Reminder
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
