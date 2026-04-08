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
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  FileSpreadsheet,
  Loader2,
  Mail,
  Play,
  RotateCcw,
  Send,
} from "lucide-react";
import { analyzeDecomImpact } from "@/lib/decom/analyze";
import { buildSimulatedEmails } from "@/lib/decom/simulate-email";
import { getDefaultCnsEvents, getDefaultShutdowns } from "@/data/workflow-defaults";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  AnalyzeResponse,
  CnsEventRow,
  ShutdownRow,
  SiteAnalysisRow,
} from "@/types/decom";

const STEPS = [
  {
    n: 1,
    short: "Decom",
    title: "Decommissioned sites",
    desc: "Review mmWave shutdown rows (sample data loads automatically).",
  },
  {
    n: 2,
    short: "CNS",
    title: "CNS / NRB signals",
    desc: "Customer pins and tickets by Fuze site ID.",
  },
  {
    n: 3,
    short: "Analyze",
    title: "Thresholds & run analysis",
    desc: "Tune rules and compute pre vs post impact.",
  },
  {
    n: 4,
    short: "Validate",
    title: "Validate reinstatement",
    desc: "Confirm which flagged sites belong on the exceptions path.",
  },
  {
    n: 5,
    short: "Resolve",
    title: "Resolve outreach",
    desc: "Preview simulated emails to NA engineers (not sent).",
  },
] as const;

