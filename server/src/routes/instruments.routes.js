import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import * as InstrumentController from "../controllers/instrument.controller.js";

const router = Router();

router.get("/",            authMiddleware, InstrumentController.getInstrumentList);
router.post("/",           authMiddleware, InstrumentController.createInstrument);
router.get("/:id",         authMiddleware, InstrumentController.getInstrumentDetails);
router.get("/:id/history", authMiddleware, InstrumentController.getInstrumentHistory);
router.put("/:id",         authMiddleware, InstrumentController.updateInstrument);
router.patch("/:id/active",authMiddleware, InstrumentController.setInstrumentActive);
router.delete("/:id",      authMiddleware, InstrumentController.deleteInstrument);

export default router;
