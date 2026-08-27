import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Plus } from 'lucide-react';
import { usePayments, usePaymentKPIs } from './payments.api';
import type { PaymentItem } from './payments.api';
import { PaymentSummaryCards } from './components/PaymentSummaryCards';
import { PaymentToolbar } from './components/PaymentToolbar';
import { PaymentTable } from './components/PaymentTable';
import { RecordPaymentModal } from './components/RecordPaymentModal';
import { PaymentReceiptModal } from './components/PaymentReceiptModal';
import { CancelPaymentModal } from './components/CancelPaymentModal';

export const PaymentsDirectory: React.FC = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [paymentMethod, setPaymentMethod] = useState('ALL');

  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [recordModalInvoiceId, setRecordModalInvoiceId] = useState<string | undefined>(undefined);
  const [receiptPayment, setReceiptPayment] = useState<PaymentItem | null>(null);
  const [cancelPaymentTarget, setCancelPaymentTarget] = useState<PaymentItem | null>(null);

  // Queries
  const { data: kpis, isLoading: isLoadingKPIs } = usePaymentKPIs();
  const { data: paymentsData, isLoading: isLoadingPayments } = usePayments({
    page,
    limit: 10,
    search: search.trim() || undefined,
    status: status as any,
    paymentMethod: paymentMethod as any,
    sortBy: 'paymentNumber',
    sortOrder: 'desc',
  });

  const handleOpenRecordModal = (invoiceId?: string) => {
    setRecordModalInvoiceId(invoiceId);
    setIsRecordModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-fast">
      {/* Page Header */}
      <PageHeader
        title="Payments & Collections"
        description="Authoritative financial ledger tracking realized payments, customer receipts, and uncollected dues."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Payments' }]}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenRecordModal()}
            leftIcon={<Plus className="w-4 h-4" />}
            className="shadow-sm"
          >
            Record Payment
          </Button>
        }
      />

      {/* KPI Overview Cards */}
      <PaymentSummaryCards kpis={kpis} isLoading={isLoadingKPIs} />

      {/* Toolbar & Filters */}
      <PaymentToolbar
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        status={status}
        onStatusChange={(val) => {
          setStatus(val);
          setPage(1);
        }}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={(val) => {
          setPaymentMethod(val);
          setPage(1);
        }}
        onRecordPayment={() => handleOpenRecordModal()}
      />

      {/* Payments Data Table */}
      <PaymentTable
        payments={paymentsData?.data || []}
        isLoading={isLoadingPayments}
        pagination={paymentsData?.pagination}
        onPageChange={setPage}
        onViewReceipt={(p) => setReceiptPayment(p)}
        onCancelPayment={(p) => setCancelPaymentTarget(p)}
        onRecordPaymentForInvoice={(invId) => handleOpenRecordModal(invId)}
      />

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isRecordModalOpen}
        initialInvoiceId={recordModalInvoiceId}
        onClose={() => {
          setIsRecordModalOpen(false);
          setRecordModalInvoiceId(undefined);
        }}
      />

      {/* Official Receipt Modal */}
      <PaymentReceiptModal
        isOpen={Boolean(receiptPayment)}
        onClose={() => setReceiptPayment(null)}
        payment={receiptPayment}
      />

      {/* Cancel Payment Modal */}
      <CancelPaymentModal
        isOpen={Boolean(cancelPaymentTarget)}
        onClose={() => setCancelPaymentTarget(null)}
        payment={cancelPaymentTarget}
      />
    </div>
  );
};
