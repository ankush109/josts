import { Router } from "express";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";
import * as ParameterController from "../controllers/parameter.controller.js";

const router = Router();

router.get("/",             authMiddleware,                              ParameterController.getParameterList);
router.post("/",            authMiddleware, adminMiddleware,             ParameterController.createParameter);
router.get("/:id",          authMiddleware,                              ParameterController.getParameter);
router.put("/:id",          authMiddleware, adminMiddleware,             ParameterController.updateParameter);
router.patch("/:id/active", authMiddleware, adminMiddleware,             ParameterController.setParameterActive);

export default router;
