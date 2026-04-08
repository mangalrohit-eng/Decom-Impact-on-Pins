import { cn } from "@/lib/utils";

/** Abstract network mesh — Verizon-adjacent crimson + deep blue energy. */
export function PremiumMesh({ className }: { className?: string }) {
  return (
    <svg
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="pm-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(0 86% 52%)" stopOpacity="0.45" />
          <stop offset="45%" stopColor="hsl(220 70% 42%)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="hsl(200 60% 35%)" stopOpacity="0.15" />
        </linearGradient>
        <radialGradient id="pm-glow" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="hsl(0 86% 55%)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#pm-glow)" />
      <g stroke="url(#pm-grad)" strokeWidth="0.5" fill="none" opacity="0.9">
        <path d="M0,40 Q120,20 240,50 T480,35 T720,55 T960,30 V0 H0Z" />
        <path d="M0,85 Q200,60 400,90 T800,70 T1200,95 V0 H0Z" opacity="0.7" />
        <path d="M0,120 Q180,100 360,130 T720,110 T1080,125 V0 H0Z" opacity="0.5" />
      </g>
      {[
        [12, 28],
        [28, 52],
        [52, 38],
        [72, 58],
        [88, 32],
      ].map(([cx, cy], i) => (
        <circle
          key={i}
          cx={`${cx}%`}
          cy={`${cy}%`}
          r="2.5"
          fill="hsl(0 86% 55%)"
          opacity={0.35 + i * 0.08}
        />
      ))}
    </svg>
  );
}

/** Subtle dot grid for cards and panels */
export function PremiumDotGrid({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 opacity-[0.4]",
        "[background-image:radial-gradient(hsl(var(--foreground)/0.06)_1px,transparent_1px)] [background-size:20px_20px]",
        className
      )}
      aria-hidden
    />
  );
}
