import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  ChevronDown,
  Cpu,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { BrandLogos } from "@/components/brand/brand-logos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PremiumDotGrid, PremiumMesh } from "@/components/visual/premium-mesh";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1451187580459-43490279c940?auto=format&fit=crop&w=2000&q=80";

const FLOW_STEPS = [
  {
    step: "01",
    title: "Ground truth data",
    body: "Load decom schedules and CNS/NRB extracts (or use the built-in live-style feeds). The app keeps Fuze site IDs aligned so every signal can be tied to a shutdown window.",
    ai: "Prepares structured context for the model.",
    human: "You curate uploads, append rows, or reload reference extracts.",
  },
  {
    step: "02",
    title: "AI reads the pattern",
    body: "A large language model reviews pre- vs post-shutdown pin volume per site. It streams its reasoning, flags sites that may be driving customer pain, and explains why — not with fixed ratio rules, but with judgment tuned to your notes.",
    ai: "Reasoning, prioritization, concern levels, narrative overview.",
    human: "You set calendar windows, timezone, and optional analyst instructions.",
  },
  {
    step: "03",
    title: "Human validation",
    body: "Review AI-flagged sites alongside charts and pin-level drill-down. Check or uncheck sites for the exceptions path before any outreach language is drafted.",
    ai: "Surfaces candidates and rationale.",
    human: "You decide what is safe to escalate.",
  },
  {
    step: "04",
    title: "AI drafts the next action",
    body: "For confirmed sites, the model drafts email copy grouped by NA engineer. Operators copy into the corporate mail path; this application does not originate outbound SMTP.",
    ai: "Subject, body, HTML table summaries.",
    human: "You edit, approve, and send through normal channels.",
  },
] as const;

const CAPABILITIES = [
  {
    title: "Narrative review",
    body: "Supplements quantitative pre/post counts with LLM-generated rationale tied to network operations context.",
    icon: Sparkles,
  },
  {
    title: "Traceable decisions",
    body: "Streamed or summarized model output precedes structured site decisions and escalation lists.",
    icon: Cpu,
  },
  {
    title: "Outreach support",
    body: "Produces draft NA communications from the same validated site set — ready for copy-forward and approval.",
    icon: Bot,
  },
] as const;

