/**
 * @file routes/index.js
 * @description Mounts all versioned API route groups onto /api/v1.
 *
 * Health check is at /health (no version prefix) for load-balancer probes.
 */

import { Router } from "express";
import authRoutes        from "./auth.routes.js";
import userRoutes        from "./user.routes.js";
import calibrationRoutes from "./calibration.routes.js";
import reportRoutes      from "./report.routes.js";
import equipmentRoutes   from "./equipments.js"
import instrumentRoutes  from "./instruments.routes.js";
import parameterRoutes  from "./parameter.routes.js";
import supportRoutes     from "./support.routes.js";
import dashboardRoutes   from "./dashboard.routes.js";
import presenceRoutes    from "./presence.routes.js";
import templateRoutes    from "./template.routes.js";
import formulaConfigRoutes from "./formula-config.routes.js";
const router = Router();

/** Liveness probe — no auth required. */
router.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

router.use("/auth",               authRoutes);
router.use("/user",               userRoutes);
router.use("/calibration-report", calibrationRoutes);
router.use("/report",             reportRoutes);
router.use("/equipments", equipmentRoutes)
router.use("/instruments", instrumentRoutes);
router.use("/parameters",  parameterRoutes);
router.use("/support",    supportRoutes);
router.use("/dashboard",  dashboardRoutes);
router.use("/presence",   presenceRoutes);
router.use("/templates",      templateRoutes);
router.use("/formula-config", formulaConfigRoutes);

export default router;
