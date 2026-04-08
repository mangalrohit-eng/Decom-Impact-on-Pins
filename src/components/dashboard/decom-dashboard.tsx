"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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
import { AlertTriangle, FileSpreadsheet, Loader2, Mail, Play } from "lucide-react";
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
import { BrandLogos } from "@/components/brand/brand-logos";
import type { AnalyzeResponse, SiteAnalysisRow } from "@/types/decom";

type SimEmail = {
  to: string;
  subject: string;
  textBody: string;
  htmlBody: string;
};

function formatTime(d: Date): string {
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
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

export function DecomDashboard() {
  const decomInputRef = useRef<HTMLInputElement>(null);
  const cnsInputRef = useRef<HTMLInputElement>(null);

  const [decomFile, setDecomFile] = useState<File | null>(null);
  const [cnsFile, setCnsFile] = useState<File | null>(null);
  const [lastRunAt, setLastRunAt] = useState<Date | null>(null);

  const [preDays, setPreDays] = useState("30");
  const [postDays, setPostDays] = useState("30");
  const [minPostPos, setMinPostPos] = useState("3");
  const [minRatio, setMinRatio] = useState("2");
  const [minPostZero, setMinPostZero] = useState("5");
  const [timeZone, setTimeZone] = useState("America/New_York");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  const [onlyWithPins, setOnlyWithPins] = useState(false);
  const [selectedFlagged, setSelectedFlagged] = useState<Set<string>>(
    () => new Set()
  );

  const [emails, setEmails] = useState<SimEmail[] | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  const canRun = Boolean(decomFile && cnsFile && !loading);

  const syncSelectionToFlagged = useCallback((sites: SiteAnalysisRow[]) => {
    const flagged = sites.filter((s) => s.flagged).map((s) => s.fuzeSiteId);
    setSelectedFlagged(new Set(flagged));
  }, []);

  const runAnalysis = async () => {
    if (!decomFile || !cnsFile) return;
    setLoading(true);
    setError(null);
    setEmails(null);
    try {
      const fd = new FormData();
      fd.append("decomFile", decomFile);
      fd.append("cnsFile", cnsFile);
      fd.append("preDays", preDays);
      fd.append("postDays", postDays);
      fd.append("minPostWhenPrePositive", minPostPos);
      fd.append("minRatioWhenPrePositive", minRatio);
      fd.append("minPostWhenPreZero", minPostZero);
      fd.append("timeZone", timeZone);

      const res = await fetch("/api/decom/analyze", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : `Request failed (${res.status})`;
        setError(msg);
        setResult(null);
        return;
      }
      const next = data as AnalyzeResponse;
      setResult(next);
      setLastRunAt(new Date());
      syncSelectionToFlagged(next.sites);
    } catch {
      setError("Network error while analyzing.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const filteredSites = useMemo(() => {
    if (!result) return [];
    if (!onlyWithPins) return result.sites;
    return result.sites.filter((s) => s.preTotal + s.postTotal > 0);
  }, [result, onlyWithPins]);

  const chartData = useMemo(() => {
    if (!result) return [];
    return result.sites
      .filter((s) => s.flagged)
      .map((s) => ({
        name:
          s.fuzeSiteId.length > 14
            ? `${s.fuzeSiteId.slice(0, 12)}…`
            : s.fuzeSiteId,
        fullId: s.fuzeSiteId,
        pre: s.preTotal,
        post: s.postTotal,
      }));
  }, [result]);

  const toggleSelect = (fuze: string) => {
    setSelectedFlagged((prev) => {
      const n = new Set(prev);
      if (n.has(fuze)) n.delete(fuze);
      else n.add(fuze);
      return n;
    });
  };

  const selectAllFlagged = () => {
    if (!result) return;
    const flagged = result.sites.filter((s) => s.flagged).map((s) => s.fuzeSiteId);
    setSelectedFlagged(new Set(flagged));
  };

  const generateEmails = async () => {
    if (!result) return;
    const flaggedSites = result.sites.filter(
      (s) => s.flagged && selectedFlagged.has(s.fuzeSiteId)
    );
    if (flaggedSites.length === 0) {
      setError("Select at least one flagged site for the email simulation.");
      return;
    }
    setEmailLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/decom/simulate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sites: flaggedSites }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Email simulation failed.");
        setEmails(null);
        return;
      }
      setEmails(data.emails ?? []);
    } catch {
      setError("Network error during email simulation.");
      setEmails(null);
    } finally {
      setEmailLoading(false);
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-3">
            <BrandLogos variant="welcome" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            mmWave decom &amp; customer signal impact
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Upload the latest <strong>mmWave shutdown</strong> extract and{" "}
            <strong>CNS / NRB</strong> extract (joined by Fuze site ID). Run
            analysis to compare pin volume before versus after each shutdown.
            Post windows are clamped to today in your selected timezone.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="h-4 w-4" aria-hidden />
              Decom / mmWave shutdowns
            </CardTitle>
            <CardDescription>
              Excel workbook (.xlsx) with Fuze site ID and shutdown date.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              ref={decomInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="cursor-pointer"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setDecomFile(f);
              }}
            />
            {decomFile && (
              <p className="text-xs text-muted-foreground">
                Selected: {decomFile.name}
                {lastRunAt ? ` · last run ${formatTime(lastRunAt)}` : ""}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="h-4 w-4" aria-hidden />
              CNS pins &amp; NRB tickets
            </CardTitle>
            <CardDescription>
              Excel workbook with Fuze site ID and event dates near decom sites.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              ref={cnsInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="cursor-pointer"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setCnsFile(f);
              }}
            />
            {cnsFile && (
              <p className="text-xs text-muted-foreground">
                Selected: {cnsFile.name}
                {lastRunAt ? ` · last run ${formatTime(lastRunAt)}` : ""}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Analysis controls</CardTitle>
          <CardDescription>
            Windows and thresholds apply to the <strong>total</strong> count
            (CNS + NRB). Tune values to match your NA review standard.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="preDays">Pre window (days)</Label>
            <Input
              id="preDays"
              inputMode="numeric"
              value={preDays}
              onChange={(e) => setPreDays(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postDays">Post window (days)</Label>
            <Input
              id="postDays"
              inputMode="numeric"
              value={postDays}
              onChange={(e) => setPostDays(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tz">Timezone (IANA)</Label>
            <Input
              id="tz"
              value={timeZone}
              onChange={(e) => setTimeZone(e.target.value)}
              placeholder="America/New_York"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minPostPos">Min post count (pre &gt; 0)</Label>
            <Input
              id="minPostPos"
              inputMode="numeric"
              value={minPostPos}
              onChange={(e) => setMinPostPos(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minRatio">Min post/pre ratio (pre &gt; 0)</Label>
            <Input
              id="minRatio"
              inputMode="decimal"
              value={minRatio}
              onChange={(e) => setMinRatio(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="minPostZero">Min post count (pre = 0)</Label>
            <Input
              id="minPostZero"
              inputMode="numeric"
              value={minPostZero}
              onChange={(e) => setMinPostZero(e.target.value)}
            />
          </div>
        </CardContent>
        <CardContent className="border-t border-border pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={!canRun} onClick={runAnalysis}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Play className="h-4 w-4" aria-hidden />
              )}
              Run analysis
            </Button>
            {!decomFile || !cnsFile ? (
              <span className="text-xs text-muted-foreground">
                Select both workbooks to enable Run.
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label="Decom sites"
              value={String(result.summary.decomSiteCount)}
            />
            <Kpi
              label="Sites with any pins"
              value={String(result.summary.sitesWithEvents)}
            />
            <Kpi
              label="Flagged (impact rule)"
              value={String(result.summary.flaggedCount)}
            />
            <Kpi
              label="CNS rows (no shutdown match)"
              value={String(result.summary.unmatchedEventCount)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Pin date span (matched Fuze IDs):{" "}
            {result.summary.pinDateMin ?? "—"} →{" "}
            {result.summary.pinDateMax ?? "—"} · Post window clamped to{" "}
            {result.appliedConfig.postWindowClampYmd} ({result.appliedConfig.timeZone}
            )
          </p>

          {result.warnings.length > 0 && (
            <Card className="border-amber-500/40 bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  Data quality
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-inside list-disc space-y-1 text-sm text-amber-950/90 dark:text-amber-50/90">
                  {result.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Flagged sites — pre vs post totals
                </CardTitle>
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
                <CardTitle className="text-base">Site results</CardTitle>
                <CardDescription>
                  {result.summary.shutdownsWithNoEvents} site(s) have zero pins in
                  file. Use the filter to hide them if needed.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={onlyWithPins}
                    onCheckedChange={(c) => setOnlyWithPins(c === true)}
                  />
                  Only sites with pins
                </label>
                <Button type="button" variant="outline" size="sm" onClick={selectAllFlagged}>
                  Select all flagged
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>Fuze site ID</TableHead>
                      <TableHead>Shutdown</TableHead>
                      <TableHead className="text-right">Pre</TableHead>
                      <TableHead className="text-right">Post</TableHead>
                      <TableHead className="text-right">CNS</TableHead>
                      <TableHead className="text-right">NRB</TableHead>
                      <TableHead>NA engineer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-24">Pins</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSites.map((row) => (
                      <TableRow key={row.fuzeSiteId}>
                        <TableCell>
                          {row.flagged ? (
                            <Checkbox
                              checked={selectedFlagged.has(row.fuzeSiteId)}
                              onCheckedChange={() => toggleSelect(row.fuzeSiteId)}
                              aria-label={`Select ${row.fuzeSiteId}`}
                            />
                          ) : null}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {row.fuzeSiteId}
                        </TableCell>
                        <TableCell className="text-xs">{row.shutdownDate}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.preTotal}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.postTotal}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                          {row.preCns}/{row.postCns}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                          {row.preNrb}/{row.postNrb}
                        </TableCell>
                        <TableCell className="max-w-[140px] truncate text-xs">
                          {row.naEngineerEmail ?? row.naEngineerName ?? "—"}
                        </TableCell>
                        <TableCell>
                          {row.flagged ? (
                            <Badge variant="destructive">Flagged</Badge>
                          ) : (
                            <Badge variant="secondary">OK</Badge>
                          )}
                          {row.eventsTruncated ? (
                            <span className="ml-1 text-[10px] text-amber-700">
                              truncated
                            </span>
                          ) : null}
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
                                  <DialogTitle>
                                    Pins — {row.fuzeSiteId}
                                  </DialogTitle>
                                </DialogHeader>
                                <ScrollArea className="max-h-[55vh] pr-3">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-24">Type</TableHead>
                                        <TableHead>When (UTC)</TableHead>
                                        <TableHead>Id</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {row.events.map((ev, j) => (
                                        <TableRow key={j}>
                                          <TableCell className="text-xs">
                                            {ev.type}
                                          </TableCell>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4" aria-hidden />
                Simulated email
              </CardTitle>
              <CardDescription>
                Not sent — preview only. Messages group by NA engineer email when
                present in the decom file. Use checkboxes in the table to choose
                flagged sites.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={emailLoading || result.summary.flaggedCount === 0}
                onClick={generateEmails}
              >
                {emailLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Mail className="h-4 w-4" aria-hidden />
                )}
                Generate preview
              </Button>
            </CardContent>
            {emails && emails.length > 0 && (
              <CardContent className="space-y-6 border-t border-border pt-6">
                {emails.map((em, idx) => (
                  <div key={idx} className="space-y-2 rounded-md border border-border p-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      To
                    </p>
                    <p className="font-mono text-sm">{em.to}</p>
                    <p className="text-xs font-medium text-muted-foreground">
                      Subject
                    </p>
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
        </>
      )}
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
