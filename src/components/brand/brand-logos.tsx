import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BrandLogosProps = {
  /** Sidebar: compact row. Welcome: larger logos. */
  variant?: "sidebar" | "welcome";
  /** Wrap logos in external links (welcome page). */
  withLinks?: boolean;
  className?: string;
};

export function BrandLogos({
  variant = "welcome",
  withLinks = false,
  className,
}: BrandLogosProps) {
  const isSidebar = variant === "sidebar";
  const accentureClass = isSidebar
    ? "h-6 w-auto max-w-[108px] object-left object-contain"
    : "h-9 w-auto max-w-[200px] object-contain sm:h-10";
  const verizonClass = isSidebar
    ? "h-6 w-auto max-w-[96px] object-left object-contain"
    : "h-9 w-auto max-w-[200px] object-contain sm:h-10";

  const accenture = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/accenture-logo.svg"
      alt="Accenture"
      className={accentureClass}
      width={isSidebar ? 108 : 200}
      height={isSidebar ? 28 : 52}
    />
  );

  const verizon = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/verizon-logo.svg"
      alt="Verizon"
      className={verizonClass}
      width={isSidebar ? 96 : 200}
      height={isSidebar ? 28 : 45}
    />
  );

  const wrap = (
    node: ReactNode,
    href: string,
    aria: string
  ) =>
    withLinks ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={aria}
        className="inline-flex shrink-0 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
      >
        {node}
      </a>
    ) : (
      node
    );

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 sm:gap-4",
        isSidebar && "gap-2.5",
        className
      )}
    >
      {wrap(accenture, "https://www.accenture.com", "Accenture (opens in new tab)")}
      <div
        className={cn(
          "shrink-0 bg-border",
          isSidebar ? "h-5 w-px" : "h-9 w-px sm:h-10"
        )}
        aria-hidden
      />
      {wrap(verizon, "https://www.verizon.com", "Verizon (opens in new tab)")}
    </div>
  );
}
