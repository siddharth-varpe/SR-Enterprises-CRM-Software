/**
 * Central Data Import Service
 * Orchestrates domain importers, file parsing, validation, previews, and transactional commits.
 */

import { BaseImporter, type ImporterContext } from './importers/base.importer';
import { CustomerImporter } from './importers/customer.importer';
import { ProductImporter } from './importers/product.importer';
import { AssetImporter } from './importers/asset.importer';
import { InventoryImporter } from './importers/inventory.importer';
import { WarrantyImporter } from './importers/warranty.importer';
import { parseCsv } from './utils/csv-parser';
import type {
  ImportEntityType,
  ImportDuplicatePolicy,
  ImportPreviewResult,
  ImportExecuteResult,
} from '@crm/types';

export class DataImportService {
  private importers = new Map<ImportEntityType, BaseImporter>();

  constructor() {
    this.registerImporter(new CustomerImporter());
    this.registerImporter(new ProductImporter());
    this.registerImporter(new AssetImporter());
    this.registerImporter(new InventoryImporter());
    this.registerImporter(new WarrantyImporter());
  }

  private registerImporter(importer: BaseImporter) {
    this.importers.set(importer.entityType, importer);
  }

  /**
   * Get registered importer for an entity type
   */
  getImporter(type: ImportEntityType): BaseImporter {
    const importer = this.importers.get(type);
    if (!importer) {
      throw new Error(`Unsupported import entity type: '${type}'. Supported: ${Array.from(this.importers.keys()).join(', ')}`);
    }
    return importer;
  }

  /**
   * Generates a preview from raw CSV text or structured JSON row array
   * ABSOLUTELY ZERO DATABASE MUTATIONS OCCUR.
   */
  async preview(
    type: ImportEntityType,
    payload: string | Array<Record<string, any>>,
    context?: ImporterContext
  ): Promise<ImportPreviewResult> {
    const importer = this.getImporter(type);

    let rows: Array<Record<string, any>> = [];
    if (typeof payload === 'string') {
      const parsed = parseCsv(payload);
      rows = parsed.rows;
    } else if (Array.isArray(payload)) {
      rows = payload;
    } else {
      throw new Error('Invalid import payload. Must be a CSV string or an array of row objects.');
    }

    if (rows.length === 0) {
      return {
        entityType: type,
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        duplicateRows: 0,
        missingReferenceRows: 0,
        errors: [
          {
            rowNumber: 0,
            code: 'REQUIRED_FIELD',
            message: 'No data rows found in uploaded file.',
          },
        ],
        warnings: [],
        sampleValid: [],
        sampleInvalid: [],
        canProceed: false,
      };
    }

    return await importer.preview(rows, context);
  }

  /**
   * Commits the import dataset inside a transactional boundary.
   */
  async execute(
    type: ImportEntityType,
    records: Array<Record<string, any>>,
    duplicatePolicy: ImportDuplicatePolicy = 'CREATE',
    context?: ImporterContext
  ): Promise<ImportExecuteResult> {
    const importer = this.getImporter(type);
    if (!records || records.length === 0) {
      throw new Error('Cannot execute empty import dataset.');
    }

    return await importer.execute(records, duplicatePolicy, context);
  }

  /**
   * Generates standard downloadable CSV template for a given entity type
   */
  getTemplateCsv(type: ImportEntityType): { filename: string; csvContent: string } {
    const importer = this.getImporter(type);
    const { headers, exampleRows } = importer.getTemplate();

    const lines: string[] = [headers.join(',')];
    for (const ex of exampleRows) {
      const line = headers.map((h) => `"${(ex[h] || '').replace(/"/g, '""')}"`).join(',');
      lines.push(line);
    }

    return {
      filename: `srm_${type}_import_template.csv`,
      csvContent: lines.join('\n') + '\n',
    };
  }
}

export const dataImportService = new DataImportService();
