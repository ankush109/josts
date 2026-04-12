import AuditLog from "../models/AuditLog.js";
import logger   from "../lib/logger.js";

// Fields to diff at report level
const TRACKED_FIELDS = [
  { key: "status",              label: "Status" },
  { key: "customerName",        label: "Customer Name" },
  { key: "customerAddress",     label: "Customer Address" },
  { key: "customerRefNo",       label: "Customer Ref No" },
  { key: "calibrationLocation", label: "Calibration Location" },
  { key: "ducReceivedDate",     label: "DUC Received Date" },
  { key: "dateOfCalibration",   label: "Date of Calibration" },
  { key: "calibrationDueDate",  label: "Calibration Due Date" },
];

function fmt(val) {
  if (val == null || val === "") return "—";
  if (val instanceof Date || (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val))) {
    const d = new Date(val);
    return isNaN(d) ? String(val) : d.toLocaleDateString("en-IN");
  }
  return String(val);
}

export function computeDiff(oldDoc, newDoc) {
  const changes = [];

  for (const { key, label } of TRACKED_FIELDS) {
    const from = fmt(oldDoc[key]);
    const to   = fmt(newDoc[key]);
    if (from !== to) changes.push({ field: label, from, to });
  }

  // Instrument-level: detect added / removed by index
  const oldInsts = oldDoc.instruments ?? [];
  const newInsts = newDoc.instruments ?? [];
  const maxLen = Math.max(oldInsts.length, newInsts.length);

  for (let i = 0; i < maxLen; i++) {
    const o = oldInsts[i];
    const n = newInsts[i];
    const label = `Instrument ${i + 1}`;
    if (!o && n) {
      changes.push({ field: label, from: "—", to: [n.make, n.modelType].filter(Boolean).join(" ") || "Added" });
    } else if (o && !n) {
      changes.push({ field: label, from: [o.make, o.modelType].filter(Boolean).join(" ") || "Removed", to: "—" });
    } else if (o && n) {
      const instFields = [
        { key: "make",        label: `${label} Make` },
        { key: "modelType",   label: `${label} Model` },
        { key: "nomenclature",label: `${label} Nomenclature` },
        { key: "slNo",        label: `${label} Serial No` },
      ];
      for (const f of instFields) {
        const from = fmt(o[f.key]);
        const to   = fmt(n[f.key]);
        if (from !== to) changes.push({ field: f.label, from, to });
      }
    }
  }

  return changes;
}

export async function logAudit({ reportId, action, performedBy, changes = [] }) {
  try {
    await AuditLog.create({ reportId, action, performedBy, changes });
  } catch (err) {
    logger.warn("Failed to write audit log", { reportId, action, err: err.message });
  }
}

export async function getAuditLog(reportId) {
  return AuditLog.find({ reportId })
    .populate("performedBy", "name email signatureName")
    .sort({ createdAt: -1 })
    .lean();
}
