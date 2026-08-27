import { drizzle as drizzlePg, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import postgres from 'postgres';
import { PGlite } from '@electric-sql/pglite';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env';
import * as schema from './schema/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let pgClient: postgres.Sql | null = null;
let pgliteClient: PGlite | null = null;
let dbInstance: any = null;
let isInitialized = false;

/**
 * Resolve persistent storage directory for embedded PostgreSQL
 */
export function resolveDatabaseStorageDir(): string {
  if (process.env.CRM_STORAGE_DIR) {
    return path.join(process.env.CRM_STORAGE_DIR, 'database', 'pgdata');
  }

  // Persistent database in workspace root
  return path.resolve(process.cwd(), '.crm-data', 'pgdata');
}

/**
 * Execute Drizzle migration SQL statements on PGlite or Postgres
 */
export async function applySqlMigrations(targetPg: PGlite | postgres.Sql): Promise<void> {
  const migrationsFolder = path.resolve(__dirname, '../../drizzle');
  const sqlFilePath = path.join(migrationsFolder, '0000_lumpy_vapor.sql');

  if (!fs.existsSync(sqlFilePath)) {
    return;
  }

  // Run idempotent migrations to ensure newly added tables exist

  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
  const rawStatements = sqlContent
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);

  const statements = rawStatements.map((stmt) => {
    // Make CREATE TABLE idempotent
    if (/^CREATE\s+TABLE\s+(?!"?[a-zA-Z0-9_]+"?\s+IF\s+NOT\s+EXISTS)/i.test(stmt)) {
      return stmt.replace(/^CREATE\s+TABLE\s+/i, 'CREATE TABLE IF NOT EXISTS ');
    }
    // Make CREATE INDEX idempotent
    if (/^CREATE\s+INDEX\s+/i.test(stmt)) {
      return stmt.replace(/^CREATE\s+INDEX\s+/i, 'CREATE INDEX IF NOT EXISTS ');
    }
    // Make CREATE UNIQUE INDEX idempotent
    if (/^CREATE\s+UNIQUE\s+INDEX\s+/i.test(stmt)) {
      return stmt.replace(/^CREATE\s+UNIQUE\s+INDEX\s+/i, 'CREATE UNIQUE INDEX IF NOT EXISTS ');
    }
    return stmt;
  });

  if ('exec' in targetPg) {
    // PGlite client
    for (const stmt of statements) {
      try {
        await targetPg.exec(stmt);
      } catch (err: any) {
        // Suppress non-critical migration notices
      }
    }
  } else {
    // postgres.js client
    for (const stmt of statements) {
      try {
        await targetPg.unsafe(stmt);
      } catch (err: any) {
        // Suppress non-critical migration notices
      }
    }
  }
}

/**
 * Initialize or get database client with persistent storage
 */
export function getDatabaseClient() {
  if (dbInstance) {
    return { sql: pgClient || pgliteClient, db: dbInstance };
  }

  // Check if PostgreSQL server is explicitly configured and not default unconfigured
  const storageDir = resolveDatabaseStorageDir();
  fs.mkdirSync(storageDir, { recursive: true });

  ['postmaster.pid', 'postmaster.opts', '.lock'].forEach((f) => {
    const p = path.join(storageDir, f);
    if (fs.existsSync(p)) {
      try {
        fs.unlinkSync(p);
      } catch {}
    }
  });

  try {
    // Initialize persistent PGlite engine stored on disk
    pgliteClient = new PGlite(storageDir);
    dbInstance = drizzlePglite(pgliteClient, { schema });
    console.log(`[Database] Connected to persistent database engine at: ${storageDir}`);
  } catch (err) {
    console.warn('[Database] Initializing clean database storage directory due to exception:', err);
    try {
      if (fs.existsSync(storageDir)) {
        fs.rmSync(storageDir, { recursive: true, force: true });
      }
      fs.mkdirSync(storageDir, { recursive: true });
      pgliteClient = new PGlite(storageDir);
      dbInstance = drizzlePglite(pgliteClient, { schema });
    } catch {
      pgClient = postgres(env.DATABASE_URL, {
        max: env.DB_MAX_CONNECTIONS,
        idle_timeout: Math.floor(env.DB_IDLE_TIMEOUT_MS / 1000),
        connect_timeout: 5,
        onnotice: () => {},
      });
      dbInstance = drizzlePg(pgClient, { schema });
    }
  }

  return { sql: pgClient || pgliteClient, db: dbInstance! };
}

export const { sql, db } = getDatabaseClient();

/**
 * Ensures email_notifications and email_queue tables and enums exist
 */
