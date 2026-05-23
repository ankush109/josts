/**
 * @file auth.controller.js
 * @description Thin HTTP handlers for authentication routes.
 * All business logic lives in auth.service.js.
 */

import * as AuthService from "../services/auth.service.js";

/**
 * POST /auth/register
 * Registers a new user and returns a JWT access token.
 *
 * @type {import("express").RequestHandler}
 */
export async function register(req, res, next) {
  try {
    const result = await AuthService.registerUser(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/login
 * Authenticates a user and returns a JWT access token + public user fields.
 *
 * @type {import("express").RequestHandler}
 */
export async function login(req, res, next) {
  try {
    const ip = req.ip ?? req.headers["x-forwarded-for"] ?? "";
    const result = await AuthService.loginUser({ ...req.body, ip });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
