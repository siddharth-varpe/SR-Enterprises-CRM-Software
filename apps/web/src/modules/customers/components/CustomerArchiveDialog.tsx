import React from 'react';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { useArchiveCustomerMutation, type CustomerSummary } from '../customer.api';
import { useToast } from '../../../providers/ToastProvider';

export interface CustomerArchiveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerSummary | null;
  onSuccess?: () => void;
}

export const CustomerArchiveDialog: React.FC<CustomerArchiveDialogProps> = ({
  isOpen,
  onClose,
  customer,
  onSuccess,
}) => {
  const toast = useToast();
  const archiveMutation = useArchiveCustomerMutation(customer?.id || '');

  const handleArchive = async () => {
    if (!customer) return;
    try {
      await archiveMutation.mutateAsync('Archived via Customer Management UI');
      toast.success(
        `Customer ${customer.fullName} (${customer.customerNumber}) archived. Historical records remain preserved.`,
        'Customer Archived'
      );
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to archive customer', 'Archive Error');
    }
  };

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleArchive}
      title="Archive Customer Account"
      message={`Are you sure you want to archive ${customer?.fullName} (${customer?.customerNumber})? The customer will no longer appear in the active directory, but all historical invoices, payments, warranties, and services will be permanently preserved.`}
      confirmLabel="Archive Customer"
      variant="danger"
      isLoading={archiveMutation.isPending}
    />
  );
};
