
"use client";

import React from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/lib/types';
// Removed: import { sendRoomInvitationNotification } from '@/lib/mock-data';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

const inviteUserSchema = z.object({
  username: z.string().min(1, "Username cannot be empty."),
  role: z.enum(["voter", "candidate"], { required_error: "Please select a role for the invitee." }),
});

type InviteUserFormValues = z.infer<typeof inviteUserSchema>;

interface InviteUserToRoomCardProps {
  roomId: string;
}

export function InviteUserToRoomCard({ roomId }: InviteUserToRoomCardProps) {
  const { toast } = useToast();
  const { currentUser, token } = useAuth();

  const form = useForm<InviteUserFormValues>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      username: "",
      role: "voter" as UserRole,
    },
  });

  const { formState: { isSubmitting }} = form;

  const handleSubmit: SubmitHandler<InviteUserFormValues> = async (values) => {
    if (!currentUser || !token) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in and authenticated." });
      return;
    }
    try {
      // TODO: Implement API endpoint POST /api/rooms/${roomId}/invite
      // This API endpoint would:
      // 1. Find the target user by username.
      // 2. Check if they are already a member or have a pending invite.
      // 3. Create a notification for the target user of type 'room_invitation'.
      // 4. Store the invitation details (roomId, invitedRole, inviterId) in the notification.

      /*
      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUsername: values.username, role: values.role }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Failed to send invitation");
      
      toast({ title: "Invitation Sent!", description: result.message || `An invitation notification has been sent to ${values.username}.` });
      */

      toast({ 
        variant: "default", 
        title: "Feature Incomplete", 
        description: `Sending invitations via backend for room ${roomId} to user ${values.username} as ${values.role} is not yet implemented. This would typically create a notification for the target user.` 
      });
      form.reset();

    } catch (error) {
      toast({ variant: "destructive", title: "Failed to Send Invitation", description: (error as Error).message });
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserPlus className="h-6 w-6 text-primary" />
          <CardTitle>Invite User to Room</CardTitle>
        </div>
        <CardDescription>Send an invitation to a user to join this room with a specific role. (Backend for sending invites is pending)</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username to Invite</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="voter">Voter</SelectItem>
                      <SelectItem value="candidate">Candidate</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
              <Send className="mr-2 h-4 w-4" />
              {isSubmitting ? "Sending..." : "Send Invitation"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
