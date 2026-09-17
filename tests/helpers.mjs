// Shared contract-test helpers: zero dependencies, global fetch only.
// Retry policy (documented, not hidden): network errors and 502s from the
// sandbox's flaky egress are retried ONCE after 2s. 429s are signal, never retried.
import assert from 'node:assert/strict';

export const BASE = process.env.BASE_URL ?? 'http://localhost:18100';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchJson(path, { method = 'GET', body, retries = 1, timeoutMs = 30000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const r = await fetch(`${BASE}${path}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
      });
      const text = await r.text();
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch { /* html pages */ }
      if ((r.status === 502 || r.status === 503) && attempt < retries) {
        await sleep(2000);
        continue;
      }
      return { status: r.status, headers: r.headers, json, text };
    } catch (e) {
      lastErr = e;
      if (attempt < retries) await sleep(2000);
    }
  }
  throw new Error(`GET ${path} failed after retries: ${lastErr?.message ?? lastErr}`);
}

/** Upstream-dependent endpoints: 200 + shape, OR honest 502 contract. Never anything else. */
export function assertLiveOrDegraded(res, path) {
  assert.ok([200, 502].includes(res.status), `${path}: expected 200|502, got ${res.status}`);
  if (res.status === 502) {
    assert.equal(typeof res.json?.message, 'string', `${path}: 502 must carry actionable message`);
    return null;
  }
  return res.json;
}

export function assertEnvelope(res, path) {
  assert.equal(res.status, 200, `${path}: expected 200, got ${res.status}`);
  assert.ok(res.json && typeof res.json === 'object', `${path}: envelope object`);
  assert.equal(typeof res.json.cached, 'boolean', `${path}: cached flag`);
  return res.json.data;
}
