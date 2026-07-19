import path from "path";
import QRCode from "qrcode";
import CalibrationReport from "../db/models/calibration.js";
import { Template, TemplateVersion } from "../db/models/template.js";
import { renderTemplate, renderTemplateString, renderHtmlToPdf } from "../lib/pdf.js";
import { uploadPdfToS3 } from "../lib/s3.js";
import { readImageAsBase64, formatDate, buildCalibrationS3Key } from "../lib/utils.js";
import { CERT_DEFAULTS, LETTER_HEAD_VARIANTS, PUBLIC_APP_URL } from "../config.js";
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
 * Builds the `referenceStandards` array for the EJS template.
 * Prefers `inst.refStandards` (multi-standard array) when present;
 * falls back to the legacy `inst.refStandard` singular object.
 *
 * @param {object} inst - Instrument document from the DB.
 * @returns {object[]}
 */
function buildReferenceStandards(inst) {
  const multi = inst.refStandards ?? [];
  if (multi.length > 0) {
    return multi.map((std) => ({
      name:               std.name || "",
      makeModel:          [std.make, std.modelType].filter(Boolean).join("/"),
      validUpto:          formatDate(validUptoFromDueDate(std.calDueDate)),
      traceabilityCertNo: std.traceability ?? "",
      idNo:               std.idNo || "",
      srNo:               std.srNo || "",
    }));
  }
  // Legacy fallback: single refStandard object
  const ref = inst.refStandard ?? {};
  if (!ref.name) return [];
  return [{
    name:               ref.name,
    makeModel:          [ref.make, ref.modelType].filter(Boolean).join("/"),
    validUpto:          formatDate(validUptoFromDueDate(ref.calDueDate)),
    traceabilityCertNo: ref.traceability ?? "",
    idNo:               ref.idNo || "",
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
async function buildCalibrationTemplateData(report, instIndex = 0) {
  const inst = report.instruments?.[instIndex] ?? {};

  // Letterhead variant — falls back to plain Kolkata for old reports.
  const letterHeadKey = LETTER_HEAD_VARIANTS[report.letterHeadStyle]
    ? report.letterHeadStyle
    : "kol";
  const letterHead = LETTER_HEAD_VARIANTS[letterHeadKey];

  // Per-report QR — encodes the deep-link so scanning takes you to the
  // report. Only generated when the chosen letterhead needs one.
  let qrUrl = "";
  if (letterHead.showQr && report._id) {
    try {
      const reportUrl = `${PUBLIC_APP_URL}/calibration/${String(report._id)}`;
      qrUrl = await QRCode.toDataURL(reportUrl, {
        errorCorrectionLevel: "M",
        margin: 1,
        width: 220,
      });
    } catch (err) {
      log.warn("QR generation failed — proceeding without QR", { error: err.message, reportId: String(report._id) });
    }
  }

  return {
    ...CERT_DEFAULTS,

    logoUrl: readImageAsBase64("logo2.png"),
    qrUrl,

    // Letterhead variant + related flags for the EJS template
    letterHeadStyle: letterHeadKey,
    letterHeadAddress: letterHead.address,
    showNabl:          Boolean(letterHead.nablCertNo),
    nablCertNo:        letterHead.nablCertNo,
    nablBadgeUrl:      readImageAsBase64("nabl.png"), // optional — template hides badge img when empty

    // Certificate metadata
    certificateNo:        report.certNo || report.csrNo || "",
    certificateIssueDate: formatDate(report.createdAt),

    // Dates
    ducReceivedDate:    formatDate(report.ducReceivedDate),
    dateOfCalibration:  formatDate(report.dateOfCalibration || inst.calDate),
    calibrationDueDate: formatDate(report.calibrationDueDate),
    isClientRequirement: (() => {
      const cal = new Date(report.dateOfCalibration || inst.calDate);
      const due = new Date(report.calibrationDueDate);
      if (!isNaN(cal.getTime()) && !isNaN(due.getTime())) {
        const threshold = new Date(cal);
        threshold.setMonth(threshold.getMonth() + 12);
        return due > threshold;
      }
      return false;
    })(),
    validUpto: formatDate(validUptoFromDueDate(report.calibrationDueDate)),

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
    referenceStandards: buildReferenceStandards(inst),
    calibrationResults: buildCalibrationResults(inst.parameters),

    // Signatories
    calibratedByName: report.signatures?.calibratedBy?.signatureName || report.signatures?.calibratedBy?.name || "",
    approvedByName:   report.signatures?.verifiedBy?.signatureName   || report.signatures?.verifiedBy?.name   || "",

    // Certificate remarks — rendered on the last page. Fall back to the standard
    // 7 lines when the report was created before this field existed.
    remarks: (Array.isArray(report.remarks) && report.remarks.length > 0)
      ? report.remarks
      : DEFAULT_REMARKS,
  };
}

const DEFAULT_REMARKS = [
  "DUC : Device Under Calibration.",
  "Average of 5 reading has been taken in DUC.",
  "This certificate refer only to the particular item submitted for calibration",
  "The results in the certificate are valid at the time of measurement under stated conditions.",
  "Calibration sticker has been affix on the calibrated sample indicating \"CALIBRATION STATUS\".",
  "The certificate should not be produced except in full without prior approval from the Technical Manager and / or the Quality Manager",
  "Measurement Uncertainty reported is at appproximately 95% of Confidence Level with k = 2, Units of measurement results and uncertainty are the same as that of a range selected Unless otherwise indicated.",
];

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
    const data  = await buildCalibrationTemplateData(report, i);
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
