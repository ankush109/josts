/**
 * @file auth.schema.js
 * @description Zod validation schemas for authentication endpoints.
 */

import { z } from "zod";

/**
 * Schema for POST /auth/register.
 * Enforces josts.com or josts.in domain and a minimum password length.
 */
export const registerSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .refine((e) => e.endsWith("@josts.com") || e.endsWith("@josts.in"), {
      message: "Email must be a @josts.com or @josts.in address",
    }),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long"),
});

/**
 * Schema for POST /auth/login.
 */
export const loginSchema = z.object({
  email:    z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
