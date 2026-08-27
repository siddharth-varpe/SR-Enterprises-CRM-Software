/**
 * CSV Formula Injection Sanitizer & Safe Cell Formatter
 * Protects against CSV / DDE injection attacks in spreadsheet applications.
 */

const DANGEROUS_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Sanitizes a single cell value for CSV output.
 * If the string begins with a formula execution character (=, +, -, @, \t, \r),
 * it prepends a single quote (') to force spreadsheets to treat it as plain text.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }

  let stringValue = String(value);

  // If the value starts with a dangerous formula trigger, prepend a single quote
  const firstChar = stringValue.charAt(0);
  if (DANGEROUS_PREFIXES.includes(firstChar)) {
    stringValue = `'${stringValue}`;
  }

  // Escape any existing double quotes by doubling them
  const escapedValue = stringValue.replace(/"/g, '""');

  // Wrap in quotes
  return `"${escapedValue}"`;
}

/**
 * Formats an array of row values into a sanitized CSV line.
 */
export function formatCsvRow(values: unknown[]): string {
  return values.map(sanitizeCsvCell).join(',') + '\n';
}
