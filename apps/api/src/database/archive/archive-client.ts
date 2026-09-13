import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../../config/env.js';
import * as schema from '../schema/index.js';

let archivePgClient: postgres.Sql | null = null;
let archiveDbInstance: any = null;

/**
 * Check whether Supabase #2 Archive Database credentials are configured
 */
export function isArchiveDatabaseConfigured(): boolean {
  return Boolean(env.ARCHIVE_DATABASE_URL && env.ARCHIVE_DATABASE_URL.trim() !== '');
}

/**
 * Initialize or retrieve isolated Supabase #2 Archive PostgreSQL connection.
 * Strictly isolated from Primary Supabase #1.
 */
export function getArchiveDatabaseClient(): { sql: postgres.Sql; db: any } {
  if (!isArchiveDatabaseConfigured()) {
    throw new Error('Archive database (Supabase #2) is not configured. Please set ARCHIVE_DATABASE_URL in your environment.');
  }

  if (archiveDbInstance && archivePgClient) {
    return { sql: archivePgClient, db: archiveDbInstance };
  }

  const archiveUrl = env.ARCHIVE_DATABASE_URL!;
  const isSupabasePooler = archiveUrl.includes(':6543') || archiveUrl.includes('pooler.supabase.com');
  const isSupabase = isSupabasePooler || archiveUrl.includes('supabase.co');
  const sslMode = isSupabase || archiveUrl.includes('sslmode=') || env.NODE_ENV === 'production' ? 'require' : undefined;

  try {
    archivePgClient = postgres(archiveUrl, {
      max: env.DB_MAX_CONNECTIONS || 5,
      idle_timeout: Math.floor((env.DB_IDLE_TIMEOUT_MS || 30000) / 1000),
      connect_timeout: 10,
      ssl: sslMode as any,
      prepare: isSupabasePooler ? false : true,
      onnotice: () => {},
    });

    archiveDbInstance = drizzle(archivePgClient, { schema });
    console.log(
      `[Database #2 Archive] Connected to Supabase #2 PostgreSQL engine at: ${archiveUrl.replace(/:[^:@]+@/, ':****@')}`
    );

    return { sql: archivePgClient, db: archiveDbInstance };
  } catch (err: any) {
    console.error('[Database #2 Archive] Connection error:', err?.message || err);
    throw err;
  }
}

/**
 * Proxy for Archive Database (Supabase #2) operations.
 * Throws explicit descriptive error if accessed when unconfigured.
 */
export const archiveDb: any = new Proxy(
  {},
  {
    get(_target, prop) {
      const client = getArchiveDatabaseClient();
      return client.db ? (client.db as any)[prop] : undefined;
    },
  }
);

/**
 * Proxy for Archive SQL client (Supabase #2).
 */
export const archiveSql: any = new Proxy(
  function () {},
  {
    get(_target, prop) {
      const client = getArchiveDatabaseClient();
      return client.sql ? (client.sql as any)[prop] : undefined;
    },
    apply(_target, thisArg, argArray) {
      const client = getArchiveDatabaseClient();
      return Reflect.apply(client.sql as any, thisArg, argArray);
    },
  }
);

/**
 * Close Supabase #2 Archive Database connections
 */
export async function closeArchiveDatabaseConnection(): Promise<void> {
  if (archivePgClient) {
    try {
      await archivePgClient.end({ timeout: 5 });
    } catch {}
    archivePgClient = null;
  }
  archiveDbInstance = null;
}
