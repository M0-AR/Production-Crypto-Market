// Server-only fetcher: browser never sees CoinGecko keys. Backend owns cache + rate-limit.
const INTERNAL = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:4000";

export async function api<T>(path: string, revalidate = 60): Promise<T | null> {
  const r = await apiStatus<T>(path, revalidate);
  return r.status === 200 ? r.json : null;
}

// Status-aware variant: lets callers distinguish "unknown coin" (404 -> notFound())
// from "upstream down" (degraded card). Never throws.
export async function apiStatus<T>(path: string, revalidate = 60): Promise<{ status: number; json: T | null }> {
  try {
    const r = await fetch(`${INTERNAL}${path}`, { next: { revalidate } });
    if (!r.ok) return { status: r.status, json: null };
    return { status: 200, json: (await r.json()) as T };
  } catch {
    return { status: 0, json: null };
  }
}

// Backend envelopes every market route as { data, cached, stale? }.
export type Envelope<T> = { data: T; cached: boolean; stale?: boolean };

export type CoinRow = {
  id: string; symbol: string; name: string; image: string;
  current_price: number; price_change_percentage_24h: number; market_cap: number;
};

export type TrendingEntry = {
  item: {
    id: string; name: string; symbol: string; market_cap_rank: number;
    thumb: string; small: string; large: string; slug: string;
    price_btc: number; score: number;
  };
};

export type Category = {
  id: string; name: string; market_cap: number; market_cap_change_24h: number;
  content?: string; top_3_coins?: string[]; top_3_coins_id?: string[];
  volume_24h: number; updated_at: string;
};

export type CoinDetails = {
  id: string; symbol: string; name: string;
  image?: { thumb: string; small: string; large: string };
  market_cap_rank?: number;
  market_data?: {
    current_price: Record<string, number>;
    market_cap: Record<string, number>;
    total_volume: Record<string, number>;
    price_change_percentage_24h_in_currency?: Record<string, number>;
    price_change_percentage_7d_in_currency?: Record<string, number>;
    price_change_percentage_30d_in_currency?: Record<string, number>;
    high_24h?: Record<string, number>;
    low_24h?: Record<string, number>;
  };
};

export type SearchResult = {
  coins: { id: string; name: string; symbol: string; market_cap_rank?: number; thumb: string; large: string }[];
};

export type FearGreed = {
  name: string;
  data: { value: string; value_classification: string; timestamp: string; time_until_update?: string }[];
};
