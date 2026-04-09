"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  {
    href: "/",
    label: "Home",
    hint: "Guide & capabilities",
    icon: Home,
    match: (p: string) => p === "/",
  },
  {
    href: "/overview",
    label: "Dashboard",
    hint: "Pins, decom & regions",
    icon: BarChart3,
    match: (p: string) => p === "/overview" || p.startsWith("/overview/"),
  },
  {
    href: "/dashboard",
    label: "Analysis",
    hint: "Guided workflow",
    icon: Sparkles,
    match: (p: string) => p === "/dashboard" || p.startsWith("/dashboard/"),
  },
] as const;

type NavProps = {
  onNavigate?: () => void;
};

export function DecomSidebarNav({ onNavigate }: NavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1.5 p-3" aria-label="Main navigation">
      {items.map(({ href, label, hint, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => onNavigate?.()}
            className={cn(
              "group relative flex flex-col gap-1 rounded-xl border border-transparent px-3 py-3 text-sm transition-all duration-200",
              active
                ? "border-white/[0.08] bg-gradient-to-br from-white/[0.09] to-white/[0.02] text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                : "text-zinc-400 hover:border-white/[0.05] hover:bg-white/[0.04] hover:text-zinc-100"
            )}
          >
            {active ? (
              <span
                className="absolute left-0 top-1/2 h-8 w-0.5 -translate-y-1/2 rounded-full bg-[hsl(0_86%_51%)] shadow-[0_0_12px_hsl(0_86%_51%/0.5)]"
                aria-hidden
              />
            ) : null}
            <span className="flex items-center gap-2.5 pl-0.5">
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                  active
                    ? "border-[hsl(0_86%_51%/0.35)] bg-[hsl(0_86%_51%/0.12)] text-[hsl(0_86%_58%)]"
                    : "border-white/10 bg-white/[0.04] text-zinc-500 group-hover:border-white/15 group-hover:text-zinc-300"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden strokeWidth={1.75} />
              </span>
              <span className="font-display font-semibold tracking-tight">{label}</span>
            </span>
            <span className="pl-[2.75rem] text-[11px] font-medium leading-snug tracking-wide text-zinc-500 group-hover:text-zinc-400">
              {hint}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
