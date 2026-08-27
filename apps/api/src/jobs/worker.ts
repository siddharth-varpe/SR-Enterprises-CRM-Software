import { Worker, type Processor, type WorkerOptions } from 'bullmq';
import { env } from '../config/env.js';

export function createWorker<T = any, R = any>(
  queueName: string,
  processor: Processor<T, R>,
  customOptions?: Partial<WorkerOptions>
): Worker<T, R> {
  const redisUrl = new URL(env.REDIS_URL);

  const worker = new Worker<T, R>(queueName, processor, {
    connection: {
      host: redisUrl.hostname,
      port: parseInt(redisUrl.port || '6379', 10),
      password: redisUrl.password || undefined,
      maxRetriesPerRequest: null,
    },
    concurrency: 5,
    ...customOptions,
  });

  worker.on('failed', (job, err) => {
    console.error(`[BullMQ] Job ${job?.id} in queue '${queueName}' failed:`, err.message);
  });

  worker.on('error', (err) => {
    if (env.NODE_ENV !== 'test') {
      console.error(`[BullMQ] Worker error in queue '${queueName}':`, err.message);
    }
  });

  return worker;
}
