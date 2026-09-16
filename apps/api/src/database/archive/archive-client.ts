import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../../config/env.js';
import * as schema from '../schema/index.js';

let archivePgClient: postgres.Sql | null = null;
let archiveDbInstance: any = null;

/**
 * Check whether Secondary Archive Database credentials are configured
 */
export function isArchiveDatabaseConfigured(): boolean {
  return Boolean(env.ARCHIVE_DATABASE_URL && env.ARCHIVE_DATABASE_URL.trim() !== '');
}

/**
 * Initialize or retrieve isolated Secondary Archive PostgreSQL connection.
 */
export function getArchiveDatabaseClient(): { sql: postgres.Sql; db: any } {
  if (!isArchiveDatabaseConfigured()) {
    throw new Error('Archive database is not configured. Please set ARCHIVE_DATABASE_URL in your environment.');
  }

  if (archiveDbInstance && archivePgClient) {
    return { sql: archivePgClient, db: archiveDbInstance };
  }

  const archiveUrl = env.ARCHIVE_DATABASE_URL!;
  const sslMode = archiveUrl.includes('sslmode=require') || env.NODE_ENV === 'production' ? 'require' : undefined;

  try {
    archivePgClient = postgres(archiveUrl, {
      max: env.DB_MAX_CONNECTIONS || 5,
      idle_timeout: Math.floor((env.DB_IDLE_TIMEOUT_MS || 30000) / 1000),
      connect_timeout: 10,
      ssl: sslMode as any,
      onnotice: () => {},
    });

    archiveDbInstance = drizzle(archivePgClient, { schema });
    console.log(
      `[Archive Database] Connected to Archive PostgreSQL engine at: ${archiveUrl.replace(/:[^:@]+@/, ':****@')}`
    );

    return { sql: archivePgClient, db: archiveDbInstance };
  } catch (err: any) {
    console.error('[Archive Database] Connection error:', err?.message || err);
    throw err;
  }
}

/**
 * Proxy for Archive Database operations.
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
 * Proxy for Archive SQL client.
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
 * Close Archive Database connections
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
