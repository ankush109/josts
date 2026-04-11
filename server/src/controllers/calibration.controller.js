/**
 * @file calibration.controller.js
 * @description Thin HTTP handlers for calibration report routes.
 * All business logic lives in calibration.service.js.
 */

import * as CalibrationService from "../services/calibration.service.js";

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
    const report = await CalibrationService.getReportById(req.params.reportId);
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
    const report = await CalibrationService.updateReport(req.params.reportId, req.body);
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
    const instrument = CalibrationService.previewCompute(req.body.instrument);
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
