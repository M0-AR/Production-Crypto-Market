// Layer: contract/pages — server-rendered HTML markers per route.
// Asserts on user-visible outcomes, never on CSS classes.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fetchJson } from '../helpers.mjs';

describe('pages', () => {
  it('/ renders terminal shell (title, viewport, key sections)', async () => {
    const r = await fetchJson('/');
    assert.equal(r.status, 200);
    // Unconditional shell only: data sections (trending/movers/categories) render
    // null when their upstream is down — covered by API contract tests
    // (200-shape or honest-502), never by page-structure assertions.
    for (const marker of [
      '<title>', 'Pro Screener', 'name="viewport"', 'Top movers', 'All coins',
    ]) {
      assert.ok(r.text.includes(marker), `homepage missing: ${marker}`);
    }
    // Sentiment is third-party dependent: assert the gauge IF the section rendered,
    // never fail the whole page on someone else's blip (degraded null is by design).
    if (r.text.includes('Fear')) {
      assert.ok(r.text.includes('Fear and greed index'), 'sentiment gauge needs accessible label');
    }
  });

  it('/coins?page=2 paginates server-side', async () => {
    const r = await fetchJson('/coins?page=2');
    assert.equal(r.status, 200);
    assert.ok(r.text.includes('All coins'));
    // React SSR emits comment nodes between static text and expressions: "Page <!-- -->2".
    assert.match(r.text, /Page <!-- -->2/, 'current page indicator');
    assert.ok(r.text.includes('page=1') && r.text.includes('page=3'));
  });

  it('/coins/bitcoin renders details or honest fallback (never blank/crash)', async () => {
    const r = await fetchJson('/coins/bitcoin');
    assert.equal(r.status, 200);
    const live = r.text.includes('Bitcoin') && r.text.includes('Price chart');
    const degraded = r.text.includes('warming up');
    assert.ok(live || degraded, 'details must render data or fallback');
  });

  it('/does-not-exist renders branded 404', async () => {
    const r = await fetchJson('/does-not-exist');
    assert.equal(r.status, 404);
    assert.ok(r.text.includes('Nothing at this address'));
  });
});
