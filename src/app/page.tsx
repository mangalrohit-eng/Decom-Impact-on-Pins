import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  GitBranch,
  Layers,
  Mail,
  RadioTower,
  Sparkles,
} from "lucide-react";
import { BrandLogos } from "@/components/brand/brand-logos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PremiumDotGrid } from "@/components/visual/premium-mesh";

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

const STEPS_SHORT = [
  "Load or maintain the **decommission site** list (file import, defaults, or manual rows).",
  "Review **CNS/NRB** events joined on Fuze ID.",
  "Run **analysis** with calendar windows, timezone, and optional analyst notes.",
  "**Validate** flagged sites for reinstatement or exceptions consideration.",
  "**Generate drafts** for NA distribution via your approved mail path.",
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

export default function WelcomePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 pb-12">
      <div className="animate-fade-up relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-primary/[0.04] p-8 shadow-premium-lg sm:p-10">
        <PremiumDotGrid className="opacity-40" />
        <div className="relative space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Network Engineering
          </div>
          <div className="w-fit rounded-xl bg-white p-4 shadow-premium ring-1 ring-border/60">
            <BrandLogos variant="welcome" withLinks />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Verizon Wireless · Network Engineering
            </p>
            <h1 className="font-display mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Decom impact on CNS pins
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              <RichLine text="Production-style workspace for assessing whether **mmWave site decommissions** align with changes in **customer network signals** (CNS and NRB). Combines operational extracts with **LLM-assisted review** and **draft NA communications**, with analysts retaining full approval authority." />
            </p>
          </div>
        </div>
      </div>

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

      <Card className="rounded-2xl border-border/70 bg-muted/30 shadow-premium">
        <CardHeader>
          <div className="flex items-center gap-2">
            <RadioTower className="h-5 w-5 text-primary" aria-hidden />
            <CardTitle className="font-display text-lg">Standard workflow</CardTitle>
          </div>
          <div className="text-base leading-relaxed text-muted-foreground">
            In <strong className="text-foreground">Decom &amp; CNS analysis</strong> (main
            workspace):
          </div>
        </CardHeader>
        <CardContent>
          <ol className="list-none space-y-3 text-sm leading-relaxed text-muted-foreground">
            {STEPS_SHORT.map((line, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <span className="pt-0.5">
                  <RichLine text={line} />
                </span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          asChild
          size="lg"
          className="h-12 rounded-xl px-8 text-base shadow-glow sm:min-w-[220px]"
        >
          <Link href="/dashboard" className="gap-2">
            Open analysis workspace
            <ArrowRight className="h-5 w-5" strokeWidth={2} />
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="h-12 rounded-xl border-border/80">
          <Link href="/introduction" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Product overview
          </Link>
        </Button>
      </div>
    </div>
  );
}
