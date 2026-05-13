import InstrumentAuditLog from "../models/InstrumentAuditLog.js";
import logger from "../lib/logger.js";

const TOP_FIELDS = [
  { key: "key",       label: "Key"   },
  { key: "make",      label: "Make"  },
  { key: "modelType", label: "Model" },
  { key: "isActive",  label: "Active" },
];

const RANGE_FIELDS = [
  "label", "stdUncPct", "accPct", "accOffset", "leastCount", "scopePct",
];

const fmt = (v) => (v == null || v === "" ? "—" : String(v));

/**
 * Diffs an Instrument before/after a save.
 *
 * Emits one change row per top-level field change and one row per range field
 * change. Sample readings changes are summarised as a single "samples updated"
 * row to keep the log readable.
 */
export function computeInstrumentDiff(oldDoc, newDoc) {
  const changes = [];

  for (const { key, label } of TOP_FIELDS) {
    if (fmt(oldDoc[key]) !== fmt(newDoc[key])) {
      changes.push({ field: label, from: fmt(oldDoc[key]), to: fmt(newDoc[key]) });
    }
  }

  const oldParams = oldDoc.parameters ?? [];
  const newParams = newDoc.parameters ?? [];
  const byName = (arr) => Object.fromEntries(arr.map((p) => [p.parameterName, p]));
  const oldByName = byName(oldParams);
  const newByName = byName(newParams);

  for (const name of new Set([...Object.keys(oldByName), ...Object.keys(newByName)])) {
    const o = oldByName[name];
    const n = newByName[name];
    if (!o && n) { changes.push({ field: `Parameter [${name}]`, from: "—", to: "Added"   }); continue; }
    if (o && !n) { changes.push({ field: `Parameter [${name}]`, from: "Existed", to: "Removed" }); continue; }

    if (fmt(o.unit) !== fmt(n.unit)) {
      changes.push({ field: `${name} · Unit`, from: fmt(o.unit), to: fmt(n.unit) });
    }

    const oldR = o.ranges ?? [];
    const newR = n.ranges ?? [];
    const max = Math.max(oldR.length, newR.length);
    for (let i = 0; i < max; i++) {
      const or = oldR[i];
      const nr = newR[i];
      const idx = `${name} · Range ${i + 1}`;
      if (!or && nr) { changes.push({ field: idx, from: "—",     to: `Added (${nr.label})` }); continue; }
      if (or && !nr) { changes.push({ field: idx, from: `${or.label}`, to: "Removed" });       continue; }
      for (const f of RANGE_FIELDS) {
        if (fmt(or[f]) !== fmt(nr[f])) {
          changes.push({ field: `${idx} · ${f}`, from: fmt(or[f]), to: fmt(nr[f]) });
        }
      }
    }

    if (JSON.stringify(o.samples ?? []) !== JSON.stringify(n.samples ?? [])) {
      changes.push({ field: `${name} · Samples`, from: "(prev)", to: "(updated)" });
    }
  }

  return changes;
}

export async function logInstrumentAudit({ instrumentId, action, performedBy, changes = [] }) {
  try {
    await InstrumentAuditLog.create({ instrumentId, action, performedBy, changes });
  } catch (err) {
    logger.warn("Failed to write instrument audit log", { instrumentId, action, err: err.message });
  }
}

export async function getInstrumentAudit(instrumentId) {
  return InstrumentAuditLog.find({ instrumentId })
    .populate("performedBy", "name email")
    .sort({ createdAt: -1 })
    .lean();
}
