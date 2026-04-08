import { NextResponse } from "next/server";
import { buildSimulatedEmails } from "@/lib/decom/simulate-email";
import type { SiteAnalysisRow } from "@/types/decom";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    !Array.isArray((body as { sites?: unknown }).sites)
  ) {
    return NextResponse.json(
      { error: "Body must include sites: SiteAnalysisRow[]." },
      { status: 400 }
    );
  }

  const sites = (body as { sites: SiteAnalysisRow[] }).sites;
  const emails = buildSimulatedEmails(sites);
  return NextResponse.json({ emails });
}
