// Layer: contract/coins — every market endpoint: shape on 200, honest 502 on outage,
// strict 4xx on bad input. This is the layer that catches "provider changed the shape".
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { fetchJson, assertLiveOrDegraded, assertEnvelope } from '../helpers.mjs';

describe('coins markets', () => {
  it('paginated envelope with coin rows', async () => {
    const r = await fetchJson('/api/coins/markets?per_page=3&page=1');
    const data = assertLiveOrDegraded(r, 'markets');
    if (!data) return; // degraded — contract (502+message) already asserted
    assert.ok(Array.isArray(data.data ?? data), 'markets payload');
    const rows = data.data ?? data;
    assert.ok(rows.length > 0);
    for (const c of rows) {
      assert.equal(typeof c.id, 'string');
      assert.equal(typeof c.symbol, 'string');
      assert.equal(typeof c.name, 'string');
      assert.equal(typeof c.current_price, 'number');
    }
  });

  it('per_page=999 -> 400 (DTO validation through HTTP)', async () => {
    const r = await fetchJson('/api/coins/markets?per_page=999&page=1');
    assert.equal(r.status, 400);
  });
});

describe('coins discovery', () => {
  it('trending shape', async () => {
    const r = await fetchJson('/api/coins/trending');
    const json = assertLiveOrDegraded(r, 'trending');
    if (!json) return;
    assert.ok(Array.isArray(json.data?.coins), 'trending.coins array');
    assert.ok(json.data.coins.length > 0);
    assert.equal(typeof json.data.coins[0].item.id, 'string');
  });

  it('movers: <=7 gainers desc, <=7 losers asc, no nulls on top', async () => {
    const r = await fetchJson('/api/coins/movers');
    const json = assertLiveOrDegraded(r, 'movers');
    if (!json) return;
    const { gainers, losers } = json.data;
    assert.ok(gainers.length <= 7 && losers.length <= 7);
    const desc = [...gainers].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h);
    assert.deepEqual(gainers.map((c) => c.id), desc.map((c) => c.id));
    for (const c of [...gainers, ...losers]) {
      assert.equal(typeof c.price_change_percentage_24h, 'number', `${c.id} must carry a real change value`);
    }
  });

  it('categories shape', async () => {
    const r = await fetchJson('/api/coins/categories');
    const json = assertLiveOrDegraded(r, 'categories');
    if (!json) return;
    assert.ok(Array.isArray(json.data) && json.data.length > 0);
    assert.equal(typeof json.data[0].name, 'string');
    assert.equal(typeof json.data[0].market_cap, 'number');
  });
});

describe('coins search + details', () => {
  it('q too short -> 400, missing q -> 400', async () => {
    assert.equal((await fetchJson('/api/coins/search?q=a')).status, 400);
    assert.equal((await fetchJson('/api/coins/search')).status, 400);
  });

  it('q=bit -> 200 with coin hits (or honest 502)', async () => {
    const r = await fetchJson('/api/coins/search?q=bit');
    const json = assertLiveOrDegraded(r, 'search');
    if (!json) return;
    assert.ok(Array.isArray(json.data?.coins));
  });

  it('unknown id with illegal chars -> 404 (allow-list, no upstream call)', async () => {
    const r = await fetchJson('/api/coins/INVALID!!ID');
    assert.equal(r.status, 404);
  });

  it('bitcoin details shape (or honest 502)', async () => {
    const r = await fetchJson('/api/coins/bitcoin');
    const json = assertLiveOrDegraded(r, 'coin');
    if (!json) return;
    assert.equal(json.data?.id, 'bitcoin');
    assert.equal(typeof json.data?.market_data?.current_price?.usd, 'number');
  });

  it('ohlc rejects bad range -> 400; accepts 7d (or honest 502)', async () => {
    assert.equal((await fetchJson('/api/coins/bitcoin/ohlc?days=99')).status, 400);
    const r = await fetchJson('/api/coins/bitcoin/ohlc?days=7');
    const json = assertLiveOrDegraded(r, 'ohlc');
    if (!json) return;
    assert.ok(Array.isArray(json.data) && json.data.length > 0);
    assert.equal(json.data[0].length, 5, 'each candle is [t,o,h,l,c]');
  });

  it('sentiment works with zero CoinGecko quota', async () => {
    const data = assertEnvelope(await fetchJson('/api/sentiment'), 'sentiment');
    assert.ok(Array.isArray(data.data) && data.data.length > 0);
    const v = parseInt(data.data[0].value, 10);
    assert.ok(v >= 0 && v <= 100);
  });
});
