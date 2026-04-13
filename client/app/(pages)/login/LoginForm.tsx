"use client";

import * as React from "react";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "react-hot-toast";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { LoginInputSchema } from "@/app/types/schema";
import { useLoginMutation } from "@/app/hooks/mutation/useLoginMutation";
import { useAuth } from "@/app/provider/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useGetUserDetailsQuery } from "@/app/hooks/mutation/useGetUserDetails";
import { Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import Image from "next/image";
import jostLogo from "../../../public/logo2.png";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters long."),
});

export function LoginForm() {
  const router = useRouter();
  const { setUser } = useAuth();
  const { mutate: LoginUser } = useLoginMutation();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  // Rotating taglines
  const taglines = [
    "Advanced engineering solutions since 1907",
    "Built on fair & ethical business practices",
    "Trusted by customers, stakeholders & employees",
    "World-class products for Indian industry",
    "Setting high standards of quality & service",
    "Diverse Technology Integrated Approach",
  ];
  const [taglineIndex, setTaglineIndex] = React.useState(0);
  const [taglineFade, setTaglineFade] = React.useState(true);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTaglineFade(false);
      setTimeout(() => {
        setTaglineIndex((prev) => (prev + 1) % taglines.length);
        setTaglineFade(true);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Typewriter effect for brand name
  const brandName = "Josts Technologies";
  const [displayedText, setDisplayedText] = React.useState("");
  const [typewriterDone, setTypewriterDone] = React.useState(false);
  React.useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(brandName.slice(0, i + 1));
      i++;
      if (i >= brandName.length) {
        clearInterval(interval);
        setTimeout(() => setTypewriterDone(true), 600);
      }
    }, 80);
    return () => clearInterval(interval);
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  const getUserQuery = useGetUserDetailsQuery();

  useEffect(() => {
    if (localStorage.getItem("token") && getUserQuery.data?.user) {
      localStorage.setItem("user", JSON.stringify(getUserQuery.data?.user));
      router.push("/calibration");
    }
  }, [getUserQuery.data?.user, router]);

  function onSubmit(data: z.infer<typeof LoginInputSchema>) {
    setIsSubmitting(true);
    LoginUser(data, {
      onSuccess: (response) => {
        localStorage.setItem("token", response.token);
        setUser(response.user);
        setIsSubmitting(false);
        toast.success("Login successful!");
        router.push("/calibration");
      },
      onError: (error: any) => {
        setIsSubmitting(false);
        const errorMessage =
          error?.response?.data?.message || "An unexpected error occurred";
        toast.error(errorMessage);
      },
    });
  }

  return (
    <div className="force-light min-h-screen lg:grid lg:grid-cols-2">
      {/* Left branding panel — minimal elegance */}
      <div className="hidden lg:flex flex-col items-center justify-center p-16 relative overflow-hidden" style={{ backgroundColor: "#1e3a5f" }}>
        {/* Dot grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
        {/* Subtle geometric accents */}
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-400/20 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-400/20 to-transparent" />
        <div className="absolute top-12 right-12 w-24 h-24 border border-blue-400/[0.08] rounded-full" />
        <div className="absolute bottom-16 left-10 w-32 h-32 border border-blue-400/[0.06] rounded-full" />

        <div className="relative z-10 flex flex-col items-center text-center gap-10 max-w-sm">
          {/* Typewriter heading */}
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white">
              {displayedText}
              {!typewriterDone && (
                <span className="inline-block w-[2px] h-8 bg-white/80 ml-0.5 animate-pulse align-middle" />
              )}
            </h1>
            <div className="mt-3 mx-auto w-12 h-px bg-blue-400" />
          </div>

          {/* Logo */}
          <div className="bg-white rounded-2xl p-5 shadow-2xl shadow-black/20">
            <Image
              src={jostLogo}
              alt="Josts Technologies"
              width={220}
              height={480}
            />
          </div>

          {/* Divider */}
          <div className="w-full flex items-center gap-4">
            <div className="flex-1 h-px bg-blue-400/15" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-blue-300/40 font-medium">
              Est. 1907
            </span>
            <div className="flex-1 h-px bg-blue-400/15" />
          </div>

          {/* Rotating tagline */}
          <p
            className="text-sm text-blue-200/50 h-6 transition-all duration-400 ease-in-out"
            style={{
              opacity: taglineFade ? 1 : 0,
              transform: taglineFade ? "translateY(0)" : "translateY(6px)",
            }}
          >
            {taglines[taglineIndex]}
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex min-h-screen lg:min-h-0 items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm space-y-7">
          {/* Mobile logo */}
          <div className="flex justify-center lg:hidden">
            <Image
              src={jostLogo}
              alt="Josts Technologies"
              width={130}
              height={55}
              className="h-14 w-auto"
            />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground">
              Sign in to your Josts Technologies account
            </p>
          </div>

          <form id="login-form" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="space-y-4">
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
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

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
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
                  Signing in...
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
              <Link href="/register" className="font-medium hover:underline" style={{ color: "#1e3a5f" }}>
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}