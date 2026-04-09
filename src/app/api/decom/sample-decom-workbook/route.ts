import { NextResponse } from "next/server";
import { SAMPLE_DECOM_WORKBOOK_FILENAME } from "@/lib/decom/sample-workbook-names";
import { buildSampleDecomWorkbookBuffer } from "@/lib/decom/sample-workbook-buffers";

export const dynamic = "force-dynamic";

export async function GET() {
  const buf = buildSampleDecomWorkbookBuffer();
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${SAMPLE_DECOM_WORKBOOK_FILENAME}"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
