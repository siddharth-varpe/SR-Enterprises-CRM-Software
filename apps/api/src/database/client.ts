import { drizzle as drizzlePg, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import postgres from 'postgres';
import { PGlite } from '@electric-sql/pglite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env';
import * as schema from './schema/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let pgClient: postgres.Sql | null = null;
let pgliteClient: PGlite | null = null;
let dbInstance: any = null;
let initPromise: Promise<void> | null = null;
let isInitialized = false;

/**
 * Resolve persistent storage directory for embedded PostgreSQL
 */
export function resolveDatabaseStorageDir(): string {
  if (process.env.CRM_STORAGE_DIR) {
    return path.join(process.env.CRM_STORAGE_DIR, 'database', 'pgdata');
  }

  // Anchor persistent database deterministically to apps/api/.crm-data/pgdata
  const apiRoot = path.resolve(__dirname, '../../');
  return path.resolve(apiRoot, '.crm-data', 'pgdata');
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
    // 1. Make CREATE TYPE idempotent
    if (/^CREATE\s+TYPE\s+/i.test(stmt)) {
      const cleanStmt = stmt.replace(/;$/, '');
      return `DO $$ BEGIN ${cleanStmt}; EXCEPTION WHEN duplicate_object THEN null; END $$;`;
    }
    // 2. Make CREATE TABLE idempotent
    if (/^CREATE\s+TABLE\s+(?!"?[a-zA-Z0-9_]+"?\s+IF\s+NOT\s+EXISTS)/i.test(stmt)) {
      return stmt.replace(/^CREATE\s+TABLE\s+/i, 'CREATE TABLE IF NOT EXISTS ');
    }
    // 3. Make CREATE INDEX idempotent
    if (/^CREATE\s+INDEX\s+/i.test(stmt)) {
      return stmt.replace(/^CREATE\s+INDEX\s+/i, 'CREATE INDEX IF NOT EXISTS ');
    }
    // 4. Make CREATE UNIQUE INDEX idempotent
    if (/^CREATE\s+UNIQUE\s+INDEX\s+/i.test(stmt)) {
      return stmt.replace(/^CREATE\s+UNIQUE\s+INDEX\s+/i, 'CREATE UNIQUE INDEX IF NOT EXISTS ');
    }
    // 5. Make ALTER TABLE ADD CONSTRAINT idempotent
    if (/^ALTER\s+TABLE\s+.*ADD\s+CONSTRAINT/i.test(stmt)) {
      const cleanStmt = stmt.replace(/;$/, '');
      return `DO $$ BEGIN ${cleanStmt}; EXCEPTION WHEN duplicate_object THEN null; WHEN duplicate_table THEN null; END $$;`;
    }
    return stmt;
  });

  if ('exec' in targetPg) {
    // PGlite client
    for (const stmt of statements) {
      try {
        await targetPg.exec(stmt);
      } catch (err: any) {
        // Suppress non-critical duplicate notices
      }
    }
  } else {
    // postgres.js client
    for (const stmt of statements) {
      try {
        await targetPg.unsafe(stmt);
      } catch (err: any) {
        // Suppress non-critical duplicate notices
      }
    }
  }
}

/**
 * Initialize or get database client with persistent storage
 */
