/**
 * CSV Parser & Generator Utility for SRM Data Movement
 * Safe, robust parser supporting quoted fields, escaped quotes, multi-line cells, and formula sanitization.
 */

export interface ParsedCsvResult {
  headers: string[];
  rows: Array<Record<string, string>>;
  totalRows: number;
}

/**
 * Parse a CSV string into structured header array and record rows.
 */
export function parseCsv(csvText: string, options?: { maxRows?: number }): ParsedCsvResult {
  if (!csvText || !csvText.trim()) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  const rawLines = tokenizeCsv(csvText);
  if (rawLines.length === 0) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  // First line is headers
  const headers = rawLines[0].map((h) => h.trim());
  const rows: Array<Record<string, string>> = [];

  const maxRows = options?.maxRows || 50000;
  const lineLimit = Math.min(rawLines.length, maxRows + 1);

  for (let i = 1; i < lineLimit; i++) {
    const lineTokens = rawLines[i];
    // Skip empty lines
    if (lineTokens.length === 1 && !lineTokens[0].trim()) {
      continue;
    }

    const rowObj: Record<string, string> = {};
    for (let h = 0; h < headers.length; h++) {
      const header = headers[h];
      let val = lineTokens[h] !== undefined ? lineTokens[h].trim() : '';
      // Strip leading single quote if prepended by CSV formula sanitizer
      if (val.startsWith("'") && (val.startsWith("'=") || val.startsWith("'+") || val.startsWith("'-") || val.startsWith("'@"))) {
        val = val.substring(1);
      }
      rowObj[header] = val;
    }
    rows.push(rowObj);
  }

  return {
    headers,
    rows,
    totalRows: rows.length,
  };
}

/**
 * Tokenizes CSV string respecting quoted strings containing commas and newlines
 */
export function tokenizeCsv(csvText: string): string[][] {
  const result: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < csvText.length) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped double quote
        currentField += '"';
        i += 2;
        continue;
      } else if (char === '"') {
        // Closing quote
        inQuotes = false;
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
        i++;
        continue;
      } else if (char === '\r' && nextChar === '\n') {
        currentRow.push(currentField);
        result.push(currentRow);
        currentRow = [];
        currentField = '';
        i += 2;
        continue;
      } else if (char === '\n' || char === '\r') {
        currentRow.push(currentField);
        result.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
        continue;
      } else {
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // Push final field & row
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    result.push(currentRow);
  }

  return result;
}
