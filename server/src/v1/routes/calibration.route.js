import { Router } from "express";
import { authMiddleware, adminMiddleware } from "../../utils/middleware.js";
import {
  createCalibrationReport,
  getAllCalibrationReports,
  getCalibrationReportById,
  updateCalibrationReport,
  verifyOrRejectReport,
  deleteReport,
} from "../controllers/calibration.js";

const router = Router();

router.post(  "/",                   authMiddleware,                createCalibrationReport);
router.get(   "/",                   authMiddleware,                getAllCalibrationReports);
router.get(   "/:reportId",          authMiddleware,                getCalibrationReportById);
router.put(   "/:reportId",          authMiddleware,                updateCalibrationReport);
router.patch( "/:reportId/status",   authMiddleware, adminMiddleware, verifyOrRejectReport);
router.delete("/:reportId",          authMiddleware,                deleteReport);

export default router;
