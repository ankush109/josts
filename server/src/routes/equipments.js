import { Router } from "express";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";
import * as EquipmentController from "../controllers/equipment.controller.js";

const router = Router();

// Static paths first (must be before /:id)
router.get("/",                authMiddleware, EquipmentController.getEquipmentList);
router.post("/",               authMiddleware, EquipmentController.createEquipment);
router.get("/params-summary",  authMiddleware, EquipmentController.getEquipmentParamSummary);

router.get("/:id",             authMiddleware, EquipmentController.getEquipmentDetails);
router.get("/:id/history",     authMiddleware, EquipmentController.getEquipmentHistory);
router.put("/:id",             authMiddleware, EquipmentController.updateEquipment);
router.patch("/:id/active",    authMiddleware, EquipmentController.setEquipmentActive);
router.delete("/:id",          authMiddleware, EquipmentController.deleteEquipment);

export default router;
