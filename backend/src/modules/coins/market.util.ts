// Pure market helpers: zero I/O, zero dependencies — unit-tested with node:test.
// Kept separate from the NestJS service so tests run with no framework, no mocks.

export type ChangeRow = {
  price_change_percentage_24h?: number | null;
};

/** Top-7 gainers + top-7 losers. Null-change rows (usually stablecoins) are
 *  excluded: as -Infinity they would otherwise top the losers list. */
export function rankMovers<T extends ChangeRow>(rows: T[]): { gainers: T[]; losers: T[] } {
  const ranked = [...rows].sort(
    (a, b) => (b.price_change_percentage_24h ?? -Infinity) - (a.price_change_percentage_24h ?? -Infinity),
  );
  const withChange = ranked.filter((c) => c.price_change_percentage_24h != null);
  return { gainers: withChange.slice(0, 7), losers: withChange.slice(-7).reverse() };
}

const PLACEHOLDERS = new Set(['', 'demo', 'changeme', 'change-me', 'test', 'password']);

/** A secret file containing a placeholder is "no key configured":
 *  sending it fails 100% of calls, keyless succeeds within shared-pool luck. */
export function isPlaceholderKey(k: string | undefined): boolean {
  if (k == null) return true;
  return PLACEHOLDERS.has(k.trim().toLowerCase());
}
