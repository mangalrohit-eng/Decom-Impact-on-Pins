import { NextResponse } from "next/server";
import { buildSampleCnsWorkbookBuffer } from "@/lib/decom/sample-workbook-buffers";

export const dynamic = "force-dynamic";

export async function GET() {
  const buf = buildSampleCnsWorkbookBuffer();
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="sample-CNS-NRB-pins.xlsx"',
      "Cache-Control": "private, max-age=60",
    },
  });
}
