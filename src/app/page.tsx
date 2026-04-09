import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  ChevronDown,
  GitBranch,
  Layers,
  Mail,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Timer,
  UserRound,
  Zap,
} from "lucide-react";
import { BrandLogos } from "@/components/brand/brand-logos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { APP_NAME, APP_TAGLINE, APP_VALUE_PITCH } from "@/config/app-brand";
import { PremiumDotGrid, PremiumMesh } from "@/components/visual/premium-mesh";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1451187580459-43490279c940?auto=format&fit=crop&w=2000&q=80";

const HERO_STATS = [
  {
    icon: Timer,
    title: "Analysis in minutes",
    body: "Load inventory + signal extracts, set windows, and run correlation with streamed AI reasoning—same day, not a multi-week offline study.",
  },
  {
    icon: Activity,
    title: "Performance you can defend",
    body: "Tie every mmWave cut to CNS/NRB trends so you can show decommission is not silently dragging perceived network quality or care metrics.",
  },
  {
    icon: Bell,
    title: "Outreach, largely automated",
    body: "Turn validated sites into grouped NA drafts in one click; your engineers release through Outlook so the right markets move while you stay compliant.",
  },
] as const;

const WHY_TRY = [
  {
    icon: Zap,
    title: "Momentum, not slide decks",
    text: "The dashboard and guided workflow are built to get you from raw feeds to a defendable story before the next ops review.",
  },
  {
    icon: ShieldCheck,
    title: "CX and RF on one timeline",
    text: "Customer pins and tickets share Fuze lineage with shutdown dates—so experience signals and network change stop living in separate threads.",
  },
  {
    icon: Sparkles,
    title: "Judgment when you want it",
    text: "Optional generative review narrates tradeoffs; you keep approval gates for escalation and external mail.",
  },
] as const;

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
    text: "You **confirm** which sites move forward; **SignalSpan** **composes draft outreach** for NA engineers. **Outbound mail is not sent** from this application — operators copy drafts into standard messaging channels.",
  },
] as const;

