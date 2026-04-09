"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bot,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileSpreadsheet,
  Loader2,
  Mail,
  Plus,
  RadioTower,
  RotateCcw,
  Send,
  Sparkles,
  UserRound,
} from "lucide-react";
import {
  CNS_FEED_SNAPSHOT,
  DECOM_FEED_SNAPSHOT,
  getDefaultCnsEvents,
  getDefaultShutdowns,
} from "@/data/workflow-defaults";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type {
  AnalyzeResponse,
  CnsEventRow,
  ShutdownRow,
  SiteAnalysisRow,
} from "@/types/decom";
import { PremiumDotGrid } from "@/components/visual/premium-mesh";

type StepDef = {
  n: number;
  short: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  aiDoes: string;
  youDo: string;
};

const STEPS: StepDef[] = [
  {
    n: 1,
    short: "Decom",
    title: "Decommissioned sites",
    desc: "mmWave shutdown extract (same columns as the standard decom workbook).",
    icon: Building2,
    aiDoes: "Uses shutdown dates as anchors for pre/post windows.",
    youDo: "Confirm the pull or replace the table with your own .xlsx.",
  },
  {
    n: 2,
    short: "CNS",
    title: "CNS / NRB signals",
    desc: "CNS / NRB pin extract (same columns as the standard signal workbook).",
    icon: RadioTower,
    aiDoes: "Will correlate these signals with each site’s timeline.",
    youDo: "Confirm the pull or load your own extract.",
  },
  {
    n: 3,
    short: "Analyze",
    title: "AI analysis",
    desc: "The model streams reasoning, then flags sites with elevated post-decom customer signals.",
    icon: Sparkles,
    aiDoes: "Reasoning + structured flagging + concern levels.",
    youDo: "Set windows, timezone, and optional analyst notes.",
  },
  {
    n: 4,
    short: "Validate",
    title: "Validate reinstatement",
    desc: "Confirm which AI-flagged sites belong on the exceptions path.",
    icon: ClipboardCheck,
    aiDoes: "Surfaced candidates; does not commit workflow.",
    youDo: "Check/uncheck sites before outreach.",
  },
  {
    n: 5,
    short: "Resolve",
    title: "Resolve outreach",
    desc: "Reach NA engineers: review drafts, then simulate or send from your client.",
    icon: Send,
    aiDoes: "Drafts subject/body/HTML for human send.",
    youDo: "Review each recipient, then dispatch from mail per NE policy.",
  },
];

type OutreachEmail = {
  to: string;
  subject: string;
  textBody: string;
  htmlBody: string;
};

type ResolveRecipientRow = OutreachEmail & {
  displayName: string | null;
  siteCount: number;
};

function enrichResolveRecipients(
  emails: OutreachEmail[],
  chosen: SiteAnalysisRow[]
): ResolveRecipientRow[] {
  return emails.map((em) => {
    const isPlaceholder =
      em.to.includes("not in decom") || em.to.includes("manually");
    const sites = chosen.filter((s) => {
      const eml = (s.naEngineerEmail ?? "").trim().toLowerCase();
      if (isPlaceholder) return !eml;
      return eml === em.to.trim().toLowerCase();
    });
    const displayName =
      sites.find((s) => s.naEngineerName?.trim())?.naEngineerName ?? null;
    return {
      ...em,
      displayName,
      siteCount: sites.length,
    };
  });
}

function formatFeedPulled(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/New_York",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function hydrateShutdowns(data: {
  shutdowns: Array<{
    fuzeSiteId: string;
    shutdownDate: string;
    naEngineerEmail?: string;
    naEngineerName?: string;
  }>;
}): ShutdownRow[] {
  return data.shutdowns.map((s) => ({
    fuzeSiteId: s.fuzeSiteId,
    shutdownDate: new Date(s.shutdownDate),
    naEngineerEmail: s.naEngineerEmail,
    naEngineerName: s.naEngineerName,
  }));
}

function hydrateEvents(data: {
  events: Array<{
    fuzeSiteId: string;
    eventDate: string;
    kind: "CNS" | "NRB";
    externalId?: string;
  }>;
}): CnsEventRow[] {
  return data.events.map((e) => ({
    fuzeSiteId: e.fuzeSiteId,
    eventDate: new Date(e.eventDate),
    kind: e.kind,
    externalId: e.externalId,
  }));
}

function serializeShutdowns(list: ShutdownRow[]) {
  return list.map((s) => ({
    fuzeSiteId: s.fuzeSiteId,
    shutdownDate: s.shutdownDate.toISOString(),
    naEngineerEmail: s.naEngineerEmail,
    naEngineerName: s.naEngineerName,
  }));
}

function serializeEvents(list: CnsEventRow[]) {
  return list.map((e) => ({
    fuzeSiteId: e.fuzeSiteId,
    eventDate: e.eventDate.toISOString(),
    kind: e.kind,
    externalId: e.externalId,
  }));
}

