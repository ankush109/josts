/**
 * Raw form-data export utilities for a calibration report.
 *
 * Excel (multi-sheet workbook):
 *   Page-1        — certificate meta, DUC details, environmental conditions,
 *                   reference standards, signatures
 *   Page-2..N     — per-instrument "Calibration Results" grid with STANDARD /
 *                   DUC / ERROR + full uncertainty-budget columns
 *
 * PDF (print-ready HTML rendered into a hidden iframe → browser print dialog):
 *   Single continuous document containing all the same sections. Sections have
 *   `page-break-inside: avoid` so nothing splits awkwardly.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

type AnyReport = Record<string, any>;
type Style     = any; // xlsx-js-style cell style object

const COMPANY = "Jost's Engineering Company Limited";
const LAB     = "Calibration Laboratory, Kolkata";

// ─── helpers ────────────────────────────────────────────────────────────────

function safe(v: unknown, fallback = ""): string {
  if (v === null || v === undefined) return fallback;
  const s = Array.isArray(v)
    ? v.filter((x) => x != null && String(x).trim() !== "").join(" | ")
    : typeof v === "object"
      ? JSON.stringify(v)
      : String(v);
  return s.trim() ? s : fallback;
}

function fmtDate(v: unknown): string {
  const s = safe(v);
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function reportBasename(report: AnyReport): string {
  const cert = safe(report?.reportMeta?.certNo, report?._id ?? "report");
  const slug = cert.replace(/[^\w.-]+/g, "-");
  const date = new Date().toISOString().slice(0, 10);
  return `${slug}_${date}`;
}

function num(v: unknown, digits = 4): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return safe(v);
  return n.toFixed(digits);
}

// ─── measurement flattening ─────────────────────────────────────────────────

type ResultRow = {
  paramName: string;
  paramUnit: string;
  rangeLabel: string;
  standardValue: string;
  standardUnit: string;
  ducValue:      string;
  ducUnit:       string;
  errorPct:      string;
  readingSet:    string;
  stdUncMean:    string;
  stdUncTemp:    string;
  stdUncertainty:string;
  ucRef:         string;
  ucAccRef:      string;
  ucLcDuc:       string;
  combinedUc:    string;
  effectiveDof:  string;
  kFactor:       string;
  expandedUnc:   string;
  scopeClaimed:  string;
  resultedUnc:   string;
  percentUc:     string;
  meanValue:     string;
};

function flattenResults(inst: AnyReport): ResultRow[] {
  const rows: ResultRow[] = [];
  const params: AnyReport[] = Array.isArray(inst?.params) ? inst.params : [];
  for (const p of params) {
    const pName = safe(p?.name);
    const pUnit = safe(p?.unit);
    const ranges: AnyReport[] = Array.isArray(p?.ranges) ? p.ranges : [];
    for (const r of ranges) {
      const rLabel = safe(r?.label);
      const meas: AnyReport[] = Array.isArray(r?.measurements) ? r.measurements : [];
      for (const m of meas) {
        const c = (m?.computed ?? {}) as AnyReport;
        const nomVal  = safe(m?.nomValue);
        const nomUnit = safe(m?.nomUnit) || pUnit;
        const readings: any[] = Array.isArray(m?.readings) ? m.readings : [];
        const nums = readings.map((v) => Number(String(v).replace(/[^\d.\-eE]/g, ""))).filter((n) => Number.isFinite(n));
        const meanFallback = nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(4) : "";
        rows.push({
          paramName: pName,
          paramUnit: pUnit,
          rangeLabel: rLabel,
          standardValue: nomVal,
          standardUnit:  nomUnit,
          ducValue: Number.isFinite(c?.meanValue) ? num(c.meanValue) : meanFallback,
          ducUnit:  nomUnit,
          errorPct: Number.isFinite(c?.error) ? num(c.error, 4) : "",
          readingSet:    nomVal,
          stdUncMean:    Number.isFinite(c?.stdUcMean)          ? num(c.stdUcMean, 6)          : "",
          stdUncTemp:    "",
          stdUncertainty:Number.isFinite(c?.stdUncertainty)     ? num(c.stdUncertainty, 6)     : "",
          ucRef:         Number.isFinite(c?.ucOfRefStd)         ? num(c.ucOfRefStd, 6)         : "",
          ucAccRef:      Number.isFinite(c?.ucDueToAccOfRefStd) ? num(c.ucDueToAccOfRefStd, 6) : "",
          ucLcDuc:       Number.isFinite(c?.ucDueToLcOfDuc)     ? num(c.ucDueToLcOfDuc, 6)     : "",
          combinedUc:    Number.isFinite(c?.combinedUc)         ? num(c.combinedUc, 6)         : "",
          effectiveDof:  c?.effectiveDof == null ? "" : num(c.effectiveDof, 2),
          kFactor:       Number.isFinite(c?.kFactor)            ? num(c.kFactor, 2)            : "",
          expandedUnc:   Number.isFinite(c?.expandedUncertainty)? num(c.expandedUncertainty, 6): "",
          scopeClaimed:  Number.isFinite(c?.scopeClaimed)       ? num(c.scopeClaimed, 6)       : "",
          resultedUnc:   Number.isFinite(c?.resultedExpandedUc) ? num(c.resultedExpandedUc, 6) : "",
          percentUc:     Number.isFinite(c?.percentUc)          ? num(c.percentUc, 4)          : "",
          meanValue:     Number.isFinite(c?.meanValue)          ? num(c.meanValue)             : meanFallback,
        });
      }
    }
  }
  return rows;
}

// ─── Excel styles (borders only, no fills; bold on headers/labels) ──────────

const border = { style: "thin", color: { rgb: "000000" } };
const box = { top: border, bottom: border, left: border, right: border };

const S_TITLE: Style = {
  font: { name: "Calibri", sz: 14, bold: true, color: { rgb: "000000" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: box,
};
const S_SECTION: Style = {
  font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "000000" } },
  alignment: { horizontal: "center", vertical: "center" },
  border: box,
};
const S_LABEL: Style = {
  font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "000000" } },
  alignment: { horizontal: "left", vertical: "center", wrapText: true },
  border: box,
};
const S_VAL: Style = {
  font: { name: "Calibri", sz: 10, color: { rgb: "000000" } },
  alignment: { horizontal: "left", vertical: "center", wrapText: true },
  border: box,
};
const S_TH: Style = {
  font: { name: "Calibri", sz: 10, bold: true, color: { rgb: "000000" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: box,
};
const S_TH_SUB: Style = {
  font: { name: "Calibri", sz: 9, bold: true, color: { rgb: "000000" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: box,
};
const S_TD_CENTER: Style = {
  font: { name: "Calibri", sz: 10, color: { rgb: "000000" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: box,
};
const S_TD_LEFT: Style = {
  font: { name: "Calibri", sz: 10, color: { rgb: "000000" } },
  alignment: { horizontal: "left", vertical: "center", wrapText: true },
  border: box,
};
const S_ALT: Style = S_TD_CENTER;

function cell(v: string | number, s: Style): any {
  const isNum = typeof v === "number";
  return { v: isNum ? v : String(v ?? ""), t: isNum ? "n" : "s", s };
}

function put(ws: any, addr: string, c: any) { ws[addr] = c; }

function colLetter(i: number): string {
  let n = i + 1, out = "";
  while (n > 0) { const r = (n - 1) % 26; out = String.fromCharCode(65 + r) + out; n = Math.floor((n - 1) / 26); }
  return out;
}

function addRow(ws: any, row: number, cells: Array<{ v: any; s: Style; merge?: number }>) {
  let col = 0;
  const merges: Array<{ s: any; e: any }> = [];
  for (const c of cells) {
    const addr = colLetter(col) + row;
    put(ws, addr, cell(c.v, c.s));
    if (c.merge && c.merge > 1) {
      merges.push({ s: { c: col, r: row - 1 }, e: { c: col + c.merge - 1, r: row - 1 } });
      for (let k = 1; k < c.merge; k++) {
        put(ws, colLetter(col + k) + row, cell("", c.s));
      }
      col += c.merge;
    } else {
      col += 1;
    }
  }
  const existing = ws["!merges"] ?? [];
  ws["!merges"] = [...existing, ...merges];
}

// ─── Page 1 builder ─────────────────────────────────────────────────────────

function buildPage1(report: AnyReport, instruments: AnyReport[]): any {
  const ws: any = {};
  const meta = report?.reportMeta ?? {};
  const inst0 = instruments[0] ?? {};
  const m0    = inst0?.meta ?? {};
  const sig   = report?.signatures ?? {};

  const totalCols = 10;

  // Title
  addRow(ws, 1, [{ v: "CALIBRATION CERTIFICATE — DRAFT (Raw Form Data)", s: S_TITLE, merge: totalCols }]);
  addRow(ws, 2, [
    { v: `${COMPANY} · ${LAB}`, s: { ...S_SECTION, fill: { patternType: "solid", fgColor: { rgb: "0B1424" } } }, merge: totalCols },
  ]);

  // Certificate meta row
  addRow(ws, 3, [
    { v: "Certificate No.",   s: S_LABEL, merge: 2 },
    { v: safe(meta.certNo),   s: S_VAL,   merge: 4 },
    { v: "Issue Date",        s: S_LABEL, merge: 2 },
    { v: fmtDate(meta.dateOfCalibration), s: S_VAL, merge: 2 },
  ]);
  addRow(ws, 4, [
    { v: "DUC Received Date",      s: S_LABEL, merge: 2 },
    { v: fmtDate(meta.ducReceivedDate),    s: S_VAL, merge: 2 },
    { v: "Date of Calibration",    s: S_LABEL, merge: 2 },
    { v: fmtDate(meta.dateOfCalibration),  s: S_VAL, merge: 2 },
    { v: "Calibration Due Date",   s: S_LABEL, merge: 1 },
    { v: fmtDate(meta.calibrationDueDate), s: S_VAL, merge: 1 },
  ]);
  addRow(ws, 5, [
    { v: "Customer Name",     s: S_LABEL, merge: 2 },
    { v: safe(meta.customerName), s: S_VAL, merge: 4 },
    { v: "Customer Ref No.",  s: S_LABEL, merge: 2 },
    { v: safe(meta.customerRefNo), s: S_VAL, merge: 2 },
  ]);
  addRow(ws, 6, [
    { v: "Customer Address",  s: S_LABEL, merge: 2 },
    { v: safe(meta.customerAddress), s: S_VAL, merge: 8 },
  ]);

  // Section header — DUC
  addRow(ws, 7, [{ v: "Details of the DUC to be Calibrated", s: S_SECTION, merge: totalCols }]);
  addRow(ws, 8, [
    { v: "Name of DUC",        s: S_TH_SUB },
    { v: "Serial No.",         s: S_TH_SUB, merge: 2 },
    { v: "Make",               s: S_TH_SUB },
    { v: "Model",              s: S_TH_SUB, merge: 2 },
    { v: "Range",              s: S_TH_SUB, merge: 2 },
    { v: "Least Count",        s: S_TH_SUB, merge: 2 },
  ]);
  addRow(ws, 9, [
    { v: safe(m0.nomenclature), s: S_TD_LEFT },
    { v: safe(m0.slNo),         s: S_TD_LEFT, merge: 2 },
    { v: safe(m0.make),         s: S_TD_LEFT },
    { v: safe(m0.modelType),    s: S_TD_LEFT, merge: 2 },
    { v: safe(m0.ducRange),     s: S_TD_LEFT, merge: 2 },
    { v: safe(m0.othersDetails, "Refer Cal Results"), s: S_TD_LEFT, merge: 2 },
  ]);

  // Location & method
  addRow(ws, 10, [
    { v: "Location of Calibration", s: S_LABEL, merge: 3 },
    { v: safe(meta.calibrationLocation === "onsite" ? "At Site" : "At Lab"), s: S_VAL, merge: 2 },
    { v: "Calibration Method",      s: S_LABEL, merge: 2 },
    { v: safe(m0.calibrationMethod), s: S_VAL, merge: 3 },
  ]);
  addRow(ws, 11, [
    { v: "Calibration Procedure",   s: S_LABEL, merge: 3 },
    { v: safe(m0.calibrationProcedure), s: S_VAL, merge: 7 },
  ]);

  // Environmental
  addRow(ws, 12, [{ v: "Environmental Conditions", s: S_SECTION, merge: totalCols }]);
  addRow(ws, 13, [
    { v: "Supply Voltage (V)",   s: S_TH_SUB, merge: 2 },
    { v: "Temperature (°C)",     s: S_TH_SUB, merge: 2 },
    { v: "Humidity (%RH)",       s: S_TH_SUB, merge: 2 },
    { v: "Voltage Area",         s: S_TH_SUB, merge: 4 },
  ]);
  addRow(ws, 14, [
    { v: safe(m0.supplyVoltage), s: S_TD_CENTER, merge: 2 },
    { v: safe(m0.temperature),   s: S_TD_CENTER, merge: 2 },
    { v: safe(m0.humidity),      s: S_TD_CENTER, merge: 2 },
    { v: safe(m0.voltageArea),   s: S_TD_CENTER, merge: 4 },
  ]);

  // Reference standards
  addRow(ws, 15, [{ v: "Reference Standards Used", s: S_SECTION, merge: totalCols }]);
  addRow(ws, 16, [
    { v: "#",             s: S_TH_SUB },
    { v: "Name",          s: S_TH_SUB, merge: 2 },
    { v: "Make",          s: S_TH_SUB },
    { v: "Model",         s: S_TH_SUB, merge: 2 },
    { v: "Sr. No",        s: S_TH_SUB },
    { v: "ID No",         s: S_TH_SUB },
    { v: "Cal Due Date",  s: S_TH_SUB },
    { v: "Traceability Cert No", s: S_TH_SUB },
  ]);
  const refStds: AnyReport[] = Array.isArray(m0?.refStandards) ? m0.refStandards : [];
  let rowIdx = 17;
  const list = refStds.length ? refStds : [{}, {}, {}];
  list.forEach((r, i) => {
    addRow(ws, rowIdx++, [
      { v: String(i + 1),                s: S_TD_CENTER },
      { v: safe((r as any)?.name),               s: S_TD_LEFT, merge: 2 },
      { v: safe((r as any)?.make),               s: S_TD_LEFT },
      { v: safe((r as any)?.modelType),          s: S_TD_LEFT, merge: 2 },
      { v: safe((r as any)?.srNo),               s: S_TD_CENTER },
      { v: safe((r as any)?.idNo),               s: S_TD_CENTER },
      { v: fmtDate((r as any)?.calDate),          s: S_TD_CENTER },
      { v: safe((r as any)?.traceabilityCertNo), s: S_TD_LEFT },
    ]);
  });

  // Remarks
  const remarks: unknown = meta?.remarks;
  if (Array.isArray(remarks) && remarks.length) {
    addRow(ws, rowIdx++, [{ v: "Remarks", s: S_SECTION, merge: totalCols }]);
    remarks.forEach((r, i) => {
      addRow(ws, rowIdx++, [
        { v: `${i + 1}.`,  s: { ...S_TD_LEFT, alignment: { horizontal: "right", vertical: "top" } } },
        { v: safe(r),      s: S_TD_LEFT, merge: totalCols - 1 },
      ]);
    });
  }

  // Signatures
  addRow(ws, rowIdx++, [{ v: "Signatures", s: S_SECTION, merge: totalCols }]);
  addRow(ws, rowIdx++, [
    { v: "Calibrated By", s: S_LABEL, merge: 3 },
    { v: safe((sig as any)?.calibratedBy?.name ?? (sig as any)?.calibratedBy?.email), s: S_VAL, merge: 2 },
    { v: "Verified By",   s: S_LABEL, merge: 2 },
    { v: safe((sig as any)?.verifiedBy?.name   ?? (sig as any)?.verifiedBy?.email),   s: S_VAL, merge: 3 },
  ]);

  ws["!cols"] = Array(totalCols).fill(0).map(() => ({ wch: 14 }));
  ws["!ref"] = `A1:${colLetter(totalCols - 1)}${rowIdx - 1}`;
  return ws;
}

// ─── Page N (Results) builder ───────────────────────────────────────────────

function buildResultsPage(inst: AnyReport, pageIdx: number, totalPages: number): any {
  const ws: any = {};
  const meta = inst?.meta ?? {};
  const results = flattenResults(inst);

  const headers = [
    "Parameter",
    "Range",
    "Nom. (STD)",
    "Unit",
    "DUC (Mean)",
    "Unit",
    "Error %",
    "Std U/c of Mean",
    "Std Uncertainty",
    "U/c of Ref Std",
    "U/c due to Acc of Ref Std",
    "U/c due to L/c of DUC",
    "Combined Uc",
    "Effective DoF",
    "k factor",
    "Expanded Uncertainty",
    "Scope Claimed",
    "Resulted Expanded U/C",
    "% U/C",
  ];
  const nCols = headers.length;

  // Title
  addRow(ws, 1, [{ v: `Calibration Results — Instrument ${pageIdx}${meta?.nomenclature ? " · " + safe(meta.nomenclature) : ""}`, s: S_TITLE, merge: nCols }]);
  addRow(ws, 2, [{
    v: `Make: ${safe(meta.make)}  ·  Model: ${safe(meta.modelType)}  ·  Sr No: ${safe(meta.slNo)}  ·  ID No: ${safe(meta.idNo)}  ·  Page ${pageIdx + 1} of ${totalPages}`,
    s: { ...S_SECTION, fill: { patternType: "solid", fgColor: { rgb: "0B1424" } } },
    merge: nCols,
  }]);

  // Column widths
  ws["!cols"] = [
    { wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 8 },
    { wch: 12 }, { wch: 8 },  { wch: 10 }, { wch: 14 },
    { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
    { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 16 },
    { wch: 14 }, { wch: 18 }, { wch: 10 },
  ];

  // Table header
  addRow(ws, 3, headers.map((h) => ({ v: h, s: S_TH })));

  // Data rows
  let row = 4;
  if (results.length === 0) {
    addRow(ws, row++, [{ v: "No measurements recorded for this instrument.", s: S_TD_LEFT, merge: nCols }]);
  } else {
    results.forEach((r, i) => {
      const zebra = i % 2 === 0 ? S_TD_CENTER : S_ALT;
      const zLeft = i % 2 === 0
        ? S_TD_LEFT
        : { ...S_TD_LEFT, fill: { patternType: "solid", fgColor: { rgb: "F6F8FB" } } };
      addRow(ws, row++, [
        { v: r.paramName,      s: zLeft },
        { v: r.rangeLabel,     s: zebra },
        { v: r.standardValue,  s: zebra },
        { v: r.standardUnit,   s: zebra },
        { v: r.ducValue,       s: zebra },
        { v: r.ducUnit,        s: zebra },
        { v: r.errorPct,       s: zebra },
        { v: r.stdUncMean,     s: zebra },
        { v: r.stdUncertainty, s: zebra },
        { v: r.ucRef,          s: zebra },
        { v: r.ucAccRef,       s: zebra },
        { v: r.ucLcDuc,        s: zebra },
        { v: r.combinedUc,     s: zebra },
        { v: r.effectiveDof,   s: zebra },
        { v: r.kFactor,        s: zebra },
        { v: r.expandedUnc,    s: zebra },
        { v: r.scopeClaimed,   s: zebra },
        { v: r.resultedUnc,    s: zebra },
        { v: r.percentUc,      s: zebra },
      ]);
    });
  }

  ws["!ref"] = `A1:${colLetter(nCols - 1)}${row - 1}`;
  return ws;
}

// ─── Excel export ───────────────────────────────────────────────────────────

export async function exportRawExcel(report: AnyReport): Promise<void> {
  const XLSX = await import("xlsx-js-style");
  const instruments: AnyReport[] = Array.isArray(report.instruments) ? report.instruments : [];

  const wb: any = XLSX.utils.book_new();
  const total = 1 + Math.max(instruments.length, 1);

  XLSX.utils.book_append_sheet(wb, buildPage1(report, instruments), "Page-1");

  if (instruments.length === 0) {
    const empty = buildResultsPage({}, 1, total);
    XLSX.utils.book_append_sheet(wb, empty, "Page-2");
  } else {
    instruments.forEach((inst, i) => {
      const sheet = buildResultsPage(inst, i + 1, total);
      XLSX.utils.book_append_sheet(wb, sheet, `Page-${i + 2}`.slice(0, 31));
    });
  }

  XLSX.writeFile(wb, `${reportBasename(report)}.xlsx`);
}

// ─── PDF: hidden iframe → browser print dialog ──────────────────────────────

function openPrintFrame(html: string, title: string) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, {
    position: "fixed", right: "0", bottom: "0",
    width: "0", height: "0", border: "0",
  });
  document.body.appendChild(iframe);

  const cleanup = () => window.setTimeout(() => {
    try { document.body.removeChild(iframe); } catch { /* noop */ }
  }, 500);

  iframe.onload = () => {
    try {
      const w = iframe.contentWindow;
      if (!w) return cleanup();
      try { w.document.title = title; } catch { /* noop */ }
      const onAfter = () => {
        w.removeEventListener("afterprint", onAfter);
        cleanup();
      };
      w.addEventListener("afterprint", onAfter);
      w.focus();
      w.print();
      window.setTimeout(cleanup, 60_000);
    } catch { cleanup(); }
  };

  const doc = iframe.contentWindow?.document;
  if (!doc) { document.body.removeChild(iframe); return; }
  doc.open(); doc.write(html); doc.close();
}

