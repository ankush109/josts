import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  heartbeat,
  getActive,
  getReportViewers,
  leave,
} from "../controllers/presence.controller.js";

const router = Router();

router.post("/heartbeat",         authMiddleware, heartbeat);
router.get("/active",             authMiddleware, getActive);
router.get("/report/:reportId/viewers", authMiddleware, getReportViewers);
router.post("/leave",             authMiddleware, leave);

export default router;
