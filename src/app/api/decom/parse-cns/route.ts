import { NextResponse } from "next/server";
import { parseCnsBuffer } from "@/lib/decom/parse-cns";

export const maxDuration = 30;

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart form data." },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Field `file` is required." }, { status: 400 });
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const { feedKind, events, rollups, warnings } = parseCnsBuffer(buf);
    return NextResponse.json({
      feedKind,
      events: events.map((e) => ({
        fuzeSiteId: e.fuzeSiteId,
        eventDate: e.eventDate.toISOString(),
        kind: e.kind,
        externalId: e.externalId,
      })),
      rollups: rollups.map((r) => ({
        fuzeSiteId: r.fuzeSiteId,
        rptDt: r.rptDt.toISOString(),
        market: r.market,
        lteMarketId: r.lteMarketId,
        lteMarketName: r.lteMarketName,
        totalPinCount: r.totalPinCount,
        nidPinCount: r.nidPinCount,
        internalPinCount: r.internalPinCount,
        totalNrbTickets: r.totalNrbTickets,
        networkNrbCount: r.networkNrbCount,
        dataRelatedNrbCount: r.dataRelatedNrbCount,
      })),
      warnings,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Parse failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
