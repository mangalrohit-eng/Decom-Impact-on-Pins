import * as fs from "node:fs";
import * as path from "node:path";

const DECOM_DUMMY = "Dummy data - Date of mmWave Shutdowns by Site.xlsx";
const CNS_DUMMY = "Dummy data - CNS Pins and NRB Tix Near Decom Sites.xlsx";

function readPublicXlsx(name: string): Buffer {
  const p = path.join(process.cwd(), "public", name);
  return fs.readFileSync(p);
}

/** Bytes of the checked-in mmWave shutdown dummy workbook (exact public sample). */
export function buildSampleDecomWorkbookBuffer(): Buffer {
  return readPublicXlsx(DECOM_DUMMY);
}

/** Bytes of the checked-in CNS/NRB warehouse rollup dummy workbook. */
export function buildSampleCnsWorkbookBuffer(): Buffer {
  return readPublicXlsx(CNS_DUMMY);
}
