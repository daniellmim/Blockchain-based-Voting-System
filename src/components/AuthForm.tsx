"use client";

import React, { useState, useMemo } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// Toast is now handled by login/signup pages
import Link from "next/link";
import { Logo } from "./Logo";
// useAuth is not directly needed here as onSubmit handles success/error
// import { useAuth } from '@/contexts/AuthContext';

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

const signupSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name cannot be empty.")
      .max(50, "Name is too long."),
    username: z
      .string()
      .min(3, "Username must be at least 3 characters.")
      .max(20, "Username is too long.")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores."
      ),
    email: z.string().email({ message: "Invalid email address." }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters." }),
    confirmPassword: z
      .string()
      .min(6, { message: "Please confirm your password." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;
type FormValues = LoginFormValues | SignupFormValues;

interface AuthFormProps {
  mode: "login" | "signup";
  onSubmit: (values: FormValues) => Promise<void>;
}

// Password strength requirements
const passwordRequirements = [
  { label: "At least 8 characters", test: (pw: string) => pw.length >= 8 },
  {
    label: "At least one uppercase letter",
    test: (pw: string) => /[A-Z]/.test(pw),
  },
  {
    label: "At least one lowercase letter",
    test: (pw: string) => /[a-z]/.test(pw),
  },
  { label: "At least one number", test: (pw: string) => /[0-9]/.test(pw) },
  {
    label: "At least one special character",
    test: (pw: string) => /[^A-Za-z0-9]/.test(pw),
  },
];

export function AuthForm({ mode, onSubmit }: AuthFormProps) {
  // const { isLoading: authLoading } = useAuth(); // useAuth is not directly used here
  const formSchema = mode === "login" ? loginSchema : signupSchema;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues:
      mode === "login"
        ? { email: "", password: "" }
        : {
            name: "",
            username: "",
            email: "",
            password: "",
            confirmPassword: "",
          },
  });

  const {
    formState: { isSubmitting },
  } = form;
  const [passwordValue, setPasswordValue] = useState("");
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const handleSubmit: SubmitHandler<FormValues> = async (values) => {
    setUsernameError(null);
    try {
      await onSubmit(values);
    } catch (err: any) {
      if (mode === "signup" && err?.message === "Username is already taken") {
        setUsernameError(err.message);
        form.setError("username", {
          type: "manual",
          message: err.message,
        });
        return;
      }
      // Only log the error if it's not a username taken error
      if (
        !(mode === "signup" && err?.message === "Username is already taken")
      ) {
        console.error("AuthForm submission error:", err);
      }
    }
  };

  // Memoized password checks
  const passwordChecks = useMemo(() => {
    return passwordRequirements.map((req) => req.test(passwordValue));
  }, [passwordValue]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
      <Card className="w-full max-w-sm sm:max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-fit">
            <Logo size="md" />
          </div>
          <CardTitle className="text-xl sm:text-2xl">
            {mode === "login" ? "Welcome Back!" : "Create an Account"}
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            {mode === "login"
              ? "Enter your credentials to access your account."
              : "Fill in the details below to get started."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4 sm:space-y-6"
            >
              {mode === "signup" && (
                <>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Choose a unique username"
                            {...field}
                            className={
                              (form.formState.errors as any).username
                                ? "border-red-500"
                                : ""
                            }
                          />
                        </FormControl>
                        {(form.formState.errors as any).username && (
                          <div className="text-red-600 text-xs mt-1">
                            {(form.formState.errors as any).username.message}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          setPasswordValue(e.target.value);
                        }}
                      />
                    </FormControl>
                    {/* Password strength checklist */}
                    {mode === "signup" && (
                      <div className="mt-2 space-y-1">
                        {passwordRequirements.map((req, idx) => (
                          <div
                            key={req.label}
                            className="flex items-center text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={passwordChecks[idx]}
                              readOnly
                              className="mr-2 accent-green-500"
                              aria-label={req.label}
                            />
                            <span
                              className={
                                passwordChecks[idx]
                                  ? "text-green-600"
                                  : "text-gray-500"
                              }
                            >
                              {req.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              {mode === "signup" && (
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <Button
                type="submit"
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? mode === "login"
                    ? "Logging in..."
                    : "Signing up..."
                  : mode === "login"
                  ? "Login"
                  : "Sign Up"}
              </Button>
            </form>
          </Form>
          <div className="mt-6 text-center text-sm">
            {mode === "login" ? (
              <p>
                Don&apos;t have an account?{" "}
                <Link
                  href="/signup"
                  className="font-medium text-primary hover:underline"
                >
                  Sign up
                </Link>
              </p>
            ) : (
              <p>
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-medium text-primary hover:underline"
                >
                  Login
                </Link>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
