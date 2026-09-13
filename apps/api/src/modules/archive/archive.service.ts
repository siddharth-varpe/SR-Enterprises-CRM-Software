import { isArchiveDatabaseConfigured, getArchiveDatabaseClient } from '../../database/archive/archive-client.js';

export interface ArchiveSummaryReport {
  isConfigured: boolean;
  status: 'CONNECTED' | 'NOT_CONFIGURED' | 'ERROR';
  archiveRecordCounts: Record<string, number>;
  errorMessage?: string;
}

/**
 * Archive Service (Supabase #2 Data Foundation)
 * Provides read and query access for historical records residing in Supabase #2.
 * Strictly read-only for existing operational records (zero deletion or mutation of DB1).
 */
export class ArchiveService {
  /**
   * Check if Supabase #2 Archive Database is configured and ready
   */
  public isArchiveAvailable(): boolean {
    return isArchiveDatabaseConfigured();
  }

  /**
   * Inspect status and record counts across Supabase #2 tables
   */
  public async getArchiveSummary(): Promise<ArchiveSummaryReport> {
    if (!this.isArchiveAvailable()) {
      return {
        isConfigured: false,
        status: 'NOT_CONFIGURED',
        archiveRecordCounts: {},
      };
    }

    try {
      const { sql } = getArchiveDatabaseClient();
      const tablesCheck: any[] = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `;

      const counts: Record<string, number> = {};
      for (const row of tablesCheck) {
        const tableName = row.table_name;
        try {
          const res: any[] = await sql.unsafe(`SELECT count(*)::int as count FROM "${tableName}"`);
          counts[tableName] = Number(res[0]?.count || 0);
        } catch {
          counts[tableName] = 0;
        }
      }

      return {
        isConfigured: true,
        status: 'CONNECTED',
        archiveRecordCounts: counts,
      };
    } catch (err: any) {
      return {
        isConfigured: true,
        status: 'ERROR',
        archiveRecordCounts: {},
        errorMessage: err?.message || String(err),
      };
    }
  }

  /**
   * Query historical records from Supabase #2 Archive Database
   */
  public async queryArchivedTable<T = any>(
    tableName: string,
    filter?: { whereClause?: string; limit?: number; offset?: number }
  ): Promise<T[]> {
    if (!this.isArchiveAvailable()) {
      return [];
    }

    const { sql } = getArchiveDatabaseClient();
    const limit = filter?.limit || 100;
    const offset = filter?.offset || 0;
    const where = filter?.whereClause ? `WHERE ${filter.whereClause}` : '';

    const queryStr = `SELECT * FROM "${tableName.replace(/[^a-zA-Z0-9_]/g, '')}" ${where} LIMIT ${limit} OFFSET ${offset};`;
    const rows = await sql.unsafe(queryStr);
    return (rows as any) || [];
  }
}

export const archiveService = new ArchiveService();