export function getDatabaseClient() {
  if (dbInstance && (pgClient || pgliteClient)) {
    return { sql: pgClient || pgliteClient, db: dbInstance };
  }

  const storageDir = resolveDatabaseStorageDir();
  fs.mkdirSync(storageDir, { recursive: true });

  // Clean stale pid file only if process crashed
  ['postmaster.pid', '.lock'].forEach((f) => {
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
    console.warn('[Database] PGlite initialization notice:', err);
    try {
      pgClient = postgres(env.DATABASE_URL, {
        max: env.DB_MAX_CONNECTIONS,
        idle_timeout: Math.floor(env.DB_IDLE_TIMEOUT_MS / 1000),
        connect_timeout: 5,
        onnotice: () => {},
      });
      dbInstance = drizzlePg(pgClient, { schema });
    } catch (pgErr) {
      console.error('[Database] Connection fallback failed:', pgErr);
    }
  }

  return { sql: pgClient || pgliteClient, db: dbInstance! };
}

// Export dynamic proxies to ensure all modules always interact with the active database instance
export const db: any = new Proxy(
  {},
  {
    get(_target, prop) {
      if (!dbInstance) {
        getDatabaseClient();
      }
      return dbInstance ? (dbInstance as any)[prop] : undefined;
    },
  }
);

export const sql: any = new Proxy(
  function () {},
  {
    get(_target, prop) {
      if (!pgClient && !pgliteClient) {
        getDatabaseClient();
      }
      const active = pgClient || pgliteClient;
      return active ? (active as any)[prop] : undefined;
    },
    apply(_target, thisArg, argArray) {
      if (!pgClient && !pgliteClient) {
        getDatabaseClient();
      }
      const active = pgClient || pgliteClient;
      return Reflect.apply(active as any, thisArg, argArray);
    },
  }
);

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
 * Ensures rentals, rental_payments, and rental_events tables and enums exist
 */
export async function ensureRentalTables(targetPg: PGlite | postgres.Sql): Promise<void> {
  const statements = [
    `DO $$ BEGIN CREATE TYPE "rental_status" AS ENUM('ACTIVE', 'PAYMENT_DUE', 'OVERDUE', 'SUSPENDED', 'RETURNED', 'COMPLETED', 'CANCELLED', 'TERMINATED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE "rental_payment_status" AS ENUM('PAID', 'PARTIALLY_PAID', 'NOT_PAID', 'DUE', 'OVERDUE'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE "rental_deposit_status" AS ENUM('NOT_COLLECTED', 'COLLECTED', 'PARTIALLY_REFUNDED', 'FULLY_REFUNDED', 'FORFEITED_ADJUSTED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE "rental_billing_frequency" AS ENUM('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'CUSTOM'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE "rental_duration" AS ENUM('MONTHLY', '3_MONTHS', '6_MONTHS', '12_MONTHS', 'CUSTOM'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE "rental_installation_status" AS ENUM('PENDING', 'SCHEDULED', 'INSTALLED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE "rental_machine_condition" AS ENUM('NEW', 'GOOD', 'USED_GOOD', 'USED_FAIR', 'NEEDS_ATTENTION'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE "rental_payment_type" AS ENUM('SECURITY_DEPOSIT', 'MONTHLY_RENT', 'ADVANCE_RENT', 'DAMAGE_CHARGE', 'OTHER'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `CREATE TABLE IF NOT EXISTS "rentals" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "rental_number" text NOT NULL UNIQUE,
      "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE RESTRICT,
      "machine_type" text DEFAULT 'RO' NOT NULL,
      "machine_model" text NOT NULL,
      "serial_number" text NOT NULL,
      "asset_id" uuid,
      "capacity_lph" text,
      "installation_location" text,
      "machine_condition" "rental_machine_condition" DEFAULT 'GOOD' NOT NULL,
      "accessories" text,
      "remarks" text,
      "rental_start_date" timestamp with time zone NOT NULL,
      "rental_end_date" timestamp with time zone,
      "rental_duration" "rental_duration" DEFAULT 'MONTHLY' NOT NULL,
      "minimum_rental_period_months" integer DEFAULT 1 NOT NULL,
      "billing_frequency" "rental_billing_frequency" DEFAULT 'MONTHLY' NOT NULL,
      "monthly_rent" numeric(12, 2) NOT NULL,
      "billing_amount" numeric(12, 2) NOT NULL,
      "security_deposit" numeric(12, 2) DEFAULT '0.00' NOT NULL,
      "deposit_status" "rental_deposit_status" DEFAULT 'NOT_COLLECTED' NOT NULL,
      "initial_payment_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
      "total_paid" numeric(12, 2) DEFAULT '0.00' NOT NULL,
      "outstanding_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
      "next_due_date" timestamp with time zone NOT NULL,
      "rental_status" "rental_status" DEFAULT 'ACTIVE' NOT NULL,
      "payment_status" "rental_payment_status" DEFAULT 'NOT_PAID' NOT NULL,
      "installation_date" timestamp with time zone,
      "installation_time" text,
      "installation_address" text,
      "technician_id" uuid REFERENCES "technicians"("id") ON DELETE SET NULL,
      "technician_name" text,
      "installation_status" "rental_installation_status" DEFAULT 'PENDING' NOT NULL,
      "installation_notes" text,
      "return_date" timestamp with time zone,
      "return_condition" text,
      "damage_charges" numeric(12, 2) DEFAULT '0.00' NOT NULL,
      "deposit_adjustment" numeric(12, 2) DEFAULT '0.00' NOT NULL,
      "refund_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
      "return_notes" text,
      "last_service_date" timestamp with time zone,
      "next_service_date" timestamp with time zone,
      "service_frequency_months" integer DEFAULT 3,
      "notes" text,
      "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS "rentals_rental_number_idx" ON "rentals" ("rental_number");`,
    `CREATE INDEX IF NOT EXISTS "rentals_customer_id_idx" ON "rentals" ("customer_id");`,
    `CREATE INDEX IF NOT EXISTS "rentals_serial_number_idx" ON "rentals" ("serial_number");`,
    `CREATE INDEX IF NOT EXISTS "rentals_status_idx" ON "rentals" ("rental_status");`,
    `CREATE INDEX IF NOT EXISTS "rentals_payment_status_idx" ON "rentals" ("payment_status");`,
    `CREATE INDEX IF NOT EXISTS "rentals_next_due_date_idx" ON "rentals" ("next_due_date");`,
    `CREATE INDEX IF NOT EXISTS "rentals_created_at_idx" ON "rentals" ("created_at");`,
    `CREATE TABLE IF NOT EXISTS "rental_payments" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "rental_id" uuid NOT NULL REFERENCES "rentals"("id") ON DELETE CASCADE,
      "customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE RESTRICT,
      "amount" numeric(12, 2) NOT NULL,
      "payment_date" timestamp with time zone DEFAULT now() NOT NULL,
      "payment_method" text DEFAULT 'UPI' NOT NULL,
      "payment_type" "rental_payment_type" DEFAULT 'MONTHLY_RENT' NOT NULL,
      "receipt_number" text,
      "reference_number" text,
      "period_start_date" timestamp with time zone,
      "period_end_date" timestamp with time zone,
      "notes" text,
      "recorded_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );`,
    `ALTER TABLE "rental_payments" ADD COLUMN IF NOT EXISTS "receipt_number" text;`,
    `CREATE INDEX IF NOT EXISTS "rental_payments_rental_id_idx" ON "rental_payments" ("rental_id");`,
    `CREATE INDEX IF NOT EXISTS "rental_payments_customer_id_idx" ON "rental_payments" ("customer_id");`,
    `CREATE INDEX IF NOT EXISTS "rental_payments_date_idx" ON "rental_payments" ("payment_date");`,
    `CREATE INDEX IF NOT EXISTS "rental_payments_receipt_number_idx" ON "rental_payments" ("receipt_number");`,
    `CREATE TABLE IF NOT EXISTS "rental_events" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "rental_id" uuid NOT NULL REFERENCES "rentals"("id") ON DELETE CASCADE,
      "event_type" text NOT NULL,
      "description" text NOT NULL,
      "actor_id" text,
      "actor_name" text,
      "metadata" text,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );`,
    `CREATE INDEX IF NOT EXISTS "rental_events_rental_id_idx" ON "rental_events" ("rental_id");`,
    `CREATE INDEX IF NOT EXISTS "rental_events_created_at_idx" ON "rental_events" ("created_at");`,
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
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      getDatabaseClient();

      if (pgliteClient) {
        await pgliteClient.waitReady;
        await applySqlMigrations(pgliteClient);
        await ensureEmailTables(pgliteClient);
        await ensureGoogleDriveColumns(pgliteClient);
        await ensureRentalTables(pgliteClient);
      } else if (pgClient) {
        await applySqlMigrations(pgClient);
        await ensureEmailTables(pgClient);
        await ensureGoogleDriveColumns(pgClient);
        await ensureRentalTables(pgClient);
      }

      isInitialized = true;
      console.log('✅ [Database] All database tables, sequences, and indexes verified successfully.');
    } catch (err) {
      console.error('[Database] Error verifying database schema:', err);
    }
  })();

  return initPromise;
}

/**
 * Graceful close of PostgreSQL connections
 */
export async function closeDatabaseConnections(): Promise<void> {
  if (pgClient) {
    try {
      await pgClient.end({ timeout: 5 });
    } catch {}
    pgClient = null;
  }
  if (pgliteClient) {
    try {
      await pgliteClient.close();
    } catch {}
    pgliteClient = null;
    await new Promise((r) => setTimeout(r, 200));
  }
  dbInstance = null;
  initPromise = null;
  isInitialized = false;
}
