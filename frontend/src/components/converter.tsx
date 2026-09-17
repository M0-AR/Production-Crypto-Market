"use client";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils";

// Converter: pure client math on server-provided price list. Zero API calls per keystroke.
export function Converter({ symbol, icon, prices }: { symbol: string; icon?: string; prices: Record<string, number> }) {
  const codes = useMemo(() => Object.keys(prices ?? {}).map((c) => c.toLowerCase()).sort(), [prices]);
  const [currency, setCurrency] = useState("usd");
  const [amount, setAmount] = useState("1");
  const rate = prices?.[currency] ?? prices?.[currency.toUpperCase()] ?? 0;
  const out = (parseFloat(amount) || 0) * rate;

  return (
    <div className="card space-y-3 p-5">
      <h4 className="text-base font-semibold">{symbol.toUpperCase()} converter</h4>
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--muted-foreground)]">Amount ({symbol.toUpperCase()})</span>
        <input
          type="number" min="0" step="any" value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-11 w-full rounded-lg border bg-transparent px-3 tabular-nums"
          aria-label={`${symbol} amount`}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--muted-foreground)]">Currency</span>
        <select
          value={currency} onChange={(e) => setCurrency(e.target.value)}
          className="h-11 w-full rounded-lg border bg-transparent px-3"
          aria-label="Target currency"
        >
          {codes.map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}
        </select>
      </label>
      <p className="flex items-center gap-2 text-lg font-semibold tabular-nums">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {icon && <img src={icon} alt="" width={20} height={20} className="rounded-full" />}
        {formatCurrency(out, currency.toUpperCase())}
      </p>
    </div>
  );
}
