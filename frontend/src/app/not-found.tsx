import Link from "next/link";
import { Header } from "@/components/header";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="main-container">
        <div className="card mx-auto max-w-md space-y-2 p-8 text-center">
          <p className="text-5xl font-bold tabular-nums">404</p>
          <h1 className="text-lg font-semibold">Nothing at this address</h1>
          <p className="text-sm text-[var(--muted-foreground)]">The page moved or never existed. The market didn&apos;t.</p>
          <Link href="/" className="inline-flex h-11 min-h-[44px] items-center rounded-lg bg-[var(--primary)] px-5 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90">
            Back to overview
          </Link>
        </div>
      </main>
    </>
  );
}
