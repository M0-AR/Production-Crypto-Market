import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/header";
import { CardMuted, CardTitle, Badge } from "@/components/ui/card";
import { PriceChart } from "@/components/price-chart";
import { Converter } from "@/components/converter";
import { api, apiStatus, type CoinDetails, type Envelope } from "@/lib/api";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { TrendingUp, TrendingDown, ArrowLeft } from "lucide-react";

// Per-coin SEO (verified 2026 pattern): server-resolved title/description, graceful
// fallback on outage, fetch memoized with the page's own request (no double cost).
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const res = await apiStatus<Envelope<CoinDetails>>(`/api/coins/${id}`, 300);
  const coin = res.json?.data;
  if (!coin) return { title: "Coin details" };
  const price = coin.market_data?.current_price?.usd;
  const ch = coin.market_data?.price_change_percentage_24h_in_currency?.usd;
  return {
    title: `${coin.name} (${coin.symbol.toUpperCase()}) price, chart & converter`,
    description:
      `${coin.name} live price${price != null ? ` ${formatCurrency(price)}` : ""}` +
      `${ch != null ? ` (${formatPercent(ch)} 24h)` : ""}. Candlestick chart, currency converter and market stats.`,
  };
}

const PERIODS = [
  { days: "1", label: "24H" }, { days: "7", label: "7D" }, { days: "30", label: "30D" },
  { days: "90", label: "90D" }, { days: "365", label: "1Y" },
] as const;

function Stat({ label, value, up }: { label: string; value: string; up?: boolean }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-widest text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-base font-semibold tabular-nums">
        {up !== undefined && (up
          ? <TrendingUp className="size-4 text-emerald-500" aria-label="up" />
          : <TrendingDown className="size-4 text-red-500" aria-label="down" />)}
        {value}
      </p>
    </div>
  );
}

async function Details({ id, days }: { id: string; days: string }) {
  const [coinRes, ohlcRes] = await Promise.all([
    apiStatus<Envelope<CoinDetails>>(`/api/coins/${id}`, 60),
    api<Envelope<number[][]>>(`/api/coins/${id}/ohlc?days=${days}`, 300),
  ]);
  // Unknown coin (backend allow-list 404) -> real 404 page, not a "retry" card.
  if (coinRes.status === 404) notFound();
  const coin = coinRes.json?.data;
  if (!coin) {
    return (
      <div className="card p-5">
        <CardTitle>Details warming up</CardTitle>
        <CardMuted>Upstream quota or key issue — nothing crashed, nothing half-rendered. Retry shortly.</CardMuted>
      </div>
    );
  }
  const md = coin.market_data;
  const price = md?.current_price?.usd ?? 0;
  const ch24 = md?.price_change_percentage_24h_in_currency?.usd ?? 0;
  const up = ch24 >= 0;
  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-4 p-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {coin.image?.large && <img src={coin.image.large} alt={coin.name} width={56} height={56} className="rounded-full" />}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold tracking-tight">{coin.name}
            <span className="ml-2 text-sm font-medium uppercase text-[var(--muted-foreground)]">{coin.symbol}</span>
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-bold tabular-nums">
            {formatCurrency(price)}
            <Badge up={up}>{up ? <TrendingUp /> : <TrendingDown />}{formatPercent(ch24)} 24h</Badge>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Market cap rank" value={coin.market_cap_rank ? `#${coin.market_cap_rank}` : "—"} />
        <Stat label="Market cap" value={formatCurrency(md?.market_cap?.usd)} />
        <Stat label="24h volume" value={formatCurrency(md?.total_volume?.usd)} />
        <Stat label="7d change" value={formatPercent(md?.price_change_percentage_7d_in_currency?.usd)}
          up={(md?.price_change_percentage_7d_in_currency?.usd ?? 0) >= 0} />
      </div>

      <div className="card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Price chart</h2>
          <nav className="flex gap-1" aria-label="Chart range">
            {PERIODS.map((p) => (
              <Link key={p.days} href={`/coins/${id}?days=${p.days}`}
                aria-current={days === p.days ? "true" : undefined}
                className={`inline-flex h-9 min-w-[44px] items-center justify-center rounded-lg px-3 text-sm ${days === p.days ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "border hover:bg-[var(--muted)]"}`}>
                {p.label}
              </Link>
            ))}
          </nav>
        </div>
        <PriceChart data={ohlcRes?.data ?? []} stale={ohlcRes?.stale} />
      </div>

      <Converter symbol={coin.symbol} icon={coin.image?.small} prices={md?.current_price ?? { usd: price }} />
    </div>
  );
}

export default async function CoinPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ days?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const days = ["1", "7", "30", "90", "365"].includes(sp.days ?? "") ? sp.days! : "7";
  // Existence check BEFORE streaming starts: notFound() here yields a true 404
  // status. Inside Suspense it would render the same UI but keep status 200
  // (headers already sent). Fetch is memoized + Redis-cached, so ~free.
  const check = await apiStatus<Envelope<CoinDetails>>(`/api/coins/${id}`, 60);
  if (check.status === 404) notFound();
  return (
    <>
      <Header />
      <main className="main-container space-y-4">
        <Link href="/coins" className="inline-flex min-h-[44px] items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          <ArrowLeft className="size-4" /> All coins
        </Link>
        <Suspense fallback={<div className="space-y-3" aria-busy="true"><div className="skeleton h-28 w-full" /><div className="skeleton h-80 w-full" /></div>}>
          <Details id={id} days={days} />
        </Suspense>
      </main>
    </>
  );
}
