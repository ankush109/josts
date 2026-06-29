/**
 * @file template.service.js
 * @description Versioned PDF-template store. Any save creates a new version;
 *              one version per template is marked active and is what the
 *              worker fetches at render time.
 *
 *              Preview rendering happens client-side via the `ejs` browser
 *              build, so this service is render-engine agnostic — it just
 *              stores strings.
 */

import mongoose from "mongoose";
import { Template, TemplateVersion } from "../models/Template.js";
import CalibrationReport from "../models/Calibration.js";

/** @type {Record<string, { name: string; description: string }>} */
const KNOWN_TEMPLATES = {
  "calibration-certificate": {
    name:        "Calibration Certificate",
    description: "Rendered for every non-draft calibration report. EJS template — variables like `customerName`, `calibrationResults`, etc. are injected at render time.",
  },
};

/** Bootstrap a Template doc the first time it is requested. */
async function ensureTemplate(key) {
  if (!KNOWN_TEMPLATES[key]) {
    const err = new Error(`Unknown template key: ${key}`);
    err.statusCode = 404;
    throw err;
  }
  let tpl = await Template.findOne({ key });
  if (!tpl) {
    tpl = await Template.create({ key, ...KNOWN_TEMPLATES[key] });
  }
  return tpl;
}

/** Lists known templates with active-version metadata (no bodies). */
export async function listTemplates() {
  const out = [];
  for (const key of Object.keys(KNOWN_TEMPLATES)) {
    const tpl = await ensureTemplate(key);
    const versions = await TemplateVersion
      .find({ templateKey: key })
      .select("_id versionNumber note createdAt createdBy")
      .populate("createdBy", "name email")
      .sort({ versionNumber: -1 })
      .lean();
    out.push({
      _id:             tpl._id,
      key:             tpl.key,
      name:            tpl.name,
      description:     tpl.description,
      activeVersionId: tpl.activeVersionId,
      versionCount:    versions.length,
      versions,
      updatedAt:       tpl.updatedAt,
    });
  }
  return out;
}

/** Returns one template + its full version list (no bodies). */
export async function getTemplate(key) {
  const tpl = await ensureTemplate(key);
  const versions = await TemplateVersion
    .find({ templateKey: key })
    .select("_id versionNumber note createdAt createdBy")
    .populate("createdBy", "name email")
    .sort({ versionNumber: -1 })
    .lean();
  return {
    _id:             tpl._id,
    key:             tpl.key,
    name:            tpl.name,
    description:     tpl.description,
    activeVersionId: tpl.activeVersionId,
    versions,
    updatedAt:       tpl.updatedAt,
  };
}

/** Returns one version including its `body`. */
export async function getVersion(key, versionId) {
  if (!mongoose.Types.ObjectId.isValid(versionId)) {
    const err = new Error("Invalid version ID");
    err.statusCode = 400;
    throw err;
  }
  const version = await TemplateVersion
    .findOne({ _id: versionId, templateKey: key })
    .populate("createdBy", "name email")
    .lean();
  if (!version) {
    const err = new Error("Version not found");
    err.statusCode = 404;
    throw err;
  }
  return version;
}

/** Returns the active version body (used by worker). */
export async function getActiveVersion(key) {
  const tpl = await ensureTemplate(key);
  if (!tpl.activeVersionId) return null;
  const version = await TemplateVersion.findById(tpl.activeVersionId).lean();
  return version;
}

/**
 * Creates a new version. If `activate` is true (default) or the template has
 * no active version yet, the new version becomes active immediately.
 */
export async function createVersion(key, { body, note, activate = true }, userId) {
  if (typeof body !== "string" || !body.trim()) {
    const err = new Error("Template body is required");
    err.statusCode = 400;
    throw err;
  }
  const tpl = await ensureTemplate(key);
  const latest = await TemplateVersion
    .findOne({ templateKey: key })
    .sort({ versionNumber: -1 })
    .select("versionNumber")
    .lean();
  const versionNumber = (latest?.versionNumber ?? 0) + 1;

  const version = await TemplateVersion.create({
    templateKey:  key,
    versionNumber,
    body,
    note:         note ?? "",
    createdBy:    userId ?? null,
  });

  if (activate || !tpl.activeVersionId) {
    tpl.activeVersionId = version._id;
    await tpl.save();
  }

  return getVersion(key, version._id);
}

/** Marks a specific version as active. */
export async function activateVersion(key, versionId) {
  if (!mongoose.Types.ObjectId.isValid(versionId)) {
    const err = new Error("Invalid version ID");
    err.statusCode = 400;
    throw err;
  }
  const tpl = await ensureTemplate(key);
  const version = await TemplateVersion.findOne({ _id: versionId, templateKey: key });
  if (!version) {
    const err = new Error("Version not found");
    err.statusCode = 404;
    throw err;
  }
  tpl.activeVersionId = version._id;
  await tpl.save();
  return getTemplate(key);
}

// ─── Preview data builder ────────────────────────────────────────────────────
//
// Mirrors `worker/jobs/calibration.js → buildCalibrationTemplateData` so a
// preview rendered in the browser matches what the worker will produce. The
// worker embeds the logo/QR as base64 from its container fs; for the preview
// we return root-relative URLs that the client's iframe (which injects a
// <base href> pointing at the app origin) resolves to `client/public/`.

