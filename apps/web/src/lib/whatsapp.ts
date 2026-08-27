/**
 * Utility to generate and trigger direct WhatsApp Web / Mobile chat with customers
 */
export interface SendInvoiceWhatsAppParams {
  phone?: string | null;
  orderNumber?: string;
  invoiceNumber?: string;
  customerName?: string;
  totalAmount?: string | number | null;
  paidAmount?: string | number | null;
  balanceAmount?: string | number | null;
}

export function sendInvoiceViaWhatsApp({
  phone,
  orderNumber,
  invoiceNumber,
}: SendInvoiceWhatsAppParams): { success: boolean; url?: string; error?: string } {
  if (!phone || !phone.trim()) {
    return { success: false, error: 'Customer phone number is missing.' };
  }

  // Remove non-digit characters
  let cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = `91${cleanPhone}`;
  }

  const orderId = orderNumber || 'Order';
  const invNumber = invoiceNumber || orderNumber || 'Invoice';

  const message = `Thanks for shopping with SR Enterprises. Here is your invoice for your order ${orderId},\nInvoice: ${invNumber}`;

  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return { success: true, url };
}
