import path from "path";
import CalibrationReport from "../db/models/calibration.js";
import { Template, TemplateVersion } from "../db/models/template.js";
import { renderTemplate, renderTemplateString, renderHtmlToPdf } from "../lib/pdf.js";
import { uploadPdfToS3 } from "../lib/s3.js";
import { readImageAsBase64, formatDate, buildCalibrationS3Key } from "../lib/utils.js";
import { CERT_DEFAULTS } from "../config.js";
import logger from "../lib/logger.js";

const log = logger("calibration");

const TEMPLATE_KEY = "calibration-certificate";

/**
 * Loads the active calibration template body from MongoDB. Returns `null`
 * when no template/version is set up — caller falls back to the on-disk file.
 *
 * @returns {Promise<string|null>}
 */
async function loadActiveTemplateBody() {
  try {
    const tpl = await Template.findOne({ key: TEMPLATE_KEY }).select("activeVersionId").lean();
    if (!tpl?.activeVersionId) return null;
    const version = await TemplateVersion.findById(tpl.activeVersionId).select("body versionNumber").lean();
    if (!version) return null;
    log.info("loaded template from DB", { versionNumber: version.versionNumber, versionId: String(tpl.activeVersionId) });
    return version.body;
  } catch (err) {
    log.warn("failed to load template from DB — falling back to file", { error: err.message });
    return null;
  }
}

// ─── Template data builders ───────────────────────────────────────────────────

/**
 * Maps a single measurement row to the columns the EJS template expects.
 *
 * @param {{ nomValue?: string, computed?: object }} measurement
 * @param {string} unit - Physical unit for this parameter (e.g. `"V"`).
 * @returns {object}
 */
function buildMeasurementRow(measurement, unit) {
  const fmt = (val) => (val != null ? Number(val).toFixed(4) : "");
  const ducUnit = (measurement.readingUnits ?? []).find((u) => u) || unit;
  return {
    standardValue:       measurement.nomValue ?? "",
    standardUnit:        unit,
    ducValue:            fmt(measurement.computed?.meanValue),
    ducUnit,
    errorValue:          fmt(measurement.computed?.error),
    errorUnit:           unit,
    expandedUncertainty: fmt(measurement.computed?.percentUc),
  };
}

/**
 * Converts an instrument's parameters array to the `calibrationResults` shape
 * the EJS template expects.
 *
 * @param {object[]} parameters - Parameter objects from the DB instrument.
 * @returns {object[]}
 */
function buildCalibrationResults(parameters = []) {
  return parameters.map((param) => ({
    parameter: param.name,
    ranges: (param.ranges ?? []).map((range) => ({
      label: range.label,
      rows:  (range.measurements ?? []).map((m) => buildMeasurementRow(m, param.unit ?? "")),
    })),
  }));
}

/**
 * Builds the `referenceStandards` array for the EJS template from the
 * instrument's `refStandard` field.
 * Returns an empty array when no reference data is present.
 *
 * @param {object} [ref={}] - `instrument.refStandard` from the DB.
 * @returns {object[]}
 */
function buildReferenceStandards(ref = {}) {
  if (!ref.name) return [];
  return [{
    name:               ref.name,
    makeModel:          [ref.make, ref.modelType].filter(Boolean).join(" / "),
    validUpto:          formatDate(validUptoFromDueDate(ref.calDueDate)),
    traceabilityCertNo: ref.traceability ?? "",
    idNo:               "",
    srNo:               ref.srNo ?? "",
  }];
}

/**
 * Per client spec: the final report's "Valid Up To" is one day before the
 * reference standard's calibration due date.
 *
 * @param {Date|string|null|undefined} due
 * @returns {Date|null}
 */
/**
 * Builds the "Identification / Serial Number" cell for the DUC table.
 * Uses idNoInReport / slNoInReport flags set by the engineer in the form.
 * Falls back to slNo if neither flag is set (backwards compat).
 */
function buildDucIdentifier(inst) {
  const parts = [];
  if (inst.idNoInReport && inst.idNo) parts.push(`ID: ${inst.idNo}`);
  if (inst.slNoInReport && inst.slNo) parts.push(`SN: ${inst.slNo}`);
  if (parts.length) return parts.join(" / ");
  return inst.slNo ?? "";
}

function validUptoFromDueDate(due) {
  if (!due) return null;
  const d = new Date(due);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() - 1);
  return d;
}

/**
 * Builds the complete data object passed to the calibration EJS template for
 * one instrument in a report.
 *
 * @param {object} report    - Populated `CalibrationReport` document (lean).
 * @param {number} instIndex - Index of the instrument to render (default `0`).
 * @returns {object} Template variables.
 */
