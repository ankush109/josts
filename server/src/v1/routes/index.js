import { Router } from "express";
import healthRoutes from "./health.route.js"
import authRoutes from "./auth.route.js";
import userRoutes from "./users.route.js";
import reportRoutes from "./report.route.js";
const router = Router();

router.use("/health", healthRoutes);
router.use("/auth",authRoutes)
router.use("/user",userRoutes)
router.use("/report",reportRoutes)

export default router;
