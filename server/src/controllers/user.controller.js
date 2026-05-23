/**
 * @file user.controller.js
 * @description Thin HTTP handlers for user profile routes.
 * All business logic lives in user.service.js.
 */

import * as UserService from "../services/user.service.js";

/**
 * GET /user/profile
 * Returns the authenticated user's profile.
 *
 * @type {import("express").RequestHandler}
 */
export async function getProfile(req, res, next) {
  try {
    const user = await UserService.getProfile(req.user.userId);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /user/profile
 * Updates the authenticated user's mutable profile fields.
 *
 * @type {import("express").RequestHandler}
 */
export async function updateProfile(req, res, next) {
  try {
    const user = await UserService.updateProfile(req.user.userId, req.body);
    res.json({ message: "Profile updated successfully", user });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /user/password
 * Changes the authenticated user's password after verifying the current one.
 *
 * @type {import("express").RequestHandler}
 */
export async function resetPassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body;
    await UserService.resetPassword(req.user.userId, oldPassword, newPassword);
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    next(err);
  }
}

// ── Admin user management ───────────────────────────────────────────────────

export async function adminListUsers(req, res, next) {
  try {
    const users = await UserService.listUsers({
      search: typeof req.query.search === "string" ? req.query.search : "",
      status: typeof req.query.status === "string" ? req.query.status : "",
    });
    res.json({ users });
  } catch (err) { next(err); }
}

export async function adminCreateUser(req, res, next) {
  try {
    const user = await UserService.adminCreateUser(req.body);
    res.status(201).json({ user });
  } catch (err) { next(err); }
}

export async function adminResetPassword(req, res, next) {
  try {
    const { newPassword } = req.body ?? {};
    if (!newPassword || newPassword.length < 6) {
      const err = new Error("New password must be at least 6 characters");
      err.statusCode = 400;
      throw err;
    }
    await UserService.adminResetPassword(req.params.userId, newPassword);
    res.json({ message: "Password reset successfully" });
  } catch (err) { next(err); }
}

export async function adminSetUserActive(req, res, next) {
  try {
    const { isActive } = req.body ?? {};
    const user = await UserService.adminSetUserActive(
      req.params.userId,
      !!isActive,
      req.user.userId,
    );
    res.json({ user });
  } catch (err) { next(err); }
}