// ─── PDF (HTML) ─────────────────────────────────────────────────────────────

function metaRow(label: string, value: string, colspan = 1): string {
  return `<tr><th>${esc(label)}</th><td colspan="${colspan}">${esc(value)}</td></tr>`;
}

function renderInstrumentSection(inst: AnyReport, idx: number): string {
  const meta = inst?.meta ?? {};
  const refStds: AnyReport[] = Array.isArray(meta?.refStandards) ? meta.refStandards : [];
  const results = flattenResults(inst);

  const refRows = (refStds.length ? refStds : [{}, {}, {}]).map((r: AnyReport, i: number) => `
    <tr>
      <td class="ctr">${i + 1}</td>
      <td>${esc(safe(r?.name))}</td>
      <td>${esc(safe(r?.make))}</td>
      <td>${esc(safe(r?.modelType))}</td>
      <td class="ctr">${esc(safe(r?.srNo))}</td>
      <td class="ctr">${esc(safe(r?.idNo))}</td>
      <td class="ctr">${esc(fmtDate(r?.calDate))}</td>
      <td>${esc(safe(r?.traceabilityCertNo))}</td>
    </tr>`).join("");

  const resultRows = results.length ? results.map((r, i) => `
    <tr>
      <td class="left">${esc(r.paramName)}</td>
      <td class="ctr">${esc(r.rangeLabel)}</td>
      <td class="ctr">${esc(r.standardValue)}</td>
      <td class="ctr">${esc(r.standardUnit)}</td>
      <td class="ctr">${esc(r.ducValue)}</td>
      <td class="ctr">${esc(r.ducUnit)}</td>
      <td class="ctr">${esc(r.errorPct)}</td>
      <td class="ctr">${esc(r.stdUncMean)}</td>
      <td class="ctr">${esc(r.stdUncertainty)}</td>
      <td class="ctr">${esc(r.ucRef)}</td>
      <td class="ctr">${esc(r.ucAccRef)}</td>
      <td class="ctr">${esc(r.ucLcDuc)}</td>
      <td class="ctr">${esc(r.combinedUc)}</td>
      <td class="ctr">${esc(r.effectiveDof)}</td>
      <td class="ctr">${esc(r.kFactor)}</td>
      <td class="ctr">${esc(r.expandedUnc)}</td>
      <td class="ctr">${esc(r.scopeClaimed)}</td>
      <td class="ctr">${esc(r.resultedUnc)}</td>
      <td class="ctr">${esc(r.percentUc)}</td>
    </tr>`).join("") : `<tr><td colspan="19" class="muted ctr">No measurements recorded</td></tr>`;

  return `
    <section class="page">
      <div class="section-title">Instrument ${idx + 1}${meta?.nomenclature ? " — " + esc(safe(meta.nomenclature)) : ""}</div>

      <table class="meta">
        <tbody>
          <tr>
            <th>Make</th><td>${esc(safe(meta.make))}</td>
            <th>Model / Type</th><td>${esc(safe(meta.modelType))}</td>
            <th>Sr. No</th><td>${esc(safe(meta.slNo))}</td>
          </tr>
          <tr>
            <th>ID No</th><td>${esc(safe(meta.idNo))}</td>
            <th>Job ID</th><td>${esc(safe(meta.jobId))}</td>
            <th>Cal Date</th><td>${esc(fmtDate(meta.calDate))}</td>
          </tr>
          <tr>
            <th>Report Range</th><td>${esc(safe(meta.ducRange))}</td>
            <th>Cal Procedure</th><td>${esc(safe(meta.calibrationProcedure))}</td>
            <th>Method</th><td>${esc(safe(meta.calibrationMethod))}</td>
          </tr>
          <tr>
            <th>Other Details</th><td colspan="5">${esc(safe(meta.othersDetails))}</td>
          </tr>
        </tbody>
      </table>

      <div class="sub-title">Environmental Conditions</div>
      <table class="env">
        <thead>
          <tr>
            <th>Supply Voltage (V)</th>
            <th>Temperature (°C)</th>
            <th>Humidity (%RH)</th>
            <th>Voltage Area</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="ctr">${esc(safe(meta.supplyVoltage))}</td>
            <td class="ctr">${esc(safe(meta.temperature))}</td>
            <td class="ctr">${esc(safe(meta.humidity))}</td>
            <td class="ctr">${esc(safe(meta.voltageArea))}</td>
          </tr>
        </tbody>
      </table>

      <div class="sub-title">Reference Standards Used</div>
      <table class="ref">
        <thead>
          <tr>
            <th>#</th><th>Name</th><th>Make</th><th>Model</th>
            <th>Sr. No</th><th>ID No</th><th>Cal Due</th><th>Traceability Cert No</th>
          </tr>
        </thead>
        <tbody>${refRows}</tbody>
      </table>

      <div class="sub-title">Calibration Results</div>
      <div class="scroll-x">
      <table class="results">
        <thead>
          <tr>
            <th rowspan="2">Parameter</th>
            <th rowspan="2">Range</th>
            <th colspan="2">STANDARD</th>
            <th colspan="2">DUC</th>
            <th rowspan="2">Error %</th>
            <th colspan="6">Uncertainty Components</th>
            <th rowspan="2">Combined Uc</th>
            <th rowspan="2">Eff. DoF</th>
            <th rowspan="2">k</th>
            <th rowspan="2">Expanded Uc</th>
            <th rowspan="2">Scope Claimed</th>
            <th rowspan="2">Resulted Exp. U/C</th>
            <th rowspan="2">% U/C</th>
          </tr>
          <tr>
            <th>Nom.</th><th>Unit</th>
            <th>Mean</th><th>Unit</th>
            <th>Std U/c Mean</th>
            <th>Std Uncertainty</th>
            <th>U/c Ref Std</th>
            <th>U/c Acc Ref</th>
            <th>U/c L/c DUC</th>
            <th>—</th>
          </tr>
        </thead>
        <tbody>${resultRows}</tbody>
      </table>
      </div>
    </section>`;
}

