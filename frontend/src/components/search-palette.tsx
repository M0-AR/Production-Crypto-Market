"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

// Global command palette: Ctrl/⌘K anywhere, debounced server search, AbortController
// cancels stale in-flight queries so a slow "bit" response can never overwrite "bitcoin".
const API = process.env.NEXT_PUBLIC_API_URL ?? "/api";

type Hit = { id: string; name: string; symbol: string; market_cap_rank?: number; thumb: string };

import { Search } from "lucide-react";

export function SearchTrigger() {
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent("open-search"))}
      className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
      aria-label="Search coins"
    >
      <Search className="size-4" aria-hidden="true" />
      <span className="hidden md:inline">Search</span>
      <kbd className="hidden rounded border px-1.5 text-xs md:inline">⌘K</kbd>
    </button>
  );
}

export function SearchPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const abort = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);

  // Reset happens in the event handlers that OPEN the palette (not in an effect):
  // effects must sync with external systems, not cascade renders.
  const openPalette = useCallback(() => {
    setQ(""); setHits([]); setState("idle"); setOpen(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openPalette(); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-search", openPalette);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-search", openPalette);
    };
  }, [openPalette]);

  // Focus is a genuine external-system sync (DOM), so an effect is correct here.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => input.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  const search = useCallback((value: string) => {
    setQ(value);
    abort.current?.abort();
    if (value.trim().length < 2) { setHits([]); setState("idle"); return; }
    setState("loading");
    const c = new AbortController();
    abort.current = c;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`${API}/coins/search?q=${encodeURIComponent(value.trim())}`, { signal: c.signal });
        if (!r.ok) throw new Error(String(r.status));
        const j = await r.json();
        setHits((j.data?.coins ?? []).slice(0, 8));
        setState("idle");
      } catch (e) {
        if ((e as Error).name === "AbortError") return; // superseded, not an error
        setState("error");
      }
    }, 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => () => abort.current?.abort(), []);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search coins">
      <button aria-label="Close search" className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
      <div className="card relative w-full max-w-lg p-2">
        <input
          ref={input} value={q} onChange={(e) => search(e.target.value)}
          placeholder="Search 14,000+ coins… (bitcoin, eth, sol)" aria-label="Search coins"
          className="h-12 w-full rounded-lg bg-transparent px-4 text-base outline-none"
        />
        <div className="max-h-80 overflow-y-auto">
          {state === "loading" && <p className="px-4 py-3 text-sm text-[var(--muted-foreground)]">Searching…</p>}
          {state === "error" && <p className="px-4 py-3 text-sm text-red-500">Search unavailable — try again in a minute.</p>}
          {state === "idle" && q.trim().length >= 2 && !hits.length && (
            <p className="px-4 py-3 text-sm text-[var(--muted-foreground)]">No matches.</p>
          )}
          {hits.map((h) => (
            <Link key={h.id} href={`/coins/${h.id}`} onClick={() => setOpen(false)}
              className="flex min-h-[44px] items-center gap-3 rounded-lg px-4 py-2 hover:bg-[var(--muted)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={h.thumb} alt="" width={24} height={24} className="rounded-full" loading="lazy" />
              <span className="font-medium">{h.name}</span>
              <span className="text-xs uppercase text-[var(--muted-foreground)]">{h.symbol}</span>
              {h.market_cap_rank ? <span className="ml-auto text-xs text-[var(--muted-foreground)]">#{h.market_cap_rank}</span> : null}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
