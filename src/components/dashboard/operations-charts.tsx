"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, RadioTower, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { OperationsDashboardPayload } from "@/lib/decom/operations-dashboard-data";
import { PremiumDotGrid } from "@/components/visual/premium-mesh";

const PIN_BLUE = "hsl(221 83% 53%)";
const NID_ORANGE = "hsl(24 95% 53%)";
const PRE_BAR = "hsl(221 83% 53%)";
const POST_BAR = "hsl(24 95% 53%)";

type Props = {
  data: OperationsDashboardPayload;
};

function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/80 px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="font-display mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function OperationsDashboardCharts({ data }: Props) {
  const relTicks = data.relativeNid.map((d) => d.dayOffset);

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      <div className="decom-elevate relative overflow-hidden rounded-2xl border border-border/70 bg-card p-6 shadow-premium-lg sm:p-8">
        <PremiumDotGrid className="opacity-35" />
        <div className="relative space-y-2">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            <BarChart3 className="h-4 w-4 text-primary" aria-hidden />
            Operations dashboard
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            CNS pins, decommissions &amp; reinstatement signals
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Snapshot from the current working feeds (inventory sync + signal warehouse). NID pins
            use <strong className="font-medium text-foreground">NRB</strong> records in the extract.
            Reinstatement candidates use the same heuristic spike rules as the analysis workspace when
            the LLM path is off. For deep review, open{" "}
            <strong className="font-medium text-foreground">Analysis</strong> in the nav.
          </p>
          <p className="text-xs text-muted-foreground">{data.windowNote}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Decommissioned sites" value={data.kpis.decomSiteCount} />
        <Kpi label="Pin / ticket rows" value={data.kpis.pinRowCount} sub="CNS + NRB" />
        <Kpi label="Sites with pins" value={data.kpis.sitesWithPins} />
        <Kpi
          label="Reinstatement candidates"
          value={data.kpis.reversalCandidates}
          sub="Heuristic spike pattern"
        />
        <Kpi label="Unmatched pin rows" value={data.kpis.unmatchedPinRows} sub="No Fuze in decom" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden rounded-2xl border-border/70 shadow-premium">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" aria-hidden />
              <CardTitle className="font-display text-base">
                Daily CNS pin volumes (all sites)
              </CardTitle>
            </div>
            <CardDescription>
              Total pin records vs NID (NRB) subset — last ten calendar days ending at the latest
              activity in the feed.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[320px] pt-6">
            {data.dailyPins.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pin dates in range.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.dailyPins} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10 }}
                    angle={-20}
                    textAnchor="end"
                    height={56}
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                      fontSize: 12,
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="totalPins"
                    name="Total pins"
                    stroke={PIN_BLUE}
                    strokeWidth={2}
                    dot={{ r: 3, fill: PIN_BLUE }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="nidPins"
                    name="NID pins (NRB)"
                    stroke={NID_ORANGE}
                    strokeWidth={2}
                    dot={{ r: 3, fill: NID_ORANGE }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-2xl border-border/70 shadow-premium">
          <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
            <div className="flex items-center gap-2">
              <RadioTower className="h-4 w-4 text-primary" aria-hidden />
              <CardTitle className="font-display text-base">
                Avg NID pins per site (relative to shutdown)
              </CardTitle>
            </div>
            <CardDescription>
              Mean NRB count per decom site by calendar-day offset from shutdown (0 = shutdown
              day). Vertical line marks shutdown.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[320px] pt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.relativeNid}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis
                  type="category"
                  dataKey="dayOffset"
                  ticks={relTicks}
                  tick={{ fontSize: 11 }}
                  label={{
                    value: "Days from shutdown",
                    position: "insideBottom",
                    offset: -4,
                    style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
                  }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  label={{
                    value: "Avg NID pins / site",
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
                  }}
                />
                <Tooltip
                  formatter={(v) => [
                    typeof v === "number" ? v.toFixed(3) : String(v ?? ""),
                    "Avg NID",
                  ]}
                  labelFormatter={(l) => `Day ${l}`}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid hsl(var(--border))",
                    fontSize: 12,
                  }}
                />
                <ReferenceLine
                  x={0}
                  stroke="hsl(0 86% 51%)"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                />
                <Bar dataKey="avgNidPins" name="Avg NID pins" fill={NID_ORANGE} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-2xl border-border/70 shadow-premium-lg">
        <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
          <CardTitle className="font-display text-base">
            Avg NID pins per site: pre vs post shutdown by region
          </CardTitle>
          <CardDescription>
            Regions assigned from market mix on the decom list (illustrative grouping). Bars are
            average NRB counts per site in 30d pre- and post-shutdown windows.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[min(420px,50vh)] min-h-[320px] pt-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.regionalNid}
              margin={{ top: 8, right: 8, left: 8, bottom: 64 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
              <XAxis
                dataKey="region"
                tick={{ fontSize: 10 }}
                angle={-35}
                textAnchor="end"
                interval={0}
                height={72}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                label={{
                  value: "Avg NID pins / site",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
                }}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  fontSize: 12,
                }}
              />
              <Legend />
              <Bar
                dataKey="avgPreNid"
                name="Pre-shutdown"
                fill={PRE_BAR}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="avgPostNid"
                name="Post-shutdown"
                fill={POST_BAR}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
