/**
 * @file calibration.routes.js
 * @description Routes for electrical calibration report management.
 *
 * POST   /calibration-report/compute        — preview uncertainty budget (no DB write)
 * POST   /calibration-report               — create a new report
 * GET    /calibration-report               — list reports (paginated)
 * GET    /calibration-report/:reportId     — get single report
 * PUT    /calibration-report/:reportId     — partial update
 * PATCH  /calibration-report/:reportId/status — verify or reject (admin only)
 * DELETE /calibration-report/:reportId     — delete draft
 *
 * Note: /compute must be registered before /:reportId to avoid Express
 * treating "compute" as a reportId parameter.
 */

import { Router } from "express";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createCalibrationSchema,
  computePreviewSchema,
  verifyRejectSchema,
} from "../schemas/calibration.schema.js";
import * as CalibrationController from "../controllers/calibration.controller.js";

const router = Router();

router.post(  "/compute",          authMiddleware,                         validate(computePreviewSchema),      CalibrationController.computePreview);
router.get(   "/check-csr",        authMiddleware,                                                              CalibrationController.checkCsrNo);
router.post(  "/",                 authMiddleware,                         validate(createCalibrationSchema),   CalibrationController.createReport);
router.get(   "/",                 authMiddleware,                                                              CalibrationController.listReports);
router.get(   "/:reportId",        authMiddleware,                                                              CalibrationController.getReport);
router.put(   "/:reportId",        authMiddleware,                                                              CalibrationController.updateReport);
router.patch( "/:reportId/status", authMiddleware, adminMiddleware,        validate(verifyRejectSchema),        CalibrationController.verifyOrReject);
router.delete("/:reportId",        authMiddleware,                                                              CalibrationController.deleteReport);
router.get(   "/:reportId/history",authMiddleware,                                                              CalibrationController.getHistory);

export default router;
