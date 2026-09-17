import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rankMovers, isPlaceholderKey } from './market.util.ts';

const row = (id: string, ch: number | null | undefined) => ({ id, price_change_percentage_24h: ch });

describe('rankMovers', () => {
  it('sorts gainers desc and losers asc by 24h change', () => {
    const { gainers, losers } = rankMovers([row('a', 1), row('b', 9), row('c', -5), row('d', -1)]);
    assert.deepEqual(gainers.map((r) => r.id), ['b', 'a', 'd', 'c']);
    assert.deepEqual(losers.map((r) => r.id), ['c', 'd', 'a', 'b']);
  });

  it('excludes null/undefined change rows so stablecoins never top losers', () => {
    const { gainers, losers } = rankMovers([row('s', null), row('u', undefined), row('g', 3), row('l', -2)]);
    assert.deepEqual(gainers.map((r) => r.id), ['g', 'l']);
    assert.deepEqual(losers.map((r) => r.id), ['l', 'g']);
  });

  it('caps at 7 per side', () => {
    const rows = Array.from({ length: 20 }, (_, i) => row(`c${i}`, 20 - i));
    const { gainers, losers } = rankMovers(rows);
    assert.equal(gainers.length, 7);
    assert.equal(losers.length, 7);
    assert.equal(gainers[0].id, 'c0');
    assert.equal(losers[0].id, 'c19');
  });

  it('handles empty input', () => {
    assert.deepEqual(rankMovers([]), { gainers: [], losers: [] });
  });
});

describe('isPlaceholderKey', () => {
  it('flags missing and placeholder values', () => {
    assert.equal(isPlaceholderKey(undefined), true);
    assert.equal(isPlaceholderKey(''), true);
    assert.equal(isPlaceholderKey('demo'), true);
    assert.equal(isPlaceholderKey('  Demo  '), true);
    assert.equal(isPlaceholderKey('change-me'), true);
  });

  it('accepts real keys untouched', () => {
    assert.equal(isPlaceholderKey('CG-AbC123xyz'), false);
    assert.equal(isPlaceholderKey('demo-real-suffix-9'), false);
  });
});
