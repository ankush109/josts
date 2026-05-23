/**
 * @file auth.service.js
 * @description Business logic for user registration and login.
 *
 * All DB interactions and token generation live here.
 * Controllers call these functions and only deal with HTTP concerns.
 */

import bcrypt   from "bcryptjs";
import User     from "../models/User.js";
import LoginEvent from "../models/LoginEvent.js";
import { signToken } from "../lib/jwt.js";

/** bcrypt cost factor — 12 rounds gives ~300 ms on modern hardware. */
const SALT_ROUNDS = 12;

/**
 * Registers a new user account.
 *
 * Derives the display name from the email local-part (e.g. "john.doe@josts.com" → "john.doe").
 * Hashes the password before storing.
 *
 * @param {object} params
 * @param {string} params.email    - Must end with @josts.com (enforced by Zod before this).
 * @param {string} params.password - Plain-text password; hashed here.
 * @returns {Promise<{ token: string }>} JWT access token for the new user.
 * @throws {Error} With `statusCode: 409` if the email is already registered.
 */
export async function registerUser({ email, password }) {
  const existing = await User.findOne({ email });
  if (existing) {
    const err = new Error("An account with this email already exists");
    err.statusCode = 409;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const name           = email.split("@")[0];

  const user  = await User.create({ name, email, password: hashedPassword });
  const token = signToken({ userId: user._id, userRole: user.role });

  return { token };
}

/**
 * Authenticates a user with email + password.
 *
 * Returns the same error message for both "user not found" and "wrong password"
 * to prevent user enumeration.
 *
 * @param {object} params
 * @param {string} params.email    - User's email address.
 * @param {string} params.password - Plain-text password to verify.
 * @returns {Promise<{ token: string, user: object }>} Access token + public user fields.
 * @throws {Error} With `statusCode: 401` on invalid credentials.
 */
export async function loginUser({ email, password, ip = "" }) {
  const user = await User.findOne({ email }).select("+password");

  // Constant-time check — compare even if user doesn't exist to prevent timing attacks
  const passwordToCheck = user?.password ?? "$2b$12$invalidhashfortimingnoop";
  const isMatch = await bcrypt.compare(password, passwordToCheck);

  if (!user || !isMatch) {
    const err = new Error("Invalid email or password");
    err.statusCode = 401;
    throw err;
  }

  if (user.isActive === false) {
    const err = new Error("Account deactivated. Please contact support.");
    err.statusCode = 403;
    err.code = "ACCOUNT_DEACTIVATED";
    throw err;
  }

  const token = signToken({ userId: user._id, userRole: user.role });

  // Fire-and-forget login event — never blocks the response.
  LoginEvent.create({ userId: user._id, ip }).catch(() => {});

  return {
    token,
    user: {
      id:            user._id,
      name:          user.name,
      email:         user.email,
      role:          user.role,
      signatureName: user.signatureName ?? null,
      location:      user.location      ?? null,
    },
  };
}
