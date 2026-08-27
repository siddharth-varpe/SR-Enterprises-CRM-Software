import { db } from './client';
import { sql } from 'drizzle-orm';

/**
 * Health check for PostgreSQL connection
 */
export async function checkDatabaseHealth(): Promise<{ status: 'connected' | 'disconnected' | 'error'; latencyMs: number }> {
  const start = Date.now();
  try {
    // Perform simple ping query
    await db.execute(sql`SELECT 1`);
    return {
      status: 'connected',
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'disconnected',
      latencyMs: Date.now() - start,
    };
  }
}
