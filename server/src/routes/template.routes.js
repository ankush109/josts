import { Router } from "express";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";
import * as TemplateController from "../controllers/template.controller.js";

const router = Router();

// Admin-only — raw EJS edits give code-execution surface on the worker.
router.get("/",                                  authMiddleware, adminMiddleware, TemplateController.listTemplates);
router.get("/sample-data",                       authMiddleware, adminMiddleware, TemplateController.getSampleData);
router.get("/:key",                              authMiddleware, adminMiddleware, TemplateController.getTemplate);
router.get("/:key/active",                       authMiddleware, adminMiddleware, TemplateController.getActiveVersion);
router.get("/:key/versions/:versionId",          authMiddleware, adminMiddleware, TemplateController.getVersion);
router.post("/:key/versions",                    authMiddleware, adminMiddleware, TemplateController.createVersion);
router.post("/:key/activate",                    authMiddleware, adminMiddleware, TemplateController.activateVersion);

export default router;