/**
 * Returns a complete HTML document (with inline styles) that renders the raw
 * form data. `printable` variant hides the toolbar; the non-printable variant
 * shows an in-doc "Print / Save as PDF" button (used only when rendering into
 * the print iframe — the preview modal has its own toolbar).
 */
export function getRawPreviewHtml(report: AnyReport, opts: { showPrintButton?: boolean } = {}): string {
  const meta = report?.reportMeta ?? {};
  const sig  = report?.signatures ?? {};
  const instruments: AnyReport[] = Array.isArray(report.instruments) ? report.instruments : [];
  const cert = safe(meta?.certNo, "—");
  const customer = safe(meta?.customerName, "—");
  const now = new Date().toLocaleString("en-IN");

  const remarks: unknown = meta?.remarks;
  const remarksHtml = Array.isArray(remarks) && remarks.length
    ? `<div class="sub-title">Remarks</div>
       <ol class="remarks">${remarks.map((r) => `<li>${esc(safe(r))}</li>`).join("")}</ol>` : "";

  const instrumentsHtml = instruments.length
    ? instruments.map((inst, i) => renderInstrumentSection(inst, i)).join("")
    : `<p class="muted ctr">No instruments recorded</p>`;

  const toolbar = opts.showPrintButton
    ? `<div class="toolbar"><button onclick="window.print()">Print / Save as PDF</button></div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" />
<title>${esc(cert)} — Calibration Certificate (Raw)</title>
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: "Calibri","Segoe UI",Arial,sans-serif;
    color: #000; padding: 12px;
    background: #fff; font-size: 8.5pt;
    overflow-x: auto;
  }
  @media print {
    body { padding: 0; }
    .sheet { margin: 0; border: 0; }
    .toolbar { display: none; }
    .page { page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    table, .section-title, .sub-title { page-break-inside: avoid; }
  }
  .sheet { width: 1080px; max-width: 100%; margin: 0 auto; background: #fff; padding: 14px 16px;
    border: 1px solid #000; }
  @media (max-width: 900px) {
    body { padding: 6px; overflow-x: auto; }
    .sheet { width: 1040px; max-width: none; }
  }
  .toolbar { position: fixed; top: 12px; right: 12px; z-index: 100; }
  .toolbar button { background: #000; color: #fff; border: 0; padding: 6px 12px;
    font-weight: 700; cursor: pointer; font-size: 10pt; }

  .doc-title {
    color: #000; padding: 6px 8px; text-align: center;
    font-size: 12pt; font-weight: 700; letter-spacing: 0.02em;
    border: 1px solid #000;
  }
  .doc-sub {
    color: #000; padding: 3px 8px; text-align: center; font-size: 8.5pt;
    border: 1px solid #000; border-top: 0; margin-bottom: 10px; font-weight: 700;
  }

  .section-title {
    color: #000; padding: 4px 8px; font-weight: 700; font-size: 10.5pt;
    text-align: center; margin-top: 14px;
    border: 1px solid #000;
  }
  .sub-title {
    color: #000; padding: 3px 8px; font-weight: 700; font-size: 9.5pt;
    margin-top: 8px; border: 1px solid #000;
  }

  table { width: 100%; border-collapse: collapse; margin-top: 0; }
  th, td { border: 1px solid #000; padding: 3px 5px; vertical-align: middle; }
  th { color: #000; font-weight: 700; font-size: 8.5pt; text-align: center; }
  td { font-size: 8.5pt; }
  td.ctr { text-align: center; }
  td.left { text-align: left; }

  table.meta th { text-align: left; width: 100px; }
  table.meta td { text-align: left; }

  table.results { font-size: 7.5pt; }
  table.results th, table.results td { padding: 2px 4px; }
  table.results thead th { font-weight: 700; }
  table.results thead tr:nth-child(2) th { font-size: 7pt; font-weight: 700; }

  .muted { color: #666; font-style: italic; }
  .ctr   { text-align: center; }

  /* Wide results table scrolls on screen; unwraps in print */
  .scroll-x { overflow-x: auto; max-width: 100%; }
  @media print { .scroll-x { overflow-x: visible; max-width: none; } }

  .signatures { display: flex; justify-content: space-between; margin-top: 16px;
    border-top: 1px solid #000; padding-top: 10px; }
  .sig-block { flex: 1; }
  .sig-label { font-size: 7.5pt; color: #000; font-weight: 700;
    letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 2px; }
  .sig-name { font-size: 10pt; font-weight: 600; }
  .sig-block.right { text-align: right; }

  ol.remarks { padding-left: 18px; margin: 3px 0 0; }
  ol.remarks li { margin-bottom: 2px; font-size: 8.5pt; }
</style>
</head>
<body>
${toolbar}
<div class="sheet">
  <div class="doc-title">CALIBRATION CERTIFICATE — DRAFT (RAW FORM DATA)</div>
  <div class="doc-sub">${esc(COMPANY)} · ${esc(LAB)}</div>

  <div class="section-title">Report Details</div>
  <table class="meta">
    <tbody>
      <tr>
        <th>Certificate No.</th><td>${esc(cert)}</td>
        <th>Issue Date</th><td>${esc(fmtDate(meta.dateOfCalibration))}</td>
        <th>Exported</th><td>${esc(now)}</td>
      </tr>
      <tr>
        <th>DUC Received</th><td>${esc(fmtDate(meta.ducReceivedDate))}</td>
        <th>Date of Calibration</th><td>${esc(fmtDate(meta.dateOfCalibration))}</td>
        <th>Calibration Due</th><td>${esc(fmtDate(meta.calibrationDueDate))}</td>
      </tr>
      <tr>
        <th>Customer</th><td colspan="5">${esc(customer)}</td>
      </tr>
      <tr>
        <th>Address</th><td colspan="5">${esc(safe(meta.customerAddress))}</td>
      </tr>
      <tr>
        <th>Customer Ref.</th><td>${esc(safe(meta.customerRefNo))}</td>
        <th>Location</th><td>${esc(meta.calibrationLocation === "onsite" ? "At Site" : "At Lab")}</td>
        <th>Interval</th><td>${esc(safe(meta.calibrationInterval))} mo.</td>
      </tr>
    </tbody>
  </table>

  ${remarksHtml}

  ${instrumentsHtml}

  <div class="signatures">
    <div class="sig-block">
      <div class="sig-label">Calibrated By</div>
      <div class="sig-name">${esc(safe((sig as any)?.calibratedBy?.name ?? (sig as any)?.calibratedBy?.email, "—"))}</div>
    </div>
    <div class="sig-block right">
      <div class="sig-label">Verified By</div>
      <div class="sig-name">${esc(safe((sig as any)?.verifiedBy?.name ?? (sig as any)?.verifiedBy?.email, "—"))}</div>
    </div>
  </div>
</div>
</body></html>`;
}

