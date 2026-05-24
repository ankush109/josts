/**
 * @file user.schema.js
 * @description Zod validation schemas for user profile endpoints.
 */

import { z } from "zod";

/**
 * Schema for PUT /user/profile.
 * All fields are optional — only provided fields are updated.
 */
export const updateProfileSchema = z.object({
  name:          z.string().min(1).max(100).optional(),
  signatureName: z.string().max(100).optional(),
  location:      z.string().max(200).optional(),
});

/**
 * Schema for PUT /user/password.
 * Enforces minimum length on the new password.
 */
export const resetPasswordSchema = z.object({
  oldPassword: z.string().min(1, "Old password is required"),
  newPassword: z
    .string()
    .min(8,  "New password must be at least 8 characters")
    .max(128, "Password too long"),
});

/**
 * Schema for POST /user/admin — admin creates a new account.
 * Mirrors register: same josts.in domain rule, but lets admin pick role + name.
 */
export const adminCreateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z
    .string()
    .email("Invalid email address")
    .refine((e) => e.toLowerCase().endsWith("@josts.in"), {
      message: "Email must be a @josts.in address",
    }),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(128, "Password too long"),
  role: z.enum(["user", "admin"]).optional(),
});
