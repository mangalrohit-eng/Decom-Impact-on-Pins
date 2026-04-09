import { NextResponse } from "next/server";
import { buildSampleDecomWorkbookBuffer } from "@/lib/decom/sample-workbook-buffers";

export const dynamic = "force-dynamic";

export async function GET() {
  const buf = buildSampleDecomWorkbookBuffer();
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="sample-mmWave-decom-sites.xlsx"',
      "Cache-Control": "private, max-age=60",
    },
  });
}
