"use client";

import * as React from "react";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { toast } from "react-hot-toast";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
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
import jostLogo from '../../../public/logo.png';

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
    defaultValues: {
      email: "",
      password: "",
    },
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-3 text-center pb-8">
          <div className="mx-auto mb-4">
            <Image 
              alt="Josts Technologies Logo" 
              width={160} 
              height={50}  
              src={jostLogo}
              className="h-16 w-auto"
            />
          </div>
          <CardTitle className="text-4xl font-bold bg-gradient-to-r from-blue-800 to-blue-900 bg-clip-text text-transparent">
            Josts Technologies
          </CardTitle>
          <CardDescription className="text-md text-blue-500">
            Sign in to access your dashboard
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form id="login-form" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup className="space-y-5">
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="email" className="text-sm font-medium text-gray-700">
                      Email Address
                    </FieldLabel>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        {...field}
                        id="email"
                        type="email"
                        aria-invalid={fieldState.invalid}
                        placeholder="you@example.com"
                        autoComplete="email"
                        className="pl-10 h-11"
                      />
                    </div>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="password" className="text-sm font-medium text-gray-700">
                      Password
                    </FieldLabel>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        {...field}
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        aria-invalid={fieldState.invalid}
                        className="pl-10 pr-10 h-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <FaEye className="h-4 w-4" /> : <FaEyeSlash className="h-4 w-4" />}
                      </button>
                    </div>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <div className="flex items-center justify-end">
                <Link 
                  href="/forgot-password" 
                  className="text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
            </FieldGroup>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4 pt-2">
          <Button
            form="login-form"
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-700 hover:to-blue-700 text-white font-medium"
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

          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">New to Josts Technologies?</span>
            </div>
          </div>

          <Link href="/register" className="w-full">
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 border-2 border-gray-200 hover:border-blue-600 hover:text-blue-600 font-medium"
            >
              Create an account
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}