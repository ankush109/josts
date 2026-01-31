
import { z } from "zod";

export const RegisterInputSchema = z.object({
  email: z.string(),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  age: z
    .number()
    .min(0)
    .max(120, { message: "Age must be between 0 and 120." }),
  dob: z.any(),
  password: z
    .string()
    .min(10, { message: "Password must be at least 10 characters." })
    .regex(/[a-zA-Z]/, "Must contain letters")
    .regex(/[0-9]/, "Must contain at least one digit"),
  gender: z.string().nonempty("Please select a gender"),
  about: z.string().max(5000, "Maximum 5000 characters allowed"),
});

export const updateInputSchema = z.object({
  email: z.string(),
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  age: z
    .number()
    .min(0)
    .max(120, { message: "Age must be between 0 and 120." }),
  dob: z.any(),

  gender: z.string().nonempty("Please select a gender"),
  about: z.string().max(5000, "Maximum 5000 characters allowed"),
});

export const ChangePasswordSchema = z
  .object({
    password: z
    .string()
    .min(10, { message: "Password must be at least 10 characters." })
    .regex(/[a-zA-Z]/, "Must contain letters")
    .regex(/[0-9]/, "Must contain at least one digit"),
 
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

  export const ForgotPasswordSchema = z.object({
    email:z.string()

  })
export const LoginInputSchema = z.object({
  email:z.string(),
  password:z.string()
})
export type Gender = "Male" | "Female" | "Others" | "all"