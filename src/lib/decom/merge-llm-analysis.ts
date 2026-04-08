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

/** Parse model JSON; tolerate extra keys and missing sites (default: not flagged). */
export function parseLlmAnalysisJson(raw: string): LlmAnalysisPayload | null {
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    const overview = typeof o.overview === "string" ? o.overview : undefined;
    const arr = o.sites;
    if (!Array.isArray(arr)) return null;
    const sites: LlmSiteDecision[] = [];
    for (const item of arr) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const fuzeSiteId =
        typeof row.fuzeSiteId === "string" ? row.fuzeSiteId.trim() : "";
      if (!fuzeSiteId) continue;
      sites.push({
        fuzeSiteId,
        flagged: Boolean(row.flagged),
        rationale:
          typeof row.rationale === "string"
            ? row.rationale
            : "No rationale provided.",
        concernLevel: normalizeConcern(row.concernLevel),
      });
    }
    if (sites.length === 0) return null;
    return { overview, sites };
  } catch {
    return null;
  }
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
