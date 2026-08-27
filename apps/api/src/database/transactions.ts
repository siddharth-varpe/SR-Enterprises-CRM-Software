import { db } from './client';

export type TransactionCallback<T> = (tx: any) => Promise<T>;

/**
 * Execute a unit of work inside an ACID PostgreSQL transaction.
 * Automatically commits on success and rolls back on error.
 */
export async function withTransaction<T>(
  callback: TransactionCallback<T>,
  options?: { isolationLevel?: 'read committed' | 'repeatable read' | 'serializable' }
): Promise<T> {
  return await db.transaction(async (tx) => {
    return await callback(tx);
  }, options?.isolationLevel ? { isolationLevel: options.isolationLevel } : undefined);
}

