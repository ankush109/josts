import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getList,
  getActive,
  getById,
  create,
  update,
  activate,
  test,
  deleteConfig,
} from "../controllers/formula-config.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/",             getList);
router.get("/active",       getActive);
router.get("/:id",          getById);
router.post("/",            create);
router.put("/:id",          update);
router.patch("/:id/activate", activate);
router.post("/:id/test",    test);
router.delete("/:id",       deleteConfig);

export default router;
