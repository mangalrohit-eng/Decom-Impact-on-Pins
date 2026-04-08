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
    const { events, warnings } = parseCnsBuffer(buf);
    return NextResponse.json({
      events: events.map((e) => ({
        fuzeSiteId: e.fuzeSiteId,
        eventDate: e.eventDate.toISOString(),
        kind: e.kind,
        externalId: e.externalId,
      })),
      warnings,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Parse failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
