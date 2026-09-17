import { Suspense } from "react";
import Link from "next/link";
import { Header } from "@/components/header";
import { CardMuted, CardTitle, Badge } from "@/components/ui/card";
import { api, type CoinRow, type Envelope } from "@/lib/api";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

const PER_PAGE = 20;

async function ExplorerTable({ page }: { page: number }) {
  const res = await api<Envelope<CoinRow[]>>(`/api/coins/markets?per_page=${PER_PAGE}&page=${page}`, 60);
  const coins = res?.data ?? [];
  if (!coins.length) {
    return (
      <div className="card p-5">
        <CardTitle>Explorer warming up</CardTitle>
        <CardMuted>Market data is unavailable right now (upstream quota or key). Your filters and page are kept — retry in a minute.</CardMuted>
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
                <td className="tabular-nums text-[var(--muted-foreground)]">{(page - 1) * PER_PAGE + i + 1}</td>
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

export default async function CoinsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const sp = await searchParams;
  const page = Math.min(500, Math.max(1, parseInt(sp.page ?? "1", 10) || 1));
  return (
    <>
      <Header />
      <main className="main-container space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">All coins</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Server-side pagination — the browser never holds more than one page.</p>
          </div>
          <nav className="flex items-center gap-2" aria-label="Pagination">
            <Link href={`/coins?page=${page - 1}`} aria-disabled={page <= 1}
              className={`inline-flex h-11 min-w-[44px] items-center justify-center rounded-lg border px-4 text-sm ${page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-[var(--muted)]"}`}>
              ← Prev
            </Link>
            <span className="text-sm tabular-nums text-[var(--muted-foreground)]">Page {page}</span>
            <Link href={`/coins?page=${page + 1}`}
              className="inline-flex h-11 min-w-[44px] items-center justify-center rounded-lg border px-4 text-sm hover:bg-[var(--muted)]">
              Next →
            </Link>
          </nav>
        </div>
        <Suspense fallback={<div className="card space-y-2 p-5" aria-busy="true">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-11 w-full" />)}</div>}>
          <ExplorerTable page={page} />
        </Suspense>
      </main>
    </>
  );
}
