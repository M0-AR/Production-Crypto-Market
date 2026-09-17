import { Suspense } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { Card, CardTitle, CardMuted, Badge } from "@/components/ui/card";
import { api, type CoinRow, type Envelope, type TrendingEntry, type Category, type FearGreed } from "@/lib/api";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { TrendingUp, TrendingDown, Activity, ShieldCheck, Zap } from "lucide-react";

async function MarketTable() {
  const res = await api<Envelope<CoinRow[]>>("/api/coins/markets?per_page=10&page=1", 60);
  const coins = res?.data ?? [];
  if (!coins.length) {
    return (
      <div className="card p-5">
        <CardTitle>Market is warming up</CardTitle>
        <CardMuted>Backend cache is cold or CoinGecko key is missing. UI stays usable — no spinner trap, no crash.</CardMuted>
      </div>
    );
  }
  return (
    <div className="table-wrap">
      <table className="data">
        <thead><tr><th>#</th><th>Asset</th><th className="text-right">Price</th><th className="text-right">24h</th><th className="text-right">Mkt cap</th></tr></thead>
        <tbody>
          {coins.map((c, i) => {
            const up = (c.price_change_percentage_24h ?? 0) >= 0;
            return (
              <tr key={c.id} className="hover:bg-[var(--muted)]/50">
                <td className="text-[var(--muted-foreground)]">{i + 1}</td>
                <td>
                  <Link href={`/coins/${c.id}`} className="flex min-h-[44px] items-center gap-2 font-medium hover:underline">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.image} alt={c.name} width={24} height={24} className="rounded-full" loading="lazy" />
                    {c.name} <span className="text-xs uppercase text-[var(--muted-foreground)]">{c.symbol}</span>
                  </Link>
                </td>
                <td className="text-right tabular-nums">{formatCurrency(c.current_price)}</td>
                <td className="text-right"><Badge up={up}>{up ? <TrendingUp /> : <TrendingDown />}{formatPercent(c.price_change_percentage_24h)}</Badge></td>
                <td className="text-right tabular-nums">{formatCurrency(c.market_cap)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

async function TrendingStrip() {
  const res = await api<Envelope<{ coins: TrendingEntry[] }>>("/api/coins/trending", 600);
  const coins = res?.data?.coins?.slice(0, 10) ?? [];
  if (!coins.length) return null;
  return (
    <Card>
      <CardTitle>Trending now</CardTitle>
      <CardMuted>CoinGecko search momentum, refreshed every 10 minutes — one cached call serves all users.</CardMuted>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {coins.map(({ item }) => (
          <Link key={item.id} href={`/coins/${item.id}`}
            className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-lg border px-3 py-2 hover:bg-[var(--muted)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.thumb} alt="" width={24} height={24} className="rounded-full" loading="lazy" />
            <span className="text-sm font-medium">{item.name}</span>
            <span className="text-xs uppercase text-[var(--muted-foreground)]">{item.symbol}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function MiniRows({ coins, base }: { coins: CoinRow[]; base: number }) {
  return (
    <div className="table-wrap">
      <table className="data">
        <tbody>
          {coins.map((c, i) => {
            const up = (c.price_change_percentage_24h ?? 0) >= 0;
            return (
              <tr key={c.id} className="hover:bg-[var(--muted)]/50">
                <td className="text-[var(--muted-foreground)]">{base + i + 1}</td>
                <td>
                  <Link href={`/coins/${c.id}`} className="flex min-h-[44px] items-center gap-2 font-medium hover:underline">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.image} alt={c.name} width={20} height={20} className="rounded-full" loading="lazy" />
                    <span className="text-sm">{c.symbol.toUpperCase()}</span>
                  </Link>
                </td>
                <td className="text-right text-sm tabular-nums">{formatCurrency(c.current_price)}</td>
                <td className="text-right"><Badge up={up}>{formatPercent(c.price_change_percentage_24h)}</Badge></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

async function Movers() {
  const res = await api<Envelope<{ gainers: CoinRow[]; losers: CoinRow[] }>>("/api/coins/movers", 120);
  if (!res?.data?.gainers?.length) return null;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardTitle>Top gainers 24h</CardTitle>
        <div className="mt-3"><MiniRows coins={res.data.gainers} base={0} /></div>
      </Card>
      <Card>
        <CardTitle>Top losers 24h</CardTitle>
        <div className="mt-3"><MiniRows coins={res.data.losers} base={0} /></div>
      </Card>
    </div>
  );
}

async function Sentiment() {
  // Zero CoinGecko quota: Alternative.me is free + daily. 12h backend cache.
  const res = await api<Envelope<FearGreed>>("/api/sentiment", 3600);
  const points = res?.data?.data ?? [];
  if (!points.length) return null;
  const now = points[0];
  const v = parseInt(now.value, 10) || 0;
  return (
    <Card>
      <CardTitle>Fear &amp; Greed</CardTitle>
      <CardMuted>Market sentiment, updated daily — costs zero API quota.</CardMuted>
      <p className="mt-2 text-3xl font-bold tabular-nums">{v}<span className="ml-2 text-sm font-medium text-[var(--muted-foreground)]">{now.value_classification}</span></p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--muted)]" role="img" aria-label={`Fear and greed index ${v} of 100, ${now.value_classification}`}>
        <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${Math.min(100, Math.max(0, v))}%` }} />
      </div>
      <div className="mt-3 flex h-10 items-end gap-[3px]" aria-hidden="true">
        {points.slice(0, 30).reverse().map((p, i) => (
          <div key={i} className="flex-1 rounded-sm bg-[var(--primary)] opacity-70" style={{ height: `${Math.min(100, Math.max(6, parseInt(p.value, 10) || 0))}%` }} />
        ))}
      </div>
    </Card>
  );
}

async function Categories() {
  const res = await api<Envelope<Category[]>>("/api/coins/categories", 600);
  const cats = (res?.data ?? []).slice(0, 8);
  if (!cats.length) return null;
  return (
    <Card>
      <CardTitle>Categories</CardTitle>
      <CardMuted>Narratives at a glance — DeFi, L1s, memes and more.</CardMuted>
      <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {cats.map((c) => (
          <div key={c.id} className="rounded-lg border p-3">
            <p className="truncate text-sm font-medium">{c.name}</p>
            <p className="mt-1 text-sm tabular-nums text-[var(--muted-foreground)]">{formatCurrency(c.market_cap)}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function BlockSkeleton() {
  return <div className="card p-5" aria-busy="true"><div className="skeleton h-5 w-40" /><div className="skeleton mt-3 h-16 w-full" /></div>;
}

function TableSkeleton() {
  return (
    <div className="card p-5" aria-busy="true" aria-label="Loading market">
      <div className="skeleton h-5 w-40" />
      <div className="mt-3 space-y-2">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-11 w-full" />)}</div>
    </div>
  );
}

export default function Page() {
  return (
    <>
      <Header />
      <main className="main-container space-y-4">
        <section className="card grid gap-4 p-5 sm:p-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[var(--muted-foreground)]">Production market terminal</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Fast when 50 users show up. Alive when 50,000 do.</h1>
            <p className="mt-2 max-w-prose text-sm text-[var(--muted-foreground)] sm:text-base">
              Stateless API behind nginx · Redis sessions + cache-aside · PgBouncer-ready Postgres ·
              BullMQ queue for slow work · sharding deliberately omitted until data demands it.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/coins" className="inline-flex h-9 items-center rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90">View live market</Link>
              <a href="/api/docs" className="inline-flex h-9 items-center rounded-lg border px-4 text-sm font-medium hover:bg-[var(--muted)]">API docs</a>
            </div>
          </div>
          <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3 lg:grid-cols-1">
            <li className="card flex items-center gap-2 p-3"><Zap className="size-4" /> Cache hit target &gt;80%</li>
            <li className="card flex items-center gap-2 p-3"><ShieldCheck className="size-4" /> Secrets as files, not env</li>
            <li className="card flex items-center gap-2 p-3"><Activity className="size-4" /> Health-gated deploys</li>
          </ul>
        </section>

        <section className="home-grid">
          <div className="space-y-4 lg:col-span-2">
            <Card>
              <CardTitle>Top movers</CardTitle>
              <CardMuted>Server-rendered, streamed via Suspense. No waterfall: sections fetch in parallel.</CardMuted>
              <div className="mt-3">
                <Suspense fallback={<TableSkeleton />}>
                  <MarketTable />
                </Suspense>
              </div>
            </Card>
          </div>
          <div className="space-y-4">
            <Suspense fallback={<BlockSkeleton />}>
              <Sentiment />
            </Suspense>
            <Card>
              <CardTitle>Why this is sellable</CardTitle>
              <CardMuted>Every box exists for a measured bottleneck — and lists its cost.</CardMuted>
              <ul className="mt-3 space-y-2 text-sm">
                <li>· <b>Vertical first:</b> $20 box = 100s RPS. $0 code change.</li>
                <li>· <b>Horizontal:</b> nginx + stateless NestJS. Cost: LB is SPOF → keepalive + 2nd target.</li>
                <li>· <b>Sessions:</b> Redis, not server memory. Cost: +1 lookup/request.</li>
                <li>· <b>Reads:</b> replicas + Redis cache. Cost: replication lag; never cache balances.</li>
                <li>· <b>Slow work:</b> BullMQ worker. Cost: eventual completion + DLQ discipline.</li>
              </ul>
            </Card>
          </div>
        </section>

        <Suspense fallback={<BlockSkeleton />}>
          <TrendingStrip />
        </Suspense>

        <Suspense fallback={<BlockSkeleton />}>
          <Movers />
        </Suspense>

        <Suspense fallback={<BlockSkeleton />}>
          <Categories />
        </Suspense>
      </main>
    </>
  );
}
