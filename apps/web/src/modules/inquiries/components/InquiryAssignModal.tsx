import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Textarea } from '../../../components/ui/Textarea';
import { useAssignInquiry } from '../inquiries.api';
import { useToast } from '../../../providers/ToastProvider';
import type { Inquiry } from '@crm/types';
import { UserCheck } from 'lucide-react';

interface InquiryAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  inquiry: Inquiry;
}

export const InquiryAssignModal: React.FC<InquiryAssignModalProps> = ({
  isOpen,
  onClose,
  inquiry,
}) => {
  const toast = useToast();
  const assignMutation = useAssignInquiry();

  const [assignedToUserId, setAssignedToUserId] = useState(inquiry.assignedToUserId || '');
  const [notes, setNotes] = useState('');

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await assignMutation.mutateAsync({
        id: inquiry.id,
        payload: {
          assignedToUserId: assignedToUserId.trim() || null,
          notes: notes.trim() || undefined,
        },
      });

      toast.success(
        assignedToUserId ? 'Inquiry assigned to staff member' : 'Inquiry unassigned',
        'Assignment Updated'
      );
      onClose();
      setNotes('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to assign inquiry', 'Error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Inquiry to Staff Member"
      description={`Assign lead ${inquiry.inquiryNumber} (${inquiry.name}) to a CRM user`}
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button variant="outline" size="sm" onClick={onClose} disabled={assignMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleAssign}
            isLoading={assignMutation.isPending}
            leftIcon={<UserCheck className="w-4 h-4" />}
          >
            Save Assignment
          </Button>
        </div>
      }
    >
      <form onSubmit={handleAssign} className="space-y-4">
        <Input
          label="Assigned Staff User ID / Identifier"
          placeholder="Enter staff User ID (leave empty to unassign)"
          value={assignedToUserId}
          onChange={(e) => setAssignedToUserId(e.target.value)}
        />

        <Textarea
          label="Assignment Notes / Instructions"
          placeholder="Special notes or priority instructions for the assigned staff member..."
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </form>
    </Modal>
  );
};
