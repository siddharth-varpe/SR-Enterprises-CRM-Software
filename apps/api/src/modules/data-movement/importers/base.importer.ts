/**
 * Base Importer Interface & Abstract Class
 * Establishes standard pipeline: Validation -> Normalization -> Duplicate Detection -> Reference Check -> Transactional Import
 */

import type {
  ImportEntityType,
  ImportDuplicatePolicy,
  ImportPreviewResult,
  ImportExecuteResult,
  ImportRowError,
  ImportRowWarning,
} from '@crm/types';

export interface ImporterContext {
  userId?: string;
  userRole?: string;
  organizationId?: string;
  ipAddress?: string;
}

export abstract class BaseImporter {
  abstract readonly entityType: ImportEntityType;
  abstract readonly requiredColumns: string[];
  abstract readonly optionalColumns: string[];

  /**
   * Generates a preview with validation, duplicate detection, and reference checks.
   * ABSOLUTELY ZERO DATABASE MUTATIONS OCCUR DURING PREVIEW.
   */
  abstract preview(
    rows: Array<Record<string, any>>,
    context?: ImporterContext
  ): Promise<ImportPreviewResult>;

  /**
   * Executes the validated import inside a transactional boundary.
   */
  abstract execute(
    records: Array<Record<string, any>>,
    duplicatePolicy: ImportDuplicatePolicy,
    context?: ImporterContext
  ): Promise<ImportExecuteResult>;

  /**
   * Returns standard CSV template header and example rows for download
   */
  abstract getTemplate(): { headers: string[]; exampleRows: Array<Record<string, string>> };

  /**
   * Helper: Normalize string (trim, collapse whitespace)
   */
  protected normalizeString(val: unknown): string {
    if (val === null || val === undefined) return '';
    return String(val).trim().replace(/\s+/g, ' ');
  }

  /**
   * Helper: Normalize phone numbers (strips non-digits, extracts last 10 digits)
   */
  protected normalizePhone(phone: unknown): string {
    if (!phone) return '';
    const digits = String(phone).replace(/\D/g, '');
    if (digits.length === 10) return digits;
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
    return digits;
  }

  /**
   * Helper: Safe parse currency/numbers (handles ₹, commas)
   */
  protected parseSafeNumber(val: unknown): number | null {
    if (val === null || val === undefined || val === '') return null;
    const cleanStr = String(val).replace(/[₹,$,\s]/g, '').trim();
    const num = Number(cleanStr);
    return Number.isFinite(num) ? num : null;
  }
}
