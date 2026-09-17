import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cn, formatCurrency, formatPercent, timeAgo } from './utils.ts';

describe('cn', () => {
  it('merges tailwind conflicts (last wins)', () => {
    assert.equal(cn('bg-red-500', 'bg-blue-500'), 'bg-blue-500');
  });
  it('joins conditionals', () => {
    assert.equal(cn('a', false && 'b', 'c'), 'a c');
  });
});

describe('formatCurrency', () => {
  it('formats USD with grouping + 2dp', () => {
    assert.equal(formatCurrency(76195), '$76,195.00');
  });
  it('uses 4dp for sub-dollar values', () => {
    assert.equal(formatCurrency(0.9994), '$0.9994');
  });
  it('returns em-dash for null/undefined/NaN', () => {
    assert.equal(formatCurrency(null), '—');
    assert.equal(formatCurrency(undefined), '—');
    assert.equal(formatCurrency(NaN), '—');
  });
  it('supports other currencies', () => {
    assert.match(formatCurrency(10, 'EUR'), /10/);
  });
});

describe('formatPercent', () => {
  it('prefixes + for gains, 2dp', () => {
    assert.equal(formatPercent(8.234), '+8.23%');
    assert.equal(formatPercent(-1.5), '-1.50%');
  });
  it('returns em-dash for null', () => {
    assert.equal(formatPercent(null), '—');
  });
});

describe('timeAgo', () => {
  it('buckets seconds/minutes/hours/days', () => {
    const now = Date.now();
    assert.equal(timeAgo(now - 5_000), '5s ago');
    assert.equal(timeAgo(now - 3 * 60_000), '3m ago');
    assert.equal(timeAgo(now - 2 * 3_600_000), '2h ago');
    assert.equal(timeAgo(now - 3 * 86_400_000), '3d ago');
  });
});
