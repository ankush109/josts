import EquipmentAuditLog from "../models/EquipmentAuditLog.js";
import logger from "../lib/logger.js";

const TOP_FIELDS = [
  { key: "equipmentName", label: "Name"     },
  { key: "make",          label: "Make"     },
  { key: "model",         label: "Model"    },
  { key: "serialNo",      label: "Serial No." },
  { key: "idNo",          label: "ID No."   },
  { key: "certificateNo", label: "Certificate No." },
  { key: "calLab",        label: "Cal. Lab" },
  { key: "nablCert",      label: "NABL Cert." },
  { key: "calDate",       label: "Cal. Date" },
  { key: "nextDue",       label: "Next Due" },
  { key: "isActive",      label: "Active"   },
];

const PARAM_FIELDS = [
  "parameterName", "range", "subRange", "stdValue", "ducReading",
  "unit", "errorPct", "uncertaintyPct", "accuracy", "remarks",
];

const fmt = (v) => {
  if (v == null || v === "") return "—";
  if (v instanceof Date) return v.toLocaleDateString("en-IN");
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    const d = new Date(v);
    return isNaN(d) ? String(v) : d.toLocaleDateString("en-IN");
  }
  return String(v);
};

/**
 * Diffs an Equipment before/after a save. Top-level fields produce one row
 * per change; parameter list emits add/remove rows and per-field changes
 * indexed by row number.
 */
export function computeEquipmentDiff(oldDoc, newDoc) {
  const changes = [];

  for (const { key, label } of TOP_FIELDS) {
    if (fmt(oldDoc[key]) !== fmt(newDoc[key])) {
      changes.push({ field: label, from: fmt(oldDoc[key]), to: fmt(newDoc[key]) });
    }
  }

  const oldP = oldDoc.parameters ?? [];
  const newP = newDoc.parameters ?? [];
  const max = Math.max(oldP.length, newP.length);
  for (let i = 0; i < max; i++) {
    const o = oldP[i];
    const n = newP[i];
    const idx = `Row ${i + 1}`;
    if (!o && n) {
      changes.push({ field: idx, from: "—", to: `Added (${n.parameterName ?? ""})` });
      continue;
    }
    if (o && !n) {
      changes.push({ field: idx, from: `${o.parameterName ?? ""}`, to: "Removed" });
      continue;
    }
    for (const f of PARAM_FIELDS) {
      if (fmt(o[f]) !== fmt(n[f])) {
        changes.push({ field: `${idx} · ${f}`, from: fmt(o[f]), to: fmt(n[f]) });
      }
    }
  }

  return changes;
}

export async function logEquipmentAudit({ equipmentId, action, performedBy, changes = [] }) {
  try {
    await EquipmentAuditLog.create({ equipmentId, action, performedBy, changes });
  } catch (err) {
    logger.warn("Failed to write equipment audit log", { equipmentId, action, err: err.message });
  }
}

export async function getEquipmentAudit(equipmentId) {
  return EquipmentAuditLog.find({ equipmentId })
    .populate("performedBy", "name email")
    .sort({ createdAt: -1 })
    .lean();
}
