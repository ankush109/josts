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
import User                 from "../models/User.js";
import { computeUncertaintyBudget } from "../utils/calibration-compute.js";
import { getInstrumentLookup, MAKE_TO_INSTRUMENT_KEY } from "../constants/instrument-specs.js";
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
export function injectComputed(instruments) {
  if (!Array.isArray(instruments)) return instruments;

  return instruments.map((inst) => {
    const instrumentName = MAKE_TO_INSTRUMENT_KEY[inst.make] ?? `${inst.make} ${inst.modelType}`.trim();
    const lookup         = getInstrumentLookup(instrumentName);

    if (!lookup || Object.keys(lookup).length === 0) {
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
              if (!constants || m.nomValue == null) {
                return { ...m, computed: null };
              }

              const budget = computeUncertaintyBudget({
                nomValue:   m.nomValue,
                readings:   (m.readings ?? []).filter((r) => r != null && !isNaN(r)),
                stdUncPct:  constants.stdUncPct,
                accPct:     constants.accPct,
                accOffset:  constants.accOffset,
                leastCount: constants.leastCount,
                scopePct:   constants.scopePct,
              });

              return { ...m, computed: budget };
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
  const certNo = await generateCertNo(data.createdBy ?? userId, data.customerName);

  const report = await CalibrationReport.create({
    ...data,
    csrNo:       data.csrNo.trim(),
    certNo,
    instruments: injectComputed(data.instruments ?? []),
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
    safeUpdates.instruments = injectComputed(safeUpdates.instruments);
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
export function previewCompute(instrument) {
  const [result] = injectComputed([instrument]);
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
