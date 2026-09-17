"use client";
import { useEffect } from "react";
import { Header } from "@/components/header";

// Segment error boundary (must be client): isolates a crashed section with retry,
// instead of a full-page blank. Log to your aggregator here in prod (Sentry/PostHog).
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[route-error]", error.digest ?? error.message);
  }, [error]);
  return (
    <>
      <Header />
      <main className="main-container">
        <div className="card mx-auto max-w-md space-y-2 p-8 text-center">
          <h1 className="text-lg font-semibold">This section failed to load</h1>
          <p className="text-sm text-[var(--muted-foreground)]">The rest of the app is fine. Usually a transient upstream blip.</p>
          <button onClick={reset} className="inline-flex h-11 min-h-[44px] items-center rounded-lg bg-[var(--primary)] px-5 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90">
            Try again
          </button>
        </div>
      </main>
    </>
  );
}
