"use client";

import { usePathname } from "next/navigation";
import { ChevronRight, Sparkles } from "lucide-react";
import { APP_NAME } from "@/config/app-brand";
import { cn } from "@/lib/utils";

const CRUMBS: Record<string, { segment: string; title: string }> = {
  "/": { segment: "Home", title: "Overview & guide" },
  "/overview": { segment: "Operations", title: "Live metrics" },
  "/dashboard": { segment: "Operations", title: "Guided analysis" },
};

function crumbKey(pathname: string): keyof typeof CRUMBS {
  if (pathname.startsWith("/dashboard")) return "/dashboard";
  if (pathname.startsWith("/overview")) return "/overview";
  return "/";
}

export function DecomSiteHeader({ className }: { className?: string }) {
  const pathname = usePathname();
  const key = crumbKey(pathname);
  const crumb = CRUMBS[key];

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center justify-between gap-3",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-1 text-xs sm:gap-2 sm:text-sm">
        <span className="shrink-0 font-medium text-muted-foreground/90">{APP_NAME}</span>
        <ChevronRight
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50"
          aria-hidden
          strokeWidth={2}
        />
        <span className="truncate text-muted-foreground">{crumb.segment}</span>
        <ChevronRight
          className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground/50 sm:block"
          aria-hidden
          strokeWidth={2}
        />
        <span className="hidden truncate font-display font-semibold text-foreground sm:inline">
          {crumb.title}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-gradient-to-r from-primary/[0.08] via-primary/[0.06] to-[hsl(220_70%_42%/0.08)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-primary shadow-sm"
          title="AI-assisted reasoning and outreach drafts"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
          <span className="hidden sm:inline">Gen-AI ready</span>
        </span>
        <span className="hidden rounded-md border border-border/80 bg-muted/40 px-2 py-1 text-[10px] font-medium tracking-wide text-muted-foreground lg:inline">
          NE · Ops
        </span>
      </div>
    </div>
  );
}
