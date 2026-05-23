/**
 * @file user.routes.js
 * @description Routes for user profile management.
 *
 * GET  /user/profile   — fetch own profile
 * PUT  /user/profile   — update name / signatureName / location
 * PUT  /user/password  — change password (requires old password)
 */

import { Router }   from "express";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { updateProfileSchema, resetPasswordSchema } from "../schemas/user.schema.js";
import * as UserController from "../controllers/user.controller.js";

const router = Router();

router.get( "/profile",  authMiddleware,                                     UserController.getProfile);
router.put( "/profile",  authMiddleware, validate(updateProfileSchema),      UserController.updateProfile);
router.put( "/password", authMiddleware, validate(resetPasswordSchema),      UserController.resetPassword);

// ── Admin user management ───────────────────────────────────────────────────
router.get(   "/admin",                  authMiddleware, adminMiddleware, UserController.adminListUsers);
router.post(  "/admin",                  authMiddleware, adminMiddleware, UserController.adminCreateUser);
router.put(   "/admin/:userId/password", authMiddleware, adminMiddleware, UserController.adminResetPassword);
router.patch( "/admin/:userId/active",   authMiddleware, adminMiddleware, UserController.adminSetUserActive);
router.patch( "/admin/:userId/role",     authMiddleware, adminMiddleware, UserController.adminSetUserRole);

export default router;