type FlaggedTipPayload = {
  fullId: string;
  pre: number;
  post: number;
  name: string;
};

function FlaggedChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload: FlaggedTipPayload }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs">
      <p className="font-mono font-semibold">{p.fullId}</p>
      <p className="text-muted-foreground">
        Pre: {p.pre} · Post: {p.post}
      </p>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

export function DecomDashboard() {
  const [step, setStep] = useState(1);

  const [shutdowns, setShutdowns] = useState<ShutdownRow[]>(() => getDefaultShutdowns());
  const [events, setEvents] = useState<CnsEventRow[]>(() => getDefaultCnsEvents());
  const [decomFileName, setDecomFileName] = useState<string | null>(null);
  const [cnsFileName, setCnsFileName] = useState<string | null>(null);
  const [uploadingDecom, setUploadingDecom] = useState(false);
  const [uploadingCns, setUploadingCns] = useState(false);

  const [preDays, setPreDays] = useState("30");
  const [postDays, setPostDays] = useState("30");
  const [timeZone, setTimeZone] = useState("America/New_York");
  const [analystNotes, setAnalystNotes] = useState("");

  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [reasoningLog, setReasoningLog] = useState("");

  const [selectedReinstate, setSelectedReinstate] = useState<Set<string>>(new Set());
  const [resolveRecipients, setResolveRecipients] = useState<ResolveRecipientRow[] | null>(
    null
  );
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [emailsDemo, setEmailsDemo] = useState(false);
  const [emailInfo, setEmailInfo] = useState<string | null>(null);
  const [sentByTo, setSentByTo] = useState<Record<string, boolean>>({});
  const [sendSuccessBanner, setSendSuccessBanner] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [decomDialogOpen, setDecomDialogOpen] = useState(false);
  const [newDecomId, setNewDecomId] = useState("");
  const [newDecomDate, setNewDecomDate] = useState("");
  const [newDecomEmail, setNewDecomEmail] = useState("");
  const [newDecomName, setNewDecomName] = useState("");

  const [cnsDialogOpen, setCnsDialogOpen] = useState(false);
  const [newCnsFuze, setNewCnsFuze] = useState("");
  const [newCnsDate, setNewCnsDate] = useState("");
  const [newCnsKind, setNewCnsKind] = useState<"CNS" | "NRB">("CNS");
  const [newCnsExtId, setNewCnsExtId] = useState("");

  const invalidateAnalysis = useCallback(() => {
    setAnalysis(null);
    setResolveRecipients(null);
    setReasoningLog("");
    setEmailsDemo(false);
    setSentByTo({});
    setSendSuccessBanner(null);
  }, []);

  useEffect(() => {
    if (!sendSuccessBanner) return;
    const t = window.setTimeout(() => setSendSuccessBanner(null), 9000);
    return () => window.clearTimeout(t);
  }, [sendSuccessBanner]);

  const onWindowChange = useCallback(() => {
    invalidateAnalysis();
  }, [invalidateAnalysis]);

  useEffect(() => {
    if (step > 3 && !analysis) {
      setStep(3);
    }
  }, [step, analysis]);

  const uploadDecom = async (file: File) => {
    setUploadingDecom(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/decom/parse-shutdowns", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Decom upload failed.");
        return;
      }
      setShutdowns(hydrateShutdowns(data));
      setDecomFileName(file.name);
      invalidateAnalysis();
    } catch {
      setError("Network error uploading decom file.");
    } finally {
      setUploadingDecom(false);
    }
  };

  const uploadCns = async (file: File) => {
    setUploadingCns(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/decom/parse-cns", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "CNS upload failed.");
        return;
      }
      setEvents(hydrateEvents(data));
      setCnsFileName(file.name);
      invalidateAnalysis();
    } catch {
      setError("Network error uploading CNS file.");
    } finally {
      setUploadingCns(false);
    }
  };

  const runAnalysis = async () => {
    setAnalysisRunning(true);
    setError(null);
    setResolveRecipients(null);
    setReasoningLog("");
    setEmailsDemo(false);
    setSentByTo({});
    setSendSuccessBanner(null);
    try {
      const pre = Math.max(1, Math.min(365, Number(preDays) || 30));
      const post = Math.max(1, Math.min(365, Number(postDays) || 30));
      const res = await fetch("/api/decom/llm-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shutdowns: serializeShutdowns(shutdowns),
          events: serializeEvents(events),
          preDays: pre,
          postDays: post,
          timeZone,
          analystNotes,
        }),
      });

      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Analysis failed (${res.status})`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream.");

      const decoder = new TextDecoder();
      let buffer = "";
      let finalAnalysis: AnalyzeResponse | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const block of chunks) {
          const line = block.trim();
          if (!line.startsWith("data: ")) continue;
          let data: {
            type?: string;
            text?: string;
            analysis?: AnalyzeResponse;
            message?: string;
          };
          try {
            data = JSON.parse(line.slice(6)) as typeof data;
          } catch {
            continue;
          }
          if (data.type === "reasoning" && typeof data.text === "string") {
            setReasoningLog((prev) => prev + data.text);
          }
          if (data.type === "error") {
            throw new Error(data.message ?? "Stream error");
          }
          if (data.type === "done" && data.analysis) {
            finalAnalysis = data.analysis;
          }
        }
      }

      if (finalAnalysis) {
        setAnalysis(finalAnalysis);
        setReasoningLog((prev) => finalAnalysis!.llmReasoning ?? prev);
        const flaggedIds = finalAnalysis.sites
          .filter((s) => s.flagged)
          .map((s) => s.fuzeSiteId);
        setSelectedReinstate(new Set(flaggedIds));
      } else {
        throw new Error("Analysis stream ended without a result.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setAnalysisRunning(false);
    }
  };

  const chartData = useMemo(() => {
    if (!analysis) return [];
    return analysis.sites
      .filter((s) => s.flagged)
      .map((s) => ({
        name: s.fuzeSiteId.length > 14 ? `${s.fuzeSiteId.slice(0, 12)}…` : s.fuzeSiteId,
        fullId: s.fuzeSiteId,
        pre: s.preTotal,
        post: s.postTotal,
      }));
  }, [analysis]);

  const flaggedSites = useMemo(
    () => analysis?.sites.filter((s) => s.flagged) ?? [],
    [analysis]
  );

  const toggleReinstate = (fuze: string) => {
    setSelectedReinstate((prev) => {
      const n = new Set(prev);
      if (n.has(fuze)) n.delete(fuze);
      else n.add(fuze);
      return n;
    });
  };

  const selectAllFlagged = () => {
    setSelectedReinstate(new Set(flaggedSites.map((s) => s.fuzeSiteId)));
  };

  const clearReinstate = () => setSelectedReinstate(new Set());

  const generateResolveEmails = async () => {
    if (!analysis) return;
    const chosen = analysis.sites.filter(
      (s) => s.flagged && selectedReinstate.has(s.fuzeSiteId)
    );
    if (chosen.length === 0) {
      setError("Select at least one flagged site for reinstatement outreach.");
      setResolveRecipients(null);
      return;
    }
    setError(null);
    setEmailsLoading(true);
    setEmailsDemo(false);
    setEmailInfo(null);
    try {
      const res = await fetch("/api/decom/llm-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sites: chosen }),
      });
      const data = (await res.json()) as {
        emails?: OutreachEmail[];
        demoMode?: boolean;
        error?: string;
        warning?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Email request failed.");
      }
      if (!data.emails?.length) {
        throw new Error("No emails returned.");
      }
      setSentByTo({});
      setSendSuccessBanner(null);
      setResolveRecipients(enrichResolveRecipients(data.emails, chosen));
      setEmailsDemo(Boolean(data.demoMode));
      setEmailInfo(data.warning ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Email generation failed.");
      setResolveRecipients(null);
    } finally {
      setEmailsLoading(false);
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  const simulateEmailSend = (recipientKey: string, displayLabel: string) => {
    setSentByTo((prev) => ({ ...prev, [recipientKey]: true }));
    setSendSuccessBanner(
      `Simulated send succeeded — delivery queued for ${displayLabel}. No message was transmitted from this application.`
    );
  };

  const goNext = () => setStep((s) => Math.min(5, s + 1));
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const canNext =
    step === 1
      ? shutdowns.length > 0
      : step === 2
        ? events.length > 0
        : step === 3
          ? analysis != null
          : step === 4
            ? flaggedSites.length >= 0
            : true;

  const addDecomRow = () => {
    const id = newDecomId.trim();
    if (!id || !newDecomDate) return;
    setShutdowns((prev) => [
      ...prev,
      {
        fuzeSiteId: id,
        shutdownDate: new Date(`${newDecomDate}T12:00:00.000Z`),
        naEngineerEmail: newDecomEmail.trim() || undefined,
        naEngineerName: newDecomName.trim() || undefined,
      },
    ]);
    setDecomDialogOpen(false);
    setNewDecomId("");
    setNewDecomDate("");
    setNewDecomEmail("");
    setNewDecomName("");
    invalidateAnalysis();
  };

  const addCnsRow = () => {
    const fuze = newCnsFuze.trim();
    if (!fuze || !newCnsDate) return;
    setEvents((prev) => [
      ...prev,
      {
        fuzeSiteId: fuze,
        eventDate: new Date(`${newCnsDate}T12:00:00.000Z`),
        kind: newCnsKind,
        externalId: newCnsExtId.trim() || undefined,
      },
    ]);
    setCnsDialogOpen(false);
    setNewCnsFuze("");
    setNewCnsDate("");
    setNewCnsKind("CNS");
    setNewCnsExtId("");
    invalidateAnalysis();
  };

  const displayedReasoning =
    analysis?.llmReasoning && !analysisRunning ? analysis.llmReasoning : reasoningLog;

  const workflowProgress = Math.round((step / STEPS.length) * 100);
  const activeStep = STEPS[step - 1];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div className="decom-elevate relative overflow-hidden rounded-2xl border border-border/70 bg-card p-6 shadow-premium-lg sm:p-8">
        <PremiumDotGrid className="opacity-40" />
        <div className="relative space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="secondary"
                  className="rounded-full border border-primary/15 bg-primary/10 font-medium text-primary"
                >
                  <Sparkles className="mr-1 h-3.5 w-3.5" aria-hidden strokeWidth={2} />
                  LLM-assisted operations
                </Badge>
                <Badge variant="outline" className="rounded-full font-mono text-xs font-normal">
                  Step {step} / {STEPS.length}
                </Badge>
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
                mmWave decom &amp;{" "}
                <span className="text-primary">customer signal</span> impact
              </h1>
              <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                LLM-supported interpretation, prioritization, and outreach composition — with analysts
                validating every escalation.{" "}
                <Link
                  href="/"
                  className="font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Home &amp; guide
                </Link>
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Workflow progress</span>
              <span className="tabular-nums text-foreground">{workflowProgress}%</span>
            </div>
            <Progress value={workflowProgress} className="h-2 bg-muted/80" />
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-5">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const isActive = s.n === step;
          const isDone = s.n < step;
          const unlocked =
            s.n <= step || (s.n === 4 && analysis != null) || (s.n === 5 && analysis != null);
          const locked = !unlocked && s.n > step;
          return (
            <button
              key={s.n}
              type="button"
              disabled={locked}
              onClick={() => {
                if (unlocked) setStep(s.n);
              }}
              className={cn(
                "flex flex-col gap-2 rounded-xl border p-3.5 text-left shadow-sm transition-all duration-200",
                isActive &&
                  "border-primary/40 bg-gradient-to-br from-primary/[0.07] to-card shadow-premium ring-1 ring-primary/15",
                isDone && !isActive && "border-border/80 bg-muted/40",
                !isActive && !isDone && !locked && "border-border/60 bg-card hover:border-primary/20 hover:shadow-premium",
                locked && "cursor-not-allowed border-dashed border-border/40 bg-muted/10 opacity-45"
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-bold",
                    isActive
                      ? "border-primary bg-gradient-to-br from-primary to-[hsl(0_72%_42%)] text-primary-foreground shadow-sm"
                      : "border-border bg-background text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {s.short}
                </span>
              </div>
              <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                <span className="font-medium text-foreground/90">AI:</span> {s.aiDoes}
              </p>
            </button>
          );
        })}
      </div>

      <nav aria-label="Workflow steps" className="flex flex-col gap-3">
        <ol className="flex flex-wrap items-center gap-1 text-xs sm:text-sm">
          {STEPS.map((s, i) => {
            const StepIcon = s.icon;
            return (
              <li key={s.n} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    if (s.n <= step || (s.n === 4 && analysis) || (s.n === 5 && analysis))
                      setStep(s.n);
                  }}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                    step === s.n
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : s.n < step || (s.n === 4 && analysis) || (s.n === 5 && analysis)
                        ? "border-border/80 text-muted-foreground hover:bg-muted/80"
                        : "border-transparent text-muted-foreground/45"
                  )}
                >
                  <StepIcon className="h-3.5 w-3.5 opacity-90" aria-hidden />
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background/20 text-[10px] font-bold sm:text-xs">
                    {s.n}
                  </span>
                  <span className="hidden sm:inline">{s.short}</span>
                </button>
                {i < STEPS.length - 1 ? (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                ) : null}
              </li>
            );
          })}
        </ol>
        {activeStep ? (
          <div className="decom-elevate rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-muted/20 p-5 sm:p-6">
            <h2 className="font-display text-xl font-bold tracking-tight">{activeStep.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{activeStep.desc}</p>
            <div className="mt-3 flex flex-col gap-2 border-t border-border/60 pt-3 sm:flex-row sm:gap-6">
              <p className="flex flex-1 items-start gap-2 text-xs text-muted-foreground">
                <Bot className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span>
                  <span className="font-semibold text-foreground">Model</span> —{" "}
                  {activeStep.aiDoes}
                </span>
              </p>
              <p className="flex flex-1 items-start gap-2 text-xs text-muted-foreground">
                <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span>
                  <span className="font-semibold text-foreground">You</span> — {activeStep.youDo}
                </span>
              </p>
            </div>
          </div>
        ) : null}
      </nav>

      {error && (
        <div
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span className="whitespace-pre-wrap break-words">{error}</span>
        </div>
      )}

      {step === 1 && (
        <Card className="overflow-hidden rounded-2xl border-border/70 shadow-premium-lg">
          <CardHeader className="border-b border-border/60 bg-gradient-to-r from-muted/40 to-transparent">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="font-display flex items-center gap-2 text-base font-semibold">
                    <FileSpreadsheet className="h-4 w-4 text-primary" aria-hidden />
                    Decommissioned sites
                  </CardTitle>
                  <Badge variant="secondary" className="font-normal">
                    <span
                      className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-500"
                      aria-hidden
                    />
                    {decomFileName ? "Uploaded workbook" : "Inventory sync"}
                  </Badge>
                  <Badge variant="outline" className="font-mono text-xs font-normal">
                    {shutdowns.length} sites
                  </Badge>
                </div>
                <CardDescription className="space-y-1.5 text-sm leading-relaxed">
                  {decomFileName ? (
                    <span className="font-medium text-foreground">
                      Working set replaced by{" "}
                      <span className="font-mono text-xs">{decomFileName}</span>. Column layout
                      matches the standard decom workbook (Fuze Site ID, Shutdown Date, NA Engineer
                      Email, NA Engineer Name).
                    </span>
                  ) : (
                    <>
                      <span className="block text-foreground">
                        {DECOM_FEED_SNAPSHOT.sourceLabel} — job{" "}
                        <span className="font-mono text-xs">{DECOM_FEED_SNAPSHOT.syncJobId}</span>
                        , last pulled{" "}
                        <span className="whitespace-nowrap font-medium">
                          {formatFeedPulled(DECOM_FEED_SNAPSHOT.pulledAtIso)}
                        </span>{" "}
                        ET.
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Rows below use the same fields as the decom .xlsx template. Upload a
                        workbook to replace this sync; add row appends to the current set.
                      </span>
                    </>
                  )}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Dialog open={decomDialogOpen} onOpenChange={setDecomDialogOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="secondary" size="sm">
                      <Plus className="h-4 w-4" aria-hidden />
                      Add site
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add shutdown row</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3 py-2">
                      <div className="space-y-2">
                        <Label htmlFor="nd-id">Fuze site ID</Label>
                        <Input
                          id="nd-id"
                          value={newDecomId}
                          onChange={(e) => setNewDecomId(e.target.value)}
                          placeholder="FZ-204912"
                          className="font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nd-date">Shutdown date</Label>
                        <Input
                          id="nd-date"
                          type="date"
                          value={newDecomDate}
                          onChange={(e) => setNewDecomDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nd-email">NA engineer email (optional)</Label>
                        <Input
                          id="nd-email"
                          type="email"
                          value={newDecomEmail}
                          onChange={(e) => setNewDecomEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nd-name">NA engineer name (optional)</Label>
                        <Input
                          id="nd-name"
                          value={newDecomName}
                          onChange={(e) => setNewDecomName(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setDecomDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="button" onClick={addDecomRow} disabled={!newDecomId.trim() || !newDecomDate}>
                        Add to feed
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  className="max-w-[200px] cursor-pointer text-xs"
                  disabled={uploadingDecom}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadDecom(f);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShutdowns(getDefaultShutdowns());
                    setDecomFileName(null);
                    invalidateAnalysis();
                  }}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden />
                  Restore sync pull
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {uploadingDecom ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Parsing workbook…
              </p>
            ) : null}
            <ScrollArea className="h-[min(420px,55vh)] w-full rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fuze Site ID</TableHead>
                    <TableHead>Shutdown Date</TableHead>
                    <TableHead>NA Engineer Email</TableHead>
                    <TableHead>NA Engineer Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shutdowns.map((r) => (
                    <TableRow key={r.fuzeSiteId}>
                      <TableCell className="font-mono text-xs">{r.fuzeSiteId}</TableCell>
                      <TableCell className="text-xs">
                        {r.shutdownDate.toISOString().slice(0, 10)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate font-mono text-xs">
                        {r.naEngineerEmail ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate text-xs">
                        {r.naEngineerName ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="overflow-hidden rounded-2xl border-border/70 shadow-premium-lg">
          <CardHeader className="border-b border-border/60 bg-gradient-to-r from-muted/40 to-transparent">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="font-display flex items-center gap-2 text-base font-semibold">
                    <FileSpreadsheet className="h-4 w-4 text-primary" aria-hidden />
                    CNS pins &amp; NRB tickets
                  </CardTitle>
                  <Badge variant="secondary" className="font-normal">
                    <span
                      className="mr-1.5 inline-block h-2 w-2 rounded-full bg-sky-500"
                      aria-hidden
                    />
                    {cnsFileName ? "Uploaded workbook" : "Warehouse sync"}
                  </Badge>
                  <Badge variant="outline" className="font-mono text-xs font-normal">
                    {events.length} rows
                  </Badge>
                </div>
                <CardDescription className="space-y-1.5 text-sm leading-relaxed">
                  {cnsFileName ? (
                    <span className="font-medium text-foreground">
                      Working set replaced by{" "}
                      <span className="font-mono text-xs">{cnsFileName}</span>. Column layout
                      matches the standard CNS workbook (Fuze Site ID, Pin Date, Type, Pin ID).
                    </span>
                  ) : (
                    <>
                      <span className="block text-foreground">
                        {CNS_FEED_SNAPSHOT.sourceLabel} — job{" "}
                        <span className="font-mono text-xs">{CNS_FEED_SNAPSHOT.syncJobId}</span>
                        , last pulled{" "}
                        <span className="whitespace-nowrap font-medium">
                          {formatFeedPulled(CNS_FEED_SNAPSHOT.pulledAtIso)}
                        </span>{" "}
                        ET.
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Rows mirror the CNS / NRB .xlsx extract. Upload your file to replace this
                        pull; add row appends to the current set.
                      </span>
                    </>
                  )}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Dialog open={cnsDialogOpen} onOpenChange={setCnsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="secondary" size="sm">
                      <Plus className="h-4 w-4" aria-hidden />
                      Add signal
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add CNS / NRB row</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3 py-2">
                      <div className="space-y-2">
                        <Label htmlFor="nc-fuze">Fuze site ID</Label>
                        <Input
                          id="nc-fuze"
                          value={newCnsFuze}
                          onChange={(e) => setNewCnsFuze(e.target.value)}
                          placeholder="FZ-204881"
                          className="font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nc-date">Pin date</Label>
                        <Input
                          id="nc-date"
                          type="date"
                          value={newCnsDate}
                          onChange={(e) => setNewCnsDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select
                          value={newCnsKind}
                          onValueChange={(v) => setNewCnsKind(v as "CNS" | "NRB")}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CNS">CNS</SelectItem>
                            <SelectItem value="NRB">NRB</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nc-ext">Pin ID (optional)</Label>
                        <Input
                          id="nc-ext"
                          value={newCnsExtId}
                          onChange={(e) => setNewCnsExtId(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setCnsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="button" onClick={addCnsRow} disabled={!newCnsFuze.trim() || !newCnsDate}>
                        Add to feed
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  className="max-w-[200px] cursor-pointer text-xs"
                  disabled={uploadingCns}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadCns(f);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEvents(getDefaultCnsEvents());
                    setCnsFileName(null);
                    invalidateAnalysis();
                  }}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden />
                  Restore sync pull
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {uploadingCns ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Parsing workbook…
              </p>
            ) : null}
            <ScrollArea className="h-[min(420px,55vh)] w-full rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fuze Site ID</TableHead>
                    <TableHead>Pin Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Pin ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((r, idx) => (
                    <TableRow key={`${r.fuzeSiteId}-${idx}-${r.externalId ?? ""}`}>
                      <TableCell className="font-mono text-xs">{r.fuzeSiteId}</TableCell>
                      <TableCell className="text-xs">
                        {r.eventDate.toISOString().slice(0, 10)}
                      </TableCell>
                      <TableCell className="text-xs">{r.kind}</TableCell>
                      <TableCell className="text-xs">{r.externalId ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              Showing all {events.length} row(s) in the working set.
            </p>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <div className="space-y-6">
          {analysis?.demoMode ? (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
              <strong>Heuristic analysis mode.</strong> LLM credentials are not configured (
              <code className="rounded bg-muted px-1">OPENAI_API_KEY</code>). Output below uses the
              on-platform fallback engine; configure the key for full generative review.
            </div>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                Windows &amp; analyst context
              </CardTitle>
              <CardDescription>
                Pre/post windows define how pin counts are bucketed for the model. They are not
                threshold rules — the LLM judges impact.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="preDays">Pre window (days)</Label>
                <Input
                  id="preDays"
                  inputMode="numeric"
                  value={preDays}
                  onChange={(e) => {
                    setPreDays(e.target.value);
                    onWindowChange();
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postDays">Post window (days)</Label>
                <Input
                  id="postDays"
                  inputMode="numeric"
                  value={postDays}
                  onChange={(e) => {
                    setPostDays(e.target.value);
                    onWindowChange();
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tz">Timezone (IANA)</Label>
                <Input
                  id="tz"
                  value={timeZone}
                  onChange={(e) => {
                    setTimeZone(e.target.value);
                    onWindowChange();
                  }}
                />
              </div>
              <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                <Label htmlFor="notes">Optional notes for the model</Label>
                <Textarea
                  id="notes"
                  placeholder="e.g. Prioritize enterprise corridors; flag anything with NRB growth even if CNS is flat."
                  value={analystNotes}
                  onChange={(e) => {
                    setAnalystNotes(e.target.value);
                    onWindowChange();
                  }}
                  rows={3}
                  className="resize-y"
                />
              </div>
            </CardContent>
            <CardContent className="border-t border-border pt-6">
              <Button type="button" onClick={() => void runAnalysis()} disabled={analysisRunning}>
                {analysisRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="h-4 w-4" aria-hidden />
                )}
                Run analysis
              </Button>
              {!analysis ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  The model streams its reasoning, then returns structured site decisions.
                </p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Last run:{" "}
                  {new Date(analysis.appliedConfig.analysisRunIso).toLocaleString()} ·{" "}
                  {analysis.summary.flaggedCount} site(s) flagged by the model
                  {analysis.appliedConfig.llmModel
                    ? ` · ${analysis.appliedConfig.llmModel}`
                    : ""}
                  .
                </p>
              )}
            </CardContent>
          </Card>

          {(analysisRunning || displayedReasoning) && (
            <Card className="rounded-2xl border-primary/25 bg-gradient-to-b from-primary/[0.06] via-muted/30 to-card shadow-premium">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-sm border border-primary/30 bg-primary/10">
                    <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-medium">Model reasoning</CardTitle>
                    <CardDescription>
                      {analysisRunning
                        ? "Live stream — how the model reads the data."
                        : "Final narrative from the last completed run."}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[min(280px,40vh)] w-full rounded-md border border-border/80 bg-background/90 p-4">
                  <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground/90">
                    {displayedReasoning || (analysisRunning ? "…" : "")}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {analysis?.llmOverview ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Headline</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {analysis.llmOverview}
              </CardContent>
            </Card>
          ) : null}

          {analysis && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi label="Decom sites" value={String(analysis.summary.decomSiteCount)} />
                <Kpi
                  label="Sites with pins"
                  value={String(analysis.summary.sitesWithEvents)}
                />
                <Kpi label="AI-flagged" value={String(analysis.summary.flaggedCount)} />
                <Kpi
                  label="Unmatched CNS rows"
                  value={String(analysis.summary.unmatchedEventCount)}
                />
              </div>
              {analysis.warnings.length > 0 && (
                <Card className="border-amber-500/40 bg-amber-500/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Data quality</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-inside list-disc space-y-1 text-sm">
                      {analysis.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {step === 4 && analysis && (
        <div className="space-y-6">
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI-flagged sites — pre vs post</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip content={<FlaggedChartTooltip />} />
                    <Legend />
                    <Bar dataKey="pre" name="Pre" fill="hsl(var(--chart-2))" />
                    <Bar dataKey="post" name="Post" fill="hsl(var(--chart-1))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Reinstatement validation</CardTitle>
                <CardDescription>
                  AI-flagged sites only. Checked sites are included in step 5 outreach drafts.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={selectAllFlagged}>
                  Select all flagged
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={clearReinstate}>
                  Clear all
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {flaggedSites.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  The model did not flag any sites. Add context in optional notes, widen windows, or
                  enrich the feeds — then run AI analysis again.
                </p>
              ) : (
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Include</TableHead>
                        <TableHead>Fuze site ID</TableHead>
                        <TableHead>Shutdown</TableHead>
                        <TableHead className="text-right">Pre</TableHead>
                        <TableHead className="text-right">Post</TableHead>
                        <TableHead>Concern</TableHead>
                        <TableHead>Rationale</TableHead>
                        <TableHead className="w-24">Pins</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {flaggedSites.map((row) => (
                        <TableRow key={row.fuzeSiteId}>
                          <TableCell>
                            <Checkbox
                              checked={selectedReinstate.has(row.fuzeSiteId)}
                              onCheckedChange={() => toggleReinstate(row.fuzeSiteId)}
                              aria-label={`Include ${row.fuzeSiteId}`}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-xs">{row.fuzeSiteId}</TableCell>
                          <TableCell className="text-xs">{row.shutdownDate}</TableCell>
                          <TableCell className="text-right tabular-nums">{row.preTotal}</TableCell>
                          <TableCell className="text-right tabular-nums">{row.postTotal}</TableCell>
                          <TableCell className="text-xs capitalize">
                            {row.concernLevel ?? "—"}
                          </TableCell>
                          <TableCell className="max-w-[220px] text-xs text-muted-foreground">
                            {row.flagReason ?? "—"}
                          </TableCell>
                          <TableCell>
                            {row.events && row.events.length > 0 ? (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                                    {row.events.length} pin(s)
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-h-[85vh] max-w-lg">
                                  <DialogHeader>
                                    <DialogTitle>Pins — {row.fuzeSiteId}</DialogTitle>
                                  </DialogHeader>
                                  <ScrollArea className="max-h-[55vh] pr-3">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Type</TableHead>
                                          <TableHead>When (UTC)</TableHead>
                                          <TableHead>Id</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {row.events.map((ev, j) => (
                                          <TableRow key={j}>
                                            <TableCell className="text-xs">{ev.type}</TableCell>
                                            <TableCell className="font-mono text-xs">
                                              {ev.date}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                              {ev.id ?? "—"}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </ScrollArea>
                                </DialogContent>
                              </Dialog>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {step === 5 && analysis && (
        <Card className="rounded-2xl border-primary/15 decom-elevate shadow-premium-lg">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Send className="h-4 w-4" aria-hidden />
                Resolve — NA outreach
              </CardTitle>
              <Badge variant="secondary" className="text-[10px] font-normal">
                Action step
              </Badge>
            </div>
            <CardDescription>
              Build drafts from your validated site list (one message per NA contact). Review each
              message, then use <strong className="font-medium text-foreground">Send email</strong>{" "}
              to simulate dispatch (production mail still goes through your client per NE policy).
              With <code className="rounded bg-muted px-1 text-xs">OPENAI_API_KEY</code> set, copy
              is model-generated; otherwise the standard template applies.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {sendSuccessBanner ? (
              <div
                className="flex items-start gap-3 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-950 dark:text-emerald-50"
                role="status"
              >
                <CheckCircle2
                  className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400"
                  aria-hidden
                />
                <span>{sendSuccessBanner}</span>
              </div>
            ) : null}
            {emailInfo ? (
              <div
                className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
                role="status"
              >
                {emailInfo}
              </div>
            ) : null}
            {emailsDemo ? (
              <p className="text-xs text-muted-foreground">
                Structured template mode — set <code className="rounded bg-muted px-1">OPENAI_API_KEY</code>{" "}
                for LLM-generated correspondence.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="default"
                disabled={selectedReinstate.size === 0 || emailsLoading}
                onClick={() => void generateResolveEmails()}
              >
                {emailsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Mail className="h-4 w-4" aria-hidden />
                )}
                Generate outreach drafts
              </Button>
              <p className="w-full text-xs text-muted-foreground">
                {selectedReinstate.size} site(s) selected for this run.
              </p>
            </div>
          </CardContent>
          {resolveRecipients && resolveRecipients.length > 0 && (
            <CardContent className="space-y-4 border-t border-border pt-6">
              <p className="text-sm font-medium text-foreground">Recipients</p>
              <ul className="space-y-3" role="list">
                {resolveRecipients.map((em, idx) => {
                  const sent = Boolean(sentByTo[em.to]);
                  const label = em.displayName
                    ? `${em.displayName} · ${em.to}`
                    : em.to;
                  return (
                    <li
                      key={`${em.to}-${idx}`}
                      className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
                          aria-hidden
                        >
                          {(em.displayName ?? em.to).slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <p className="truncate font-medium text-foreground">
                            {em.displayName ?? "NA engineer"}
                          </p>
                          <p className="truncate font-mono text-xs text-muted-foreground">
                            {em.to}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {em.siteCount} site{em.siteCount === 1 ? "" : "s"} in this draft
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button type="button" variant="outline" size="sm">
                              Review email
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-h-[90vh] max-w-2xl gap-0 p-0">
                            <DialogHeader className="border-b border-border px-6 py-4 text-left">
                              <DialogTitle className="text-base">Draft message</DialogTitle>
                              <p className="pt-1 font-mono text-xs text-muted-foreground">{em.to}</p>
                            </DialogHeader>
                            <div className="px-6 py-4">
                              <p className="text-xs font-medium text-muted-foreground">Subject</p>
                              <p className="pb-4 text-sm">{em.subject}</p>
                              <Tabs defaultValue="text" className="w-full">
                                <TabsList className="mb-3 w-full justify-start">
                                  <TabsTrigger value="text">Plain text</TabsTrigger>
                                  <TabsTrigger value="html">HTML</TabsTrigger>
                                </TabsList>
                                <TabsContent value="text" className="mt-0">
                                  <ScrollArea className="h-[min(320px,40vh)] rounded-md border border-border p-3">
                                    <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed">
                                      {em.textBody}
                                    </pre>
                                  </ScrollArea>
                                </TabsContent>
                                <TabsContent value="html" className="mt-0">
                                  <ScrollArea className="h-[min(320px,40vh)] rounded-md border border-border p-3">
                                    <div
                                      className="prose prose-sm max-w-none dark:prose-invert"
                                      dangerouslySetInnerHTML={{ __html: em.htmlBody }}
                                    />
                                  </ScrollArea>
                                </TabsContent>
                              </Tabs>
                            </div>
                            <DialogFooter className="border-t border-border px-6 py-4">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void copyText(em.textBody)}
                              >
                                Copy plain text
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void copyText(em.htmlBody)}
                              >
                                Copy HTML
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        {sent ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled
                            className="pointer-events-none gap-1.5"
                          >
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
                            Sent (simulated)
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            className="gap-1.5"
                            onClick={() => simulateEmailSend(em.to, label)}
                          >
                            <Send className="h-4 w-4" aria-hidden />
                            Send email
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          )}
        </Card>
      )}

      <Card className="rounded-2xl border border-border/70 bg-muted/20 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Operational context</CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            This module pairs decommission and customer-signal extracts with LLM-assisted review
            and draft NA communications. Analyst approval and external mail delivery remain outside
            this application per standard NE controls.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={goBack}
          disabled={step <= 1}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </Button>
        <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground sm:flex-row sm:gap-3">
          {analysis && step >= 3 ? (
            <span className="inline-flex items-center gap-1">
              <Check className="h-3.5 w-3.5 text-primary" aria-hidden />
              Model run ready
            </span>
          ) : null}
          <span className="hidden text-[10px] sm:inline">Analyst validates · LLM assists</span>
        </div>
        <Button
          type="button"
          onClick={goNext}
          disabled={!canNext || step >= 5}
        >
          Next
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
