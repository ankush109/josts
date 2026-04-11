/**
 * @file user.service.js
 * @description Business logic for user profile operations.
 */

import bcrypt from "bcryptjs";
import User   from "../models/User.js";

const SALT_ROUNDS = 12;

/**
 * Returns the public profile of the authenticated user.
 *
 * @param {string} userId - MongoDB ObjectId string from `req.user.userId`.
 * @returns {Promise<object>} User document (no password).
 * @throws {Error} With `statusCode: 404` if the user no longer exists.
 */
export async function getProfile(userId) {
  const user = await User.findById(userId).lean();
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  return { ...user, id: user._id };
}

/**
 * Updates the mutable profile fields (name, signatureName, location).
 * Only fields that are explicitly provided in `updates` are changed.
 *
 * @param {string} userId  - MongoDB ObjectId string of the authenticated user.
 * @param {object} updates - Partial profile fields from the request body.
 * @param {string} [updates.name]
 * @param {string} [updates.signatureName]
 * @param {string} [updates.location]
 * @returns {Promise<object>} Updated public user fields.
 * @throws {Error} With `statusCode: 404` if the user no longer exists.
 */
export async function updateProfile(userId, updates) {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  if (updates.name          !== undefined) user.name          = updates.name;
  if (updates.signatureName !== undefined) user.signatureName = updates.signatureName;
  if (updates.location      !== undefined) user.location      = updates.location;

  await user.save();

  return {
    id:            user._id,
    name:          user.name,
    email:         user.email,
    role:          user.role,
    signatureName: user.signatureName ?? null,
    location:      user.location      ?? null,
  };
}

/**
 * Changes the authenticated user's password after verifying the old one.
 *
 * @param {string} userId      - MongoDB ObjectId string of the authenticated user.
 * @param {string} oldPassword - Current plain-text password for verification.
 * @param {string} newPassword - New plain-text password to store.
 * @returns {Promise<void>}
 * @throws {Error} With `statusCode: 401` if `oldPassword` does not match.
 * @throws {Error} With `statusCode: 404` if the user no longer exists.
 */
export async function resetPassword(userId, oldPassword, newPassword) {
  const user = await User.findById(userId).select("+password");
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    const err = new Error("Current password is incorrect");
    err.statusCode = 401;
    throw err;
  }

  user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();
}
