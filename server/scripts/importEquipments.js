/**
 * @file importEquipments.js
 * @description Imports the Josts traceability master Excel workbook into the
 * `equipments` collection.
 *
 * Workbook shape (Calibration_Traceability_Josts_v2.xlsx):
 *   - `Index` tab — one row per equipment with top-level fields
 *   - One tab per equipment — calibration parameter rows (column layout varies
 *     by equipment type; we auto-detect columns by header text)
 *
 * Equipment Mongo records are upserted by `idNo`, so re-running is safe.
 *
 * Run with: npm run import:equipments -- "<path/to/file.xlsx>"
 */

import mongoose from "mongoose";
import dotenv   from "dotenv";
import xlsx     from "xlsx";
import path     from "path";
import Equipment from "../src/models/Equipment.js";
import { toSI } from "../src/utils/unit-normalize.js";

dotenv.config();

// ── Helpers ────────────────────────────────────────────────────────────────

const stripUnit = (raw) => {
  if (raw == null) return { num: null, unit: "" };
  const s = String(raw).trim();
  if (!s || s === "—" || s === "-") return { num: null, unit: "" };
  // pull out leading number (with optional sign / decimal / exponent)
  const m = s.match(/^([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s*(.*)$/);
  if (!m) return { num: null, unit: s };
  const num = Number(m[1]);
  return { num: isNaN(num) ? null : num, unit: m[2].trim() };
};

const numOnly = (raw) => stripUnit(raw).num;

const cleanPct = (raw) => {
  if (raw == null) return null;
  const s = String(raw).replace(/[±%\s]/g, "").trim();
  if (!s || s === "—" || s === "-") return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
};

/**
 * Parses an "Expanded Uncertainty" cell into either a percentage or an
 * absolute (value, unit) tuple.
 *
 * Examples:
 *   "±0.13"          → { pct: 0.13 }
 *   "0.08 %"         → { pct: 0.08 }
 *   "0.058 %"        → { pct: 0.058 }
 *   "0.00057 mV"     → { abs: 0.00057, absUnit: "mV" }
 *   "0.0000113 kΩ"   → { abs: 0.0000113, absUnit: "kΩ" }
 *   "—" / null       → { }
 */
const parseUncertainty = (raw) => {
  if (raw == null) return {};
  const s = String(raw).trim();
  if (!s || s === "—" || s === "-") return {};
  // Strip leading ± and any whitespace before the number
  const cleaned = s.replace(/^±\s*/, "");
  // If it contains a unit suffix (non-empty after stripping number+%), treat as absolute
  const m = cleaned.match(/^([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s*(.*)$/);
  if (!m) return {};
  const num = Number(m[1]);
  if (isNaN(num)) return {};
  const tail = m[2].trim();
  if (!tail || tail === "%") return { pct: num };
  return { abs: num, absUnit: tail };
};

// "03 Apr 2025", "28-29 May 2025", "11–18 Jun 2025", "01 Aug 2025"
const parseDate = (raw) => {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s || s === "—") return null;
  // Extract day-month-year; for a range take the *last* day
  const m = s.match(/(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?\s+([A-Za-z]+)\s+(\d{4})/);
  if (m) {
    const day = Number(m[2] ?? m[1]);
    const d = new Date(`${m[3]} ${day}, ${m[4]}`);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

// find first header index whose normalised text contains any of the keywords
function findCol(headers, ...keywords) {
  const ks = keywords.map(norm);
  for (let i = 0; i < headers.length; i++) {
    const h = norm(headers[i]);
    if (!h) continue;
    if (ks.some((k) => h.includes(k))) return i;
  }
  return -1;
}

// pull a "(unit)" or "/ unit" suffix from a header like "Std. Reading (kV)"
function unitFromHeader(h) {
  if (!h) return "";
  const m = String(h).match(/\(([^)]+)\)\s*$/);
  return m ? m[1].trim() : "";
}

// ── Parameter row extraction per sheet ─────────────────────────────────────

/**
 * Auto-detect columns in a sheet's header row and extract parameter rows.
 * Header row is row index 1 (row 0 is the "Calibration Results – X" title).
 */
function extractParameters(rows) {
  if (rows.length < 3) return [];

  const headers = rows[1] ?? [];

  const cParameter   = findCol(headers, "parameter");
  const cRange       = findCol(headers, "rangesubrange", "nominalratio", "stdrange", "range");
  const cStdValue    = findCol(headers, "standardvalue", "stdreading", "stdinputcurrent", "primaryvoltage");
  const cDucReading  = findCol(headers, "ducreading", "calculatedratio", "measuredvoltage", "actualdropvoltage", "expecteddropvoltage");
  const cErrorUnits  = findCol(headers, "errorunits");
  const cErrorPct    = findCol(headers, "errorrdg", "errorpct", "errorab");
  const cUncertainty = findCol(headers, "expandeduncertainty", "uncertainty");
  const cRemarks     = findCol(headers, "remarks");

  // Derive default unit per parameter from the column header it came from
  const stdUnit      = unitFromHeader(headers[cStdValue]);
  const ducUnit      = unitFromHeader(headers[cDucReading]);

  const params = [];
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every((c) => c == null || c === "")) continue;
    const pName = r[cParameter];
    if (!pName) continue;

    const range = cRange >= 0 ? (r[cRange] ?? "") : "";
    const stdParsed = cStdValue   >= 0 ? stripUnit(r[cStdValue])  : { num: null, unit: "" };
    const ducParsed = cDucReading >= 0 ? stripUnit(r[cDucReading]) : { num: null, unit: "" };
    const unit = stdParsed.unit || ducParsed.unit || stdUnit || ducUnit || "";

    // Resolve uncertainty to a single % value. When the cell carries an
    // absolute (number + unit) like "0.00057 mV", convert to percentage using
    // SI-normalised division: pct = (abs / |stdValue|) × 100.
    const u = cUncertainty >= 0 ? parseUncertainty(r[cUncertainty]) : {};
    let uncertaintyPct = u.pct ?? null;
    if (uncertaintyPct == null && u.abs != null && stdParsed.num != null && stdParsed.num !== 0) {
      const absSI = toSI(u.abs, u.absUnit ?? "");
      const stdSI = toSI(stdParsed.num, unit);
      if (stdSI !== 0) uncertaintyPct = +((absSI / Math.abs(stdSI)) * 100).toFixed(6);
    }
    params.push({
      parameterName:  String(pName).trim(),
      range:          String(range).trim(),
      subRange:       "", // most sheets fold sub-range into the range string
      stdValue:       stdParsed.num,
      ducReading:     ducParsed.num,
      unit,
      errorPct:       cErrorPct >= 0 ? cleanPct(r[cErrorPct]) : null,
      uncertaintyPct,
      remarks:        cRemarks >= 0 ? (r[cRemarks] ?? "") : (cErrorUnits >= 0 && r[cErrorUnits] != null ? `Δ ${r[cErrorUnits]}` : ""),
    });
  }
  return params;
}

// ── Top-level Index parsing ────────────────────────────────────────────────

function parseIndex(rows) {
  // headers at row index 1
  const headers = rows[1] ?? [];
  const get = (...kw) => findCol(headers, ...kw);
  const cols = {
    sheetName:   get("sheetname"),
    make:        get("make"),
    model:       get("model"),
    serialNo:    get("serialno"),
    idNo:        get("idno"),
    certificateNo: get("certificateno"),
    calLab:      get("callab"),
    calDate:     get("caldate"),
    nextDue:     get("nextdue"),
    nablCert:    get("nablcert"),
  };

  const entries = [];
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !r[cols.sheetName]) continue;
    const cell = (key) => (cols[key] >= 0 ? r[cols[key]] : null);
    const clean = (v) => {
      const s = v == null ? "" : String(v).trim();
      return s === "—" || s === "-" ? "" : s;
    };
    entries.push({
      sheetName:     String(r[cols.sheetName]).trim(),
      make:          clean(cell("make")),
      model:         clean(cell("model")),
      serialNo:      clean(cell("serialNo")),
      idNo:          clean(cell("idNo")),
      certificateNo: clean(cell("certificateNo")),
      calLab:        clean(cell("calLab")),
      calDate:       parseDate(cell("calDate")),
      nextDue:       parseDate(cell("nextDue")),
      nablCert:      clean(cell("nablCert")),
    });
  }
  return entries;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function run() {
  if (!process.env.MONGO_URI) { console.error("MONGO_URI not set"); process.exit(1); }
  const file = process.argv[2];
  if (!file) { console.error("usage: node scripts/importEquipments.js <file.xlsx>"); process.exit(1); }

  const abs = path.resolve(file);
  console.log(`Reading ${abs}`);
  const wb = xlsx.readFile(abs);

  if (!wb.Sheets["Index"]) { console.error("No 'Index' sheet found"); process.exit(1); }
  const indexRows = xlsx.utils.sheet_to_json(wb.Sheets["Index"], { header: 1, defval: null });
  const entries   = parseIndex(indexRows);
  console.log(`Index has ${entries.length} equipments`);

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  let upserted = 0, skipped = 0;
  for (const e of entries) {
    // Excel has "—" in ID No. for some rows; fall back to serial-number-based
    // synthetic ID so they still get imported (and remain editable later).
    if (!e.idNo) {
      if (e.serialNo) {
        e.idNo = `JECL/KOL/SN-${e.serialNo}`;
        console.warn(`  • "${e.sheetName}" had no idNo — using ${e.idNo}`);
      } else {
        console.warn(`  • Skipping "${e.sheetName}" — no idNo and no serialNo`);
        skipped++;
        continue;
      }
    }
    const sheet = wb.Sheets[e.sheetName];
    let parameters = [];
    if (sheet) {
      const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
      parameters = extractParameters(rows);
    } else {
      console.warn(`  • Sheet "${e.sheetName}" not found — saving without parameters`);
    }

    const doc = {
      equipmentName: e.sheetName,
      make:          e.make,
      model:         e.model,
      serialNo:      e.serialNo,
      idNo:          e.idNo,
      certificateNo: e.certificateNo,
      calLab:        e.calLab,
      calDate:       e.calDate,
      nextDue:       e.nextDue,
      nablCert:      e.nablCert,
      parameters,
      isActive:      true,
    };

    await Equipment.findOneAndUpdate(
      { idNo: e.idNo },
      { $set: doc },
      { upsert: true, new: true }
    );
    console.log(`  ✓ ${e.idNo}  ${e.sheetName}  (${parameters.length} params)`);
    upserted++;
  }

  await mongoose.disconnect();
  console.log(`\nDone — upserted ${upserted}, skipped ${skipped}`);
}

run().catch((err) => { console.error(err); process.exit(1); });
