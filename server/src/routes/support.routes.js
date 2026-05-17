import { Router } from "express";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";
import * as SupportCtrl from "../controllers/support.controller.js";

const router = Router();

router.use(authMiddleware);

router.post("/",          SupportCtrl.submitMessage);
router.get("/my",         SupportCtrl.getMyMessages);
router.get("/all",        adminMiddleware, SupportCtrl.getAllMessages);
router.patch("/:id/seen", adminMiddleware, SupportCtrl.markSeen);
router.post("/:id/reply", adminMiddleware, SupportCtrl.replyToMessage);

export default router;
