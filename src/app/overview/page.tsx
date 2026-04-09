import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOperationsDashboardPayload } from "@/lib/decom/operations-dashboard-data";

const OperationsDashboardCharts = dynamic(
  () =>
    import("@/components/dashboard/operations-charts").then((m) => ({
      default: m.OperationsDashboardCharts,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
        Loading charts…
      </div>
    ),
  }
);

export default function OverviewPage() {
  const data = getOperationsDashboardPayload();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button asChild variant="outline" size="sm" className="rounded-lg">
          <Link href="/">Home</Link>
        </Button>
        <Button asChild size="sm" className="rounded-lg gap-1.5">
          <Link href="/dashboard">
            Open analysis workspace
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>
      <OperationsDashboardCharts data={data} />
    </div>
  );
}
