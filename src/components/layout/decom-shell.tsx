import Link from "next/link";
import { Activity } from "lucide-react";
import { BrandLogos } from "@/components/brand/brand-logos";

export function DecomShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card">
        <Link
          href="/"
          className="flex flex-col gap-3 border-b border-border px-4 py-4 outline-none ring-offset-background transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BrandLogos variant="sidebar" />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Verizon · NE
            </p>
            <p className="truncate text-sm font-semibold leading-tight">
              Decom · CNS impact
            </p>
          </div>
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          <Link
            href="/"
            className="flex items-center gap-2 border border-border bg-accent px-3 py-2 text-sm font-medium text-accent-foreground"
          >
            <Activity className="h-4 w-4 shrink-0" aria-hidden />
            Dashboard
          </Link>
        </nav>
        <div className="border-t border-border p-3 text-[10px] leading-relaxed text-muted-foreground">
          CTO Office · Network Engineering
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center border-b border-border bg-card px-6">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Internal use · Accenture / Verizon
          </span>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
