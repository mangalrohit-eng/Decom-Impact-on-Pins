import type { AnalyzeResponse, SiteAnalysisRow } from "@/types/decom";

export type LlmSiteDecision = {
  fuzeSiteId: string;
  flagged: boolean;
  rationale: string;
  concernLevel?: "high" | "medium" | "low" | "none";
};

export type LlmAnalysisPayload = {
  overview?: string;
  sites: LlmSiteDecision[];
};

function normalizeConcern(
  v: unknown
): "high" | "medium" | "low" | "none" | undefined {
  if (typeof v !== "string") return undefined;
  const x = v.toLowerCase();
  if (x === "high" || x === "medium" || x === "low" || x === "none") return x;
  return undefined;
}

function stripMarkdownFences(s: string): string {
  let t = s.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/u, "");
  }
  return t.trim();
}

/** First top-level `{ ... }` balanced for strings (handles nested objects/arrays). */
export function extractFirstJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i]!;
    if (escape) {
      escape = false;
      continue;
    }
    if (c === "\\" && inString) {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function fuzeIdFromCell(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number" && Number.isFinite(v)) return String(Math.trunc(v));
  const s = String(v).trim();
  return s;
}

function toBoolFlag(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const x = v.trim().toLowerCase();
    if (x === "true" || x === "yes" || x === "1") return true;
    if (x === "false" || x === "no" || x === "0" || x === "") return false;
  }
  if (typeof v === "number") return v !== 0;
  return Boolean(v);
}

function payloadFromParsed(o: Record<string, unknown>): LlmAnalysisPayload | null {
  const overview = typeof o.overview === "string" ? o.overview : undefined;
  const arr = o.sites;
  if (!Array.isArray(arr)) return null;
  const sites: LlmSiteDecision[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const fuzeSiteId = fuzeIdFromCell(row.fuzeSiteId);
    if (!fuzeSiteId) continue;
    sites.push({
      fuzeSiteId,
      flagged: toBoolFlag(row.flagged),
      rationale:
        typeof row.rationale === "string"
          ? row.rationale
          : "No rationale provided.",
      concernLevel: normalizeConcern(row.concernLevel),
    });
  }
  if (sites.length === 0) return null;
  return { overview, sites };
}

/**
 * Parse the full message body from OpenAI `response_format: { type: "json_object" }`.
 * Expects keys: reasoning (narrative), overview (headline), sites (decisions).
 */
export function parseLlmJsonModeResponse(raw: string): {
  payload: LlmAnalysisPayload | null;
  reasoning: string;
} {
  const trimmed = stripMarkdownFences(raw).trim();
  if (!trimmed) return { payload: null, reasoning: "" };
  try {
    const o = JSON.parse(trimmed) as Record<string, unknown>;
    const payload = payloadFromParsed(o);
    let reasoning = "";
    if (typeof o.reasoning === "string" && o.reasoning.trim()) {
      reasoning = o.reasoning.trim();
    } else if (typeof o.analysis === "string" && o.analysis.trim()) {
      reasoning = o.analysis.trim();
    } else if (typeof o.narrative === "string" && o.narrative.trim()) {
      reasoning = o.narrative.trim();
    } else if (payload?.overview) {
      reasoning = payload.overview;
    }
    return { payload, reasoning };
  } catch {
    return { payload: null, reasoning: "" };
  }
}

/** Single-slice parse (fences stripped, optional brace extraction). */
export function parseLlmAnalysisJson(raw: string): LlmAnalysisPayload | null {
  const trimmed = stripMarkdownFences(raw).trim();
  if (!trimmed) return null;
  const tryParse = (chunk: string): LlmAnalysisPayload | null => {
    try {
      const o = JSON.parse(chunk) as Record<string, unknown>;
      return payloadFromParsed(o);
    } catch {
      return null;
    }
  };
  const direct = tryParse(trimmed);
  if (direct) return direct;
  const extracted = extractFirstJsonObject(trimmed);
  if (extracted && extracted !== trimmed) return tryParse(extracted);
  return null;
}

/**
 * Parse model completion: text before `resultMark` is reasoning; after is JSON.
 * Tries multiple slices because models often wrap JSON in fences, omit the delimiter,
 * or emit numeric fuzeSiteId values.
 */
export function parseLlmAnalysisFromCompletion(
  full: string,
  resultMark: string
): LlmAnalysisPayload | null {
  const candidates: string[] = [];
  const markIdx = full.indexOf(resultMark);
  if (markIdx >= 0) {
    candidates.push(full.slice(markIdx + resultMark.length).trim());
  }
  const braceIdx = full.indexOf("{");
  if (braceIdx >= 0) {
    candidates.push(full.slice(braceIdx));
  }
  candidates.push(full);

  const dedup: string[] = [];
  const seen = new Set<string>();
  for (const c of candidates) {
    const k = c.slice(0, 200);
    if (!c.trim() || seen.has(k)) continue;
    seen.add(k);
    dedup.push(c);
  }

  for (const chunk of dedup) {
    const parsed = parseLlmAnalysisJson(chunk);
    if (parsed) return parsed;
    const ext = extractFirstJsonObject(chunk);
    if (ext) {
      const again = parseLlmAnalysisJson(ext);
      if (again) return again;
    }
  }
  return null;
}

export function mergeLlmIntoAggregate(
  base: AnalyzeResponse,
  payload: LlmAnalysisPayload | null,
  opts: { analystNotes?: string; llmModel?: string; reasoning?: string }
): AnalyzeResponse {
  const byId = new Map<string, LlmSiteDecision>();
  if (payload) {
    for (const d of payload.sites) {
      byId.set(d.fuzeSiteId, d);
    }
  }

  const sites: SiteAnalysisRow[] = base.sites.map((s) => {
    const d = byId.get(s.fuzeSiteId);
    if (!d) {
      return {
        ...s,
        flagged: false,
        flagReason: null,
        concernLevel: "none",
      };
    }
    return {
      ...s,
      flagged: d.flagged,
      flagReason: d.flagged ? d.rationale : null,
      concernLevel: d.concernLevel ?? (d.flagged ? "medium" : "none"),
    };
  });

  const flaggedCount = sites.filter((x) => x.flagged).length;

  return {
    ...base,
    summary: {
      ...base.summary,
      flaggedCount,
    },
    sites,
    appliedConfig: {
      ...base.appliedConfig,
      analystNotes: opts.analystNotes,
      llmModel: opts.llmModel,
    },
    llmOverview: payload?.overview,
    llmReasoning: opts.reasoning,
  };
}