const FLOW_STEPS = [
  {
    step: "01",
    title: "Ground truth data",
    body: "Load decom schedules and CNS/NRB extracts (or use the live-style inventory and warehouse pulls in the app). Fuze site IDs stay aligned so every pin ties to a shutdown window.",
    ai: "Prepares structured context for the model.",
    human: "You curate uploads, append rows, or reload the default feeds.",
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
    body: "For confirmed sites, the model drafts email copy grouped by NA engineer. Operators copy into the corporate mail path; SignalSpan does not originate outbound SMTP.",
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
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl space-y-14 pb-16">
      {/* Hero */}
      <section className="animate-fade-up relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a0d12] shadow-[0_24px_80px_-20px_rgba(0,0,0,0.45)]">
        <div className="absolute inset-0">
          <Image
            src={HERO_IMAGE}
            alt=""
            fill
            priority
            className="object-cover object-center opacity-40"
            sizes="(max-width: 1200px) 100vw, 1200px"
          />
          <div
            className="absolute inset-0 bg-gradient-to-br from-[#06080c] via-[#0c0f14]/92 to-[hsl(220_45%_12%/0.88)]"
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_20%,hsl(0_86%_45%/0.25),transparent)]"
            aria-hidden
          />
          <PremiumMesh className="opacity-[0.45] mix-blend-screen" />
        </div>

        <div className="relative z-[1] px-6 py-12 sm:px-10 sm:py-16 lg:px-14">
          <div className="mb-8 flex flex-wrap items-center gap-4">
            <div className="rounded-xl bg-white/95 p-4 shadow-xl ring-1 ring-black/10">
              <BrandLogos variant="welcome" withLinks />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[hsl(0_86%_72%)] backdrop-blur-sm">
            Verizon Wireless · Network Engineering
          </div>

          <h1 className="font-display mt-5 max-w-4xl text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-[3.5rem]">
            <span className="bg-gradient-to-r from-white via-white to-[hsl(0_86%_75%)] bg-clip-text text-transparent">
              {APP_NAME}
            </span>
          </h1>
          <p className="font-display mt-3 max-w-2xl text-lg font-medium text-[hsl(0_86%_78%)] sm:text-xl">
            {APP_TAGLINE}
          </p>
          <p className="mt-5 max-w-3xl text-base leading-relaxed text-zinc-300 sm:text-lg">
            {APP_VALUE_PITCH}
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button
              asChild
              size="lg"
              className="h-14 rounded-2xl bg-primary px-10 text-base font-bold shadow-[0_0_40px_-8px_hsl(0_86%_50%/0.65)] transition-all hover:scale-[1.02] hover:bg-primary/95"
            >
              <Link href="/dashboard" className="gap-2">
                <Zap className="h-5 w-5" aria-hidden />
                Run analysis in SignalSpan
                <ArrowRight className="h-5 w-5" strokeWidth={2} />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-14 rounded-2xl border-2 border-white/25 bg-white/10 px-8 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/20"
            >
              <Link href="/overview" className="gap-2">
                <BarChart3 className="h-5 w-5" aria-hidden />
                Explore live metrics
              </Link>
            </Button>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {HERO_STATS.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="group rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.09] to-white/[0.02] p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:border-[hsl(0_86%_50%/0.35)] hover:from-white/[0.12]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(0_86%_50%/0.2)] text-[hsl(0_86%_70%)] ring-1 ring-[hsl(0_86%_50%/0.3)]">
                  <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                </div>
                <p className="font-display mt-4 text-sm font-bold text-white">{title}</p>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why open it */}
      <section className="space-y-6">
        <div className="text-center sm:text-left">
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.22em] text-primary">
            Why teams start here
          </h2>
          <p className="mt-2 max-w-2xl text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Decommission with confidence—not guesswork about customer experience.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {WHY_TRY.map(({ icon: Icon, title, text }) => (
            <Card
              key={title}
              className="overflow-hidden rounded-2xl border-border/60 bg-gradient-to-b from-card to-muted/20 shadow-premium transition-shadow hover:shadow-premium-lg"
            >
              <CardHeader className="pb-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                </div>
                <CardTitle className="font-display pt-3 text-lg">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Capabilities */}
      <section className="space-y-4">
        <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Capabilities
        </h2>
        <p className="max-w-2xl text-muted-foreground">
          Everything below runs inside <strong className="text-foreground">{APP_NAME}</strong> today—no
          separate “pilot” stack.
        </p>
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
              When your deployment has generative-model credentials configured, {APP_NAME} uses the
              managed LLM path; otherwise it uses the standard correlation engine so sessions stay
              productive without the cloud model.
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
            in this deployment depends on your environment configuration. Ask your platform
            administrator to enable the managed generative path when your tenant should use cloud
            model reasoning. When that path is off, {APP_NAME} runs the{" "}
            <strong className="text-foreground">standard correlation engine</strong> so analysis
            and dashboards remain available.
          </p>
          <p>
            <strong className="text-foreground">Outreach:</strong> Generated content is internal draft
            only. Distribution follows Verizon NE messaging and approval standards (typically Outlook).
          </p>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/[0.06] via-card to-card shadow-premium-lg">
        <CardHeader className="flex flex-col gap-4 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
              <Bot className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <CardTitle className="font-display text-xl">Ready when you are</CardTitle>
              <CardDescription className="mt-1 text-base text-muted-foreground">
                Open <strong className="text-foreground">Analysis</strong> for the five-step run, or{" "}
                <strong className="text-foreground">Dashboard</strong> for pin and decom telemetry—both
                ship with the same live-style feeds so you can evaluate immediately.
              </CardDescription>
            </div>
          </div>
          <Button
            asChild
            size="lg"
            className="h-12 shrink-0 rounded-xl px-8 font-bold shadow-glow sm:self-center"
          >
            <Link href="/dashboard" className="gap-2">
              Start now
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </CardHeader>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <Button
          asChild
          size="lg"
          className="h-12 rounded-xl px-8 text-base shadow-glow sm:min-w-[220px]"
        >
          <Link href="/overview" className="gap-2">
            <BarChart3 className="h-5 w-5" aria-hidden />
            Operations dashboard
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="h-12 rounded-xl border-border/80">
          <Link href="/dashboard" className="gap-2">
            <RadioTower className="h-4 w-4" aria-hidden />
            Guided analysis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
