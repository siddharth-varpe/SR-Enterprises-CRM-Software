import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Textarea } from '../../../components/ui/Textarea';
import { useUpdateInquiryStatus } from '../inquiries.api';
import { useToast } from '../../../providers/ToastProvider';
import type { Inquiry } from '@crm/types';
import { INQUIRY_STATUSES } from '@crm/types';

interface InquiryStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiry: Inquiry;
}

export const InquiryStatusModal: React.FC<InquiryStatusModalProps> = ({
  isOpen,
  onClose,
  inquiry,
}) => {
  const toast = useToast();
  const updateStatusMutation = useUpdateInquiryStatus();

  const [status, setStatus] = useState(inquiry.status);
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateStatusMutation.mutateAsync({
        id: inquiry.id,
        payload: {
          status: status as any,
          notes: notes.trim() || undefined,
        },
      });

      toast.success(`Inquiry status updated to ${status}`, 'Status Changed');
      onClose();
      setNotes('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status', 'Error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Inquiry Status"
      description={`Update status for ${inquiry.inquiryNumber} (${inquiry.name})`}
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="outline" size="sm" onClick={onClose} disabled={updateStatusMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={updateStatusMutation.isPending}
          >
            Update Status
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="New Lead Status"
          value={status}
          onChange={(val) => setStatus(val as any)}
          options={INQUIRY_STATUSES.map((s) => ({
            value: s,
            label: s.replace(/_/g, ' '),
          }))}
        />

        <Textarea
          label="Status Change Reason / Notes"
          placeholder="Optional explanation for this status update..."
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </form>
    </Modal>
  );
};
