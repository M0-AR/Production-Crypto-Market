// Layer: contract/infra — gateway, health depth, docs, security headers.
// Every assertion here must hold on a healthy stack, regardless of CoinGecko.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fetchJson } from '../helpers.mjs';

describe('gateway + health', () => {
  it('GET /health -> 200 ok (external uptime monitors use this)', async () => {
    const r = await fetchJson('/health');
    assert.equal(r.status, 200);
  });

  it('GET /api/health -> backend ok + redis ok', async () => {
    const r = await fetchJson('/api/health');
    assert.equal(r.status, 200);
    assert.equal(r.json?.status, 'ok');
    assert.equal(r.json?.checks?.redis?.status, 'ok');
  });

  it('gateway /api/* routes to the BACKEND (not the frontend health)', async () => {
    const r = await fetchJson('/api/health');
    assert.equal(r.status, 200);
    assert.ok(!('service' in (r.json ?? {})), 'frontend health carries {service}, backend must not');
    assert.ok(r.json?.checks?.redis, 'backend health carries dependency checks');
  });

  it('GET /api/docs -> swagger UI', async () => {
    const r = await fetchJson('/api/docs');
    assert.equal(r.status, 200);
    assert.match(r.text, /swagger/i);
  });

  it('unknown API route -> 404 JSON (not HTML, not 500)', async () => {
    const r = await fetchJson('/api/nope-not-real');
    assert.equal(r.status, 404);
  });

  it('security headers present on /', async () => {
    const r = await fetchJson('/');
    assert.equal(r.status, 200);
    const h = (n) => r.headers.get(n);
    assert.equal(h('x-content-type-options'), 'nosniff');
    assert.equal(h('x-frame-options'), 'DENY');
    assert.ok((h('referrer-policy') ?? '').includes('strict-origin'));
  });
});
