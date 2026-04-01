import { Router } from "express";
import { authMiddleware } from "../../utils/middleware.js";
import {
  createCalibrationReport,
  getAllCalibrationReports,
  getCalibrationReportById,
  updateCalibrationReport,
  deleteReport,
} from "../controllers/calibration.js";

const router = Router();

router.post(  "/",          authMiddleware, createCalibrationReport);
router.get(   "/",          authMiddleware, getAllCalibrationReports);
router.get(   "/:reportId", authMiddleware, getCalibrationReportById);
router.put(   "/:reportId", authMiddleware, updateCalibrationReport);
router.delete("/:reportId", authMiddleware, deleteReport);

export default router;
