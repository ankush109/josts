import { Router } from "express";
import {  changeReportStatus, deleteReportById, generateReport, getAllMyDrafts, getReportById, getReportsForUser, getReportUrl } from "../controllers/report.js";
import { authMiddleware } from "../../utils/middleware.js";

const router = Router();

router.post("/",authMiddleware,generateReport);
router.get("/:id",authMiddleware,getReportUrl);
router.get("/",authMiddleware,getReportsForUser);
router.put("/:reportId/:status",authMiddleware,changeReportStatus)
router.get("/drafts/all",authMiddleware, getAllMyDrafts);
router.get("/drafts/:id",authMiddleware, getReportById);
router.delete("/:reportId",authMiddleware, deleteReportById);

export default router;