type SimEmail = ReturnType<typeof buildSimulatedEmails>[number];

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
  const [minPostPos, setMinPostPos] = useState("3");
  const [minRatio, setMinRatio] = useState("2");
  const [minPostZero, setMinPostZero] = useState("5");
  const [timeZone, setTimeZone] = useState("America/New_York");

  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [analysisRunning, setAnalysisRunning] = useState(false);

  const [selectedReinstate, setSelectedReinstate] = useState<Set<string>>(new Set());
  const [resolveEmails, setResolveEmails] = useState<SimEmail[] | null>(null);

  const [error, setError] = useState<string | null>(null);

  const invalidateAnalysis = useCallback(() => {
    setAnalysis(null);
    setResolveEmails(null);
  }, []);

  const onThresholdChange = useCallback(() => {
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
      if (Array.isArray(data.warnings) && data.warnings.length) {
        setError(null);
      }
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

  const runAnalysis = () => {
    setAnalysisRunning(true);
    setError(null);
    setResolveEmails(null);
    try {
      const pre = Math.max(1, Math.min(365, Number(preDays) || 30));
      const post = Math.max(1, Math.min(365, Number(postDays) || 30));
      const result = analyzeDecomImpact({
        shutdowns,
        events,
        timeZone,
        preDays: pre,
        postDays: post,
        minPostWhenPrePositive: Math.max(0, Number(minPostPos) || 3),
        minRatioWhenPrePositive: Math.max(1, Number(minRatio) || 2),
        minPostWhenPreZero: Math.max(0, Number(minPostZero) || 5),
        analysisRunDate: new Date(),
      });
      setAnalysis(result);
      const flaggedIds = result.sites.filter((s) => s.flagged).map((s) => s.fuzeSiteId);
      setSelectedReinstate(new Set(flaggedIds));
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

  const generateResolveEmails = () => {
    if (!analysis) return;
    const chosen = analysis.sites.filter(
      (s) => s.flagged && selectedReinstate.has(s.fuzeSiteId)
    );
    if (chosen.length === 0) {
      setError("Select at least one flagged site for reinstatement outreach.");
      setResolveEmails(null);
      return;
    }
    setError(null);
    const emails = buildSimulatedEmails(chosen, {
      appName: "mmWave reinstatement / exceptions review",
    });
    setResolveEmails(emails);
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
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

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div className="space-y-1 border-b border-border pb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Analysis insights
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          mmWave decom &amp; customer signal impact
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Five-step workflow: decom data → CNS data → thresholds &amp; analysis → validate
          reinstatement → outreach preview.{" "}
          <Link href="/" className="font-medium text-primary underline-offset-4 hover:underline">
            Introduction
          </Link>
        </p>
      </div>

      {/* Stepper */}
      <nav aria-label="Workflow steps" className="flex flex-col gap-3">
        <ol className="flex flex-wrap items-center gap-1 text-xs sm:text-sm">
          {STEPS.map((s, i) => (
            <li key={s.n} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (s.n <= step || (s.n === 4 && analysis) || (s.n === 5 && analysis))
                    setStep(s.n);
                }}
                className={
                  step === s.n
                    ? "flex items-center gap-1.5 rounded-sm border border-primary bg-primary px-2.5 py-1.5 font-medium text-primary-foreground"
                    : s.n < step || (s.n === 4 && analysis) || (s.n === 5 && analysis)
                      ? "flex items-center gap-1.5 rounded-sm border border-border px-2.5 py-1.5 text-muted-foreground hover:bg-muted"
                      : "flex items-center gap-1.5 rounded-sm border border-transparent px-2.5 py-1.5 text-muted-foreground/50"
                }
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background/20 text-[10px] font-bold sm:text-xs">
                  {s.n}
                </span>
                <span className="hidden sm:inline">{s.short}</span>
              </button>
              {i < STEPS.length - 1 ? (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              ) : null}
            </li>
          ))}
        </ol>
        <div>
          <h2 className="text-lg font-semibold">{STEPS[step - 1]?.title}</h2>
          <p className="text-sm text-muted-foreground">{STEPS[step - 1]?.desc}</p>
        </div>
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

      {/* Step 1 */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="h-4 w-4" aria-hidden />
              Decommissioned sites
            </CardTitle>
            <CardDescription>
              Sample shutdown rows load by default. Replace with your extract (.xlsx) anytime.
              {decomFileName ? (
                <span className="mt-1 block font-medium text-foreground">
                  Current file: {decomFileName}
                </span>
              ) : (
                <span className="mt-1 block">Using built-in sample data.</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Input
                type="file"
                accept=".xlsx,.xls"
                className="max-w-sm cursor-pointer"
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
                Reset to sample data
              </Button>
            </div>
            {uploadingDecom ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Parsing workbook…
              </p>
            ) : null}
            <Separator />
            <ScrollArea className="h-[min(360px,50vh)] w-full rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fuze site ID</TableHead>
                    <TableHead>Shutdown date</TableHead>
                    <TableHead>NA engineer</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shutdowns.map((r) => (
                    <TableRow key={r.fuzeSiteId}>
                      <TableCell className="font-mono text-xs">{r.fuzeSiteId}</TableCell>
                      <TableCell className="text-xs">
                        {r.shutdownDate.toISOString().slice(0, 10)}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs">
                        {r.naEngineerEmail ?? r.naEngineerName ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              {shutdowns.length} site(s) in working set.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="h-4 w-4" aria-hidden />
              CNS pins &amp; NRB tickets
            </CardTitle>
            <CardDescription>
              Sample customer-signal rows load by default. Upload your extract to replace them.
              {cnsFileName ? (
                <span className="mt-1 block font-medium text-foreground">
                  Current file: {cnsFileName}
                </span>
              ) : (
                <span className="mt-1 block">Using built-in sample data.</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Input
                type="file"
                accept=".xlsx,.xls"
                className="max-w-sm cursor-pointer"
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
                Reset to sample data
              </Button>
            </div>
            {uploadingCns ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Parsing workbook…
              </p>
            ) : null}
            <Separator />
            <ScrollArea className="h-[min(360px,50vh)] w-full rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fuze site ID</TableHead>
                    <TableHead>Event date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Id</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.slice(0, 200).map((r, idx) => (
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
              Showing {Math.min(200, events.length)} of {events.length} row(s).
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Analysis parameters</CardTitle>
              <CardDescription>
                Windows and thresholds apply to <strong>total</strong> pins (CNS + NRB). Changing
                any value clears the last run until you analyze again.
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
                    onThresholdChange();
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
                    onThresholdChange();
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
                    onThresholdChange();
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minPostPos">Min post count (pre &gt; 0)</Label>
                <Input
                  id="minPostPos"
                  inputMode="numeric"
                  value={minPostPos}
                  onChange={(e) => {
                    setMinPostPos(e.target.value);
                    onThresholdChange();
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minRatio">Min post/pre ratio (pre &gt; 0)</Label>
                <Input
                  id="minRatio"
                  inputMode="decimal"
                  value={minRatio}
                  onChange={(e) => {
                    setMinRatio(e.target.value);
                    onThresholdChange();
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minPostZero">Min post count (pre = 0)</Label>
                <Input
                  id="minPostZero"
                  inputMode="numeric"
                  value={minPostZero}
                  onChange={(e) => {
                    setMinPostZero(e.target.value);
                    onThresholdChange();
                  }}
                />
              </div>
            </CardContent>
            <CardContent className="border-t border-border pt-6">
              <Button type="button" onClick={runAnalysis} disabled={analysisRunning}>
                {analysisRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Play className="h-4 w-4" aria-hidden />
                )}
                Run analysis
              </Button>
              {!analysis ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Run analysis to enable the next step.
                </p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Last run: {new Date(analysis.appliedConfig.analysisRunIso).toLocaleString()} ·{" "}
                  {analysis.summary.flaggedCount} site(s) flagged.
                </p>
              )}
            </CardContent>
          </Card>

          {analysis && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Kpi label="Decom sites" value={String(analysis.summary.decomSiteCount)} />
                <Kpi
                  label="Sites with pins"
                  value={String(analysis.summary.sitesWithEvents)}
                />
                <Kpi label="Flagged" value={String(analysis.summary.flaggedCount)} />
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

      {/* Step 4 */}
      {step === 4 && analysis && (
        <div className="space-y-6">
          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Flagged sites — pre vs post</CardTitle>
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
                  Flagged sites only. Checked sites will be included in the step 5 outreach
                  preview (exceptions / reactivation consideration).
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
                  No sites met the impact thresholds. Adjust step 3 and run analysis again, or
                  upload richer extracts.
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
                        <TableHead>Reason</TableHead>
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
                          <TableCell className="max-w-[240px] text-xs text-muted-foreground">
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

      {/* Step 5 */}
      {step === 5 && analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="h-4 w-4" aria-hidden />
              Resolve — simulated NA outreach
            </CardTitle>
            <CardDescription>
              Generates preview emails for engineers tied to the sites you checked in step 4.
              Nothing is sent automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="default"
              disabled={selectedReinstate.size === 0}
              onClick={generateResolveEmails}
            >
              <Mail className="h-4 w-4" aria-hidden />
              Generate outreach preview
            </Button>
            <p className="w-full text-xs text-muted-foreground">
              {selectedReinstate.size} site(s) selected for outreach payload.
            </p>
          </CardContent>
          {resolveEmails && resolveEmails.length > 0 && (
            <CardContent className="space-y-6 border-t border-border pt-6">
              {resolveEmails.map((em, idx) => (
                <div
                  key={idx}
                  className="space-y-2 rounded-md border border-border p-4"
                >
                  <p className="text-xs font-medium text-muted-foreground">To</p>
                  <p className="font-mono text-sm">{em.to}</p>
                  <p className="text-xs font-medium text-muted-foreground">Subject</p>
                  <p className="text-sm">{em.subject}</p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyText(em.textBody)}
                    >
                      Copy plain text
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="sm">
                          View HTML
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[85vh] max-w-3xl">
                        <DialogHeader>
                          <DialogTitle>HTML preview</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="max-h-[60vh] rounded-md border border-border p-3">
                          <div
                            className="prose prose-sm max-w-none dark:prose-invert"
                            dangerouslySetInnerHTML={{ __html: em.htmlBody }}
                          />
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* Nav footer */}
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
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {analysis && step >= 3 ? (
            <span className="inline-flex items-center gap-1">
              <Check className="h-3.5 w-3.5 text-primary" aria-hidden />
              Analysis ready
            </span>
          ) : null}
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
