"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import type { AxiosError } from "axios";

import { AuthBrandingPanel } from "@/components/AuthBrandingPanel";
import { useRegisterMutation } from "@/app/hooks/mutation/useRegisterMutation";

const registerSchema = z
  .object({
    email: z
      .string()
      .email("Email domain is not valid")
      .endsWith("@josts.in", "Must be a @josts.in address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

const MONO = "'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace";
const SANS = "Geist, ui-sans-serif, system-ui, -apple-system, sans-serif";
const ACCENT = "#2f6fed";
const INK = "#0b1424";
const LINE = "#e6e8ec";
const MUTED = "#616b7a";

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

  const passwordValue = form.watch("password") || "";
  const strength = scorePassword(passwordValue);

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
    <div
      className="force-light min-h-screen lg:grid lg:grid-cols-2"
      style={{ background: "#fff", color: INK, fontFamily: SANS }}
    >
      <AuthBrandingPanel />

      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "48px 32px", minHeight: "100vh",
        background: "#fff", position: "relative",
      }}>
        <div style={{
          position: "absolute", top: 28, left: 32,
          fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.14em", color: "#8a94a6",
        }}>
          § 02 — REGISTER
        </div>

        {/* Mobile wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }} className="lg:hidden">
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: ACCENT,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" /><circle cx="12" cy="12" r="5" />
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 22, letterSpacing: "-0.01em", color: INK }}>Jasper</span>
        </div>

        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.16em",
            color: ACCENT,
            border: `1px solid ${ACCENT}33`,
            borderRadius: 100, padding: "6px 12px",
            background: `${ACCENT}0d`,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />
            NEW ACCOUNT
          </div>

          <h2 style={{
            margin: "20px 0 8px",
            fontSize: 38, lineHeight: 1.08,
            letterSpacing: "-0.03em", fontWeight: 660,
          }}>
            Join the team.
          </h2>
          <p style={{ margin: 0, fontSize: 15, color: MUTED, lineHeight: 1.55 }}>
            Only <span style={{ fontFamily: MONO, color: INK, fontSize: 13 }}>@josts.in</span> addresses can register — your access is provisioned by an admin.
          </p>

          <form
            id="register-form"
            onSubmit={form.handleSubmit(onSubmit)}
            style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 18 }}
          >
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <FormRow label="WORK EMAIL" error={fieldState.error?.message} invalid={fieldState.invalid}>
                  <input
                    {...field}
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@josts.in"
                    aria-invalid={fieldState.invalid}
                    style={inputStyle(fieldState.invalid)}
                  />
                </FormRow>
              )}
            />

            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <FormRow label="PASSWORD" error={fieldState.error?.message} invalid={fieldState.invalid}>
                  <div style={{ position: "relative" }}>
                    <input
                      {...field}
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      aria-invalid={fieldState.invalid}
                      style={{ ...inputStyle(fieldState.invalid), paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      style={eyeBtn}
                    >
                      {showPassword ? <FaEye size={14} /> : <FaEyeSlash size={14} />}
                    </button>
                  </div>
                  {passwordValue && <StrengthMeter score={strength} />}
                </FormRow>
              )}
            />

            <Controller
              name="confirmPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <FormRow label="CONFIRM PASSWORD" error={fieldState.error?.message} invalid={fieldState.invalid}>
                  <div style={{ position: "relative" }}>
                    <input
                      {...field}
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your password"
                      aria-invalid={fieldState.invalid}
                      style={{ ...inputStyle(fieldState.invalid), paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      style={eyeBtn}
                    >
                      {showConfirmPassword ? <FaEye size={14} /> : <FaEyeSlash size={14} />}
                    </button>
                  </div>
                </FormRow>
              )}
            />
          </form>

          <button
            form="register-form"
            type="submit"
            disabled={isSubmitting}
            style={{
              marginTop: 24, width: "100%",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 9,
              background: ACCENT, color: "#fff",
              fontFamily: SANS, fontWeight: 640, fontSize: 15,
              padding: "14px 20px", borderRadius: 10, border: "none",
              boxShadow: "0 8px 24px rgba(47,111,237,0.28)",
              cursor: isSubmitting ? "wait" : "pointer",
              opacity: isSubmitting ? 0.75 : 1,
              transition: "transform .12s ease, box-shadow .18s ease, opacity .2s ease",
            }}
            onMouseEnter={(e) => { if (!isSubmitting) e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating account…
              </>
            ) : (
              <>
                Create Account
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </>
            )}
          </button>

          <p style={{
            marginTop: 22, textAlign: "center",
            fontSize: 13.5, color: MUTED,
          }}>
            Already registered?{" "}
            <Link href="/login" style={{
              color: ACCENT, fontWeight: 560, textDecoration: "none",
            }}>
              Sign in →
            </Link>
          </p>
        </div>

        <div style={{
          position: "absolute", bottom: 24, left: 32, right: 32,
          display: "flex", justifyContent: "space-between",
          fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em", color: "#a2acbd",
        }}>
          <span>© {new Date().getFullYear()} JOSTS ELECTRIC</span>
          <span>ISO 17025-READY</span>
        </div>
      </div>
    </div>
  );
}

function FormRow({
  label,
  error,
  invalid,
  children,
}: {
  label: string;
  error?: string;
  invalid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={{
        display: "block", marginBottom: 8,
        fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.14em",
        color: invalid ? "#c94236" : "#4a5468", fontWeight: 600,
      }}>
        {label}
      </label>
      {children}
      {error && (
        <div style={{
          marginTop: 6, fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.06em",
          color: "#c94236",
        }}>
          ! {error}
        </div>
      )}
    </div>
  );
}

function inputStyle(invalid?: boolean): React.CSSProperties {
  return {
    width: "100%",
    height: 44,
    padding: "0 14px",
    borderRadius: 9,
    border: `1px solid ${invalid ? "#e0a09a" : LINE}`,
    background: "#fff",
    color: INK,
    fontFamily: SANS,
    fontSize: 15,
    outline: "none",
    transition: "border-color .15s ease, box-shadow .15s ease",
    boxShadow: invalid ? "0 0 0 3px rgba(201,66,54,0.08)" : "none",
  };
}

const eyeBtn: React.CSSProperties = {
  position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
  background: "transparent", border: "none", cursor: "pointer",
  color: MUTED, display: "flex", alignItems: "center",
};

function scorePassword(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}

function StrengthMeter({ score }: { score: number }) {
  const labels = ["TOO SHORT", "WEAK", "OK", "GOOD", "STRONG"];
  const colors = ["#c94236", "#e57e46", "#dfaf3a", "#3aae5d", "#2f6fed"];
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", gap: 4 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i < score ? colors[score] : "#e6e8ec",
            transition: "background .2s ease",
          }} />
        ))}
      </div>
      <div style={{
        marginTop: 6,
        fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em",
        color: colors[score],
      }}>
        {labels[score]}
      </div>
    </div>
  );
}
