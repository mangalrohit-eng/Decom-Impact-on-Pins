import * as fs from "node:fs";
import * as path from "node:path";
import {
  SAMPLE_CNS_WORKBOOK_FILENAME,
  SAMPLE_DECOM_WORKBOOK_FILENAME,
} from "./sample-workbook-names";

/** Preferred + legacy filenames under /public. */
const SAMPLE_DECOM_NAMES = [
  SAMPLE_DECOM_WORKBOOK_FILENAME,
  "Dummy data - Date of mmWave Shutdowns by Site.xlsx",
];
const SAMPLE_CNS_NAMES = [
  SAMPLE_CNS_WORKBOOK_FILENAME,
  "Dummy data - CNS Pins and NRB Tix Near Decom Sites.xlsx",
];

function readPublicXlsxFirstAvailable(filenames: string[]): Buffer {
  for (const name of filenames) {
    const p = path.join(process.cwd(), "public", name);
    if (fs.existsSync(p)) return fs.readFileSync(p);
  }
  throw new Error(
    `Missing sample workbook in /public. Add one of: ${filenames.join(", ")}`
  );
}

/** Bytes of the mmWave shutdown sample workbook. */
export function buildSampleDecomWorkbookBuffer(): Buffer {
  return readPublicXlsxFirstAvailable(SAMPLE_DECOM_NAMES);
}

/** Bytes of the CNS/NRB warehouse rollup sample workbook. */
export function buildSampleCnsWorkbookBuffer(): Buffer {
  return readPublicXlsxFirstAvailable(SAMPLE_CNS_NAMES);
}

