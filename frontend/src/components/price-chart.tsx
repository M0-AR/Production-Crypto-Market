"use client";
import { useEffect, useRef } from "react";
import type { IChartApi, UTCTimestamp } from "lightweight-charts";

// Client-only island: TradingView Lightweight Charts (60fps canvas, ~43KB).
// Server ships headline stats as HTML; the canvas hydrates after. Stale-data
// state is explicit: `stale` dims the chart with a badge instead of silently freezing.
export function PriceChart({ data, stale }: { data: number[][]; stale?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let chart: IChartApi | undefined;
    let ro: ResizeObserver | null = null;
    let dead = false;
    (async () => {
      if (!ref.current || !data.length) return;
      const { createChart, CandlestickSeries } = await import("lightweight-charts");
      if (dead || !ref.current) return;
      chart = createChart(ref.current, {
        height: 320,
        layout: { background: { color: "transparent" }, textColor: "#8b8b9e" },
        grid: { vertLines: { color: "rgba(140,140,160,0.12)" }, horzLines: { color: "rgba(140,140,160,0.12)" } },
        timeScale: { timeVisible: true },
      });
      const series = chart.addSeries(CandlestickSeries, {
        upColor: "#16a34a", downColor: "#dc2626",
        wickUpColor: "#16a34a", wickDownColor: "#dc2626",
        borderVisible: false,
      });
      series.setData(
        data.map(([t, o, h, l, c]) => ({
          time: Math.floor(t / 1000) as UTCTimestamp, open: o, high: h, low: l, close: c,
        })),
      );
      chart.timeScale().fitContent();
      ro = new ResizeObserver((es) => {
        if (!es.length) return;
        chart?.applyOptions({ width: es[0].contentRect.width });
      });
      ro.observe(ref.current!);
    })();
    return () => {
      dead = true;
      ro?.disconnect();
      try { chart?.remove(); } catch { /* already gone */ }
    };
  }, [data]);

  if (!data.length) return <p className="text-sm text-[var(--muted-foreground)]">No candle data for this range.</p>;
  return (
    <div className="relative">
      {stale && (
        <span className="absolute right-2 top-2 z-10 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs text-amber-500">
          Delayed — reconnecting
        </span>
      )}
      <div ref={ref} className="w-full" role="img" aria-label="Price candlestick chart" />
    </div>
  );
}
