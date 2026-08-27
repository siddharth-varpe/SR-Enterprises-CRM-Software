import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useInvoiceQuery, useCancelInvoiceMutation } from './invoices.api';
import { useInvoicePayments, type PaymentItem } from '../payments/payments.api';
import { RecordPaymentModal } from '../payments/components/RecordPaymentModal';
import { PaymentReceiptModal } from '../payments/components/PaymentReceiptModal';
import { useToast } from '../../providers/ToastProvider';
import { useAuth } from '../../providers/AuthBoundary';
import { formatINR, formatDate } from '../../lib/formatters';
import { sendInvoiceViaWhatsApp } from '../../lib/whatsapp';
import {
  Printer,
  ArrowLeft,
  XCircle,
  AlertTriangle,
  CreditCard,
  Receipt,
  Plus,
  MessageCircle,
} from 'lucide-react';

export const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { hasPermission } = useAuth();

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [receiptTarget, setReceiptTarget] = useState<PaymentItem | null>(null);

  const { data: invoice, isLoading } = useInvoiceQuery(id);
  const { data: invoicePayments } = useInvoicePayments(id || '');
  const cancelMutation = useCancelInvoiceMutation();
  const canCancel = hasPermission('invoices.cancel');
  const canRecordPayment = hasPermission('payments.create');

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse py-8">
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        <div className="h-96 bg-slate-100 rounded-xl"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Invoice Not Found</h2>
        <p className="text-sm text-slate-500 mt-1 mb-4">
          The requested invoice record could not be found.
        </p>
        <Button variant="outline" onClick={() => navigate('/invoices')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Return to Invoices
        </Button>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a cancellation reason.', 'Reason Required');
      return;
    }

    try {
      await cancelMutation.mutateAsync({ id: invoice.id, data: { reason: cancelReason } });
      toast.success(
        `Invoice ${invoice.invoiceNumber} has been cancelled.`,
        'Invoice Cancelled'
      );
      setIsCancelModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Unable to cancel invoice.', 'Cancellation Failed');
    }
  };

  const handleWhatsAppShare = () => {
    if (!invoice.customerPhone) {
      toast.error('Customer phone number is not available.', 'Phone Missing');
      return;
    }

    const res = sendInvoiceViaWhatsApp({
      phone: invoice.customerPhone,
      orderNumber: (invoice as any).saleNumber || invoice.invoiceNumber,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
    });

    if (res.success) {
      toast.success(
        `Opening WhatsApp chat with ${invoice.customerName} (${invoice.customerPhone})...`,
        'WhatsApp Invoice Sent'
      );
    } else {
      toast.error(res.error || 'Failed to open WhatsApp.', 'WhatsApp Error');
    }
  };

  const statusVariantMap: Record<string, any> = {
    ISSUED: 'warning',
    PAID: 'active',
    PARTIALLY_PAID: 'warning',
    OVERDUE: 'inactive',
    CANCELLED: 'archived',
  };

  const defaultAddress = invoice.addresses?.find((a) => a.isDefault) || invoice.addresses?.[0];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16 print:space-y-0 print:max-w-none print:m-0 print:p-0 print:pb-0">
      {/* Top Action Bar (Hidden during Print) */}
      <div className="print:hidden">
        <PageHeader
          title={`Invoice: ${invoice.invoiceNumber}`}
          description={`Issued on ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}`}
          breadcrumbs={[
            { label: 'Home', href: '/dashboard' },
            { label: 'Invoices', href: '/invoices' },
            { label: invoice.invoiceNumber },
          ]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => navigate('/invoices')} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
              {invoice.customerPhone && (
                <Button
                  variant="primary"
                  onClick={handleWhatsAppShare}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  leftIcon={<MessageCircle className="w-4 h-4" />}
                >
                  Send via WhatsApp
                </Button>
              )}
              {invoice.status !== 'CANCELLED' && invoice.status !== 'PAID' && canRecordPayment && (
                <Button
                  variant="primary"
                  onClick={() => setIsRecordPaymentOpen(true)}
                  leftIcon={<CreditCard className="w-4 h-4" />}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Record Payment
                </Button>
              )}
              <Button variant="outline" onClick={handlePrint} leftIcon={<Printer className="w-4 h-4" />}>
                Print Invoice
              </Button>
              {invoice.status !== 'CANCELLED' && canCancel && (
                <Button
                  variant="outline"
                  onClick={() => setIsCancelModalOpen(true)}
                  leftIcon={<XCircle className="w-4 h-4 text-red-500" />}
                >
                  Cancel
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* Cancellation Banner */}
      {invoice.status === 'CANCELLED' && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-start gap-3 print:hidden">
          <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">This Tax Invoice has been Voided / Cancelled</div>
            <div className="text-xs text-red-600 mt-0.5">
              Reason: {invoice.cancelReason || 'No reason specified'} • Cancelled at:{' '}
              {invoice.cancelledAt ? new Date(invoice.cancelledAt).toLocaleString('en-IN') : 'N/A'}
            </div>
          </div>
        </div>
      )}

      {/* Partially Paid & Next Payment Due Date Banner */}
      {invoice.status === 'PARTIALLY_PAID' && (
        <div className="p-4 bg-amber-50 border border-amber-200/90 rounded-xl text-amber-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-amber-950 flex items-center gap-2">
                <span>Partially Paid Invoice</span>
                <span className="px-2 py-0.5 bg-amber-200/60 text-amber-900 rounded font-semibold text-2xs uppercase">
                  Remaining Balance: {formatINR(parseFloat(invoice.outstandingAmount))}
                </span>
              </div>
              <div className="text-amber-800 text-xs mt-0.5 font-medium">
                Next Payment Due Date:{' '}
                <strong className="text-slate-900 font-semibold underline">
                  {new Date(invoice.dueDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </strong>
              </div>
            </div>
          </div>

          {canRecordPayment && (
            <Button
              size="sm"
              onClick={() => setIsRecordPaymentOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
            >
              Record Next Payment
            </Button>
          )}
        </div>
      )}
      <div
        id="printable-tax-invoice"
        className="bg-white p-8 md:p-12 rounded-xl border border-slate-200 shadow-sm text-slate-800 space-y-8 printable-tax-invoice print:border-none print:shadow-none print:p-0 print:m-0 print:space-y-6"
      >
        {/* Header Branding */}
        <div className="flex flex-col sm:flex-row justify-between items-start pb-6 border-b border-slate-200 gap-4 print:pb-4">
          <div>
            <div className="flex items-center gap-2.5 text-primary-900 font-extrabold text-2xl tracking-tight">
              <div className="w-8 h-8 bg-primary-600 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                SR
              </div>
              <span>SR ENTERPRISES</span>
            </div>
            <div className="text-xs text-slate-500 mt-1.5 space-y-0.5">
              <div>Water Purifier Sales, Genuine Spares & Doorstep Service</div>
              <div>Plot 42, Industrial Area, GE Road, Raipur, CG - 492001</div>
              <div>GSTIN: <span className="font-mono font-semibold text-slate-800">22ABCDE1234F1Z5</span> • Phone: +91 98261 00000</div>
              <div>Email: support@srenterprises.com</div>
            </div>
          </div>

          <div className="sm:text-right space-y-1">
            <span className="inline-block px-3 py-1 bg-slate-900 text-white font-mono font-bold text-sm rounded uppercase tracking-wider">
              TAX INVOICE
            </span>
            <div className="text-sm font-mono font-bold text-slate-900 mt-2">{invoice.invoiceNumber}</div>
            <div className="text-xs text-slate-500">
              Date: <span className="font-medium text-slate-800">{new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</span>
            </div>
            <div className="text-xs text-slate-500">
              Due Date: <span className="font-medium text-slate-800">{new Date(invoice.dueDate).toLocaleDateString('en-IN')}</span>
            </div>
            <div className="pt-1">
              <StatusBadge status={statusVariantMap[invoice.status] || 'warning'} label={invoice.status} />
            </div>
          </div>
        </div>

        {/* Billed To Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs pb-4 border-b border-slate-200 print:pb-3">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Billed To Customer:
            </span>
            <div className="font-bold text-slate-900 text-sm">{invoice.customerName}</div>
            <div className="text-slate-600 mt-0.5">
              Customer ID: <span className="font-mono">{invoice.customerNumber}</span>
            </div>
            <div className="text-slate-600">Phone: {invoice.customerPhone}</div>
            {invoice.customerEmail && <div className="text-slate-600">Email: {invoice.customerEmail}</div>}
            {invoice.customerGst && (
              <div className="text-slate-700 font-semibold mt-1">
                GSTIN: <span className="font-mono">{invoice.customerGst}</span>
              </div>
            )}
          </div>

          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Service / Delivery Address:
            </span>
            {defaultAddress ? (
              <div className="text-slate-600 leading-relaxed">
                <div>{defaultAddress.addressLine1}</div>
                {defaultAddress.addressLine2 && <div>{defaultAddress.addressLine2}</div>}
                {defaultAddress.landmark && <div>Near {defaultAddress.landmark}</div>}
                <div>
                  {defaultAddress.city}, {defaultAddress.state} - {defaultAddress.postalCode}
                </div>
              </div>
            ) : (
              <div className="text-slate-400 italic">No installation address specified</div>
            )}
          </div>
        </div>

        {/* Itemized Table */}
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-y border-slate-200 print:bg-slate-100">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Item Description</th>
                <th className="py-2.5 px-3 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Unit Rate (₹)</th>
                <th className="py-2.5 px-3 text-right">Discount</th>
                <th className="py-2.5 px-3 text-right">Tax (18%)</th>
                <th className="py-2.5 px-3 text-right">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoice.items.map((item, idx) => (
                <tr key={idx} className="print:break-inside-avoid">
                  <td className="py-3 px-3 text-slate-400">{idx + 1}</td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900">{item.nameSnapshot}</div>
                    {item.descriptionSnapshot && (
                      <div className="text-[11px] text-slate-500">{item.descriptionSnapshot}</div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center font-semibold">{item.quantity}</td>
                  <td className="py-3 px-3 text-right font-mono">
                    ₹{parseFloat(item.unitPriceSnapshot).toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-600 print:text-slate-800">
                    {parseFloat(item.discountAmount) > 0 ? `-₹${parseFloat(item.discountAmount).toFixed(2)}` : '—'}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-600 print:text-slate-800">
                    ₹{parseFloat(item.taxAmount).toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right font-bold font-mono text-slate-900">
                    ₹{parseFloat(item.lineTotal).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Payment Installments & Transaction Schedule (Printable Tax Invoice) */}
        {((invoicePayments && invoicePayments.length > 0) || parseFloat(invoice.paidAmount) > 0) && (
          <div className="pt-2 border-t border-slate-200 space-y-2 print-avoid-break">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Payment Installments &amp; Transaction Schedule
              </span>
              {invoice.status === 'PARTIALLY_PAID' && (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200 print:border-slate-400 print:bg-slate-100 print:text-slate-900">
                  PARTIAL PAYMENT SCHEDULE ACTIVE
                </span>
              )}
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200 print:bg-slate-100">
                  <tr>
                    <th className="py-2 px-3">Installment</th>
                    <th className="py-2 px-3">Transaction Ref / Details</th>
                    <th className="py-2 px-3 text-center">Payment Date</th>
                    <th className="py-2 px-3 text-center">Mode</th>
                    <th className="py-2 px-3 text-right">Amount (₹)</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {invoicePayments && invoicePayments.length > 0 ? (
                    invoicePayments.map((p: any, idx: number) => (
                      <tr key={p.id} className="bg-white">
                        <td className="py-2 px-3 font-bold text-slate-900">
                          Installment #{idx + 1}
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-mono font-semibold text-slate-800">{p.paymentNumber}</div>
                          {p.referenceNumber && (
                            <div className="text-[10px] text-slate-500 font-mono">Ref: {p.referenceNumber}</div>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-700">
                          {new Date(p.paymentDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="font-semibold text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
                            {p.paymentMethod}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 print:text-slate-900">
                          ₹{parseFloat(p.amount).toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-emerald-700 text-[10px] uppercase print:text-slate-900">
                          PAID ✓
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="bg-white">
                      <td className="py-2 px-3 font-bold text-slate-900">Installment #1</td>
                      <td className="py-2 px-3 text-slate-600">Advance / Initial Collection</td>
                      <td className="py-2 px-3 text-center text-slate-700">{new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</td>
                      <td className="py-2 px-3 text-center">CASH</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700 print:text-slate-900">₹{parseFloat(invoice.paidAmount).toFixed(2)}</td>
                      <td className="py-2 px-3 text-center font-bold text-emerald-700 text-[10px] uppercase print:text-slate-900">PAID ✓</td>
                    </tr>
                  )}

                  {/* Remaining Due Installment Row if Partially Paid */}
                  {parseFloat(invoice.outstandingAmount) > 0.01 && (
                    <tr className="bg-amber-50/50 print:bg-slate-50 font-medium">
                      <td className="py-2 px-3 font-bold text-amber-950 print:text-slate-900">
                        Installment #{(invoicePayments?.length || 1) + 1} (Remaining)
                      </td>
                      <td className="py-2 px-3 text-amber-900 print:text-slate-800">
                        Scheduled Next Due Balance
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-slate-900">
                        {new Date(invoice.dueDate).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-2 px-3 text-center text-slate-500">—</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-amber-900 print:text-slate-900">
                        ₹{parseFloat(invoice.outstandingAmount).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-center font-bold text-amber-800 print:text-slate-900 text-[10px] uppercase">
                        DUE ON {new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Financial Summary & Bank Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 print-avoid-break print:gap-6 print:pt-2">
          <div className="space-y-3 text-xs">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1 print:bg-slate-50/50 print:p-3">
              <span className="font-bold text-slate-800 block text-xs uppercase tracking-wider">
                Bank & Payment Details
              </span>
              <div className="text-slate-600">Account Name: SR ENTERPRISES</div>
              <div className="text-slate-600">Bank: HDFC Bank • Branch: Raipur Main</div>
              <div className="text-slate-600">A/C No: 50200012345678 • IFSC: HDFC0001234</div>
              <div className="text-slate-600 font-semibold pt-1">UPI ID: srenterprises@hdfcbank</div>
            </div>

            <div className="text-slate-500 text-[11px] leading-relaxed print:text-[10px]">
              <strong>Terms:</strong> {invoice.termsAndConditions || 'Payment due within 15 days of invoice date. 1 year standard warranty on RO machines.'}
            </div>
          </div>

          <div className="space-y-2.5 text-xs text-slate-600 font-medium print:space-y-1.5">
            <div className="flex justify-between">
              <span>Taxable Subtotal:</span>
              <span className="font-mono text-slate-900 font-bold">
                ₹{parseFloat(invoice.subtotal).toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-emerald-600 print:text-slate-800">
              <span>Total Discounts:</span>
              <span className="font-mono font-bold">-₹{parseFloat(invoice.discountAmount).toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
              <span>CGST (9%):</span>
              <span className="font-mono text-slate-900">
                ₹{(parseFloat(invoice.taxAmount) / 2).toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between">
              <span>SGST (9%):</span>
              <span className="font-mono text-slate-900">
                ₹{(parseFloat(invoice.taxAmount) / 2).toFixed(2)}
              </span>
            </div>

            <div className="pt-2 border-t-2 border-slate-900 flex justify-between items-baseline">
              <span className="font-extrabold text-slate-900 text-sm uppercase">Total Invoice Value:</span>
              <span className="font-bold text-slate-900 text-lg font-mono">
                ₹{parseFloat(invoice.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-between pt-1 text-slate-500 text-[11px]">
              <span>Amount Paid:</span>
              <span className="font-mono">₹{parseFloat(invoice.paidAmount).toFixed(2)}</span>
            </div>

            <div className="flex justify-between pt-1 font-bold text-amber-800 bg-amber-50 p-2 rounded print:border print:border-slate-300 print:bg-slate-50 print:text-slate-900">
              <span>Balance Due / Outstanding:</span>
              <span className="font-mono">₹{parseFloat(invoice.outstandingAmount).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer Signature */}
        <div className="pt-8 flex justify-between items-end border-t border-slate-200 text-xs text-slate-500 print-avoid-break print:pt-4">
          <div>Thank you for choosing SR Enterprises!</div>
          <div className="text-right">
            <div className="font-bold text-slate-800">For SR ENTERPRISES</div>
            <div className="h-10"></div>
            <div className="text-[11px] text-slate-400">Authorized Signatory</div>
          </div>
        </div>
      </div>

      {/* Payment History & Realized Collections Ledger (Screen Only) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 print:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Payment History & Collections</h3>
              <p className="text-xs text-slate-500">All realized customer collections applied to this tax invoice</p>
            </div>
          </div>
          {invoice.status !== 'CANCELLED' && invoice.status !== 'PAID' && canRecordPayment && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRecordPaymentOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Record Payment
            </Button>
          )}
        </div>

        {(!invoicePayments || invoicePayments.length === 0) ? (
          <div className="p-6 text-center bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-500">
            No payments have been recorded for this invoice yet.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 text-left">Payment #</th>
                  <th className="py-2.5 px-3 text-left">Date</th>
                  <th className="py-2.5 px-3 text-left">Method</th>
                  <th className="py-2.5 px-3 text-left">Reference / Notes</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoicePayments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-mono font-semibold text-primary-700">{p.paymentNumber}</td>
                    <td className="py-2.5 px-3 text-slate-600">{formatDate(p.paymentDate)}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                      {p.referenceNumber && <span className="font-mono font-medium text-slate-700 block">Ref: {p.referenceNumber}</span>}
                      {p.notes && <span className="italic">{p.notes}</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatINR(p.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        p.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        p.status === 'CANCELLED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setReceiptTarget({
                          ...p,
                          invoiceId: invoice.id,
                          invoiceNumber: invoice.invoiceNumber,
                          invoiceTotal: invoice.totalAmount,
                          invoiceStatus: invoice.status,
                          dueDate: invoice.dueDate,
                          customerId: invoice.customerId,
                          customerName: invoice.customerName,
                          customerPhone: invoice.customerPhone,
                          customerNumber: invoice.customerNumber,
                          createdAt: p.createdAt,
                          updatedAt: p.createdAt,
                        })}
                        className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 font-semibold text-xs"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        initialInvoiceId={invoice.id}
      />

      {/* Payment Receipt Modal */}
      <PaymentReceiptModal
        isOpen={Boolean(receiptTarget)}
        onClose={() => setReceiptTarget(null)}
        payment={receiptTarget}
      />

      {/* Cancel Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Tax Invoice"
      >
        <div className="space-y-4 text-sm">
          <p className="text-slate-600">
            Cancelling invoice <strong>{invoice.invoiceNumber}</strong> will void the tax document while preserving historical audit evidence.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Cancellation Reason <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g. Billing address error, customer cancellation"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsCancelModalOpen(false)}>
              Keep Invoice
            </Button>
            <Button
              variant="destructive"
              isLoading={cancelMutation.isPending}
              onClick={handleCancel}
            >
              Confirm Void
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