export default function IntroductionPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-12 pb-8">
      <section className="animate-fade-up relative min-h-[300px] overflow-hidden rounded-2xl border border-border/60 bg-card shadow-premium-lg sm:min-h-[360px]">
        <div className="absolute inset-0">
          <Image
            src={HERO_IMAGE}
            alt="Abstract global connectivity — Earth from orbit at night"
            fill
            priority
            className="object-cover object-center"
            sizes="(max-width: 1024px) 100vw, 1024px"
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-[#0c0f14]/95 via-[#0c0f14]/80 to-[hsl(220_50%_18%/0.65)]"
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-[#0c0f14] via-transparent to-[hsl(0_86%_30%/0.15)]"
            aria-hidden
          />
          <PremiumMesh className="opacity-50 mix-blend-screen" />
        </div>
        <div className="relative z-[1] px-6 py-10 sm:px-10 sm:py-14">
          <div className="mb-8 flex flex-wrap items-center gap-4">
            <div className="rounded-xl bg-white/95 p-4 shadow-premium ring-1 ring-black/5">
              <BrandLogos variant="welcome" withLinks />
            </div>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[hsl(0_86%_65%)]">
            Verizon Wireless · Network Engineering
          </p>
          <h1 className="font-display mt-4 max-w-3xl text-3xl font-bold leading-[1.12] tracking-tight text-white sm:text-4xl md:text-5xl">
            <span className="text-[hsl(0_86%_72%)]">AI-assisted</span> decom &amp; CNS impact
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
            Operational analytics for{" "}
            <strong className="font-semibold text-white">mmWave decommission programs</strong>:
            join customer signals to shutdown timing, apply{" "}
            <strong className="font-semibold text-white">LLM-supported review</strong>, and produce
            structured <strong className="font-semibold text-white">NA outreach drafts</strong> under
            analyst control.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-xl bg-primary px-8 text-base font-semibold shadow-glow transition-all hover:bg-primary/90 hover:shadow-premium-lg"
            >
              <Link href="/dashboard" className="gap-2">
                Open analysis workspace
                <ArrowRight className="h-5 w-5" strokeWidth={2} />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 rounded-xl border-white/25 bg-white/10 text-white hover:bg-white/15 hover:text-white"
            >
              <Link href="/">Return to welcome</Link>
            </Button>
            <p className="max-w-xs text-xs leading-relaxed text-zinc-400">
              Five-step workflow · Optional streamed LLM rationale · Validated escalation path
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {CAPABILITIES.map(({ title, body, icon: Icon }, i) => (
          <div
            key={title}
            className="animate-fade-up group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-premium transition-shadow hover:shadow-premium-lg"
            style={{ animationDelay: `${i * 0.06}s` }}
          >
            <PremiumDotGrid className="opacity-50" />
            <div className="relative flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-gradient-to-br from-primary/15 to-primary/5 text-primary shadow-sm">
                <Icon className="h-6 w-6" aria-hidden strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-display text-base font-semibold text-foreground">{title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <div className="decom-elevate relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-premium sm:p-10">
        <PremiumDotGrid className="opacity-30" />
        <div className="relative space-y-10">
          <div>
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Roles &amp; responsibilities
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="flex gap-4 rounded-xl border border-border/80 bg-gradient-to-br from-muted/50 to-transparent p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
                  <UserRound className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="font-display font-semibold text-foreground">Analyst accountability</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Data preparation, window selection, escalation decisions, and outbound messaging
                    remain with Network Engineering staff.
                  </p>
                </div>
              </div>
              <div className="flex gap-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] to-transparent p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                  <ShieldCheck className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="font-display font-semibold text-foreground">Model-supported insight</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    The model narrates tradeoffs, surfaces candidates, and produces drafts you edit
                    before distribution — aligned to NE operational review practices.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-border/60" />

          <div>
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
              End-to-end flow
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Extracts must share <strong className="font-medium text-foreground">Fuze site ID</strong>
              . Configure <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">OPENAI_API_KEY</code>{" "}
              for the managed LLM service; otherwise the platform uses the documented heuristic
              analysis path so lower environments stay functional.
            </p>
            <div className="mt-8 space-y-0">
              {FLOW_STEPS.map((item, i) => (
                <div key={item.step}>
                  <Card className="overflow-hidden rounded-xl border-border/80 shadow-premium transition-shadow hover:shadow-premium-lg">
                    <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-2 pt-5 sm:gap-5">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[hsl(0_72%_42%)] text-sm font-bold text-primary-foreground shadow-md">
                        {item.step}
                      </span>
                      <div className="min-w-0 flex-1 space-y-2">
                        <CardTitle className="font-display text-lg font-semibold">
                          {item.title}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
                            <Sparkles className="h-3 w-3" aria-hidden />
                            AI: {item.ai}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                            <UserRound className="h-3 w-3" aria-hidden />
                            You: {item.human}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-5 pt-0">
                      <p className="text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                    </CardContent>
                  </Card>
                  {i < FLOW_STEPS.length - 1 ? (
                    <div className="flex justify-center py-2 text-primary/40" aria-hidden>
                      <ChevronDown className="h-5 w-5" strokeWidth={2} />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-border/60 pt-8 sm:flex-row sm:items-center sm:justify-between">
            <Button
              asChild
              size="lg"
              className="h-12 w-full rounded-xl font-semibold shadow-premium sm:w-auto sm:px-10"
            >
              <Link href="/dashboard" className="gap-2">
                Open analysis workspace
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <p className="text-center text-xs text-muted-foreground sm:max-w-xs sm:text-right">
              Navigation rail available on all screens. Internal Network Engineering use.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
