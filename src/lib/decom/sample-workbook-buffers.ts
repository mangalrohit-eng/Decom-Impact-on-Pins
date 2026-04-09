import * as XLSX from "xlsx";
import { getDefaultCnsEvents, getDefaultShutdowns } from "@/data/workflow-defaults";

/** Column layout matches `parse-shutdowns` / standard decom template. */
export function buildSampleDecomWorkbookBuffer(): Buffer {
  const rows = getDefaultShutdowns().map((s) => ({
    "Fuze Site ID": s.fuzeSiteId,
    "Shutdown Date": s.shutdownDate.toISOString().slice(0, 10),
    "NA Engineer Email": s.naEngineerEmail ?? "",
    "NA Engineer Name": s.naEngineerName ?? "",
  }));
  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "mmWave decom sites");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

/** Column layout matches `parse-cns` / standard CNS workbook. */
export function buildSampleCnsWorkbookBuffer(): Buffer {
  const rows = getDefaultCnsEvents().map((e) => ({
    "Fuze Site ID": e.fuzeSiteId,
    "Pin Date": e.eventDate.toISOString().slice(0, 10),
    Type: e.kind,
    "Pin ID": e.externalId ?? "",
  }));
  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "CNS NRB pins");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
