
"use client";

import { AuthForm } from '@/components/AuthForm'; 
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function SignupPage() {
  const { signupUser, currentUser, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && currentUser) {
      router.push('/dashboard');
    }
  }, [currentUser, isLoading, router]);

  const handleSignup = async (values: { name?: string; username?: string; email: string; password?: string; confirmPassword?: string }) => {
    if (!values.name || !values.username || !values.email || !values.password) {
        toast({ variant: "destructive", title: "Signup Failed", description: "All fields are required." });
        throw new Error("All fields are required for signup.");
    }
    if (values.password !== values.confirmPassword) {
        toast({ variant: "destructive", title: "Signup Failed", description: "Passwords do not match." });
        throw new Error("Passwords do not match.");
    }

    try {
      await signupUser(values.name, values.username, values.email, values.password);
      toast({ title: "Signup Successful", description: "Welcome! Your account has been created." });
      // Redirection is handled by useEffect
    } catch (error: any) {
      toast({ variant: "destructive", title: "Signup Failed", description: error.message || "An unexpected error occurred." });
      throw error; // Re-throw to allow AuthForm to handle its internal submitting state
    }
  };

  if (isLoading && !currentUser) {
    return <div className="flex justify-center items-center min-h-screen"><p>Loading...</p></div>;
  }

  if (!isLoading && currentUser) {
     return <div className="flex justify-center items-center min-h-screen"><p>Redirecting to dashboard...</p></div>;
  }

  return <AuthForm mode="signup" onSubmit={handleSignup} />;
}
