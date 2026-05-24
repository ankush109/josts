import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import * as ParameterController from "../controllers/parameter.controller.js";

const router = Router();

router.get("/",             authMiddleware, ParameterController.getParameterList);
router.post("/",            authMiddleware, ParameterController.createParameter);
router.get("/:id",          authMiddleware, ParameterController.getParameter);
router.put("/:id",          authMiddleware, ParameterController.updateParameter);
router.patch("/:id/active", authMiddleware, ParameterController.setParameterActive);

export default router;
