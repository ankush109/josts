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
