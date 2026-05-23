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

// ─── Admin-only operations ────────────────────────────────────────────────

/**
 * Lists all users with optional search/status filtering.
 * Passwords are never returned (User schema has select:false on password).
 */
export async function listUsers({ search = "", status = "" } = {}) {
  const q = {};
  if (search) {
    q.$or = [
      { name:  { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }
  if (status === "active")   q.isActive = true;
  if (status === "inactive") q.isActive = false;

  const users = await User.find(q)
    .select("-password")
    .sort({ createdAt: -1 })
    .lean();

  return users.map((u) => ({
    id:            u._id,
    name:          u.name,
    email:         u.email,
    role:          u.role,
    signatureName: u.signatureName ?? null,
    location:      u.location      ?? null,
    isActive:      u.isActive !== false,
    createdAt:     u.createdAt,
    deactivatedAt: u.deactivatedAt ?? null,
  }));
}

/**
 * Admin creates a new user. Bypasses self-registration and lets admins
 * pick the role and an initial password.
 */
export async function adminCreateUser({ name, email, password, role = "user" }) {
  const existing = await User.findOne({ email });
  if (existing) {
    const err = new Error("An account with this email already exists");
    err.statusCode = 409;
    throw err;
  }

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const finalName = (name && name.trim()) || email.split("@")[0];
  const user = await User.create({
    name:     finalName,
    email,
    password: hashed,
    role:     role === "admin" ? "admin" : "user",
    isActive: true,
  });

  return {
    id:       user._id,
    name:     user.name,
    email:    user.email,
    role:     user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

/**
 * Admin-only password reset. Skips the old-password check.
 */
export async function adminResetPassword(targetUserId, newPassword) {
  const user = await User.findById(targetUserId).select("+password");
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();
}

/**
 * Activate or deactivate a user account. A deactivated user cannot log in.
 */
export async function adminSetUserActive(targetUserId, isActive, adminId) {
  const user = await User.findById(targetUserId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  if (!isActive && String(user._id) === String(adminId)) {
    const err = new Error("Admins cannot deactivate themselves");
    err.statusCode = 400;
    throw err;
  }

  user.isActive = !!isActive;
  if (!isActive) {
    user.deactivatedBy = adminId;
    user.deactivatedAt = new Date();
  } else {
    user.deactivatedBy = null;
    user.deactivatedAt = null;
  }
  await user.save();

  return {
    id:            user._id,
    name:          user.name,
    email:         user.email,
    role:          user.role,
    isActive:      user.isActive,
    deactivatedAt: user.deactivatedAt,
  };
}
