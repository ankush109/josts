/**
 * @file calibration.service.js
 * @description Business logic for calibration report management.
 *
 * This module owns the two most important server-side operations:
 *   1. `injectComputed()` — walks the instrument tree and fills in the
 *      uncertainty budget for every measurement using instrument constants.
 *   2. `generateCertNo()` — builds the formatted certificate number.
 *
 * All DB reads/writes for calibration reports live here. Controllers
 * call these functions and only deal with HTTP plumbing.
 */

import mongoose             from "mongoose";
import CalibrationReport    from "../models/Calibration.js";
import Equipment            from "../models/Equipment.js";
import Instrument           from "../models/Instrument.js";
import User                 from "../models/User.js";
import { computeUncertaintyBudget } from "../utils/calibration-compute.js";
import { getInstrumentLookup, MAKE_TO_INSTRUMENT_KEY } from "../constants/instrument-specs.js";
import { normalizeParamName, getAcceptableNames } from "../constants/param-synonyms.js";
import { toSI }                     from "../utils/unit-normalize.js";
import { pushPdfJobToRedis }        from "../lib/redis.js";
import logger                       from "../lib/logger.js";
import { logAudit, computeDiff, getAuditLog } from "./audit.service.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Converts a name to initials. "John Doe" → "JD".
 *
 * @param {string} name
 * @returns {string}
 */
function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Finds the closest uncertainty% from a master equipment document for a given
 * measurement point. Matches by parameter name (case-insensitive) then picks
 * the entry whose stdValue (SI-normalized) is closest to nomValue (SI-normalized).
 *
 * @param {object} equipment  - Master equipment document (lean)
 * @param {string} paramName  - e.g. "DC Voltage"
 * @param {number} nomValue   - The nominal value as stored (numeric)
 * @param {string} unit       - Unit for nomValue (e.g. "mV", "V")
 * @returns {number|null}     - uncertaintyPct, or null if no match
 */
function lookupMasterUncertainty(equipment, paramName, nomValue, unit) {
  if (nomValue == null || !equipment?.parameters?.length) return null;

  const targetName = normalizeParamName(paramName);
  const acceptable = getAcceptableNames(paramName);

  // First match by name only — separate from the uncertainty check so we can give a precise error.
  // Master-side names go through the same normaliser (drops "High"/"Low" qualifiers, whitespace, case)
  // and are also checked against the synonym table in PARAM_ALIASES.
  const byName = equipment.parameters.filter(
    (p) => acceptable.has(normalizeParamName(p.parameterName))
  );

  if (!byName.length) {
    logger.warn("[Traceability] No matching parameter found in master equipment", {
      masterEquipment:     equipment.equipmentName,
      searchedFor:         paramName,
      searchedNormalized:  targetName,
      availableParams:     [...new Set(equipment.parameters.map((p) => p.parameterName))],
      availableNormalized: [...new Set(equipment.parameters.map((p) => normalizeParamName(p.parameterName)))],
    });
    return null;
  }

  // Accept entries that have either uncertaintyPct OR uncertaintyAbs (RTD etc.)
  const candidates = byName.filter(
    (p) => p.uncertaintyPct != null || p.uncertaintyAbs != null
  );

  if (!candidates.length) {
    logger.error(
      `\x1b[31m[Traceability] ❌ UC% NOT FOUND — parameter "${paramName}" exists in master equipment ` +
      `"${equipment.equipmentName}" but has NO uncertainty value stored. ` +
      `Add uncertaintyPct or uncertaintyAbs to the equipment entries.\x1b[0m`
    );
    return null;
  }

  const nomSI = toSI(nomValue, unit);

  logger.info("[Traceability] Looking up UC% from master equipment", {
    masterEquipment: equipment.equipmentName,
    parameter:       paramName,
    nomValue:        `${nomValue} ${unit}`.trim(),
    nomValueSI:      `${nomSI} V/A/Ω (SI base)`,
    candidateCount:  candidates.length,
  });

  let closest = null;
  let minDist  = Infinity;

  for (const entry of candidates) {
    const entrySI = toSI(entry.stdValue ?? 0, entry.unit ?? "");
    const dist    = Math.abs(entrySI - nomSI);

    logger.debug("[Traceability] Candidate entry", {
      range:          entry.range,
      subRange:       entry.subRange,
      stdValue:       `${entry.stdValue} ${entry.unit}`,
      stdValueSI:     entrySI,
      distanceFromNom: dist,
      uncertaintyPct: entry.uncertaintyPct,
    });

    if (dist < minDist) { minDist = dist; closest = entry; }
  }

  // Resolve effective uncertaintyPct — use direct % value if available,
  // otherwise derive from absolute uncertainty: (uncertaintyAbs / |nomValue|) × 100
  let effectiveUncPct = closest.uncertaintyPct ?? null;
  const source = closest.uncertaintyPct != null ? "direct" : "derived_from_abs";
  if (effectiveUncPct == null && closest.uncertaintyAbs != null && nomValue !== 0) {
    effectiveUncPct = (closest.uncertaintyAbs / Math.abs(nomValue)) * 100;
  }

  logger.info("[Traceability] Selected closest master equipment entry", {
    masterEquipment:  equipment.equipmentName,
    parameter:        paramName,
    nomValue:         `${nomValue} ${unit}`.trim(),
    matchedRange:     closest.range ?? "—",
    matchedSubRange:  closest.subRange ?? "—",
    matchedStdValue:  `${closest.stdValue} ${closest.unit}`,
    distanceSI:       minDist,
    source,
    uncertaintyPct:   `±${effectiveUncPct}%  ← this becomes stdUncPct`,
  });

  return {
    uncertaintyPct: effectiveUncPct,
    equipmentId:    String(equipment._id),
    equipmentName:  equipment.equipmentName,
    range:          closest.range    ?? null,
    subRange:       closest.subRange ?? null,
    stdValue:       closest.stdValue,
    unit:           closest.unit,
    source,
  };
}

