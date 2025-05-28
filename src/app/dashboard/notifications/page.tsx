
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { NotificationType as AppNotificationType, UserRole } from '@/lib/types'; // Renamed to avoid conflict
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, CheckCheck, ArrowLeft, CircleDot, Circle, CheckCircle, XCircle, UserPlus, MailQuestion, UserCheck, UserX, FileText, ListChecks, MessageSquare as MessageSquareIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

export default function NotificationsPage() {
  const { currentUser, isLoading: authLoading, token } = useAuth();
  const [notifications, setNotifications] = useState<AppNotificationType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();
  const { toast } = useToast();

  const fetchNotificationsAPI = useCallback(async () => {
    if (currentUser && token) {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/notifications`, { 
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch notifications');
        }
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error Loading Notifications", description: error.message });
        setNotifications([]);
        setUnreadCount(0);
      } finally {
        setIsLoading(false);
      }
    }
  }, [currentUser, token, toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      router.push('/login');
      return;
    }
    fetchNotificationsAPI();
  }, [currentUser, authLoading, router, fetchNotificationsAPI]);

  const handleMarkAsReadAPI = async (notificationId: string) => {
    if (currentUser && token) {
      try {
        const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to mark as read');
        toast({ title: "Notification Marked as Read" });
        fetchNotificationsAPI(); // Re-fetch to update list and unread count
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
      }
    }
  };

  const handleMarkAllAsReadAPI = async () => {
    if (currentUser && token) {
      try {
        const response = await fetch(`${API_BASE_URL}/notifications`, { // Uses PUT to /api/notifications
          method: 'PUT', // To mark all as read
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to mark all as read');
        toast({ title: "All Notifications Marked as Read" });
        fetchNotificationsAPI(); // Re-fetch
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
      }
    }
  };
  
  const handleNotificationAction = async (notificationId: string, actionType: 'approve_join_request' | 'decline_join_request' | 'accept_invitation' | 'decline_invitation') => {
    if (!currentUser || !token) return;
    
    let endpoint = '';
    let payloadAction = '';

    if (actionType === 'approve_join_request' || actionType === 'decline_join_request') {
        endpoint = `${API_BASE_URL}/notifications/action/join-request/${notificationId}`;
        payloadAction = actionType === 'approve_join_request' ? 'approve' : 'decline';
    } else if (actionType === 'accept_invitation' || actionType === 'decline_invitation') {
        endpoint = `${API_BASE_URL}/notifications/action/invitation/${notificationId}`;
        payloadAction = actionType === 'accept_invitation' ? 'accept' : 'decline';
    } else {
        toast({ variant: "destructive", title: "Error", description: "Invalid action type." });
        return;
    }

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ action: payloadAction })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || `Failed to ${payloadAction} request/invitation.`);
        
        toast({ title: "Action Successful", description: data.message });
        fetchNotificationsAPI(); // Refresh notifications
    } catch (error: any) {
        toast({ variant: "destructive", title: "Action Failed", description: error.message });
    }
};


  const handleNotificationClick = (notification: AppNotificationType) => {
    if (!notification.isRead && notification.type !== 'room_invitation' && notification.type !== 'join_request_received') {
      handleMarkAsReadAPI(notification.id);
    }
    // Construct link based on notification type and data
    let targetLink = "/dashboard"; // Default
    if (notification.data.roomId) {
        targetLink = `/dashboard/room/${notification.data.roomId}`;
        if (notification.data.postId) {
            // TODO: Need a way to scroll to a specific post or comment on room page
            // targetLink += `#post-${notification.data.postId}`; // Example
        }
    }
    
    if (notification.type !== 'room_invitation' && notification.type !== 'join_request_received') {
        router.push(targetLink);
    }
  };


  const getNotificationIcon = (notification: AppNotificationType) => {
    // This logic can remain as it's UI-only based on notification type/status
    const isActionablePending = (notification.type === 'room_invitation' || notification.type === 'join_request_received') && !notification.isRead; // Simplified: consider pending if unread for these types

    if (notification.type === 'room_invitation') {
      if (isActionablePending) return <UserPlus className="h-4 w-4 text-accent animate-pulse" />;
      // TODO: Add logic for accepted/declined status from notification.data if available
      return <UserPlus className="h-4 w-4 text-muted-foreground/60" />;
    }
    if (notification.type === 'join_request_received') {
      if (isActionablePending) return <MailQuestion className="h-4 w-4 text-accent animate-pulse" />;
      // TODO: Add logic for approved/declined status from notification.data if available
      return <MailQuestion className="h-4 w-4 text-muted-foreground/60" />;
    }
    if (notification.type === 'join_request_approved' || notification.type === 'invitation_accepted') {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
     if (notification.type === 'join_request_declined' || notification.type === 'invitation_declined') {
      return <XCircle className="h-4 w-4 text-destructive" />;
    }
    if (notification.type === 'new_post') return <FileText className="h-4 w-4 text-blue-500" />;
    if (notification.type === 'new_comment') return <MessageSquareIcon className="h-4 w-4 text-purple-500" />;
    if (notification.type === 'new_ballot') return <ListChecks className="h-4 w-4 text-orange-500" />;

    return notification.isRead ? <Circle className="h-4 w-4 text-muted-foreground/60" /> : <CircleDot className="h-4 w-4 text-primary animate-pulse" />;
  };

  if (authLoading || !currentUser) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
       <Button variant="outline" size="sm" asChild className="mb-6">
        <Link href="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>
      <Card className="shadow-xl">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-8 w-8 text-primary" />
              <CardTitle className="text-2xl sm:text-3xl">Your Notifications ({unreadCount})</CardTitle>
            </div>
            {notifications.some(n => !n.isRead) && (
              <Button variant="outline" size="sm" onClick={handleMarkAllAsReadAPI}>
                <CheckCheck className="mr-2 h-4 w-4" /> Mark All as Read
              </Button>
            )}
          </div>
          <CardDescription className="mt-1">
            Stay updated with the latest activities and requests.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
           ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-lg text-muted-foreground">You have no notifications yet.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[calc(100vh-280px)] pr-3">
              <ul className="space-y-3">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className={cn(
                      "p-4 rounded-lg border transition-colors",
                      notification.isRead
                        ? "bg-card hover:bg-muted/30"
                        : "bg-primary/10 border-primary/30 hover:bg-primary/20",
                      (notification.type !== 'room_invitation' && notification.type !== 'join_request_received') && "cursor-pointer",
                      (notification.type === 'room_invitation' || notification.type === 'join_request_received') && "cursor-default"
                    )}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start justify-between gap-3">
                       <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification)}
                      </div>
                      <div className="flex-grow">
                        <p className={cn("text-sm mb-0.5", !notification.isRead && "font-semibold")}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                           {notification.data.performerName && ` by ${notification.data.performerName}`}
                        </p>
                      </div>
                      {!notification.isRead && notification.type !== 'room_invitation' && notification.type !== 'join_request_received' && (
                         <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-auto px-2 py-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsReadAPI(notification.id);
                            }}
                         >
                            Mark Read
                         </Button>
                      )}
                    </div>
                    {notification.type === 'room_invitation' && !notification.isRead && ( // Simplified: Show actions if unread
                      <div className="mt-3 pt-3 border-t flex justify-end space-x-2">
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleNotificationAction(notification.id, 'decline_invitation'); }}>
                          <XCircle className="mr-1.5 h-4 w-4" /> Decline
                        </Button>
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); handleNotificationAction(notification.id, 'accept_invitation'); }} className="bg-green-600 hover:bg-green-700">
                          <CheckCircle className="mr-1.5 h-4 w-4" /> Accept
                        </Button>
                      </div>
                    )}
                    {notification.type === 'join_request_received' && !notification.isRead && ( // Simplified: Show actions if unread
                      <div className="mt-3 pt-3 border-t flex justify-end space-x-2">
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleNotificationAction(notification.id, 'decline_join_request'); }}>
                          <UserX className="mr-1.5 h-4 w-4" /> Decline Request
                        </Button>
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); handleNotificationAction(notification.id, 'approve_join_request'); }} className="bg-green-600 hover:bg-green-700">
                          <UserCheck className="mr-1.5 h-4 w-4" /> Approve Request
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
