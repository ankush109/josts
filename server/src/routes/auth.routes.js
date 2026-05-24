/**
 * @file auth.routes.js
 * @description Routes for user registration and login.
 *
 * POST /auth/register  — create a new josts.in account
 * POST /auth/login     — authenticate and receive a JWT
 */

import { Router }   from "express";
import { validate } from "../middleware/validate.js";
import { registerSchema, loginSchema } from "../schemas/auth.schema.js";
import * as AuthController from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", validate(registerSchema), AuthController.register);
router.post("/login",    validate(loginSchema),    AuthController.login);

export default router;
