/**
 * File Security & Storage Path Validator
 * Protects against path traversal, oversized payloads, malicious extensions, and unauthorized file access.
 */

import path from 'node:path';
import crypto from 'node:crypto';

export interface FileValidationOptions {
  maxSizeBytes?: number;
  allowedExtensions?: string[];
  allowedMimeTypes?: string[];
}

const DEFAULT_MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const DEFAULT_ALLOWED_EXTENSIONS = ['.csv', '.json', '.xlsx', '.xls'];
const DEFAULT_ALLOWED_MIME_TYPES = [
  'text/csv',
  'text/plain',
  'application/json',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
];

/**
 * Validates uploaded file metadata against security constraints
 */
export function validateFileSecurity(
  filename: string,
  fileSizeBytes: number,
  mimeType?: string,
  options?: FileValidationOptions
): { valid: boolean; error?: string } {
  const maxSizeBytes = options?.maxSizeBytes || DEFAULT_MAX_SIZE_BYTES;
  const allowedExtensions = options?.allowedExtensions || DEFAULT_ALLOWED_EXTENSIONS;
  const allowedMimeTypes = options?.allowedMimeTypes || DEFAULT_ALLOWED_MIME_TYPES;

  // 1. File Size Verification
  if (fileSizeBytes <= 0) {
    return { valid: false, error: 'Uploaded file is empty (0 bytes).' };
  }
  if (fileSizeBytes > maxSizeBytes) {
    const mbLimit = (maxSizeBytes / (1024 * 1024)).toFixed(1);
    return { valid: false, error: `File size exceeds the allowable limit of ${mbLimit} MB.` };
  }

  // 2. Filename and Path Traversal Check
  if (!filename || typeof filename !== 'string') {
    return { valid: false, error: 'Invalid or missing filename.' };
  }

  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return { valid: false, error: 'Malicious filename detected (path traversal characters).' };
  }

  // 3. Extension Verification
  const ext = path.extname(filename).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported file extension '${ext}'. Allowed extensions: ${allowedExtensions.join(', ')}`,
    };
  }

  // 4. MIME Type Verification (if provided)
  if (mimeType && !allowedMimeTypes.includes(mimeType.toLowerCase())) {
    // Note: Some browsers send text/plain for CSV, so we accept text/plain if extension is .csv
    if (!(ext === '.csv' && mimeType.toLowerCase() === 'text/plain')) {
      return {
        valid: false,
        error: `Unsupported MIME type '${mimeType}'.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Generate an unguessable, safe server-side storage filename.
 */
export function generateSafeStorageFilename(originalFilename: string, prefix = 'import'): string {
  const ext = path.extname(originalFilename).toLowerCase();
  const randomSuffix = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  return `${prefix}_${timestamp}_${randomSuffix}${ext}`;
}

/**
 * Ensures the target destination path resolves strictly within the allowed parent directory.
 */
export function resolveSafeStoragePath(baseDir: string, safeFilename: string): string {
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(baseDir, safeFilename);

  if (!resolvedTarget.startsWith(resolvedBase)) {
    throw new Error('Security Violation: Target path is outside base directory.');
  }

  return resolvedTarget;
}
