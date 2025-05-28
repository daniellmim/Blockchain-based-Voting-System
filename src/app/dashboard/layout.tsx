
"use client";

import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, isLoading, router]);

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen"><p>Loading dashboard authentication...</p></div>;
  }

  if (!currentUser) {
    // This state should ideally not be reached for long as useEffect redirects.
    // It's a fallback.
    return <div className="flex justify-center items-center min-h-screen"><p>Redirecting to login...</p></div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Mobile Sidebar Toggle and Sheet */}
        <div className="md:hidden fixed top-4 left-4 z-50">
          <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <SheetHeader className="sr-only">
                <SheetTitle>Main Navigation</SheetTitle>
              </SheetHeader>
              <Sidebar />
            </SheetContent>
          </Sheet>
        </div>

        <main className="flex-grow md:ml-64 p-4 sm:p-6 bg-muted/30 min-h-[calc(100vh-var(--footer-height,0px))] mt-16 md:mt-0">
          {children}
        </main>
      </div>
    </div>
  );
}
