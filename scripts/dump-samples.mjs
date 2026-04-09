import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pub = path.join(__dirname, "../public");

function dump(name) {
  const buf = fs.readFileSync(path.join(pub, name));
  const wb = XLSX.read(buf, { type: "buffer", cellDates: true, raw: false });
  console.log("\n####", name);
  for (const sheetName of wb.SheetNames) {
    const aoa = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
      header: 1,
      defval: null,
      raw: false,
    });
    console.log("sheet", sheetName, "rows", aoa.length);
    for (let r = 0; r < Math.min(6, aoa.length); r++) {
      console.log(" R" + (r + 1), JSON.stringify(aoa[r]));
    }
  }
}

dump("Dummy data - Date of mmWave Shutdowns by Site.xlsx");
dump("Dummy data - CNS Pins and NRB Tix Near Decom Sites.xlsx");