/**
 * Pre-fetches master equipment documents for every `refStandard.equipmentId`
 * referenced by the instruments array.
 *
 * @param {object[]} instruments
 * @returns {Promise<Record<string, object>>} equipmentId → Equipment (lean)
 */
async function buildEquipmentMap(instruments) {
  const ids = [...new Set(
    (instruments ?? [])
      .map((i) => i.refStandard?.equipmentId)
      .filter((id) => id && mongoose.Types.ObjectId.isValid(String(id)))
  )];

  if (!ids.length) {
    logger.info("[Traceability] No master equipment linked to any instrument — will use hardcoded constants for all UC% values");
    return {};
  }

  const docs = await Equipment.find({ _id: { $in: ids } }).lean();

  logger.info("[Traceability] Fetched master equipment for UC% lookup", {
    requestedIds: ids.map(String),
    found: docs.map((e) => ({ id: String(e._id), name: e.equipmentName, parameterCount: e.parameters?.length ?? 0 })),
  });

  return Object.fromEntries(docs.map((e) => [String(e._id), e]));
}

/**
 * Pre-fetches Instrument documents from DB for every make used by the
 * instruments array and builds the same paramName → rangeLabel → RangeSpec
 * lookup used by injectComputed. DB is authoritative; falls back to static
 * constants at call-site if a make isn't in DB.
 *
 * @param {object[]} instruments
 * @returns {Promise<Record<string, Record<string, Record<string, object>>>>} key → paramName → rangeLabel → RangeSpec
 */
async function buildInstrumentLookupMap(instruments) {
  const makes = [...new Set(
    (instruments ?? []).map((i) => i.make).filter(Boolean)
  )];

  if (!makes.length) return {};

  const docs = await Instrument.find({ make: { $in: makes }, isActive: true }).lean();

  const map = {};
  for (const doc of docs) {
    const lookup = {};
    for (const param of doc.parameters ?? []) {
      if (!param.parameterName) continue;
      lookup[param.parameterName] = Object.fromEntries(
        (param.ranges ?? []).map((r) => [r.label, r])
      );
    }
    map[doc.key] = lookup;
  }
  return map;
}

/**
 * Generates a human-readable certificate number in the format:
 *   JK/DDMMYY/<CustomerFirstLetter>/<EngineerInitials>/<SequentialNo>
 *
 * @param {string} userId       - ObjectId of the creating engineer.
 * @param {string} customerName - Customer name for the first-letter segment.
 * @returns {Promise<string>}
 */
async function generateCertNo(userId, customerName) {
  const [user, count] = await Promise.all([
    User.findById(userId).lean(),
    CalibrationReport.countDocuments(),
  ]);

  const d      = new Date();
  const dd     = String(d.getDate()).padStart(2, "0");
  const mm     = String(d.getMonth() + 1).padStart(2, "0");
  const yy     = String(d.getFullYear()).slice(-2);
  const cust   = (customerName?.trim()[0] ?? "X").toUpperCase();
  const eng    = getInitials(user?.name ?? "ENG");
  const seq    = String(count + 1).padStart(3, "0");

  return `JK/${dd}${mm}${yy}/${cust}/${eng}/${seq}`;
}

