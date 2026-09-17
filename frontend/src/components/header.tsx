import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { SearchTrigger } from "./search-palette";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-[var(--background)]/80 backdrop-blur">
      <div className="main-container flex h-14 items-center justify-between !py-0">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-7 place-items-center rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)]">◈</span>
          Pro Screener
        </Link>
        <nav className="hidden items-center gap-1 sm:flex" aria-label="Primary">
          <Link className="nav-link nav-link-active" href="/">Overview</Link>
          <Link className="nav-link" href="/coins">All coins</Link>
          <a className="nav-link" href="/api/health">Health</a>
        </nav>
        <div className="flex items-center gap-2">
          <SearchTrigger />
          <ThemeToggle />
        </div>
      </div>
      {/* mobile nav: no hamburger trap, always visible, thumb-reachable */}
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2 sm:hidden" aria-label="Mobile">
        <Link className="nav-link nav-link-active" href="/">Overview</Link>
        <Link className="nav-link" href="/coins">All coins</Link>
      </nav>
    </header>
  );
}
