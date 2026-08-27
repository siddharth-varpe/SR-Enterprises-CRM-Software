import { Queue, type QueueOptions } from 'bullmq';
import { env } from '../config/env.js';

export function createQueue<T = any>(queueName: string, customOptions?: Partial<QueueOptions>): Queue<T> {
  const redisUrl = new URL(env.REDIS_URL);

  return new Queue<T>(queueName, {
    connection: {
      host: redisUrl.hostname,
      port: parseInt(redisUrl.port || '6379', 10),
      password: redisUrl.password || undefined,
      maxRetriesPerRequest: null,
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 86400, // 24 hours
        count: 1000,
      },
      removeOnFail: {
        age: 604800, // 7 days
      },
    },
    ...customOptions,
  });
}
