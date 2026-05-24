/**
 * @file calibration.controller.js
 * @description Thin HTTP handlers for calibration report routes.
 * All business logic lives in calibration.service.js.
 */

import * as CalibrationService from "../services/calibration.service.js";
import { getAuditLog } from "../services/audit.service.js";
import CalibrationReport from "../models/Calibration.js";

/**
 * GET /calibration-report/check-csr?csrNo=...&excludeId=...
 * Lightweight uniqueness check used by the form as the user types.
 * Returns `{ exists, reportId? }`. `excludeId` lets edit mode skip its own doc.
 */
export async function checkCsrNo(req, res, next) {
  try {
    const csrNo = String(req.query.csrNo ?? "").trim();
    if (!csrNo) return res.json({ exists: false });

    const query = { csrNo };
    const excludeId = String(req.query.excludeId ?? "").trim();
    if (excludeId && /^[a-f0-9]{24}$/i.test(excludeId)) {
      query._id = { $ne: excludeId };
    }
    const existing = await CalibrationReport.findOne(query).select("_id").lean();
    res.json({ exists: !!existing, reportId: existing?._id ?? null });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /calibration-report
 * Creates a new calibration report.
 *
 * @type {import("express").RequestHandler}
 */
export async function createReport(req, res, next) {
  try {
    const report = await CalibrationService.createReport(req.body, req.user.userId);
    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /calibration-report
 * Returns a paginated list of reports visible to the requesting user.
 *
 * @type {import("express").RequestHandler}
 */
export async function listReports(req, res, next) {
  try {
    const result = await CalibrationService.listReports(req.query, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /calibration-report/:reportId
 * Returns a single fully-populated calibration report.
 *
 * @type {import("express").RequestHandler}
 */
export async function getReport(req, res, next) {
  try {
    const report = await CalibrationService.getReportById(req.params.reportId, req.user?.userId);
    res.json(report);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /calibration-report/:reportId
 * Partially updates a calibration report.
 *
 * @type {import("express").RequestHandler}
 */
export async function updateReport(req, res, next) {
  try {
    const report = await CalibrationService.updateReport(req.params.reportId, { ...req.body, _updatedBy: req.user.userId });
    res.json(report);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /calibration-report/:reportId/status
 * Verifies or rejects a submitted report. Admin-only.
 *
 * @type {import("express").RequestHandler}
 */
export async function verifyOrReject(req, res, next) {
  try {
    const report = await CalibrationService.verifyOrReject(
      req.params.reportId,
      req.body.status,
      req.user.userId
    );
    res.json(report);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /calibration-report/compute
 * Previews the uncertainty budget for a single instrument without saving.
 *
 * @type {import("express").RequestHandler}
 */
export async function computePreview(req, res, next) {
  try {
    const instrument = await CalibrationService.previewCompute(req.body.instrument);
    res.json({ instrument });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /calibration-report/:reportId
 * Hard-deletes a draft calibration report.
 *
 * @type {import("express").RequestHandler}
 */
export async function deleteReport(req, res, next) {
  try {
    await CalibrationService.deleteReport(req.params.reportId);
    res.json({ message: "Report deleted" });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /calibration-report/:reportId/regenerate-pdf
 * Synchronously regenerates the PDF — returns once the worker is done or
 * with an error if it failed/timed out. No background fire-and-forget.
 *
 * @type {import("express").RequestHandler}
 */
export async function regeneratePdf(req, res, next) {
  try {
    const result = await CalibrationService.regeneratePdf(req.params.reportId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /calibration-report/:reportId/reopen
 * Reverts a verified/rejected report to "submitted". Admin-only.
 */
export async function reopenReport(req, res, next) {
  try {
    const report = await CalibrationService.reopenReport(
      req.params.reportId,
      req.body.reason,
      req.user.userId,
    );
    res.json(report);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /calibration-report/:reportId/signatures
 * Reassigns calibratedBy / verifiedBy. Admin-only. Triggers PDF regen.
 */
export async function reassignSignatories(req, res, next) {
  try {
    const report = await CalibrationService.reassignSignatories(
      req.params.reportId,
      { calibratedBy: req.body.calibratedBy, verifiedBy: req.body.verifiedBy },
      req.user.userId,
    );
    res.json(report);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /calibration-report/bulk/verify  | bulk/reject
 * Admin-only bulk status transitions.
 */
export async function bulkVerify(req, res, next) {
  try {
    const result = await CalibrationService.bulkVerifyOrReject("verified", req.body.ids, req.user.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function bulkReject(req, res, next) {
  try {
    const result = await CalibrationService.bulkVerifyOrReject("rejected", req.body.ids, req.user.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /calibration-report/bulk/delete
 * Soft-deletes every matched report. Admin-only.
 */
export async function bulkDelete(req, res, next) {
  try {
    const result = await CalibrationService.bulkDelete(req.body.ids, req.user.userId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getHistory(req, res, next) {
  try {
    const logs = await getAuditLog(req.params.reportId);
    res.json(logs);
  } catch (err) {
    next(err);
  }
}
