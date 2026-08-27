import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db, sql } from './client';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Execute pending database migrations programmatically
 */
export async function runMigrations(): Promise<void> {
  const migrationsFolder = path.resolve(__dirname, '../../drizzle');
  console.log(`[Database Migration] Running migrations from: ${migrationsFolder}`);

  try {
    await migrate(db, { migrationsFolder });
    console.log('[Database Migration] Migrations applied successfully.');
  } catch (error) {
    console.error('[Database Migration] Migration failed:', error);
    throw error;
  }
}

// Auto-run if executed directly via CLI
if (process.argv[1] === __filename) {
  runMigrations()
    .then(async () => {
      if (sql && typeof (sql as any).end === 'function') {
        await (sql as any).end();
      }
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(err);
      if (sql && typeof (sql as any).end === 'function') {
        await (sql as any).end();
      }
      process.exit(1);
    });
}
