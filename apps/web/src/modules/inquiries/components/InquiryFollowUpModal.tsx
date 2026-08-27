import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { useAddInquiryFollowUp } from '../inquiries.api';
import { useToast } from '../../../providers/ToastProvider';
import type { Inquiry } from '@crm/types';
import { INQUIRY_STATUSES } from '@crm/types';
import { Calendar } from 'lucide-react';

interface InquiryFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiry: Inquiry;
}

export const InquiryFollowUpModal: React.FC<InquiryFollowUpModalProps> = ({
  isOpen,
  onClose,
  inquiry,
}) => {
  const toast = useToast();
  const followUpMutation = useAddInquiryFollowUp();

  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState(inquiry.status);
  const [followUpDate, setFollowUpDate] = useState('');
  const [createReminder, setCreateReminder] = useState(false);
  const [reminderPriority, setReminderPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) return;

    try {
      await followUpMutation.mutateAsync({
        id: inquiry.id,
        payload: {
          notes: notes.trim(),
          status: status as any,
          followUpDate: followUpDate || undefined,
          createReminder,
          reminderPriority,
        },
      });

      toast.success('Follow-up recorded in inquiry timeline', 'Follow-up Added');
      onClose();
      setNotes('');
      setFollowUpDate('');
      setCreateReminder(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add follow-up', 'Error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Inquiry Follow-Up &amp; Notes"
      description={`Record interaction with ${inquiry.name} (${inquiry.inquiryNumber})`}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="outline" size="sm" onClick={onClose} disabled={followUpMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={followUpMutation.isPending}
            disabled={!notes.trim()}
          >
            Save Follow-Up
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          label="Follow-Up Conversation / Call Notes *"
          placeholder="Details of the call, customer feedback, machine requirements, or agreed next steps..."
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Update Lead Status"
            value={status}
            onChange={(val) => setStatus(val as any)}
            options={INQUIRY_STATUSES.map((s) => ({
              value: s,
              label: s.replace(/_/g, ' '),
            }))}
          />

          <Input
            label="Next Follow-Up Date"
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            leftIcon={<Calendar className="w-4 h-4 text-slate-400" />}
          />
        </div>

        {/* Phase 8 Reminders Architecture Integration */}
        {followUpDate && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-btn space-y-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-900">
              <input
                type="checkbox"
                checked={createReminder}
                onChange={(e) => setCreateReminder(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
              />
              <span>Create synchronized task reminder in Reminders Center</span>
            </label>

            {createReminder && (
              <div className="pt-2 flex items-center gap-3">
                <span className="text-slate-500">Reminder Priority:</span>
                <div className="flex gap-2">
                  {(['NORMAL', 'HIGH', 'URGENT'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setReminderPriority(p)}
                      className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                        reminderPriority === p
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
};