/**
 * Requests a server-rendered raw-data PDF for `reportId` (must be a persisted
 * report — local drafts aren't supported), then triggers a download of the
 * returned signed URL. Falls back to opening the URL in a new tab if the
 * anchor click download hint is ignored by the browser.
 */
export async function exportRawPdf(reportId: string): Promise<void> {
  if (!reportId || String(reportId).startsWith("local-")) {
    throw new Error("Save the report first — server PDF export needs a persisted report.");
  }
  const { authClient } = await import("@/lib/api-client");
  const { EP_RAW_CALIBRATION_PDF } = await import("@/lib/endpoints");
  const { data } = await authClient.post<{ url: string; filename: string }>(
    EP_RAW_CALIBRATION_PDF(reportId),
    undefined,
    { timeout: 150_000 },
  );
  const a = document.createElement("a");
  a.href = data.url;
  a.download = data.filename ?? "calibration_raw.pdf";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Builds an HTML "Excel preview" — visually mirrors the workbook layout using
 * the same monochrome palette. Not identical to opening the .xlsx in Excel,
 * but shows the user exactly what fields will be present and how they're laid out.
 */
export function getExcelPreviewHtml(report: AnyReport): string {
  const meta = report?.reportMeta ?? {};
  const sig  = report?.signatures ?? {};
  const instruments: AnyReport[] = Array.isArray(report.instruments) ? report.instruments : [];
  const inst0 = instruments[0] ?? {};
  const m0    = inst0?.meta ?? {};

  const page1 = `
    <div class="xl-sheet-label">Page-1</div>
    <table class="xl">
      <tbody>
        <tr><td colspan="10" class="xl-title">CALIBRATION CERTIFICATE — DRAFT (Raw Form Data)</td></tr>
        <tr><td colspan="10" class="xl-sub">${esc(COMPANY)} · ${esc(LAB)}</td></tr>
        <tr>
          <td class="xl-label" colspan="2">Certificate No.</td><td colspan="4">${esc(safe(meta.certNo))}</td>
          <td class="xl-label" colspan="2">Issue Date</td><td colspan="2">${esc(fmtDate(meta.dateOfCalibration))}</td>
        </tr>
        <tr>
          <td class="xl-label" colspan="2">DUC Received</td><td colspan="2">${esc(fmtDate(meta.ducReceivedDate))}</td>
          <td class="xl-label" colspan="2">Date of Calibration</td><td colspan="2">${esc(fmtDate(meta.dateOfCalibration))}</td>
          <td class="xl-label">Cal Due</td><td>${esc(fmtDate(meta.calibrationDueDate))}</td>
        </tr>
        <tr>
          <td class="xl-label" colspan="2">Customer</td><td colspan="4">${esc(safe(meta.customerName))}</td>
          <td class="xl-label" colspan="2">Customer Ref.</td><td colspan="2">${esc(safe(meta.customerRefNo))}</td>
        </tr>
        <tr>
          <td class="xl-label" colspan="2">Address</td><td colspan="8">${esc(safe(meta.customerAddress))}</td>
        </tr>
        <tr><td colspan="10" class="xl-section">Details of the DUC to be Calibrated</td></tr>
        <tr>
          <td class="xl-th">Name of DUC</td>
          <td class="xl-th" colspan="2">Serial No.</td>
          <td class="xl-th">Make</td>
          <td class="xl-th" colspan="2">Model</td>
          <td class="xl-th" colspan="2">Range</td>
          <td class="xl-th" colspan="2">Least Count</td>
        </tr>
        <tr>
          <td>${esc(safe(m0.nomenclature))}</td>
          <td colspan="2">${esc(safe(m0.slNo))}</td>
          <td>${esc(safe(m0.make))}</td>
          <td colspan="2">${esc(safe(m0.modelType))}</td>
          <td colspan="2">${esc(safe(m0.ducRange))}</td>
          <td colspan="2">${esc(safe(m0.othersDetails, "Refer Cal Results"))}</td>
        </tr>
        <tr><td colspan="10" class="xl-section">Environmental Conditions</td></tr>
        <tr>
          <td class="xl-th" colspan="2">Supply Voltage (V)</td>
          <td class="xl-th" colspan="2">Temperature (°C)</td>
          <td class="xl-th" colspan="2">Humidity (%RH)</td>
          <td class="xl-th" colspan="4">Voltage Area</td>
        </tr>
        <tr>
          <td class="ctr" colspan="2">${esc(safe(m0.supplyVoltage))}</td>
          <td class="ctr" colspan="2">${esc(safe(m0.temperature))}</td>
          <td class="ctr" colspan="2">${esc(safe(m0.humidity))}</td>
          <td class="ctr" colspan="4">${esc(safe(m0.voltageArea))}</td>
        </tr>
        <tr><td colspan="10" class="xl-section">Signatures</td></tr>
        <tr>
          <td class="xl-label" colspan="3">Calibrated By</td>
          <td colspan="2">${esc(safe((sig as any)?.calibratedBy?.name ?? (sig as any)?.calibratedBy?.email))}</td>
          <td class="xl-label" colspan="2">Verified By</td>
          <td colspan="3">${esc(safe((sig as any)?.verifiedBy?.name ?? (sig as any)?.verifiedBy?.email))}</td>
        </tr>
      </tbody>
    </table>`;

  const resultsPages = (instruments.length ? instruments : [{}]).map((inst, i) => {
    const results = flattenResults(inst);
    const rows = results.length ? results.map((r, ri) => `
      <tr class="${ri % 2 ? "alt" : ""}">
        <td>${esc(r.paramName)}</td>
        <td class="ctr">${esc(r.rangeLabel)}</td>
        <td class="ctr">${esc(r.standardValue)}</td>
        <td class="ctr">${esc(r.standardUnit)}</td>
        <td class="ctr">${esc(r.ducValue)}</td>
        <td class="ctr">${esc(r.ducUnit)}</td>
        <td class="ctr">${esc(r.errorPct)}</td>
        <td class="ctr">${esc(r.stdUncMean)}</td>
        <td class="ctr">${esc(r.stdUncertainty)}</td>
        <td class="ctr">${esc(r.ucRef)}</td>
        <td class="ctr">${esc(r.ucAccRef)}</td>
        <td class="ctr">${esc(r.ucLcDuc)}</td>
        <td class="ctr">${esc(r.combinedUc)}</td>
        <td class="ctr">${esc(r.effectiveDof)}</td>
        <td class="ctr">${esc(r.kFactor)}</td>
        <td class="ctr">${esc(r.expandedUnc)}</td>
        <td class="ctr">${esc(r.scopeClaimed)}</td>
        <td class="ctr">${esc(r.resultedUnc)}</td>
        <td class="ctr">${esc(r.percentUc)}</td>
      </tr>`).join("") : `<tr><td colspan="19" class="muted ctr">No measurements</td></tr>`;

    const meta = inst?.meta ?? {};
    return `
      <div class="xl-sheet-label">Page-${i + 2}</div>
      <div class="scroll-x">
      <table class="xl xl-results">
        <thead>
          <tr><td colspan="19" class="xl-title">Calibration Results — Instrument ${i + 1}${meta?.nomenclature ? " · " + esc(safe(meta.nomenclature)) : ""}</td></tr>
          <tr><td colspan="19" class="xl-sub">Make: ${esc(safe(meta.make))} · Model: ${esc(safe(meta.modelType))} · Sr No: ${esc(safe(meta.slNo))}</td></tr>
          <tr>
            <th>Parameter</th><th>Range</th>
            <th>Nom. (STD)</th><th>Unit</th>
            <th>DUC (Mean)</th><th>Unit</th>
            <th>Error %</th>
            <th>Std U/c of Mean</th><th>Std Uncertainty</th>
            <th>U/c Ref Std</th><th>U/c Acc Ref</th><th>U/c L/c DUC</th>
            <th>Combined Uc</th><th>Eff. DoF</th><th>k</th>
            <th>Expanded Uc</th><th>Scope Claimed</th><th>Resulted Exp. U/C</th><th>% U/C</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8" /><title>Excel Preview</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: "Calibri","Segoe UI",Arial,sans-serif;
    color: #000; padding: 12px; background: #fff; font-size: 8.5pt;
    overflow-x: auto; }
  @media (max-width: 900px) { body { padding: 6px; } }

  .xl-sheet-label {
    display: inline-block; color: #000; font-weight: 700;
    padding: 3px 8px; font-size: 8.5pt; letter-spacing: 0.06em;
    margin-top: 14px; border: 1px solid #000;
  }
  .xl-sheet-label:first-child { margin-top: 0; }

  table.xl { width: 100%; border-collapse: collapse; background: #fff;
    border: 1px solid #000; margin-top: 4px; }
  .xl td, .xl th { border: 1px solid #000; padding: 3px 6px; font-size: 8.5pt;
    vertical-align: middle; color: #000; }
  .xl th { font-weight: 700; text-align: center; }

  .xl-title { font-weight: 700;
    font-size: 12pt; text-align: center; padding: 6px !important; }
  .xl-sub { text-align: center; font-weight: 700;
    font-size: 8.5pt; padding: 3px !important; }
  .xl-section { text-align: center; font-weight: 700; padding: 4px !important; }
  .xl-label { font-weight: 700; }
  .xl-th { font-weight: 700; text-align: center; font-size: 8pt; }

  .xl-results { font-size: 7.5pt; }
  .xl-results th { font-size: 7.5pt; padding: 2px 4px; font-weight: 700; }
  .xl-results td { padding: 2px 4px; }

  .scroll-x { overflow-x: auto; max-width: 100%; }
  @media print { .scroll-x { overflow-x: visible; max-width: none; } }

  .ctr { text-align: center; }
  .muted { color: #666; font-style: italic; }
</style>
</head>
<body>
  ${page1}
  ${resultsPages}
</body></html>`;
}
