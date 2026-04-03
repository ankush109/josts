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
import jostLogo from "../../../public/logo.png";

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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  const getUserQuery = useGetUserDetailsQuery();

  useEffect(() => {
    if (localStorage.getItem("token") && getUserQuery.data?.user) {
      localStorage.setItem("user", JSON.stringify(getUserQuery.data?.user));
      router.push("/home");
    }
  }, [getUserQuery.data?.user, router]);

  function onSubmit(data: z.infer<typeof LoginInputSchema>) {
    setIsSubmitting(true);
    LoginUser(data, {
      onSuccess: (response) => {
        localStorage.setItem("token", response.token);
        setUser(response.user);
        toast.success("Login successful!");
        router.push("/home");
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
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      {/* Left branding panel */}
      <div className="hidden lg:flex bg-primary flex-col items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-white/10" />
        <div className="absolute top-1/2 left-1/4 w-40 h-40 rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-col items-center text-center text-primary-foreground gap-6">
          <div className="bg-white rounded-2xl p-4 shadow-xl">
            <Image
              src={jostLogo}
              alt="Josts Technologies"
              width={150}
              height={65}
              className="h-16 w-auto"
            />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Josts Technologies</h1>
            <p className="text-primary-foreground/75 text-base max-w-xs leading-relaxed">
              Trusted technology solutions and infrastructure since 1907.
            </p>
          </div>
          <div className="mt-4 flex flex-col gap-3 text-sm text-primary-foreground/70 w-full max-w-xs">
            {["Streamlined workflows", "Real-time collaboration", "Secure & reliable"].map((item) => (
              <div key={item} className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground/60 shrink-0" />
                {item}
              </div>
            ))}
          </div>
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
                        className="text-xs text-primary hover:underline font-medium"
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
              <Link href="/register" className="text-primary font-medium hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