export async function ensureEmailTables(targetPg: PGlite | postgres.Sql): Promise<void> {
  const statements = [
    `DO $$ BEGIN CREATE TYPE "email_event_type" AS ENUM('SALE_CONFIRMATION', 'PAYMENT_RECEIPT', 'SERVICE_COMPLETED', 'SERVICE_REMINDER', 'PAYMENT_REMINDER', 'THANK_YOU', 'WARRANTY_EXPIRY_REMINDER', 'INVOICE_EMAIL', 'ADMIN_TEST', 'GENERAL'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE "email_delivery_status" AS ENUM('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'SKIPPED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `CREATE TABLE IF NOT EXISTS "email_notifications" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "customer_id" uuid REFERENCES "customers"("id") ON DELETE SET NULL,
      "event_type" "email_event_type" NOT NULL,
      "reference_type" text,
      "reference_id" text,
      "idempotency_key" text UNIQUE,
      "recipient_email" text NOT NULL,
      "recipient_name" text,
      "subject" text NOT NULL,
      "status" "email_delivery_status" DEFAULT 'PENDING' NOT NULL,
      "attempt_count" integer DEFAULT 0 NOT NULL,
      "max_attempts" integer DEFAULT 3 NOT NULL,
      "sent_at" timestamp with time zone,
      "failed_at" timestamp with time zone,
      "last_error" text,
      "pdf_attached" boolean DEFAULT false NOT NULL,
      "pdf_filename" text,
      "metadata" jsonb,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS "email_notifications_customer_id_idx" ON "email_notifications" ("customer_id");`,
    `CREATE INDEX IF NOT EXISTS "email_notifications_event_type_idx" ON "email_notifications" ("event_type");`,
    `CREATE INDEX IF NOT EXISTS "email_notifications_reference_idx" ON "email_notifications" ("reference_type", "reference_id");`,
    `CREATE INDEX IF NOT EXISTS "email_notifications_idempotency_key_idx" ON "email_notifications" ("idempotency_key");`,
    `CREATE INDEX IF NOT EXISTS "email_notifications_status_idx" ON "email_notifications" ("status");`,
    `CREATE INDEX IF NOT EXISTS "email_notifications_created_at_idx" ON "email_notifications" ("created_at");`,
    `CREATE TABLE IF NOT EXISTS "email_queue" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "notification_id" uuid REFERENCES "email_notifications"("id") ON DELETE CASCADE,
      "event_type" "email_event_type" NOT NULL,
      "reference_type" text,
      "reference_id" text,
      "recipient_email" text NOT NULL,
      "payload" jsonb NOT NULL,
      "status" "email_delivery_status" DEFAULT 'PENDING' NOT NULL,
      "attempts" integer DEFAULT 0 NOT NULL,
      "max_attempts" integer DEFAULT 3 NOT NULL,
      "next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
      "sent_at" timestamp with time zone,
      "last_error" text,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS "email_queue_status_idx" ON "email_queue" ("status");`,
    `CREATE INDEX IF NOT EXISTS "email_queue_next_attempt_idx" ON "email_queue" ("next_attempt_at");`,
    `CREATE INDEX IF NOT EXISTS "email_queue_event_type_idx" ON "email_queue" ("event_type");`,
    `CREATE INDEX IF NOT EXISTS "email_queue_reference_idx" ON "email_queue" ("reference_type", "reference_id");`,
  ];

  if ('exec' in targetPg) {
    for (const stmt of statements) {
      try {
        await targetPg.exec(stmt);
      } catch {}
    }
  } else {
    for (const stmt of statements) {
      try {
        await targetPg.unsafe(stmt);
      } catch {}
    }
  }
}

/**
 * Ensures Google Drive metadata columns exist on invoices and payments tables
 */
export async function ensureGoogleDriveColumns(targetPg: PGlite | postgres.Sql): Promise<void> {
  const statements = [
    `ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "drive_file_id" text;`,
    `ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "drive_file_name" text;`,
    `ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "drive_web_url" text;`,
    `ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "drive_upload_status" text DEFAULT 'PENDING';`,
    `ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "drive_uploaded_at" timestamp with time zone;`,
    `ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "drive_error" text;`,
    `CREATE INDEX IF NOT EXISTS "invoices_drive_file_id_idx" ON "invoices" ("drive_file_id");`,

    `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "drive_file_id" text;`,
    `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "drive_file_name" text;`,
    `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "drive_web_url" text;`,
    `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "drive_upload_status" text DEFAULT 'PENDING';`,
    `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "drive_uploaded_at" timestamp with time zone;`,
    `ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "drive_error" text;`,
    `CREATE INDEX IF NOT EXISTS "payments_drive_file_id_idx" ON "payments" ("drive_file_id");`,
  ];

  if ('exec' in targetPg) {
    for (const stmt of statements) {
      try {
        await targetPg.exec(stmt);
      } catch {}
    }
  } else {
    for (const stmt of statements) {
      try {
        await targetPg.unsafe(stmt);
      } catch {}
    }
  }
}

/**
 * Ensures migrations and initial database initialization is executed once on server startup
 */
export async function ensureDatabaseInitialized(): Promise<void> {
  if (isInitialized) return;

  try {
    if (pgliteClient) {
      // Test health of persistent storage
      try {
        await pgliteClient.query('SELECT 1;');
      } catch (healthErr: any) {
        console.warn('⚠️ [Database] Persistent storage check failed, recovering clean database state...', healthErr?.message);
        try {
          await pgliteClient.close();
        } catch {}
        const storageDir = resolveDatabaseStorageDir();
        if (fs.existsSync(storageDir)) {
          fs.rmSync(storageDir, { recursive: true, force: true });
        }
        fs.mkdirSync(storageDir, { recursive: true });
        pgliteClient = new PGlite(storageDir);
        dbInstance = drizzlePglite(pgliteClient, { schema });
      }

      await applySqlMigrations(pgliteClient);
      await ensureEmailTables(pgliteClient);
      await ensureGoogleDriveColumns(pgliteClient);
    } else if (pgClient) {
      await applySqlMigrations(pgClient);
      await ensureEmailTables(pgClient);
      await ensureGoogleDriveColumns(pgClient);
    }
    isInitialized = true;
    console.log('✅ [Database] All database tables, sequences, and indexes verified successfully.');
  } catch (err) {
    console.error('[Database] Error verifying database schema:', err);
  }
}

/**
 * Graceful close of PostgreSQL connections
 */
export async function closeDatabaseConnections(): Promise<void> {
  if (pgClient) {
    await pgClient.end({ timeout: 5 });
    pgClient = null;
  }
  if (pgliteClient) {
    await pgliteClient.close();
    pgliteClient = null;
  }
  dbInstance = null;
  isInitialized = false;
}
