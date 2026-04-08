import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { BrandLogos } from "@/components/brand/brand-logos";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const FLOW_STEPS = [
  {
    step: "01",
    title: "Prepare extracts",
    body: "Maintain an Excel list of recent mmWave shutdowns by Fuze site ID (and optional NA engineer contact). Separately, export CNS pins and NRB tickets that are scoped to those sites with event dates.",
  },
  {
    step: "02",
    title: "Upload & configure",
    body: "On the dashboard, attach both workbooks, set pre- and post-shutdown window lengths (in days), IANA timezone for calendar boundaries, and thresholds for what counts as a meaningful spike in customer-reported activity.",
  },
  {
    step: "03",
    title: "Run analysis",
    body: "The server parses both files, joins rows on Fuze site ID, assigns each pin to the pre or post window relative to that site’s shutdown date, and clamps the post window so incomplete “future” periods do not skew results.",
  },
  {
    step: "04",
    title: "Review insights",
    body: "Use KPIs, the flagged-site chart, and the sortable grid to compare pre vs post totals (CNS and NRB). Expand pin-level detail per site, filter to sites with any activity, and read data-quality warnings from the parser.",
  },
  {
    step: "05",
    title: "Simulate NA outreach",
    body: "Generate a preview of the email that would go to each responsible NA engineer (grouped by address when present in the decom file). Nothing is sent in this version—copy or share the text to coordinate exceptions-list review.",
  },
] as const;

export default function IntroductionPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div className="space-y-6 border border-border bg-card p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-4">
            <BrandLogos variant="welcome" withLinks />
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Verizon · Network Engineering · CTO Office
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                Decom impact on CNS pins
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                This workspace helps you see whether recent mmWave site decommissions
                line up with a material increase in customer-reported network issues
                (CNS pins and NRB tickets). Upload standard extracts, run the analysis
                in your browser, and focus NA follow-up on sites that clear your impact
                rules—all without sending automated email in this release.
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            What this application does
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            <li className="border border-border bg-background px-4 py-3 text-sm leading-snug">
              Aligns{" "}
              <strong className="font-medium text-foreground">shutdown timing</strong>{" "}
              with customer signal volume before and after each Fuze site’s mmWave
              decommission date.
            </li>
            <li className="border border-border bg-background px-4 py-3 text-sm leading-snug">
              Surfaces{" "}
              <strong className="font-medium text-foreground">outlier sites</strong>{" "}
              using transparent thresholds (ratio and minimum counts) you can tune for
              your operating cadence.
            </li>
            <li className="border border-border bg-background px-4 py-3 text-sm leading-snug">
              Supports{" "}
              <strong className="font-medium text-foreground">exceptions workflow</strong>{" "}
              with a structured, simulated email to NA engineers to consider re-listing
              or reactivating high-impact locations.
            </li>
            <li className="border border-border bg-background px-4 py-3 text-sm leading-snug">
              Keeps{" "}
              <strong className="font-medium text-foreground">data in-session</strong>{" "}
              for this build: uploads are posted to the server for each run only and are
              not stored in an application database.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            End-to-end flow
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Workbooks must share a common{" "}
            <strong className="font-medium text-foreground">Fuze site ID</strong> column
            so shutdown rows join to CNS/NRB events. See the README for supported header
            aliases and Vercel upload size guidance when you deploy.
          </p>
          <div className="mt-6 space-y-0">
            {FLOW_STEPS.map((item, i) => (
              <div key={item.step}>
                <Card className="border-border shadow-none">
                  <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2 pt-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-primary bg-primary text-xs font-bold text-primary-foreground">
                      {item.step}
                    </span>
                    <CardTitle className="text-base font-semibold">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4 pt-0">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {item.body}
                    </p>
                  </CardContent>
                </Card>
                {i < FLOW_STEPS.length - 1 && (
                  <div className="flex justify-center py-1 text-muted-foreground" aria-hidden>
                    <ChevronDown className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
          <Button asChild className="rounded-sm">
            <Link href="/dashboard">
              Open analysis dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            Upload both Excel files there to refresh KPIs, charts, and the site table.
          </p>
        </div>
      </div>
    </div>
  );
}
