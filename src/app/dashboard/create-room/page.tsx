
"use client";

import { CreateRoomForm } from '@/components/CreateRoomForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CreateRoomPage() {
  const {currentUser, isLoading} = useAuth();
  const router = useRouter();

  useEffect(() => {
    if(!isLoading && !currentUser){
      router.push('/login?redirect=/dashboard/create-room');
    }
  }, [currentUser, isLoading, router]);

  if(isLoading || !currentUser){
    return <div className="flex justify-center items-center min-h-screen"><p>Loading...</p></div>;
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <Button variant="outline" size="sm" asChild className="mb-6">
        <Link href="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>
      <Card className="shadow-xl border-border">
        <CardHeader className="border-b">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl sm:text-3xl">Create a New Discussion Room</CardTitle>
          </div>
          <CardDescription className="text-base">
            Define the settings for your new room. You will be the administrator and can share invitation links after creation.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <CreateRoomForm />
        </CardContent>
      </Card>
    </div>
  );
}
