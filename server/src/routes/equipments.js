import { Router } from "express";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";
import * as EquipmentController from "../controllers/equipment.controller.js";

const router = Router();

// Static paths first
router.get("/", authMiddleware, EquipmentController.getEquipmentList);
router.get("/:id",authMiddleware,EquipmentController.getEquipmentDetails)


export default router