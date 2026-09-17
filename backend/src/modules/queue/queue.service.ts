import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Slow work NEVER blocks signup/checkout. Enqueue -> 200 now -> worker completes later.
// Every job needs: idempotency key, retries+backoff, DLQ after max attempts.
@Injectable()
export class QueueService {
  private readonly log = new Logger(QueueService.name);
  private queue: Queue | null = null;

  private getQueue(): Queue | null {
    try {
      if (!this.queue) {
        const connection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379/0', { maxRetriesPerRequest: null });
        connection.on('error', (e) => this.log.warn(`queue redis: ${e.message}`));
        this.queue = new Queue('slow-work', {
          connection,
          defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 60_000 }, removeOnComplete: 1000, removeOnFail: 5000 },
        });
      }
      return this.queue;
    } catch (e) {
      this.log.warn(`queue unavailable: ${(e as Error).message}`);
      return null;
    }
  }

  async enqueue(kind: string, payload: Record<string, unknown>, idempotencyKey?: string) {
    const q = this.getQueue();
    if (!q) return { queued: false, reason: 'queue-unavailable' };
    const job = await q.add(kind, payload, { jobId: idempotencyKey ?? `${kind}:${Date.now()}:${Math.random().toString(36).slice(2)}` });
    return { queued: true, jobId: job.id };
  }
}
