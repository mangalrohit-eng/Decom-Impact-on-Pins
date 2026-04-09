import { NextResponse } from "next/server";
import { analyzeDecomImpact } from "@/lib/decom/analyze";
import { parseCnsBuffer } from "@/lib/decom/parse-cns";
import { parseShutdownsBuffer } from "@/lib/decom/parse-shutdowns";

export const maxDuration = 60;

function num(v: FormDataEntryValue | null, fallback: number): number {
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

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

  const decomFile = form.get("decomFile");
  const cnsFile = form.get("cnsFile");
  if (!(decomFile instanceof File) || !(cnsFile instanceof File)) {
    return NextResponse.json(
      { error: "Both decomFile and cnsFile are required." },
      { status: 400 }
    );
  }

  const preDays = Math.max(1, Math.min(365, num(form.get("preDays"), 30)));
  const postDays = Math.max(1, Math.min(365, num(form.get("postDays"), 30)));
  const minPostWhenPrePositive = Math.max(
    0,
    num(form.get("minPostWhenPrePositive"), 3)
  );
  const minRatioWhenPrePositive = Math.max(
    1,
    num(form.get("minRatioWhenPrePositive"), 2)
  );
  const minPostWhenPreZero = Math.max(
    0,
    num(form.get("minPostWhenPreZero"), 5)
  );
  const timeZoneRaw = form.get("timeZone");
  const timeZone =
    typeof timeZoneRaw === "string" && timeZoneRaw.trim()
      ? timeZoneRaw.trim()
      : "America/New_York";

  try {
    const decomBuf = Buffer.from(await decomFile.arrayBuffer());
    const cnsBuf = Buffer.from(await cnsFile.arrayBuffer());

    const parsedDecom = parseShutdownsBuffer(decomBuf);
    const parsedCns = parseCnsBuffer(cnsBuf);

    if (parsedDecom.rows.length === 0) {
      return NextResponse.json(
        {
          error: "No valid decom / shutdown rows after parsing.",
          warnings: [...parsedDecom.warnings, ...parsedCns.warnings],
        },
        { status: 422 }
      );
    }

    const hasCns =
      (parsedCns.feedKind === "rollup" && parsedCns.rollups.length > 0) ||
      (parsedCns.feedKind === "events" && parsedCns.events.length > 0);
    if (!hasCns) {
      return NextResponse.json(
        {
          error: "No valid CNS / NRB rows after parsing.",
          warnings: [...parsedDecom.warnings, ...parsedCns.warnings],
        },
        { status: 422 }
      );
    }

    const result = analyzeDecomImpact({
      shutdowns: parsedDecom.rows,
      events: parsedCns.feedKind === "rollup" ? [] : parsedCns.events,
      rollups: parsedCns.feedKind === "rollup" ? parsedCns.rollups : undefined,
      timeZone,
      preDays,
      postDays,
      minPostWhenPrePositive,
      minRatioWhenPrePositive,
      minPostWhenPreZero,
      analysisRunDate: new Date(),
    });

    const warnings = [
      ...parsedDecom.warnings,
      ...parsedCns.warnings,
      ...result.warnings,
    ];

    return NextResponse.json({
      ...result,
      warnings,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