function buildCalibrationTemplateData(report, instIndex = 0) {
  const inst = report.instruments?.[instIndex] ?? {};
  const ref  = inst.refStandard ?? {};

  return {
    ...CERT_DEFAULTS,

    logoUrl: readImageAsBase64("logo2.png"),
    qrUrl:   readImageAsBase64("qr.png"),

    // Certificate metadata
    certificateNo:        report.certNo || report.csrNo || "",
    certificateIssueDate: formatDate(report.createdAt),

    // Dates
    ducReceivedDate:    formatDate(report.ducReceivedDate),
    dateOfCalibration:  formatDate(report.dateOfCalibration || inst.calDate),
    calibrationDueDate: formatDate(report.calibrationDueDate),
    calibrationDueDateDisplay: (() => {
      const cal = new Date(report.dateOfCalibration || inst.calDate);
      const due = new Date(report.calibrationDueDate);
      if (!isNaN(cal.getTime()) && !isNaN(due.getTime())) {
        const threshold = new Date(cal);
        threshold.setMonth(threshold.getMonth() + 12);
        if (due > threshold) return "As Per Client Requirement";
      }
      return formatDate(report.calibrationDueDate);
    })(),
    validUpto: (() => {
      const cal = new Date(report.dateOfCalibration || inst.calDate);
      const due = new Date(report.calibrationDueDate);
      if (!isNaN(cal.getTime()) && !isNaN(due.getTime())) {
        const threshold = new Date(cal);
        threshold.setMonth(threshold.getMonth() + 12);
        if (due > threshold) return "As Per Client Requirement";
      }
      return formatDate(validUptoFromDueDate(report.calibrationDueDate));
    })(),

    // Customer
    customerReferenceNo: report.customerRefNo   ?? "",
    customerName:        report.customerName    ?? "",
    customerAddress:     report.customerAddress ?? "",

    // Device under calibration (DUC)
    ducName:               inst.nomenclature ?? "",
    ducSerialNo:           buildDucIdentifier(inst),
    ducMake:               inst.make         ?? "",
    ducModel:              inst.modelType    ?? "",
    locationOfCalibration: report.calibrationLocation === "onsite" ? "At Site" : "At Lab",

    // Environmental conditions recorded during calibration
    duringCalibrationTemp:     inst.environmental?.temperature ?? "",
    duringCalibrationHumidity: inst.environmental?.humidity    ?? "",

    // DUC section — editable fields
    ducRange:             inst.ducRange             || "As Per Instrument Spec.",
    calibrationProcedure: inst.calibrationProcedure || "",
    methodOfCalibration:  inst.calibrationMethod    || "Direct Method",

    // Standards & measurement results
    referenceStandards: buildReferenceStandards(ref),
    calibrationResults: buildCalibrationResults(inst.parameters),

    // Signatories
    calibratedByName: report.signatures?.calibratedBy?.signatureName || report.signatures?.calibratedBy?.name || "",
    approvedByName:   report.signatures?.verifiedBy?.signatureName   || report.signatures?.verifiedBy?.name   || "",
  };
}

// ─── Job handler ──────────────────────────────────────────────────────────────

/**
 * Processes a calibration report PDF job.
 *
 * Generates one PDF per instrument in the report, uploads each to S3 under
 * `calibration/<csrNo>_<make>_<model>[_N].pdf`, then saves all resulting
 * file paths back to the report document.
 *
 * @param {string} reportId - MongoDB `_id` of the `CalibrationReport` document.
 * @returns {Promise<void>}
 */
export async function handleCalibrationJob(reportId) {
  log.info("processing job", { reportId });

  const report = await CalibrationReport.findById(reportId)
    .populate("signatures.calibratedBy", "name signatureName")
    .populate("signatures.verifiedBy",   "name signatureName")
    .lean();

  if (!report) {
    log.warn("report not found — skipping", { reportId });
    return;
  }

  const templatePath = path.join(process.cwd(), "templates", "electrical-calibration.ejs");
  const templateBody = await loadActiveTemplateBody();
  const instruments  = report.instruments?.length ? report.instruments : [{}];
  const filePaths    = [];

  log.info("starting instrument loop", {
    reportId, csrNo: report.csrNo, total: instruments.length,
    source: templateBody ? "db" : "file",
  });

  for (let i = 0; i < instruments.length; i++) {
    const data  = buildCalibrationTemplateData(report, i);
    const html  = templateBody
      ? renderTemplateString(templateBody, data)
      : await renderTemplate(templatePath, data);
    const pdf   = await renderHtmlToPdf(html);
    const s3Key = buildCalibrationS3Key(report.csrNo, instruments[i], i, instruments.length);

    await uploadPdfToS3(pdf, s3Key);
    filePaths.push(s3Key);
    log.info("instrument uploaded", { reportId, instrument: i + 1, total: instruments.length, s3Key });
  }

  await CalibrationReport.findByIdAndUpdate(reportId, { filePaths });
  log.info("job complete", { reportId, filePaths });
}
