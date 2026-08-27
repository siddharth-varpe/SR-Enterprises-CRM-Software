export interface InvoiceLineCalculationInput {
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  taxRatePercent?: number;
}

export interface CalculatedInvoiceLine {
  quantity: number;
  unitPrice: string;
  subtotal: string;
  discountAmount: string;
  taxableAmount: string;
  taxRatePercent: string;
  taxAmount: string;
  lineTotal: string;
}

export interface CalculatedInvoiceDocument {
  lines: CalculatedInvoiceLine[];
  subtotal: string;
  discountAmount: string;
  taxableAmount: string;
  taxAmount: string;
  totalAmount: string;
}

export function roundToTwo(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatMoney(value: number): string {
  return roundToTwo(value).toFixed(2);
}

export function calculateInvoiceLine(input: InvoiceLineCalculationInput): CalculatedInvoiceLine {
  const quantity = Math.max(1, Math.floor(input.quantity || 1));
  const unitPrice = Math.max(0, input.unitPrice || 0);
  const lineSubtotal = quantity * unitPrice;

  const discountAmount = Math.min(lineSubtotal, Math.max(0, input.discountAmount || 0));
  const taxableAmount = Math.max(0, lineSubtotal - discountAmount);

  const taxRatePercent = Math.max(0, input.taxRatePercent ?? 18);
  const taxAmount = roundToTwo(taxableAmount * (taxRatePercent / 100));
  const lineTotal = roundToTwo(taxableAmount + taxAmount);

  return {
    quantity,
    unitPrice: formatMoney(unitPrice),
    subtotal: formatMoney(lineSubtotal),
    discountAmount: formatMoney(discountAmount),
    taxableAmount: formatMoney(taxableAmount),
    taxRatePercent: formatMoney(taxRatePercent),
    taxAmount: formatMoney(taxAmount),
    lineTotal: formatMoney(lineTotal),
  };
}

export function calculateInvoiceTotals(
  items: InvoiceLineCalculationInput[],
  documentDiscountAmount: number = 0
): CalculatedInvoiceDocument {
  const calculatedLines = items.map((item) => calculateInvoiceLine(item));

  const totalLinesSubtotal = calculatedLines.reduce(
    (sum, line) => sum + parseFloat(line.subtotal),
    0
  );
  const totalLinesDiscount = calculatedLines.reduce(
    (sum, line) => sum + parseFloat(line.discountAmount),
    0
  );
  const totalExtraDiscount = Math.max(0, documentDiscountAmount);
  const totalDiscount = roundToTwo(totalLinesDiscount + totalExtraDiscount);

  const totalTaxable = Math.max(0, roundToTwo(totalLinesSubtotal - totalDiscount));

  const totalTax = calculatedLines.reduce(
    (sum, line) => sum + parseFloat(line.taxAmount),
    0
  );

  const totalAmount = Math.max(
    0,
    roundToTwo(totalTaxable + totalTax)
  );

  return {
    lines: calculatedLines,
    subtotal: formatMoney(totalLinesSubtotal),
    discountAmount: formatMoney(totalDiscount),
    taxableAmount: formatMoney(totalTaxable),
    taxAmount: formatMoney(totalTax),
    totalAmount: formatMoney(totalAmount),
  };
}
