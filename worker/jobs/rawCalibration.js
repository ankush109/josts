/**
 * @file rawCalibration.js
 * Worker job that renders a calibration report's raw form data (all fields,
 * every measurement, every uncertainty column) into a monochrome PDF and
 * uploads it to S3.
 *
 * Consumed by the shared queue dispatcher in `index.js` (`type: "raw-calibration"`).
 */

import path from "path";
import { fileURLToPath } from "url";
import CalibrationReport from "../db/models/calibration.js";
import { renderTemplate, renderHtmlToPdf } from "../lib/pdf.js";
import { uploadPdfToS3 } from "../lib/s3.js";
import { formatDate } from "../lib/utils.js";
import logger from "../lib/logger.js";

const log = logger("raw-calibration");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(__dirname, "..", "templates", "raw-form-data.ejs");

// ─── helpers ────────────────────────────────────────────────────────────────

function safe(v, fallback = "") {
  if (v === null || v === undefined) return fallback;
  const s = Array.isArray(v)
    ? v.filter((x) => x != null && String(x).trim() !== "").join(" | ")
    : String(v);
  return s.trim() ? s : fallback;
}

function num(v, digits = 4) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(digits) : safe(v);
}

/** Flatten every measurement in an instrument into row objects for the results table. */
function flattenResults(inst) {
  const rows = [];
  const params = Array.isArray(inst?.params) ? inst.params : [];
  for (const p of params) {
    const pName = safe(p?.name);
    const pUnit = safe(p?.unit);
    const ranges = Array.isArray(p?.ranges) ? p.ranges : [];
    for (const r of ranges) {
      const rLabel = safe(r?.label);
      const meas = Array.isArray(r?.measurements) ? r.measurements : [];
      for (const m of meas) {
        const c = m?.computed ?? {};
        const nomVal = safe(m?.nomValue);
        const nomUnit = safe(m?.nomUnit) || pUnit;
        const readings = Array.isArray(m?.readings) ? m.readings : [];
        const nums = readings.map((v) => Number(String(v).replace(/[^\d.\-eE]/g, ""))).filter(Number.isFinite);
        const meanFallback = nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(4) : "";
        rows.push({
          paramName:      pName,
          paramUnit:      pUnit,
          rangeLabel:     rLabel,
          standardValue:  nomVal,
          standardUnit:   nomUnit,
          ducValue:       Number.isFinite(c?.meanValue) ? num(c.meanValue) : meanFallback,
          ducUnit:        nomUnit,
          errorPct:       Number.isFinite(c?.error)               ? num(c.error, 4)              : "",
          stdUncMean:     Number.isFinite(c?.stdUcMean)           ? num(c.stdUcMean, 6)          : "",
          stdUncertainty: Number.isFinite(c?.stdUncertainty)      ? num(c.stdUncertainty, 6)     : "",
          ucRef:          Number.isFinite(c?.ucOfRefStd)          ? num(c.ucOfRefStd, 6)         : "",
          ucAccRef:       Number.isFinite(c?.ucDueToAccOfRefStd)  ? num(c.ucDueToAccOfRefStd, 6) : "",
          ucLcDuc:        Number.isFinite(c?.ucDueToLcOfDuc)      ? num(c.ucDueToLcOfDuc, 6)     : "",
          combinedUc:     Number.isFinite(c?.combinedUc)          ? num(c.combinedUc, 6)         : "",
          effectiveDof:   c?.effectiveDof == null ? "" : num(c.effectiveDof, 2),
          kFactor:        Number.isFinite(c?.kFactor)             ? num(c.kFactor, 2)            : "",
          expandedUnc:    Number.isFinite(c?.expandedUncertainty) ? num(c.expandedUncertainty, 6): "",
          scopeClaimed:   Number.isFinite(c?.scopeClaimed)        ? num(c.scopeClaimed, 6)       : "",
          resultedUnc:    Number.isFinite(c?.resultedExpandedUc)  ? num(c.resultedExpandedUc, 6) : "",
          percentUc:      Number.isFinite(c?.percentUc)           ? num(c.percentUc, 4)          : "",
        });
      }
    }
  }
  return rows;
}

