import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  ChevronDown,
  GitBranch,
  Layers,
  Mail,
  RadioTower,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { BrandLogos } from "@/components/brand/brand-logos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PremiumDotGrid, PremiumMesh } from "@/components/visual/premium-mesh";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1451187580459-43490279c940?auto=format&fit=crop&w=2000&q=80";

const WHAT_IT_DOES = [
  {
    icon: Layers,
    title: "Correlates network and customer data",
    text: "Aligns **mmWave shutdown dates** (Fuze site ID) with **CNS pins and NRB tickets** so analysts can compare customer-reported volume in defined pre- and post-decommission windows.",
  },
  {
    icon: Sparkles,
    title: "Applies generative AI for review",
    text: "A configured **LLM interprets** pre/post patterns (with streamed rationale where enabled) and **prioritizes sites** that may warrant exceptions or reinstatement discussion — alongside your written guidance.",
  },
  {
    icon: GitBranch,
    title: "Supports controlled escalation",
    text: "You **confirm** which sites move forward; the tool **composes draft outreach** for NA engineers. **Outbound mail is not sent** from this application — operators copy drafts into standard messaging channels.",
  },
] as const;

const FLOW_STEPS = [
  {
    step: "01",
    title: "Ground truth data",
    body: "Load decom schedules and CNS/NRB extracts (or use the built-in inventory and signal syncs). Fuze site IDs stay aligned so every pin ties to a shutdown window.",
    ai: "Prepares structured context for the model.",
    human: "You curate uploads, append rows, or restore the default pulls.",
  },
  {
    step: "02",
    title: "AI reads the pattern",
    body: "The model reviews pre- vs post-shutdown pin volume per site, streams reasoning when enabled, and flags sites that may be driving customer pain — tuned to your notes, not fixed ratio rules alone.",
    ai: "Reasoning, prioritization, concern levels, narrative overview.",
    human: "You set calendar windows, timezone, and optional analyst instructions.",
  },
  {
    step: "03",
    title: "Human validation",
    body: "Review AI-flagged sites alongside charts and pin-level drill-down. Check or uncheck sites for the exceptions path before outreach language is drafted.",
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

function RichLine({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-foreground">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      })}
    </span>
  );
}

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-12 pb-12">
      <section className="animate-fade-up relative min-h-[280px] overflow-hidden rounded-2xl border border-border/60 bg-card shadow-premium-lg sm:min-h-[320px]">
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
        <div className="relative z-[1] px-6 py-10 sm:px-10 sm:py-12">
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <div className="rounded-xl bg-white/95 p-4 shadow-premium ring-1 ring-black/5">
              <BrandLogos variant="welcome" withLinks />
            </div>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[hsl(0_86%_65%)]">
            Verizon Wireless · Network Engineering
          </p>
          <h1 className="font-display mt-3 max-w-3xl text-3xl font-bold leading-[1.12] tracking-tight text-white sm:text-4xl md:text-[2.65rem]">
            <span className="text-[hsl(0_86%_72%)]">Decom impact</span> on CNS pins
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
            Operational workspace for <strong className="font-semibold text-white">mmWave programs</strong>
            : correlate customer signals to shutdown timing, run{" "}
            <strong className="font-semibold text-white">LLM-supported analysis</strong>, and produce
            structured <strong className="font-semibold text-white">NA outreach drafts</strong> under
            analyst control.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-xl bg-primary px-8 text-base font-semibold shadow-glow transition-all hover:bg-primary/90 hover:shadow-premium-lg"
            >
              <Link href="/overview" className="gap-2">
                <BarChart3 className="h-5 w-5" aria-hidden />
                Operations dashboard
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="h-12 rounded-xl border-white/20 bg-white/15 px-8 text-base font-semibold text-white hover:bg-white/25"
            >
              <Link href="/dashboard" className="gap-2">
                <Sparkles className="h-5 w-5" aria-hidden />
                Analysis workspace
                <ArrowRight className="h-5 w-5" strokeWidth={2} />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Capabilities
        </h2>
        <div className="grid gap-4">
          {WHAT_IT_DOES.map(({ icon: Icon, title, text }) => (
            <Card
              key={title}
              className="overflow-hidden rounded-2xl border-border/70 shadow-premium transition-shadow hover:shadow-premium-lg"
            >
              <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-2">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-gradient-to-br from-primary/12 to-primary/5 text-primary">
                  <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </div>
                <div>
                  <CardTitle className="font-display text-lg">{title}</CardTitle>
                  <CardDescription className="mt-2 text-base leading-relaxed text-muted-foreground">
                    <RichLine text={text} />
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
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
              Extracts must share <strong className="font-medium text-foreground">Fuze site ID</strong>.
              Configure <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">OPENAI_API_KEY</code>{" "}
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
        </div>
      </div>

      <Card className="rounded-2xl border border-border/80 bg-card shadow-premium">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" aria-hidden />
            <CardTitle className="font-display text-base">Configuration &amp; messaging</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            Session processing: uploads are handled per request; persistent storage of customer data
            in this deployment is out of scope unless your environment is configured otherwise.
            Set <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">OPENAI_API_KEY</code>{" "}
            (and optional <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">OPENAI_MODEL</code>
            ) to enable the production LLM path. When those credentials are absent, analysis runs on
            a documented <strong className="text-foreground">heuristic engine</strong> so the
            workflow remains available in lower environments.
          </p>
          <p>
            <strong className="text-foreground">Outreach:</strong> Generated content is draft only.
            Distribution must follow your organization&apos;s messaging and approval standards.
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-dashed border-primary/25 bg-primary/[0.03] shadow-sm">
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Bot className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <CardTitle className="font-display text-base">Where to go next</CardTitle>
            <CardDescription className="text-sm">
              Use the rail: <strong className="text-foreground">Dashboard</strong> for pin and
              decom metrics; <strong className="text-foreground">Analysis</strong> for the guided
              five-step workflow.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <Button
          asChild
          size="lg"
          className="h-12 rounded-xl px-8 text-base shadow-glow sm:min-w-[200px]"
        >
          <Link href="/overview" className="gap-2">
            <BarChart3 className="h-5 w-5" aria-hidden />
            Open operations dashboard
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="h-12 rounded-xl border-border/80">
          <Link href="/dashboard" className="gap-2">
            <RadioTower className="h-4 w-4" aria-hidden />
            Open analysis workspace
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
