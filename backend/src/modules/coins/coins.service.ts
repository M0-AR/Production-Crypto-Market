import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { readFileSync, existsSync } from 'fs';
import { rankMovers, isPlaceholderKey } from './market.util';

// QUOTA MODEL (verified vs CoinGecko 2026 docs + troubleshooting guide):
// Demo = 10k credits/mo, ~100 calls/min, endpoints refresh server-side every 1–5 min.
// Rules enforced here:
//  1. NEVER poll faster than CoinGecko's own cadence (see TTL table per method).
//  2. Shared Redis cache => N users cost ~= 1 user for cached endpoints.
//  3. Single-flight (inflight map) => hot-key expiry under load = 1 upstream call, not 1000.
//  4. Batch endpoints only (/coins/markets up to 250 ids/call); never per-coin loops.
//  5. Stale-while-revalidate: upstream 429/5xx serves last-good cache instead of failing.
//  6. Browser keys are blocked by CoinGecko CORS anyway — ALL traffic goes through here.
//  7. Placeholder/absent key => keyless pool (no header) instead of a bogus header:
//     an invalid key fails EVERY call, keyless succeeds within shared-pool luck.
//  8. Flaky networks get bounded retries (backoff+jitter, 15s per-attempt cap):
//     one dropped packet must not equal one failed page.
const CG = 'https://api.coingecko.com/api/v3';
const FNG = 'https://api.alternative.me/fng/'; // zero-quota sentiment vendor (updates daily UTC)
const ID_RE = /^[a-z0-9-]{2,60}$/i;
const OHLC_DAYS = new Set(['1', '7', '30', '90', '365']);

