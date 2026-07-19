/**
 * @file report.routes.js
 * @description Routes for generic (non-calibration) report management.
 *
 * POST   /report                      — create or update a report
 * GET    /report                      — list reports for current user
 * GET    /report/url/:id              — get signed S3 URL for PDF
 * GET    /report/drafts               — list own draft reports
 * GET    /report/drafts/:id           — get a single draft report
 * DELETE /report/:reportId            — delete own report
 * PUT    /report/:reportId/:status    — change approval status (admin only)
 *
 * Static path segments (url, drafts) are registered before dynamic (:id, :reportId)
 * so Express does not swallow them as parameter values.
 */

import { Router } from "express";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";
import * as ReportController from "../controllers/report.controller.js";

const router = Router();

// Static paths first
router.get( "/drafts",           authMiddleware,                    ReportController.getMyDrafts);
router.get( "/drafts/:id",       authMiddleware,                    ReportController.getReport);
router.get( "/url/:id",          authMiddleware,                    ReportController.getReportUrl);
// Public — QR-code destination on printed certificates. No auth by design.
router.get( "/pdf/:id",                                             ReportController.redirectToReportPdf);

// Dynamic paths
router.post(  "/",               authMiddleware,                    ReportController.upsertReport);
router.get(   "/",               authMiddleware,                    ReportController.listReports);
router.delete("/:reportId",      authMiddleware,                    ReportController.deleteReport);
router.put(   "/:reportId/:status", authMiddleware, adminMiddleware, ReportController.changeStatus);

export default router;
