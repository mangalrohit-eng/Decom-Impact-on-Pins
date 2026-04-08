"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Introduction", icon: BookOpen },
  { href: "/dashboard", label: "Dashboard", icon: Activity },
] as const;

export function DecomSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-0.5 p-2">
      {items.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/"
            ? pathname === "/"
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 border px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-border bg-accent text-accent-foreground"
                : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