function buildTemplateData(report) {
  const meta = report?.reportMeta ?? {};
  const instruments = (Array.isArray(report?.instruments) ? report.instruments : []).map((inst) => {
    const m = inst?.meta ?? {};
    const refStds = (Array.isArray(m?.refStandards) ? m.refStandards : []).map((r) => ({
      name:               safe(r?.name),
      make:               safe(r?.make),
      modelType:          safe(r?.modelType),
      srNo:               safe(r?.srNo),
      idNo:               safe(r?.idNo),
      calDateFmt:         formatDate(r?.calDate),
      traceabilityCertNo: safe(r?.traceabilityCertNo),
    }));
    return {
      meta: {
        make:                 safe(m.make),
        modelType:            safe(m.modelType),
        slNo:                 safe(m.slNo),
        idNo:                 safe(m.idNo),
        jobId:                safe(m.jobId),
        nomenclature:         safe(m.nomenclature),
        calDateFmt:           formatDate(m.calDate),
        ducRange:             safe(m.ducRange),
        calibrationProcedure: safe(m.calibrationProcedure),
        calibrationMethod:    safe(m.calibrationMethod),
        othersDetails:        safe(m.othersDetails),
        supplyVoltage:        safe(m.supplyVoltage),
        temperature:          safe(m.temperature),
        humidity:             safe(m.humidity),
        voltageArea:          safe(m.voltageArea),
      },
      refStandards: refStds,
      results:      flattenResults(inst),
    };
  });

  const remarks = Array.isArray(meta?.remarks)
    ? meta.remarks.map((r) => safe(r)).filter(Boolean)
    : [];

  const sig = report?.signatures ?? {};
  return {
    report,
    reportMeta: {
      certNo:                  safe(meta.certNo),
      customerName:            safe(meta.customerName),
      customerAddress:         safe(meta.customerAddress),
      customerRefNo:           safe(meta.customerRefNo),
      ducReceivedDateFmt:      formatDate(meta.ducReceivedDate),
      dateOfCalibrationFmt:    formatDate(meta.dateOfCalibration),
      calibrationDueDateFmt:   formatDate(meta.calibrationDueDate),
      calibrationInterval:     safe(meta.calibrationInterval, "12"),
      calibrationLocationLabel: meta.calibrationLocation === "onsite" ? "At Site" : "At Lab",
    },
    remarks,
    instruments,
    signatures: {
      calibratedBy: safe(sig?.calibratedBy?.name ?? sig?.calibratedBy?.email, "—"),
      verifiedBy:   safe(sig?.verifiedBy?.name   ?? sig?.verifiedBy?.email,   "—"),
    },
    exportedAtFmt: new Date().toLocaleString("en-IN"),
  };
}

function buildS3Key(report) {
  const cert = safe(report?.reportMeta?.certNo, String(report._id));
  const slug = cert.replace(/[^\w.-]+/g, "-");
  const stamp = Date.now();
  return `calibration/${String(report._id)}/raw_${slug}_${stamp}.pdf`;
}

// ─── main handler ───────────────────────────────────────────────────────────

/**
 * Renders the raw form-data PDF for a report and uploads it to S3.
 * On success sets `rawPdfPath` on the report; on failure sets
 * `rawPdfFailedAt` + `rawPdfError` so the server's polling loop can surface
 * the failure to the client.
 *
 * @param {string} reportId
 * @returns {Promise<void>}
 */
export async function handleRawCalibrationJob(reportId) {
  log.info("start", { reportId });

  const report = await CalibrationReport.findById(reportId)
    .populate("createdBy",               "name email signatureName")
    .populate("signatures.calibratedBy", "name email signatureName")
    .populate("signatures.verifiedBy",   "name email signatureName")
    .lean();

  if (!report) {
    throw new Error(`Report ${reportId} not found`);
  }

  const data = buildTemplateData(report);

  log.debug("rendering template", { reportId });
  const html = await renderTemplate(TEMPLATE_PATH, data);

  log.debug("rendering pdf", { reportId, htmlBytes: html.length });
  const pdf = await renderHtmlToPdf(html);

  const s3Key = buildS3Key(report);
  await uploadPdfToS3(pdf, s3Key);

  await CalibrationReport.updateOne(
    { _id: reportId },
    { $set: { rawPdfPath: s3Key, rawPdfFailedAt: null, rawPdfError: "" } },
  );

  log.info("done", { reportId, s3Key, bytes: pdf.length });
}
