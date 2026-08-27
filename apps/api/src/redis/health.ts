import { redis } from './client.js';

/**
 * Health check for Redis connection
 */
export async function checkRedisHealth(): Promise<{ status: 'connected' | 'disconnected' | 'error'; latencyMs: number }> {
  const start = Date.now();
  try {
    if (redis.status !== 'ready' && redis.status !== 'connecting' && redis.status !== 'connect') {
      await redis.connect().catch(() => {});
    }

    const pong = await redis.ping();
    if (pong === 'PONG') {
      return {
        status: 'connected',
        latencyMs: Date.now() - start,
      };
    }
    return {
      status: 'disconnected',
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'disconnected',
      latencyMs: Date.now() - start,
    };
  }
}