const CERT_DEFAULTS = {
  ducRange:               "As Per Instrument Spec.",
  accuracy:               "As per Manufacturer's Specification",
  conditionOfItem:        "Satisfactory",
  recommendedTemp:        "25±4 °C",
  recommendedHumidity:    "55±15 %",
  methodOfCalibration:    "Direct Method",
  descriptionOfStandards: "Traceable to National / International Standards",
  calibrationType:        "Electro - Technical Calibration",
  calibratedByRole:       "Calibration Engineer",
  approvedByRole:         "Technical/Quality Manager",
  totalPages:             "2",
};

function fmtDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function validUptoFromDueDate(due) {
  if (!due) return null;
  const d = new Date(due);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() - 1);
  return d;
}

function buildDucIdentifier(inst) {
  const parts = [];
  if (inst.idNoInReport && inst.idNo) parts.push(`ID: ${inst.idNo}`);
  if (inst.slNoInReport && inst.slNo) parts.push(`SN: ${inst.slNo}`);
  if (parts.length) return parts.join(" / ");
  return inst.slNo ?? "";
}

function buildMeasurementRow(m, unit) {
  const f = (v) => (v != null ? Number(v).toFixed(4) : "");
  const ducUnit = (m.readingUnits ?? []).find((u) => u) || unit;
  return {
    standardValue:       m.nomValue ?? "",
    standardUnit:        unit,
    ducValue:            f(m.computed?.meanValue),
    ducUnit,
    errorValue:          f(m.computed?.error),
    errorUnit:           unit,
    expandedUncertainty: f(m.computed?.percentUc),
  };
}

function buildCalibrationResults(parameters = []) {
  return parameters.map((p) => ({
    parameter: p.name,
    ranges: (p.ranges ?? []).map((r) => ({
      label: r.label,
      rows:  (r.measurements ?? []).map((m) => buildMeasurementRow(m, p.unit ?? "")),
    })),
  }));
}

function buildReferenceStandards(ref = {}) {
  if (!ref.name) return [];
  return [{
    name:               ref.name,
    makeModel:          [ref.make, ref.modelType].filter(Boolean).join(" / "),
    validUpto:          fmtDate(validUptoFromDueDate(ref.calDueDate)),
    traceabilityCertNo: ref.traceability ?? "",
    idNo:               "",
    srNo:               ref.srNo ?? "",
  }];
}

/**
 * Builds the same data object the worker passes into EJS, for a given report.
 * Used by the admin preview pane.
 */
export async function buildSampleData(reportId, instIndex = 0) {
  if (!mongoose.Types.ObjectId.isValid(reportId)) {
    const err = new Error("Invalid report ID");
    err.statusCode = 400;
    throw err;
  }
  const report = await CalibrationReport.findById(reportId)
    .populate("signatures.calibratedBy", "name signatureName")
    .populate("signatures.verifiedBy",   "name signatureName")
    .lean();
  if (!report) {
    const err = new Error("Report not found");
    err.statusCode = 404;
    throw err;
  }

  const inst = report.instruments?.[instIndex] ?? {};
  const ref  = inst.refStandard ?? {};

  return {
    ...CERT_DEFAULTS,

    logoUrl: "/logo2.png",
    qrUrl:   "/qr.png",

    certificateNo:        report.certNo || report.csrNo || "",
    certificateIssueDate: fmtDate(report.createdAt),

    ducReceivedDate:    fmtDate(report.ducReceivedDate),
    dateOfCalibration:  fmtDate(report.dateOfCalibration || inst.calDate),
    calibrationDueDate: fmtDate(report.calibrationDueDate),
    calibrationDueDateDisplay: (() => {
      const cal = new Date(report.dateOfCalibration || inst.calDate);
      const due = new Date(report.calibrationDueDate);
      if (!isNaN(cal.getTime()) && !isNaN(due.getTime())) {
        const threshold = new Date(cal);
        threshold.setMonth(threshold.getMonth() + 12);
        if (due > threshold) return "As Per Client Requirement";
      }
      return fmtDate(report.calibrationDueDate);
    })(),
    validUpto: (() => {
      const cal = new Date(report.dateOfCalibration || inst.calDate);
      const due = new Date(report.calibrationDueDate);
      if (!isNaN(cal.getTime()) && !isNaN(due.getTime())) {
        const threshold = new Date(cal);
        threshold.setMonth(threshold.getMonth() + 12);
        if (due > threshold) return "As Per Client Requirement";
      }
      return fmtDate(validUptoFromDueDate(report.calibrationDueDate));
    })(),

    customerReferenceNo: report.customerRefNo   ?? "",
    customerName:        report.customerName    ?? "",
    customerAddress:     report.customerAddress ?? "",

    ducName:               inst.nomenclature ?? "",
    ducSerialNo:           buildDucIdentifier(inst),
    ducMake:               inst.make         ?? "",
    ducModel:              inst.modelType    ?? "",
    locationOfCalibration: report.calibrationLocation === "onsite" ? "At Site" : "At Lab",

    duringCalibrationTemp:     inst.environmental?.temperature ?? "",
    duringCalibrationHumidity: inst.environmental?.humidity    ?? "",

    ducRange:             inst.ducRange             || "As Per Instrument Spec.",
    calibrationProcedure: inst.calibrationProcedure || "",
    methodOfCalibration:  inst.calibrationMethod    || "Direct Method",

    referenceStandards: buildReferenceStandards(ref),
    calibrationResults: buildCalibrationResults(inst.parameters),

    calibratedByName: report.signatures?.calibratedBy?.signatureName || report.signatures?.calibratedBy?.name || "",
    approvedByName:   report.signatures?.verifiedBy?.signatureName   || report.signatures?.verifiedBy?.name   || "",
  };
}
