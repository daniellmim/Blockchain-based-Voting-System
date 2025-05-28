
"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { User } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserCircle, Image as ImageIcon, AtSign } from "lucide-react";
import Link from "next/link";
// Removed mockUpdateCurrentUser import

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

const profileFormSchema = z.object({
  name: z.string().min(1, "Name cannot be empty.").max(50, "Name is too long."),
  username: z.string()
    .min(3, "Username must be at least 3 characters.")
    .max(20, "Username is too long.")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores."),
  avatarUrl: z
    .string()
    .url({ message: "Please enter a valid URL for the avatar." })
    .or(z.literal("")),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const {
    currentUser,
    setCurrentUser: updateAuthContextUser,
    isLoading: authLoading,
    token,
    setToken: setAuthToken, // Added to update token in context
  } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      username: "",
      avatarUrl: "",
    },
  });

  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      router.push("/login?redirect=/dashboard/profile");
    } else {
      form.reset({
        name: currentUser.name || "",
        username: currentUser.username || "",
        avatarUrl: currentUser.avatarUrl || "",
      });
    }
    setIsLoading(false);
  }, [currentUser, authLoading, router, form]);

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return (
      name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "U"
    );
  };

  const onSubmit: SubmitHandler<ProfileFormValues> = async (values) => {
    if (!currentUser || !token) {
      toast({ variant: "destructive", title: "Error", description: "Not authenticated." });
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            name: values.name,
            username: values.username,
            // Send avatarUrl only if it's not empty, otherwise backend keeps existing or sets default
            avatarUrl: values.avatarUrl || undefined,
        }),
      });
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update profile");
      }
      
      // Update AuthContext with new user data and potentially new token
      if (data.user && data.token) {
        updateAuthContextUser(data.user);
        setAuthToken(data.token); // Update token in AuthContext
         if (typeof window !== 'undefined') { // Also update localStorage if that's your primary token store
            localStorage.setItem('bvs_token', data.token);
        }
      } else {
        // Fallback if token is not returned, just update user
        updateAuthContextUser(data.user);
      }

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: (error as Error).message,
      });
    }
  };

  if (authLoading || isLoading || !currentUser) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <Button variant="outline" size="sm" asChild className="mb-6">
        <Link href="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>

      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <UserCircle className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl sm:text-3xl">Your Profile</CardTitle>
          </div>
          <CardDescription>
            View and update your personal information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-32 w-32">
              <AvatarImage
                src={form.watch("avatarUrl") || currentUser.avatarUrl}
                alt={currentUser.name || currentUser.username}
                data-ai-hint="profile avatar large"
              />
              <AvatarFallback className="text-4xl">
                {getInitials(currentUser.name || currentUser.username)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="text-2xl font-semibold">
                {form.watch("name") || currentUser.name || currentUser.username}
              </p>
              <p className="text-muted-foreground">{currentUser.email}</p>
              {currentUser.username && <p className="text-sm text-muted-foreground">@{currentUser.username}</p>}
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    <FormLabel className="flex items-center gap-1">
                      <AtSign className="h-4 w-4 text-muted-foreground" />
                      Username
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Your unique username" {...field} />
                    </FormControl>
                    <FormDescription>
                      This is how others can invite you. Min 3, max 20 chars, letters, numbers, underscores.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      Avatar URL
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/avatar.png"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter a URL for your new avatar. If blank, a default will
                      be used or current kept.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full sm:w-auto bg-accent hover:bg-accent/90"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
