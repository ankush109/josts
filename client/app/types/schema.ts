/**
 * @fileoverview Zod validation schemas for form inputs.
 *
 * These are used by React Hook Form (via @hookform/resolvers/zod) to
 * validate form data on the client before sending it to the API.
 */

import { z } from "zod";

// ── Shared rules ───────────────────────────────────────────────────────────

const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .regex(/[a-zA-Z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one digit");

// ── Auth schemas ───────────────────────────────────────────────────────────

/** Schema for the user registration form. */
export const RegisterInputSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  age: z.number().min(0).max(120, "Age must be between 0 and 120"),
  dob: z.string().optional(),
  password: passwordSchema,
  gender: z.string().min(1, "Please select a gender"),
  about: z.string().max(5000, "Maximum 5000 characters allowed").optional(),
});

/** Inferred TypeScript type for the registration form values. */
export type RegisterInput = z.infer<typeof RegisterInputSchema>;

/** Schema for the profile update form (email + password excluded). */
export const UpdateProfileSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  age: z.number().min(0).max(120, "Age must be between 0 and 120"),
  dob: z.string().optional(),
  gender: z.string().min(1, "Please select a gender"),
  about: z.string().max(5000, "Maximum 5000 characters allowed").optional(),
});

/** @deprecated Use `UpdateProfileSchema` */
export const updateInputSchema = UpdateProfileSchema;

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

/** Schema for the change-password form. */
export const ChangePasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

/** Schema for the forgot-password email form. */
export const ForgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

/** Schema for the login form. */
export const LoginInputSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;

// ── Domain types ───────────────────────────────────────────────────────────

/** Gender values used in the register / profile forms. */
export type Gender = "Male" | "Female" | "Others" | "all";
