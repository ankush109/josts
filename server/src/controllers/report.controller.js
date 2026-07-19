/**
 * @file report.controller.js
 * @description Thin HTTP handlers for generic report routes.
 * All business logic lives in report.service.js.
 */

import * as ReportService from "../services/report.service.js";

/**
 * POST /report
 * Creates a new report or updates an existing one (if `reportId` is in the body).
 *
 * @type {import("express").RequestHandler}
 */
export async function upsertReport(req, res, next) {
  try {
    const report = await ReportService.upsertReport(req.body, req.user.userId);
    res.status(201).json({ report });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /report
 * Lists reports for the requesting user (admins see all).
 *
 * @type {import("express").RequestHandler}
 */
export async function listReports(req, res, next) {
  try {
    const reports = await ReportService.getReportsForUser(req.user);
    res.json({ reports });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /report/url/:id?type=calibration
 * Returns a pre-signed S3 URL for the report's PDF.
 *
 * @type {import("express").RequestHandler}
 */
export async function getReportUrl(req, res, next) {
  try {
    const isCalibration = req.query.type === "calibration";
    const forDownload   = req.query.download === "true";
    const result = await ReportService.getReportSignedUrl(req.params.id, isCalibration, forDownload);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /report/pdf/:id
 * Public 302 redirect to a freshly-signed S3 URL for the calibration PDF.
 * No auth — designed for QR-code scans from printed certificates.
 * The QR code encodes this URL so a stable link survives regenerations
 * (signed URLs otherwise expire in hours).
 *
 * @type {import("express").RequestHandler}
 */
export async function redirectToReportPdf(req, res, next) {
  try {
    const { fileUrls } = await ReportService.getReportSignedUrl(req.params.id, true, false);
    if (!fileUrls?.length) {
      const err = new Error("PDF not available");
      err.statusCode = 404;
      throw err;
    }
    res.redirect(302, fileUrls[0]);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /report/drafts/:id
 * Returns a single report owned by the requesting user.
 *
 * @type {import("express").RequestHandler}
 */
export async function getReport(req, res, next) {
  try {
    const report = await ReportService.getReportById(req.params.id, req.user.userId);
    res.json({ report });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /report/drafts
 * Returns all draft reports owned by the requesting user.
 *
 * @type {import("express").RequestHandler}
 */
export async function getMyDrafts(req, res, next) {
  try {
    const drafts = await ReportService.getMyDrafts(req.user.userId);
    res.json({ drafts });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /report/:reportId
 * Deletes a report owned by the requesting user.
 *
 * @type {import("express").RequestHandler}
 */
export async function deleteReport(req, res, next) {
  try {
    await ReportService.deleteReport(req.params.reportId, req.user.userId);
    res.json({ message: "Report deleted successfully" });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /report/:reportId/status
 * Changes the approval status of a report. Admin-only.
 *
 * @type {import("express").RequestHandler}
 */
export async function changeStatus(req, res, next) {
  try {
    const report = await ReportService.changeApprovalStatus(
      req.params.reportId,
      req.params.status,
      req.user.userId
    );
    res.json({ report });
  } catch (err) {
    next(err);
  }
}
