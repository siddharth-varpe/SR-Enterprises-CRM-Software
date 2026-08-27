import React from 'react';
import { Button } from '../../../components/ui/Button';
import { useInvoiceQuery } from '../../invoices/invoices.api';
import { formatDate } from '../../../lib/formatters';
import type { PaymentItem } from '../payments.api';
import { X, Printer } from 'lucide-react';

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentItem | null;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  isOpen,
  onClose,
  payment,
}) => {
  if (!isOpen || !payment) return null;

  const { data: invoice } = useInvoiceQuery(payment.invoiceId);

  const handlePrint = () => {
    window.print();
  };

  // Customer & Document Data
  const customerName = (invoice?.customerName || payment.customerName || 'Valued Customer').toUpperCase();
  const customerPhone = invoice?.customerPhone || payment.customerPhone || '9766039197';
  const invoiceNo = invoice?.invoiceNumber || payment.invoiceNumber || '82026209';
  const rawInvoiceDate = invoice?.invoiceDate || payment.invoiceDate || payment.paymentDate;
  const invoiceDate = formatDate(rawInvoiceDate);
  const rawDueDate = invoice?.dueDate || payment.dueDate;
  const dueDate = formatDate(rawDueDate);

  // Financial Calculations
  const invoiceTotalNum = parseFloat(invoice?.totalAmount || payment.invoiceTotal || payment.amount || '0');
  const paymentAmountNum = parseFloat(payment.amount || '0');
  const paidTotalNum = invoice ? parseFloat(invoice.paidAmount || '0') : paymentAmountNum;
  const discountAmountNum = invoice ? parseFloat(invoice.discountAmount || '0') : 0;
  const outstandingNum = invoice
    ? parseFloat(invoice.outstandingAmount || '0')
    : Math.max(0, invoiceTotalNum - paidTotalNum);

  const formattedTotalAmount = invoiceTotalNum.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const formattedReceivedAmount = paidTotalNum.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const formattedBalanceAmount = outstandingNum.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const formattedDiscountAmount = discountAmountNum.toLocaleString('en-IN', { maximumFractionDigits: 2 });

  // Items
  const items = invoice?.items && invoice.items.length > 0 ? invoice.items : null;
  const totalQty = items ? items.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0) : 1;

  // Notes
  const warrantyNotes = invoice?.notes || payment.notes || '1 Years Warranty On Ele Spears 1 Service Free';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-fast print:static print:p-0 print:bg-white print:backdrop-blur-none print:z-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl border border-slate-300 overflow-hidden flex flex-col max-h-[92vh] print:shadow-none print:border-none print:max-h-none print:max-w-none print:w-full print:rounded-none">
        
        {/* Modal Top Toolbar (Hidden on print) */}
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Official Receipt</span>
            <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              {payment.paymentNumber}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
              leftIcon={<Printer className="w-4 h-4" />}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              Print Receipt
            </Button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Official Receipt Paper Container */}
        <div className="p-6 overflow-y-auto bg-white print:p-0 print:overflow-visible print:m-0" id="printable-receipt">
          <div className="border-[1.5px] border-black p-4 text-black font-sans leading-tight text-[11px] bg-white">
            
            {/* Top Badges */}
            <div className="mb-2 flex items-center gap-1.5">
              <span className="inline-block border border-black px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase">
                BILL OF SUPPLY
              </span>
              <span className="inline-block border border-slate-500 px-1.5 py-0.5 text-[9px] text-slate-600 tracking-wider uppercase">
                ORIGINAL FOR RECIPIENT
              </span>
            </div>

            {/* Header: Logo & Company Name */}
            <div className="flex items-center justify-between mb-3 pb-2">
              <div className="w-16 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-14 h-14" aria-label="SR Enterprises Logo">
                  <circle cx="50" cy="50" r="47" fill="#ffffff" stroke="#1d4ed8" strokeWidth="3" />
                  <circle cx="50" cy="50" r="41" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1.5" strokeDasharray="2,2" />
                  <circle cx="50" cy="50" r="36" fill="#f8fafc" stroke="#1d4ed8" strokeWidth="1" />
                  <path id="curveTopWeb" d="M 20 50 A 30 30 0 0 1 80 50" fill="none" />
                  <text fontFamily="Arial, Helvetica, sans-serif" fontSize="7.5" fontWeight="bold" fill="#1d4ed8" textAnchor="middle">
                    <textPath href="#curveTopWeb" startOffset="50%">SR ENTERPRISES</textPath>
                  </text>
                  <circle cx="50" cy="50" r="22" fill="#1d4ed8" />
                  <text x="50" y="56" fontFamily="Arial, Helvetica, sans-serif" fontSize="16" fontWeight="900" fill="#ffffff" textAnchor="middle">SR</text>
                  <path d="M 50 28 C 47 34 44 38 44 41 C 44 44.5 46.5 47 50 47 C 53.5 47 56 44.5 56 41 C 56 38 53 34 50 28 Z" fill="#60a5fa" opacity="0.85" />
                </svg>
              </div>

              <div className="text-center flex-1 px-2">
                <h1 className="text-xl font-extrabold tracking-wide uppercase text-black font-sans">
                  SR ENTERPRISES
                </h1>
                <p className="text-[10px] text-slate-800 font-medium mt-0.5">
                  Shop A6 SaiPritam Nagari, Chatrapati Chowk Rahatani. Mo.7385059197, Pimpri-Chinchwad, Pune., Maharashtra, 411017
                </p>
                <p className="text-[11px] font-bold text-black mt-1">
                  Mobile: 9766039197 &nbsp;&nbsp;&nbsp;&nbsp; Email: srenterprises02015@gmail.com
                </p>
              </div>

              <div className="w-16 shrink-0" />
            </div>

            {/* Main Flat Grid Border Wrapper */}
            <div className="border-[1.5px] border-black">
              
              {/* Row 1: Bill To & Invoice Meta Details */}
              <div className="grid grid-cols-12 border-b-[1.5px] border-black">
                <div className="col-span-7 border-r-[1.5px] border-black p-2 bg-white">
                  <p className="text-[10px] font-bold uppercase text-black">BILL TO</p>
                  <p className="text-xs font-extrabold uppercase text-black mt-0.5">{customerName}</p>
                  <p className="text-[11px] font-bold text-black mt-1">Mobile: {customerPhone}</p>
                </div>

                <div className="col-span-5 grid grid-cols-3 text-center bg-white">
                  <div className="border-r border-black p-1 flex flex-col justify-between">
                    <p className="text-[10px] font-bold border-b border-black pb-1">Invoice No.</p>
                    <p className="text-[11px] font-bold py-1 font-mono">{invoiceNo}</p>
                  </div>
                  <div className="border-r border-black p-1 flex flex-col justify-between">
                    <p className="text-[10px] font-bold border-b border-black pb-1">Invoice Date</p>
                    <p className="text-[11px] font-bold py-1">{invoiceDate}</p>
                  </div>
                  <div className="p-1 flex flex-col justify-between">
                    <p className="text-[10px] font-bold border-b border-black pb-1">Due Date</p>
                    <p className="text-[11px] font-bold py-1">{dueDate}</p>
                  </div>
                </div>
              </div>

              {/* Row 2: Items Table */}
              <div>
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b-[1.5px] border-black font-bold">
                      <th className="w-[8%] border-r border-black py-1.5 px-1 text-center">S.NO.</th>
                      <th className="w-[50%] border-r border-black py-1.5 px-2 text-center">ITEMS</th>
                      <th className="w-[12%] border-r border-black py-1.5 px-1 text-center">QTY.</th>
                      <th className="w-[15%] border-r border-black py-1.5 px-2 text-center">RATE</th>
                      <th className="w-[15%] py-1.5 px-2 text-center">AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items ? (
                      items.map((item, idx) => {
                        const unitRate = parseFloat(item.unitPriceSnapshot || '0').toLocaleString('en-IN', { maximumFractionDigits: 2 });
                        const lineAmt = parseFloat(item.lineTotal || '0').toLocaleString('en-IN', { maximumFractionDigits: 2 });
                        return (
                          <tr key={item.id || idx} className="border-b border-black">
                            <td className="border-r border-black py-1.5 px-1 text-center">{idx + 1}</td>
                            <td className="border-r border-black py-1.5 px-2 text-left font-medium">{item.nameSnapshot}</td>
                            <td className="border-r border-black py-1.5 px-1 text-center">{item.quantity} PCS</td>
                            <td className="border-r border-black py-1.5 px-2 text-right font-mono">{unitRate}</td>
                            <td className="py-1.5 px-2 text-right font-mono font-medium">{lineAmt}</td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr className="border-b border-black">
                        <td className="border-r border-black py-1.5 px-1 text-center">1</td>
                        <td className="border-r border-black py-1.5 px-2 text-left font-medium">Water Purifier & RO System Equipment ({invoiceNo})</td>
                        <td className="border-r border-black py-1.5 px-1 text-center">1 PCS</td>
                        <td className="border-r border-black py-1.5 px-2 text-right font-mono">{formattedTotalAmount}</td>
                        <td className="py-1.5 px-2 text-right font-mono font-medium">{formattedTotalAmount}</td>
                      </tr>
                    )}

                    {/* Discount Row */}
                    {discountAmountNum > 0 && (
                      <tr className="border-b border-black">
                        <td className="border-r border-black py-1 px-1"></td>
                        <td className="border-r border-black py-1 px-2 text-right italic font-medium">Discount</td>
                        <td className="border-r border-black py-1 px-1 text-center">-</td>
                        <td className="border-r border-black py-1 px-2 text-center">-</td>
                        <td className="py-1 px-2 text-right font-mono text-emerald-800 font-semibold">- ₹ {formattedDiscountAmount}</td>
                      </tr>
                    )}

                    {/* TOTAL Row */}
                    <tr className="bg-slate-100 border-b-[1.5px] border-black font-extrabold">
                      <td colSpan={2} className="border-r border-black py-1.5 px-2 text-right uppercase">TOTAL</td>
                      <td className="border-r border-black py-1.5 px-1 text-center">{totalQty}</td>
                      <td className="border-r border-black py-1.5 px-2 text-center"></td>
                      <td className="py-1.5 px-2 text-right font-mono font-extrabold">₹ {formattedTotalAmount}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Row 3: Received Amount & Balance Amount */}
              <div className="grid grid-cols-12 border-b-[1.5px] border-black">
                <div className="col-span-7 border-r-[1.5px] border-black p-2 font-bold text-xs flex items-center">
                  <span>Received Amount:&nbsp;</span>
                  <span className="font-mono text-emerald-900 font-extrabold">₹ {formattedReceivedAmount}</span>
                </div>
                <div className="col-span-5 p-2 font-bold text-xs flex items-center">
                  <span>Balance Amount:&nbsp;</span>
                  <span className="font-mono text-amber-900 font-extrabold">₹ {formattedBalanceAmount}</span>
                </div>
              </div>

              {/* Row 4: Notes */}
              <div className="p-2 border-b-[1.5px] border-black bg-white text-[10.5px]">
                <strong>Notes:</strong>&nbsp;{warrantyNotes}
              </div>

              {/* Row 5: Four-Block Footer */}
              <div className="grid grid-cols-12 text-[9px] leading-tight bg-white">
                
                {/* Bank Details (Col 1) */}
                <div className="col-span-3 border-r border-black p-2 space-y-0.5">
                  <p className="font-bold text-[10px] mb-1">Bank Details</p>
                  <p>Name: <strong>Ramesh Ambadas Bomble</strong></p>
                  <p>IFSC Code: <strong>HDFC0000463</strong></p>
                  <p>Account No: <strong>50100399721798</strong></p>
                  <p>Bank: <strong>HDFC Bank, SANGAMNER, AHMEDNAGAR,</strong></p>
                </div>

                {/* Payment QR Code (Col 2) */}
                <div className="col-span-3 border-r border-black p-2 flex items-start justify-between gap-1">
                  <div>
                    <p className="font-bold text-[10px] mb-1">Payment QR Code</p>
                    <p className="text-[8.5px] text-slate-700">PhonePe / Google Pay / PayTM</p>
                    <p className="mt-1 text-[8px] leading-tight">
                      UPI ID:<br />
                      <strong className="text-[8.5px] font-mono">9766039197@hdfcbank</strong>
                    </p>
                  </div>
                  <div className="w-12 shrink-0 text-right">
                    <svg viewBox="0 0 100 100" className="w-11 h-11 border border-slate-300 p-0.5" aria-label="UPI QR Code">
                      <rect width="100" height="100" fill="#ffffff" />
                      <rect x="5" y="5" width="28" height="28" fill="#000000" />
                      <rect x="9" y="9" width="20" height="20" fill="#ffffff" />
                      <rect x="13" y="13" width="12" height="12" fill="#000000" />
                      <rect x="67" y="5" width="28" height="28" fill="#000000" />
                      <rect x="71" y="9" width="20" height="20" fill="#ffffff" />
                      <rect x="75" y="13" width="12" height="12" fill="#000000" />
                      <rect x="5" y="67" width="28" height="28" fill="#000000" />
                      <rect x="9" y="71" width="20" height="20" fill="#ffffff" />
                      <rect x="13" y="75" width="12" height="12" fill="#000000" />
                      <rect x="38" y="8" width="6" height="6" fill="#000000" />
                      <rect x="48" y="8" width="6" height="6" fill="#000000" />
                      <rect x="58" y="8" width="6" height="6" fill="#000000" />
                      <rect x="38" y="18" width="6" height="6" fill="#000000" />
                      <rect x="52" y="18" width="6" height="6" fill="#000000" />
                      <rect x="8" y="38" width="6" height="6" fill="#000000" />
                      <rect x="18" y="38" width="6" height="6" fill="#000000" />
                      <rect x="28" y="38" width="6" height="6" fill="#000000" />
                      <rect x="38" y="38" width="8" height="8" fill="#000000" />
                      <rect x="52" y="38" width="6" height="6" fill="#000000" />
                      <rect x="62" y="38" width="6" height="6" fill="#000000" />
                      <rect x="72" y="38" width="6" height="6" fill="#000000" />
                      <rect x="82" y="38" width="6" height="6" fill="#000000" />
                      <rect x="18" y="48" width="6" height="6" fill="#000000" />
                      <rect x="28" y="48" width="6" height="6" fill="#000000" />
                      <rect x="44" y="48" width="8" height="8" fill="#000000" />
                      <rect x="60" y="48" width="6" height="6" fill="#000000" />
                      <rect x="78" y="48" width="6" height="6" fill="#000000" />
                      <rect x="38" y="58" width="6" height="6" fill="#000000" />
                      <rect x="48" y="58" width="6" height="6" fill="#000000" />
                      <rect x="58" y="58" width="6" height="6" fill="#000000" />
                      <rect x="68" y="58" width="6" height="6" fill="#000000" />
                      <rect x="88" y="58" width="6" height="6" fill="#000000" />
                      <rect x="38" y="68" width="6" height="6" fill="#000000" />
                      <rect x="52" y="68" width="6" height="6" fill="#000000" />
                      <rect x="68" y="68" width="6" height="6" fill="#000000" />
                      <rect x="78" y="68" width="6" height="6" fill="#000000" />
                      <rect x="38" y="78" width="6" height="6" fill="#000000" />
                      <rect x="48" y="78" width="6" height="6" fill="#000000" />
                      <rect x="60" y="78" width="6" height="6" fill="#000000" />
                      <rect x="82" y="78" width="6" height="6" fill="#000000" />
                      <rect x="38" y="88" width="6" height="6" fill="#000000" />
                      <rect x="58" y="88" width="6" height="6" fill="#000000" />
                      <rect x="72" y="88" width="6" height="6" fill="#000000" />
                      <rect x="88" y="88" width="6" height="6" fill="#000000" />
                    </svg>
                  </div>
                </div>

                {/* Terms and Conditions (Col 3) */}
                <div className="col-span-3 border-r border-black p-2 text-[8px] space-y-0.5">
                  <p className="font-bold text-[10px] mb-1">Terms and Conditions</p>
                  <p>1) Except Breakage &amp; Pump In AMC</p>
                  <p>2) T&amp;C Apply For AMC &amp; Warranty</p>
                  <p>3) Dust &amp; Soil Damage Not Cover</p>
                  <p>4) Any Other Issue Service Charge Applicable</p>
                  <p>5) GST Bill Extra Charges Applicable</p>
                  <p>6) New Machine Install Advance Payment 80%</p>
                  <p>7) Commercial Use Unit No Warranty</p>
                </div>

                {/* Authorised Signatory (Col 4) */}
                <div className="col-span-3 p-2 flex flex-col justify-end text-center">
                  <div className="mb-1 flex justify-center">
                    <svg viewBox="0 0 140 60" className="h-8 w-20" aria-label="Authorised Signature">
                      <path d="M 20 48 C 15 25 22 10 32 8 C 42 6 48 18 45 32 C 43 42 32 46 25 45 C 38 43 52 28 58 16 C 63 8 70 8 74 14 C 77 22 75 36 68 45" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M 52 24 C 62 18 72 20 82 28 C 88 34 94 36 102 36" fill="none" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M 68 44 C 82 43 105 40 128 38" fill="none" stroke="#000000" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p className="text-[9px] font-bold uppercase leading-tight text-black">
                    Authorised Signatory For<br />
                    SR ENTERPRISES
                  </p>
                </div>

              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
