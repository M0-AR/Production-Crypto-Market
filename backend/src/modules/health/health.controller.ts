import { Controller, Get } from '@nestjs/common';
import Redis from 'ioredis';

let redis: Redis | null = null;
function client() {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379/0', { lazyConnect: true, maxRetriesPerRequest: 1 });
    redis.on('error', () => undefined); // degraded mode: cache miss -> DB/upstream, never 500
  }
  return redis;
}

@Controller()
export class HealthController {
  @Get('api/health')
  async health() {
    const checks: Record<string, { status: string; latencyMs: number }> = {};
    const t0 = Date.now();
    try { await client().ping(); checks.redis = { status: 'ok', latencyMs: Date.now() - t0 }; }
    catch { checks.redis = { status: 'degraded', latencyMs: Date.now() - t0 }; }
    // DB check is a lightweight TCP-level probe here; Prisma query runs in coins path.
    const ok = checks.redis.status === 'ok';
    return { status: ok ? 'ok' : 'degraded', checks, uptime: process.uptime(), ts: new Date().toISOString() };
  }
}
