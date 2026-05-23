"use client";

/**
 * @fileoverview Login page form component.
 *
 * Renders a two-column layout:
 *  - Left: `AuthBrandingPanel` (desktop only)
 *  - Right: email + password form backed by React Hook Form + Zod
 *
 * On success, stores the JWT in localStorage, syncs the user into
 * AuthContext, and redirects to /calibration.
 */

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AuthBrandingPanel } from "@/components/AuthBrandingPanel";
import Wordmark from "@/components/Wordmark";
import { useLoginMutation } from "@/app/hooks/mutation/useLoginMutation";
import { useGetUserDetailsQuery } from "@/app/hooks/mutation/useGetUserDetails";
import { useAuth } from "@/app/provider/AuthProvider";
import type { AxiosError } from "axios";

// ── Validation schema ──────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ── Component ──────────────────────────────────────────────────────────────

/**
 * Login form with animated branding panel.
 *
 * Redirects authenticated users to /calibration automatically if a valid
 * token already exists in localStorage.
 */
export function LoginForm() {
  const router = useRouter();
  const { setUser } = useAuth();
  const { mutate: loginUser } = useLoginMutation();
  const { data: userDetails } = useGetUserDetailsQuery();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  /** Redirect already-authenticated users straight to the app. */
  useEffect(() => {
    if (localStorage.getItem("token") && (userDetails as any)?.user) {
      localStorage.setItem("user", JSON.stringify((userDetails as any).user));
      router.push("/calibration");
    }
  }, [userDetails, router]);

  /**
   * Handles form submission: calls the login mutation, persists the token,
   * and navigates to the main application on success.
   *
   * @param values - Validated email and password from the form
   */
  function onSubmit(values: LoginFormValues) {
    setIsSubmitting(true);
    loginUser(values, {
      onSuccess: (response) => {
        localStorage.setItem("token", response.token);
        setUser(response.user);
        toast.success("Login successful!");
        router.push("/calibration");
      },
      onError: (err) => {
        setIsSubmitting(false);
        const axErr = err as AxiosError<{ message: string; code?: string }>;
        const message =
          axErr?.response?.data?.message ??
          "An unexpected error occurred";
        const isDeactivated =
          axErr?.response?.status === 403 ||
          axErr?.response?.data?.code === "ACCOUNT_DEACTIVATED";
        if (isDeactivated) {
          toast.error(message, { duration: 8000 });
        } else {
          toast.error(message);
        }
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
              Welcome back
            </h2>
            <p className="text-sm text-muted-foreground">
              Sign in to continue
            </p>
          </div>

          <form id="login-form" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="space-y-4">
              {/* Email */}
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="email">Email Address</FieldLabel>
                    <div className="relative mt-1.5">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...field}
                        id="email"
                        type="email"
                        aria-invalid={fieldState.invalid}
                        placeholder="you@example.com"
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
                    <div className="flex items-center justify-between">
                      <FieldLabel htmlFor="password">Password</FieldLabel>
                      <Link
                        href="/forgot-password"
                        className="text-xs hover:underline font-medium"
                        style={{ color: "#1e3a5f" }}
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative mt-1.5">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...field}
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
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
            </FieldGroup>
          </form>

          <div className="space-y-3">
            <Button
              form="login-form"
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10"
              style={{ backgroundColor: "#1e3a5f" }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-medium hover:underline"
                style={{ color: "#1e3a5f" }}
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
