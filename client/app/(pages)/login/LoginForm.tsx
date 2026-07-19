"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

import { AuthBrandingPanel } from "@/components/AuthBrandingPanel";
import { useLoginMutation } from "@/app/hooks/mutation/useLoginMutation";
import { useGetUserDetailsQuery } from "@/app/hooks/mutation/useGetUserDetails";
import { useAuth } from "@/app/provider/AuthProvider";
import type { AxiosError } from "axios";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const MONO = "'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace";
const SANS = "Geist, ui-sans-serif, system-ui, -apple-system, sans-serif";
const ACCENT = "#2f6fed";
const INK = "#0b1424";
const LINE = "#e6e8ec";
const MUTED = "#616b7a";

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

  useEffect(() => {
    if (localStorage.getItem("token") && (userDetails as any)?.user) {
      localStorage.setItem("user", JSON.stringify((userDetails as any).user));
      router.push("/calibration");
    }
  }, [userDetails, router]);

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
        const message = axErr?.response?.data?.message ?? "An unexpected error occurred";
        const isDeactivated =
          axErr?.response?.status === 403 ||
          axErr?.response?.data?.code === "ACCOUNT_DEACTIVATED";
        if (isDeactivated) toast.error(message, { duration: 8000 });
        else toast.error(message);
      },
    });
  }

  return (
    <div
      className="force-light min-h-screen lg:grid lg:grid-cols-2"
      style={{ background: "#fff", color: INK, fontFamily: SANS }}
    >
      <AuthBrandingPanel />

      {/* Form panel */}
      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "48px 32px", minHeight: "100vh",
        background: "#fff", position: "relative",
      }}>
        {/* subtle top-left mono breadcrumb */}
        <div style={{
          position: "absolute", top: 28, left: 32,
          fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.14em", color: "#8a94a6",
        }}>
          § 01 — SIGN IN
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
            SECURE ACCESS
          </div>

          <h2 style={{
            margin: "20px 0 8px",
            fontSize: 38, lineHeight: 1.08,
            letterSpacing: "-0.03em", fontWeight: 660,
          }}>
            Welcome back.
          </h2>
          <p style={{ margin: 0, fontSize: 15, color: MUTED, lineHeight: 1.55 }}>
            Sign in with your <span style={{ fontFamily: MONO, color: INK, fontSize: 13 }}>@josts.in</span> account to continue.
          </p>

          <form
            id="login-form"
            onSubmit={form.handleSubmit(onSubmit)}
            style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 18 }}
          >
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <FormRow
                  label="EMAIL ADDRESS"
                  error={fieldState.error?.message}
                  invalid={fieldState.invalid}
                >
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
                <FormRow
                  label="PASSWORD"
                  error={fieldState.error?.message}
                  invalid={fieldState.invalid}
                  labelAside={
                    <Link href="/forgot-password" style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.1em", color: ACCENT, textDecoration: "none" }}>
                      FORGOT?
                    </Link>
                  }
                >
                  <div style={{ position: "relative" }}>
                    <input
                      {...field}
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      aria-invalid={fieldState.invalid}
                      style={{ ...inputStyle(fieldState.invalid), paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      style={{
                        position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                        background: "transparent", border: "none", cursor: "pointer",
                        color: MUTED, display: "flex", alignItems: "center",
                      }}
                    >
                      {showPassword ? <FaEye size={14} /> : <FaEyeSlash size={14} />}
                    </button>
                  </div>
                </FormRow>
              )}
            />
          </form>

          <button
            form="login-form"
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
                Signing in…
              </>
            ) : (
              <>
                Sign In
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </>
            )}
          </button>

          <div style={{
            marginTop: 20, display: "flex", alignItems: "center", gap: 12,
            fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", color: "#a2acbd",
          }}>
            <div style={{ flex: 1, height: 1, background: LINE }} />
            <span>NEW HERE?</span>
            <div style={{ flex: 1, height: 1, background: LINE }} />
          </div>

          <Link
            href="/register"
            style={{
              marginTop: 14, width: "100%",
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
              background: "#fff", color: INK,
              fontWeight: 560, fontSize: 14,
              padding: "12px 20px", borderRadius: 10,
              border: `1px solid ${LINE}`,
              textDecoration: "none",
              transition: "border-color .18s ease, background .18s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#c3ccdb"; e.currentTarget.style.background = "#f6f7f9"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = LINE; e.currentTarget.style.background = "#fff"; }}
          >
            Create an account
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
        </div>

        {/* footer mono */}
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
  labelAside,
  error,
  invalid,
  children,
}: {
  label: string;
  labelAside?: React.ReactNode;
  error?: string;
  invalid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <label style={{
          fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.14em",
          color: invalid ? "#c94236" : "#4a5468", fontWeight: 600,
        }}>
          {label}
        </label>
        {labelAside}
      </div>
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
