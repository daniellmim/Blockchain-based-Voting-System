
"use client";

import { AuthForm } from '@/components/AuthForm';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation'; 
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const { loginUser, currentUser, isLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && currentUser) {
      router.push('/dashboard');
    }
  }, [currentUser, isLoading, router]);

  const handleLogin = async (values: { email: string; password?: string }) => {
    if (!values.password) { 
        toast({ variant: "destructive", title: "Login Failed", description: "Password is required." });
        throw new Error("Password is required."); // Keep throw for form state
    }
    try {
        await loginUser(values.email, values.password);
        toast({ title: "Login Successful", description: "Welcome back!" });
        // Redirection is handled by useEffect
    } catch (error: any) {
        toast({ variant: "destructive", title: "Login Failed", description: error.message || "An unexpected error occurred." });
        throw error; // Re-throw to allow AuthForm to handle its internal submitting state
    }
  };
  
  if (isLoading && !currentUser) { // Only show loading if not already redirecting
    return <div className="flex justify-center items-center min-h-screen"><p>Loading...</p></div>;
  }
  
  if (!isLoading && currentUser) { // If already logged in, effectively show nothing or redirect indicator
    return <div className="flex justify-center items-center min-h-screen"><p>Redirecting to dashboard...</p></div>;
  }

  return <AuthForm mode="login" onSubmit={handleLogin} />;
}
