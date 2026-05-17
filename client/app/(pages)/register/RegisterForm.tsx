"use client";

/**
 * @fileoverview Registration page form component.
 *
 * Renders a two-column layout:
 *  - Left: `AuthBrandingPanel` (desktop only)
 *  - Right: email + password + confirm-password form
 *
 * On success, stores the JWT and redirects to /login.
 * Only @josts.com email addresses are accepted.
 */

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Loader2, UserPlus } from "lucide-react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import type { AxiosError } from "axios";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AuthBrandingPanel } from "@/components/AuthBrandingPanel";
import Wordmark from "@/components/Wordmark";
import { useRegisterMutation } from "@/app/hooks/mutation/useRegisterMutation";

// ── Validation schema ──────────────────────────────────────────────────────

const registerSchema = z
  .object({
    email: z
      .string()
      .email("Email domain is not valid")
      .endsWith("@josts.com", "Must be a @josts.com address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

// ── Component ──────────────────────────────────────────────────────────────

/**
 * New-user registration form with animated branding panel.
 */
export function RegisterForm() {
  const router = useRouter();
  const { mutate: registerUser } = useRegisterMutation();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  /**
   * Handles form submission: calls the register mutation, stores the token,
   * and navigates to the login page on success.
   *
   * @param values - Validated form values
   */
  function onSubmit(values: RegisterFormValues) {
    setIsSubmitting(true);
    registerUser(values as any, {
      onSuccess: (response: any) => {
        localStorage.setItem("token", response.token);
        toast.success("Registration successful!");
        router.push("/login");
      },
      onError: (err) => {
        setIsSubmitting(false);
        const message =
          (err as AxiosError<{ message: string }>)?.response?.data?.message ??
          "An unexpected error occurred";
        toast.error(message);
      },
    });
  }

  return (
    <div className="force-light min-h-screen lg:grid lg:grid-cols-2">
      <AuthBrandingPanel />

      {/* Form panel */}
      <div className="flex min-h-screen lg:min-h-0 items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm space-y-7">
          {/* Mobile wordmark */}
          <div className="flex justify-center lg:hidden">
            <Wordmark size="lg" showDot caption="Calibration Suite" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">
              Create an account
            </h2>
            <p className="text-sm text-muted-foreground">
              Join your calibration team
            </p>
          </div>

          <form id="register-form" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="space-y-4">
              {/* Email */}
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="email">Work Email</FieldLabel>
                    <div className="relative mt-1.5">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...field}
                        id="email"
                        type="email"
                        aria-invalid={fieldState.invalid}
                        placeholder="you@josts.com"
                        autoComplete="email"
                        className="pl-9 h-10"
                      />
                    </div>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              {/* Password */}
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <div className="relative mt-1.5">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...field}
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        aria-invalid={fieldState.invalid}
                        className="pl-9 pr-10 h-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <FaEye className="h-4 w-4" />
                        ) : (
                          <FaEyeSlash className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              {/* Confirm password */}
              <Controller
                name="confirmPassword"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="confirmPassword">
                      Confirm Password
                    </FieldLabel>
                    <div className="relative mt-1.5">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...field}
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter your password"
                        aria-invalid={fieldState.invalid}
                        className="pl-9 pr-10 h-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={
                          showConfirmPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showConfirmPassword ? (
                          <FaEye className="h-4 w-4" />
                        ) : (
                          <FaEyeSlash className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
          </form>

          <div className="space-y-3">
            <Button
              form="register-form"
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10"
              style={{ backgroundColor: "#1e3a5f" }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account…
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Account
                </>
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
