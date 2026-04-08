import type { SiteAnalysisRow } from "@/types/decom";

export type SimulatedEmail = {
  to: string;
  subject: string;
  textBody: string;
  htmlBody: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Group flagged sites by engineer email; sites without email go to one bucket with placeholder To. */
export function buildSimulatedEmails(
  sites: SiteAnalysisRow[],
  opts?: { appName?: string }
): SimulatedEmail[] {
  const app = opts?.appName ?? "Decom CNS impact review";
  const map = new Map<string, SiteAnalysisRow[]>();
  for (const s of sites) {
    if (!s.flagged) continue;
    const key = (s.naEngineerEmail ?? "").trim().toLowerCase() || "__no_email__";
    const list = map.get(key) ?? [];
    list.push(s);
    map.set(key, list);
  }

  const out: SimulatedEmail[] = [];
  for (const [key, rows] of map) {
    const to =
      key === "__no_email__"
        ? "(NA engineer email not in decom file — add recipient manually)"
        : rows[0]?.naEngineerEmail?.trim() ?? key;

    const lines = rows.map(
      (r) =>
        `- Fuze ${r.fuzeSiteId} | shutdown ${r.shutdownDate} | pre ${r.preTotal} → post ${r.postTotal} (CNS ${r.preCns}/${r.postCns}, NRB ${r.preNrb}/${r.postNrb})${r.flagReason ? ` | ${r.flagReason}` : ""}`
    );

    const subject = `${app}: ${rows.length} site(s) — possible CNS impact after mmWave decom`;
    const textBody = [
      `Draft — not transmitted from this application. Copy into your mail client to send.`,
      ``,
      `Please review the following mmWave decommission sites where customer-reported activity (CNS/NRB) increased in the post-decom window. If impact is confirmed, consider adding the site to the exceptions list and coordinating reactivation per team process.`,
      ``,
      ...lines,
      ``,
      `— Network Engineering analytics`,
    ].join("\n");

    const tableRows = rows
      .map(
        (r) =>
          `<tr><td>${escapeHtml(r.fuzeSiteId)}</td><td>${escapeHtml(r.shutdownDate)}</td><td>${r.preTotal}</td><td>${r.postTotal}</td><td>${escapeHtml(r.flagReason ?? "")}</td></tr>`
      )
      .join("");

    const htmlBody = `<p style="font-family:system-ui,sans-serif;font-size:14px;color:#222"><strong>Draft</strong> — not transmitted from this application. Copy into your mail client to send.</p>
<p style="font-family:system-ui,sans-serif;font-size:14px;color:#222">Please review the following mmWave decommission sites where customer-reported activity (CNS/NRB) increased in the post-decom window. If impact is confirmed, consider adding the site to the <strong>exceptions</strong> list and coordinating reactivation per team process.</p>
<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:system-ui,sans-serif;font-size:13px">
<thead><tr><th>Fuze site ID</th><th>Shutdown</th><th>Pre total</th><th>Post total</th><th>Reason</th></tr></thead>
<tbody>${tableRows}</tbody>
</table>
<p style="font-family:system-ui,sans-serif;font-size:12px;color:#666">— Network Engineering analytics</p>`;

    out.push({ to, subject, textBody, htmlBody });
  }

  return out.sort((a, b) => a.to.localeCompare(b.to));
}
