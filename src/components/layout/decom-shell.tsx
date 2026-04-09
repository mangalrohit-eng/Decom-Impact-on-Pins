"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { BrandLogos } from "@/components/brand/brand-logos";
import { DecomSidebarNav } from "@/components/layout/decom-sidebar-nav";
import { DecomSiteHeader } from "@/components/layout/decom-site-header";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { APP_NAME, APP_TAGLINE } from "@/config/app-brand";
import { cn } from "@/lib/utils";

function SidebarChrome({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <div className={cn("flex h-full flex-col", className)}>
      <Link
        href="/"
        onClick={() => onNavigate?.()}
        className="group relative border-b border-white/[0.06] px-4 py-5 outline-none transition-colors hover:bg-white/[0.03] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0f14]"
      >
        <div className="relative rounded-xl bg-white p-3 shadow-premium ring-1 ring-black/5 transition-shadow group-hover:shadow-premium-lg">
          <BrandLogos variant="sidebar" />
        </div>
        <div className="mt-4 min-w-0 space-y-0.5">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Verizon Wireless · NE
            </p>
          <p className="font-display truncate text-sm font-semibold tracking-tight text-white">
            {APP_NAME}
          </p>
          <p className="line-clamp-2 text-[10px] font-medium leading-snug tracking-wide text-zinc-500">
            {APP_TAGLINE}
          </p>
        </div>
      </Link>
      <DecomSidebarNav onNavigate={onNavigate} />
        <div className="mt-auto border-t border-white/[0.06] px-4 py-4">
        <p className="text-[10px] leading-relaxed tracking-wide text-zinc-500">
          Network Engineering · Internal operations
        </p>
      </div>
    </div>
  );
}

export function DecomShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[hsl(40_25%_97%)]">
      <aside
        className="relative hidden w-[15.5rem] shrink-0 flex-col bg-[#0c0f14] md:flex"
        aria-label="Primary"
      >
        <div
          className="absolute bottom-0 left-0 top-0 w-1 bg-gradient-to-b from-[hsl(0_86%_51%)] via-[hsl(0_86%_45%)] to-[hsl(220_70%_42%)]"
          aria-hidden
        />
        <div className="flex flex-1 flex-col pl-1">
          <SidebarChrome />
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border/50 bg-white/80 px-3 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-white/70 sm:px-6">
            <SheetTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 rounded-lg text-foreground md:hidden"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <DecomSiteHeader />
          </header>
          <main className="decom-page-bg flex-1 overflow-auto p-4 sm:p-8">{children}</main>
        </div>
        <SheetContent
          side="left"
          className="relative flex w-[min(100vw-2rem,19rem)] flex-col border-r border-white/10 bg-[#0c0f14] p-0 text-white"
        >
          <div
            className="absolute bottom-0 left-0 top-0 w-1 bg-gradient-to-b from-[hsl(0_86%_51%)] via-[hsl(0_86%_45%)] to-[hsl(220_70%_42%)]"
            aria-hidden
          />
          <div className="flex flex-1 flex-col pl-1">
            <SidebarChrome onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
