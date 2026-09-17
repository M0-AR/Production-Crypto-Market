// Separate process (see compose `worker` service): scales independently from web tier.
// A spike in background work must NEVER slow interactive requests.
import { Worker } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379/0', { maxRetriesPerRequest: null });

const worker = new Worker(
  'slow-work',
  async (job) => {
    // Idempotent handlers only: same jobId twice == same effect once.
    // Put email/SMS/webhook/ingest logic here. Throw to retry with backoff; DLQ after 5.
    // eslint-disable-next-line no-console
    console.log(`[worker] ${job.name} ${job.id} attempt ${job.attemptsMade}`);
    await new Promise((r) => setTimeout(r, 200));
    return { done: true };
  },
  { connection, concurrency: 5 }
);

worker.on('failed', (job, err) => {
  console.error(`[worker] failed ${job?.id}: ${err.message} — check DLQ/dashboard`);
});

worker.on('error', (err) => {
  console.error(`[worker] connection error: ${err.message}`);
});

// Graceful shutdown (verified BullMQ 2026 pattern): stop taking new jobs, drain
// active ones, force-close before the orchestrator's SIGKILL. Pairs with
// stop_grace_period: 60s in compose — the 45s force timer leaves 15s of margin.
let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[worker] ${signal} — draining, no new jobs`);
  const force = setTimeout(() => {
    console.error('[worker] drain timeout (45s) — force closing, active jobs will stall+retry');
    worker.close(true).finally(() => process.exit(1));
  }, 45_000);
  try {
    await worker.close(); // waits for active jobs, rejects new ones
    clearTimeout(force);
    console.log('[worker] drained cleanly');
    try { await connection.quit(); } catch { /* already gone */ }
    process.exit(0);
  } catch (e) {
    clearTimeout(force);
    console.error(`[worker] close failed: ${(e as Error).message}`);
    process.exit(1);
  }
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