/**
 * Walks the instruments array and injects the computed uncertainty budget
 * into every measurement. If no constants are found for a measurement's
 * instrument+parameter+range combination, `computed` is set to `null`.
 *
 * @param {object[]} instruments - Array of instrument objects from the request.
 * @returns {object[]} Same array with `computed` fields populated.
 */
/**
 * @param {object[]} instruments
 * @param {Record<string, object>} equipmentMap - equipmentId → Equipment doc (pre-fetched)
 */
export function injectComputed(instruments, equipmentMap = {}, instrumentLookupMap = {}) {
  if (!Array.isArray(instruments)) return instruments;

  return instruments.map((inst) => {
    const instrumentName   = `${inst.make} ${inst.modelType}`.trim();
    const canonicalKey     = MAKE_TO_INSTRUMENT_KEY[inst.make] ?? instrumentName;
    // DB-stored constants take precedence; fall back to static file for legacy instruments
    const lookup           = instrumentLookupMap[instrumentName]
      ?? instrumentLookupMap[canonicalKey]
      ?? getInstrumentLookup(canonicalKey);
    const masterEquipment  = equipmentMap[String(inst.refStandard?.equipmentId ?? "")] ?? null;

    if (!masterEquipment && (!lookup || Object.keys(lookup).length === 0)) {
      logger.warn("No calibration constants found for instrument", { instrumentName, make: inst.make });
    }

    return {
      ...inst,
      parameters: (inst.parameters ?? []).map((param) => ({
        ...param,
        ranges: (param.ranges ?? []).map((range) => {
          const constants = lookup[param.name]?.[range.label];

          return {
            ...range,
            measurements: (range.measurements ?? []).map((m) => {
              if (m.nomValue == null) return { ...m, computed: null };

              // Determine stdUncPct: prefer master equipment lookup, fall back to constants
              const effectiveUnit = m.nomUnit?.trim() || param.unit?.trim() || "";
              const masterMatch   = masterEquipment
                ? lookupMasterUncertainty(masterEquipment, param.name, m.nomValue, effectiveUnit)
                : null;
              const stdUncPct = masterMatch?.uncertaintyPct ?? constants?.stdUncPct;

              if (masterMatch != null) {
                logger.debug("[Traceability] Using master equipment UC% for measurement", {
                  param: param.name, range: range.label, nomValue: `${m.nomValue} ${effectiveUnit}`.trim(), stdUncPct,
                });
              } else if (constants?.stdUncPct != null) {
                logger.debug("[Traceability] No master equipment match — falling back to hardcoded constants", {
                  param: param.name, range: range.label, nomValue: m.nomValue, stdUncPct: constants.stdUncPct,
                });
              }

              if (stdUncPct == null && !constants) return { ...m, computed: null };

              const budget = computeUncertaintyBudget({
                nomValue:   m.nomValue,
                readings:   (m.readings ?? []).filter((r) => r != null && !isNaN(r)),
                stdUncPct,
                accPct:     constants?.accPct,
                accOffset:  constants?.accOffset,
                leastCount: constants?.leastCount,
                scopePct:   constants?.scopePct,
              });

              return {
                ...m,
                computed: {
                  ...budget,
                  tracedFrom: masterMatch
                    ? {
                        equipmentId:    masterMatch.equipmentId,
                        equipmentName:  masterMatch.equipmentName,
                        range:          masterMatch.range,
                        subRange:       masterMatch.subRange,
                        stdValue:       masterMatch.stdValue,
                        unit:           masterMatch.unit,
                        uncertaintyPct: masterMatch.uncertaintyPct,
                        source:         masterMatch.source,
                      }
                    : null,
                },
              };
            }),
          };
        }),
      })),
    };
  });
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Creates a new calibration report and optionally queues PDF generation.
 *
 * @param {object} data    - Validated request body.
 * @param {string} userId  - Authenticated user's ObjectId (from JWT).
 * @returns {Promise<object>} The created Mongoose document.
 */
export async function createReport(data, userId) {
  const [certNo, equipmentMap, instrumentLookupMap] = await Promise.all([
    generateCertNo(data.createdBy ?? userId, data.customerName),
    buildEquipmentMap(data.instruments ?? []),
    buildInstrumentLookupMap(data.instruments ?? []),
  ]);

  const report = await CalibrationReport.create({
    ...data,
    csrNo:       data.csrNo.trim(),
    certNo,
    instruments: injectComputed(data.instruments ?? [], equipmentMap, instrumentLookupMap),
    signatures: {
      ...(data.signatures ?? {}),
      calibratedBy: data.createdBy ?? userId,
      calibratedAt: new Date(),
    },
  });

  await logAudit({ reportId: report._id, action: "created", performedBy: userId });

  if (report.status !== "draft") {
    await pushPdfJobToRedis({ reportId: report._id, action: "create", type: "calibration" });
  }

  return report;
}

/**
 * Returns a paginated list of calibration reports.
 * Non-admin users only see their own reports.
 *
 * @param {object} query   - Parsed query params (status, createdBy, search, page, limit).
 * @param {object} reqUser - Authenticated user from JWT ({ userId, userRole }).
 * @returns {Promise<{ items: object[], total: number, page: number, limit: number, pages: number }>}
 */
export async function listReports(query, reqUser) {
  const { status, createdBy, search } = query;
  const page  = Math.max(1, Number(query.page)  || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip  = (page - 1) * limit;

  const filter = { deletedAt: null };
  if (status) filter.status = status;

  if (reqUser.userRole !== "admin") {
    filter.createdBy = reqUser.userId;
  } else if (createdBy) {
    if (!mongoose.Types.ObjectId.isValid(createdBy)) {
      const err = new Error("Invalid createdBy id");
      err.statusCode = 400;
      throw err;
    }
    filter.createdBy = createdBy;
  }

  if (search) filter.$text = { $search: search };

  const [reports, total] = await Promise.all([
    CalibrationReport.find(filter)
      .select("csrNo formatNo status createdBy signatures createdAt updatedAt instruments filePaths customerName")
      .populate("createdBy",               "name email")
      .populate("signatures.calibratedBy", "name email signatureName")
      .populate("signatures.verifiedBy",   "name email signatureName")
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    CalibrationReport.countDocuments(filter),
  ]);

  const items = reports.map((r) => ({
    _id:             r._id,
    csrNo:           r.csrNo,
    formatNo:        r.formatNo,
    status:          r.status,
    createdBy:       r.createdBy,
    signatures:      r.signatures,
    instrumentCount: r.instruments?.length ?? 0,
    instruments:     (r.instruments ?? []).map((i) => ({ make: i.make, modelType: i.modelType })),
    filePaths:       r.filePaths ?? [],
    customerName:    r.customerName ?? "",
    createdAt:       r.createdAt,
    updatedAt:       r.updatedAt,
  }));

  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

/**
 * Returns a fully-populated single calibration report.
 *
 * @param {string} reportId - MongoDB ObjectId string.
 * @returns {Promise<object>} The Mongoose document as plain object.
 * @throws {Error} With `statusCode: 400` for an invalid ID format.
 * @throws {Error} With `statusCode: 404` if the report does not exist.
 */
export async function getReportById(reportId) {
  if (!mongoose.Types.ObjectId.isValid(reportId)) {
    const err = new Error("Invalid report ID");
    err.statusCode = 400;
    throw err;
  }

  const report = await CalibrationReport.findById(reportId)
    .populate("createdBy",               "name email location signatureName")
    .populate("signatures.calibratedBy", "name email signatureName")
    .populate("signatures.verifiedBy",   "name email signatureName")
    .lean();

  if (!report) {
    const err = new Error("Report not found");
    err.statusCode = 404;
    throw err;
  }

  return report;
}

/**
 * Partially updates a calibration report. Immutable fields (_id, createdBy,
 * createdAt, __v) are stripped before the $set so they cannot be overwritten.
 * If instruments are included, the uncertainty budget is re-injected.
 *
 * @param {string} reportId - MongoDB ObjectId string.
 * @param {object} updates  - Fields to update (from request body).
 * @returns {Promise<object>} Updated document (fully populated).
 * @throws {Error} With `statusCode: 404` if the report does not exist.
 */
export async function updateReport(reportId, updates) {
  if (!mongoose.Types.ObjectId.isValid(reportId)) {
    const err = new Error("Invalid report ID");
    err.statusCode = 400;
    throw err;
  }

  // Strip fields that must never be overwritten by the client
  const { _id, createdBy, createdAt, __v, signatures: _sig, _updatedBy, ...safeUpdates } = updates;

  if (safeUpdates.instruments) {
    const [equipmentMap, instrumentLookupMap] = await Promise.all([
      buildEquipmentMap(safeUpdates.instruments),
      buildInstrumentLookupMap(safeUpdates.instruments),
    ]);
    safeUpdates.instruments = injectComputed(safeUpdates.instruments, equipmentMap, instrumentLookupMap);
  }

  // Fetch old doc for diff + calibratedBy backfill
  const existing = await CalibrationReport.findById(reportId).select("signatures createdBy status customerName customerAddress customerRefNo calibrationLocation ducReceivedDate dateOfCalibration calibrationDueDate instruments").lean();
  if (existing && !existing.signatures?.calibratedBy) {
    safeUpdates["signatures.calibratedBy"] = existing.createdBy;
    safeUpdates["signatures.calibratedAt"] = safeUpdates["signatures.calibratedAt"] ?? new Date();
  }

  const report = await CalibrationReport.findByIdAndUpdate(
    reportId,
    { $set: safeUpdates },
    { new: true, runValidators: true }
  )
    .populate("createdBy",               "name email signatureName")
    .populate("signatures.calibratedBy", "name email signatureName")
    .populate("signatures.verifiedBy",   "name email signatureName")
    .lean();

  if (!report) {
    const err = new Error("Report not found");
    err.statusCode = 404;
    throw err;
  }

  // Audit log — pass userId via updates._updatedBy (stripped before $set)
  const performedBy = updates._updatedBy;
  if (performedBy && existing) {
    const changes = computeDiff(existing, report);
    if (changes.length > 0) {
      await logAudit({ reportId: report._id, action: "updated", performedBy, changes });
    }
  }

  if (report.status !== "draft") {
    await pushPdfJobToRedis({ reportId: report._id, action: "edit", type: "calibration" });
  }

  return report;
}

/**
 * Sets a report's status to "verified" or "rejected" and records who actioned it.
 * Restricted to admins (enforced by `adminMiddleware` in the route).
 *
 * @param {string} reportId  - MongoDB ObjectId string.
 * @param {"verified"|"rejected"} status - New status.
 * @param {string} adminId   - ObjectId of the admin user performing the action.
 * @returns {Promise<object>} Updated document (fully populated).
 */
export async function verifyOrReject(reportId, status, adminId) {
  if (!mongoose.Types.ObjectId.isValid(reportId)) {
    const err = new Error("Invalid report ID");
    err.statusCode = 400;
    throw err;
  }

  const report = await CalibrationReport.findByIdAndUpdate(
    reportId,
    {
      $set: {
        status,
        "signatures.verifiedBy": adminId,
        "signatures.verifiedAt": new Date(),
      },
    },
    { new: true, runValidators: true }
  )
    .populate("createdBy",               "name email signatureName")
    .populate("signatures.calibratedBy", "name email signatureName")
    .populate("signatures.verifiedBy",   "name email signatureName")
    .lean();

  if (!report) {
    const err = new Error("Report not found");
    err.statusCode = 404;
    throw err;
  }

  await logAudit({
    reportId: report._id,
    action: "status_changed",
    performedBy: adminId,
    changes: [{ field: "Status", from: status === "verified" ? "submitted" : "submitted", to: status }],
  });

  return report;
}

/**
 * Previews uncertainty budget computations for a single instrument
 * without writing anything to the database.
 *
 * @param {object} instrument - Instrument object from the request body.
 * @returns {object} Same instrument object with `computed` fields populated.
 */
export async function previewCompute(instrument) {
  const [equipmentMap, instrumentLookupMap] = await Promise.all([
    buildEquipmentMap([instrument]),
    buildInstrumentLookupMap([instrument]),
  ]);
  const [result] = injectComputed([instrument], equipmentMap, instrumentLookupMap);
  return result;
}

/**
 * Hard-deletes a calibration report. Only draft reports may be deleted.
 *
 * @param {string} reportId - MongoDB ObjectId string.
 * @returns {Promise<void>}
 * @throws {Error} With `statusCode: 403` if the report is not a draft.
 * @throws {Error} With `statusCode: 404` if the report does not exist.
 */
export async function deleteReport(reportId) {
  if (!mongoose.Types.ObjectId.isValid(reportId)) {
    const err = new Error("Invalid report ID");
    err.statusCode = 400;
    throw err;
  }

  const report = await CalibrationReport.findOne({ _id: reportId, deletedAt: null });

  if (!report) {
    const err = new Error("Report not found");
    err.statusCode = 404;
    throw err;
  }

  report.deletedAt = new Date();
  await report.save();
}