@Injectable()
export class CoinsService {
  private readonly log = new Logger(CoinsService.name);
  private readonly redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379/0', {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
  });
  private readonly inflight = new Map<string, Promise<unknown>>();
  constructor() {
    this.redis.on('error', (e) => this.log.warn(`redis degraded: ${e.message}`));
  }

  private apiKey(): string {
    const f = process.env.COINGECKO_API_KEY_FILE;
    try {
      if (f && existsSync(f)) return readFileSync(f, 'utf8').trim() || (process.env.COINGECKO_API_KEY ?? '');
    } catch { /* EACCES locally -> env fallback */ }
    return process.env.COINGECKO_API_KEY ?? '';
  }

  // A file containing literally "demo"/"changeme" is our own placeholder, not a key.
  // Sending it is worse than sending nothing: invalid keys fail 100% of calls,
  // keyless succeeds whenever the shared pool allows.
  private authHeaders(): Record<string, string> {
    const k = this.apiKey();
    if (isPlaceholderKey(k)) return {};
    return { 'x-cg-demo-api-key': k };
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  private async cgGet<T>(path: string, params: Record<string, string | number | boolean> = {}): Promise<T> {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    ).toString();
    const url = `${CG}${path}${qs ? `?${qs}` : ''}`;
    const headers = { 'Content-Type': 'application/json', ...this.authHeaders() };
    // Bounded retries: transient network blips must not fail the page.
    // Budget: 3 attempts x 15s cap + backoff ~= <30s worst case (nginx read timeout).
    const backoffs = [500, 2000];
    let lastErr: unknown = null;
    for (let attempt = 0; ; attempt++) {
      try {
        const r = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
        if (r.ok) return (await r.json()) as T;
        // Upstream 404 = the coin/pool doesn't exist (not an outage): surface 404
        // so the frontend renders its branded not-found page instead of a retry card.
        if (r.status === 404) {
          throw new HttpException('unknown coin', HttpStatus.NOT_FOUND);
        }
        // Retryable: rate-limit + server errors (stale cache served by caller on final failure).
        if (r.status === 429 || r.status >= 500) {
          lastErr = new Error(`upstream ${r.status}`);
        } else {
          // 400/401/403: retrying is quota burn for zero gain — fail with the real status.
          throw new HttpException(
            `market upstream unavailable (${path} -> ${r.status}). For reliable data add a free key: coingecko.com -> Developers Dashboard -> secrets/coingecko_key.txt. Cached reads resume automatically.`,
            HttpStatus.BAD_GATEWAY,
          );
        }
      } catch (e) {
        if (e instanceof HttpException) throw e;
        lastErr = e; // DNS/TCP/TLS/timeout — retried below
      }
      if (attempt >= backoffs.length) break;
      await this.sleep(backoffs[attempt] + Math.floor(Math.random() * 400)); // jitter vs herds
      this.log.warn(`cg retry ${attempt + 1}/3 ${path}: ${(lastErr as Error)?.message ?? lastErr}`);
    }
    throw new HttpException(
      `market upstream unreachable (${path}: ${(lastErr as Error)?.message ?? lastErr}). Cached reads resume automatically.`,
      HttpStatus.BAD_GATEWAY,
    );
  }

  private async cached<T>(key: string, ttlSec: number, loader: () => Promise<T>) {
    try {
      const hit = await this.redis.get(key);
      if (hit) return { data: JSON.parse(hit) as T, cached: true };
    } catch { /* degraded -> upstream */ }

    const shared = this.inflight.get(key) as Promise<T> | undefined;
    if (shared) {
      try {
        return { data: await shared, cached: true };
      } catch { /* fall through to stale */ }
    }
    const p = loader();
    this.inflight.set(key, p);
    try {
      const data = await p;
      try {
        await this.redis.setex(key, ttlSec + Math.floor(Math.random() * 30), JSON.stringify(data)); // jitter vs stampede
      } catch { /* cache is best-effort */ }
      return { data, cached: false };
    } catch (e) {
      try {
        const stale = await this.redis.get(key);
        if (stale) return { data: JSON.parse(stale) as T, cached: true, stale: true };
      } catch { /* ignore */ }
      throw e;
    } finally {
      this.inflight.delete(key);
    }
  }

  // CG cadence ~30s–5min -> 90s TTL. per_page<=50, page<=500 enforced by DTO.
  markets(perPage = 10, page = 1, vs = 'usd') {
    perPage = Math.min(50, Math.max(1, perPage));
    page = Math.min(500, Math.max(1, page));
    return this.cached(`coins:markets:v2:${vs}:${perPage}:${page}`, 90, () =>
      this.cgGet('/coins/markets', {
        vs_currency: vs, order: 'market_cap_desc', per_page: perPage, page,
        sparkline: false, price_change_percentage: '24h',
      }),
    );
  }

  // CG refreshes ~every 10 min -> 600s TTL. Powers homepage discovery + momentum.
  trending() {
    return this.cached('coins:trending:v1', 600, () => this.cgGet('/search/trending'));
  }

  // Slow-moving dimension -> 600s TTL. Powers category filter row.
  categories() {
    return this.cached('coins:categories:v1', 600, () => this.cgGet('/coins/categories'));
  }

  // ONE batched call (250 ids) -> gainers + losers computed locally. 120s TTL.
  async movers() {
    const { data, cached, stale } = await this.cached<Record<string, any>[]>(
      'coins:movers:v1', 120,
      () => this.cgGet('/coins/markets', {
        vs_currency: 'usd', order: 'market_cap_desc', per_page: 250, page: 1,
        sparkline: false, price_change_percentage: '24h',
      }),
    );
    const ranked = rankMovers(data);
    return { data: ranked, cached, stale };
  }

  // Coin header/stats. 90s TTL. ID allow-list blocks path-injection into upstream URL.
  coin(id: string) {
    if (!ID_RE.test(id)) throw new HttpException('unknown coin', HttpStatus.NOT_FOUND);
    return this.cached(`coins:detail:v1:${id.toLowerCase()}`, 90, () =>
      this.cgGet(`/coins/${id.toLowerCase()}`, {
        localization: false, tickers: false, market_data: true,
        community_data: false, developer_data: false, sparkline: false,
      }),
    );
  }

  // Candles. Day-granularity whitelist (CG plan restriction) -> 300s TTL.
  ohlc(id: string, days = '7') {
    if (!ID_RE.test(id)) throw new HttpException('unknown coin', HttpStatus.NOT_FOUND);
    if (!OHLC_DAYS.has(days)) throw new HttpException('days must be one of 1,7,30,90,365', HttpStatus.BAD_REQUEST);
    return this.cached(`coins:ohlc:v1:${id.toLowerCase()}:${days}`, 300, () =>
      this.cgGet(`/coins/${id.toLowerCase()}/ohlc`, { vs_currency: 'usd', days }),
    );
  }

  // Cmd+K palette source. 300s TTL per normalized query; min length stops 1-char quota burn.
  search(q: string) {
    const query = (q ?? '').trim().slice(0, 50);
    if (query.length < 2) throw new HttpException('q must be at least 2 characters', HttpStatus.BAD_REQUEST);
    return this.cached(`coins:search:v1:${query.toLowerCase()}`, 300, () =>
      this.cgGet('/search', { query }),
    );
  }

  // Fear & Greed via Alternative.me — DAILY cadence, zero CoinGecko quota. 12h TTL.
  async sentiment() {
    const key = 'sentiment:fng:v1';
    try {
      const hit = await this.redis.get(key);
      if (hit) return { data: JSON.parse(hit), cached: true };
    } catch { /* ignore */ }
    const r = await fetch(`${FNG}?limit=30&format=json`);
    if (!r.ok) throw new HttpException('sentiment upstream unavailable', HttpStatus.BAD_GATEWAY);
    const data = await r.json();
    try {
      await this.redis.setex(key, 12 * 3600, JSON.stringify(data));
    } catch { /* ignore */ }
    return { data, cached: false };
  }
}
