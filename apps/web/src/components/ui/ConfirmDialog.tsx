import React from 'react';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  const icons = {
    danger: <AlertCircle className="w-6 h-6 text-danger-600 shrink-0" />,
    warning: <AlertTriangle className="w-6 h-6 text-warning-600 shrink-0" />,
    primary: <Info className="w-6 h-6 text-primary-600 shrink-0" />,
  };

  const buttonVariants = {
    danger: 'destructive' as const,
    warning: 'primary' as const,
    primary: 'primary' as const,
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      closeOnEscape={!isLoading}
      closeOnBackdropClick={!isLoading}
      footer={
        <>
          <Button variant="outline" size="md" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={buttonVariants[variant]}
            size="md"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div className="p-2.5 rounded-full bg-slate-50 border border-slate-100">{icons[variant]}</div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
        </div>
      </div>
    </Modal>
  );
};
