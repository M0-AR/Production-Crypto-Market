// Layer: spike gate — the "many users" proof. Burst above the documented limit:
// every response MUST be 200 (served) or 429 (clean rejection with backoff signal).
// Any 502/503/connection failure means the limiter or the stack is broken — fail loud.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BASE } from './helpers.mjs';

const N = 150;

describe('spike gate (150 parallel /api/health)', () => {
  it('serves or cleanly rejects — never 502/503/dropped', async () => {
    const codes = await Promise.all(
      Array.from({ length: N }, async () => {
        try {
          const r = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(15000) });
          await r.text().catch(() => undefined);
          return r.status;
        } catch {
          return 0;
        }
      }),
    );
    const count = (s) => codes.filter((c) => c === s).length;
    const bad = codes.filter((c) => c !== 200 && c !== 429);
    assert.deepEqual(bad, [], `spike produced non-200/429: ${JSON.stringify(bad.slice(0, 5))} (total bad ${bad.length})`);
    assert.ok(count(429) >= 1, 'limiter must trip under 150-parallel burst (else it is not enforcing)');
    assert.ok(count(200) >= 1, 'limiter must still serve some traffic under burst');
  });
});
