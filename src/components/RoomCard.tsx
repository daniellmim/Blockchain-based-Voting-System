
"use client";

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Users, ArrowRight, LogIn, UserPlus, Hourglass, XCircle, Loader2 } from 'lucide-react';
import type { Room } from '@/lib/types';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

interface RoomCardProps {
  room: Room;
  isRequestPendingForThisRoom?: boolean;
  onJoinRequestStatusChange?: (roomId: string, isPending: boolean) => void;
}

export function RoomCard({ room, isRequestPendingForThisRoom, onJoinRequestStatusChange }: RoomCardProps) {
  const { currentUser, token } = useAuth();
  const { toast } = useToast();
  const formattedDate = room.createdAt ? format(new Date(room.createdAt), 'PP') : 'N/A';
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [isCancellingRequest, setIsCancellingRequest] = useState(false);

  const isMember = currentUser && room.members && room.members.some(member => {
    const memberUserIdString = typeof member.userId === 'string' ? member.userId : (member.userId as any)?._id?.toString();
    return memberUserIdString === currentUser.id;
  });
  const isAdmin = currentUser && (
    (typeof room.adminId === 'string' && room.adminId === currentUser.id) ||
    (typeof room.adminId === 'object' && (room.adminId as any)?._id?.toString() === currentUser.id)
  );

  const handleRequestToJoin = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser || !token) {
      toast({ variant: "destructive", title: "Not Logged In", description: "You must be logged in to request to join." });
      return;
    }
    setIsSubmittingRequest(true);
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${room.id}/join-request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409) { // Already pending
          toast({ title: "Request Pending", description: data.message, variant: "default" });
          onJoinRequestStatusChange?.(room.id, true);
        } else {
          throw new Error(data.message || "Failed to send join request");
        }
      } else { // Successfully created new request
        toast({ title: "Request Sent!", description: data.message || `Your request to join "${room.name}" has been sent to the admin.` });
        onJoinRequestStatusChange?.(room.id, true);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
      // Do not change pending status on generic error, as it might already be pending from a previous attempt
      // onJoinRequestStatusChange?.(room.id, false); 
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleCancelJoinRequest = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser || !token) {
      toast({ variant: "destructive", title: "Error", description: "Not authenticated." });
      return;
    }
    setIsCancellingRequest(true);
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${room.id}/join-request`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to cancel join request");
      }
      toast({ title: "Request Cancelled", description: data.message });
      onJoinRequestStatusChange?.(room.id, false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Cancellation Failed", description: error.message });
    } finally {
      setIsCancellingRequest(false);
    }
  };

  const renderAction = () => {
    if (isMember || isAdmin) {
      return (
        <div
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "w-full mt-auto flex items-center justify-center"
          )}
          aria-hidden="true" // Since the whole card is a link
        >
          Enter Room <ArrowRight className="ml-2 h-4 w-4" />
        </div>
      );
    }
    if (room.visibility === 'public' && currentUser) {
      if (isRequestPendingForThisRoom) {
        return (
          <div className="w-full mt-auto flex items-center space-x-2">
            <Button variant="outline" size="sm" className="flex-grow" disabled>
              {isCancellingRequest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Hourglass className="mr-2 h-4 w-4" />} 
              Request Pending
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleCancelJoinRequest} 
              disabled={isCancellingRequest}
              className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-destructive"
              aria-label="Cancel join request"
            >
              {isCancellingRequest ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-5 w-5" />}
            </Button>
          </div>
        );
      }
      return (
        <Button 
          variant="default" 
          size="sm" 
          className="w-full mt-auto bg-accent hover:bg-accent/90" 
          onClick={handleRequestToJoin}
          disabled={isSubmittingRequest}
        >
          {isSubmittingRequest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
          {isSubmittingRequest ? "Sending..." : "Request to Join"}
        </Button>
      );
    }
    if (room.visibility === 'public' && !currentUser) {
       return (
        <Button variant="outline" size="sm" className="w-full mt-auto" asChild>
           <Link href={`/login?redirect=/dashboard`}>
            <LogIn className="mr-2 h-4 w-4" /> Login to Join
          </Link>
        </Button>
      );
    }
    return null;
  };

  if (room.visibility === 'private' && (!currentUser || (!isMember && !isAdmin))) {
    return null;
  }

  const CardWrapper = (isMember || isAdmin) ? Link : 'div';
  const cardWrapperProps = (isMember || isAdmin) ? { href: `/dashboard/room/${room.id}` } : {};

  return (
    // @ts-ignore
    <CardWrapper {...cardWrapperProps} className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl">
      <Card className="relative overflow-hidden rounded-2xl border border-border bg-card/80 backdrop-blur shadow-sm transition-all duration-200 h-full flex flex-col group-hover:-translate-y-1 group-hover:shadow-xl">
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-accent to-teal-500" />
        <CardHeader className="pt-5 pb-3">
          <CardTitle className="mb-1 text-lg font-semibold text-card-foreground transition-colors group-hover:text-primary line-clamp-1">
            {room.name}
          </CardTitle>
          {room.description && (
            <CardDescription className="line-clamp-3 text-sm leading-relaxed h-[3.75rem]">
              {room.description}
            </CardDescription>
          )}
           {!room.description && (
             <CardDescription className="line-clamp-3 text-sm leading-relaxed h-[3.75rem] italic">
              No description provided.
            </CardDescription>
           )}
        </CardHeader>
        <CardContent className="flex-grow pt-2 pb-4">
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {(room.members?.length ?? 0).toString()}&nbsp;member{(room.members?.length ?? 0) !== 1 ? 's' : ''}
            </span>
            <span>{formattedDate}</span>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0">
           {renderAction()}
        </CardFooter>
        <span className="pointer-events-none absolute inset-0 rounded-2xl bg-primary/10 opacity-0 blur-lg transition-opacity group-hover:opacity-40" />
      </Card>
    </CardWrapper>
  );
}

