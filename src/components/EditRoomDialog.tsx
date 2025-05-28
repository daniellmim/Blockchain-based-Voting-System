"use client";

import React, { useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import type { Room, RoomVisibility, VotingSystem } from "@/lib/types";
// import { updateMockRoomDetails } from "@/lib/mock-data"; // Removed mock import
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "./ui/scroll-area";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

const editRoomFormSchema = z.object({
  name: z
    .string()
    .min(3, { message: "Room name must be at least 3 characters." })
    .max(50, { message: "Room name can be at most 50 characters." }),
  description: z
    .string()
    .max(250, { message: "Description can be at most 250 characters." })
    .optional(),
  visibility: z.enum(["public", "private"], {
    required_error: "Please select room visibility.",
  }),
  votingSystem: z.enum(["simple_majority", "discussion_only"], {
    required_error: "Please select a system.",
  }),
  tags: z
    .string()
    .max(100, { message: "Tags list can be at most 100 characters." })
    .optional()
    .describe("Comma-separated list of relevant keywords."),
  rules: z
    .string()
    .max(1000, { message: "Rules can be at most 1000 characters." })
    .optional()
    .describe("Guidelines for participation and conduct in the room."),
});

type EditRoomFormValues = z.infer<typeof editRoomFormSchema>;

interface EditRoomDialogProps {
  room: Room;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onRoomUpdated: (updatedRoom: Room) => void;
}

export function EditRoomDialog({
  room,
  isOpen,
  onOpenChange,
  onRoomUpdated,
}: EditRoomDialogProps) {
  const { toast } = useToast();
  const { currentUser, token } = useAuth(); // Added token

  const form = useForm<EditRoomFormValues>({
    resolver: zodResolver(editRoomFormSchema),
    defaultValues: {
      name: room.name,
      description: room.description || "",
      visibility: room.visibility,
      votingSystem: room.votingSystem,
      tags: Array.isArray(room.tags) ? room.tags.join(", ") : "",
      rules: room.rules || "",
    },
  });

  useEffect(() => {
    if (isOpen && room) {
      form.reset({
        name: room.name,
        description: room.description || "",
        visibility: room.visibility,
        votingSystem: room.votingSystem,
        tags: Array.isArray(room.tags) ? room.tags.join(", ") : "",
        rules: room.rules || "",
      });
    }
  }, [isOpen, room, form]);

  const {
    formState: { isSubmitting },
  } = form;

  const handleSubmit: SubmitHandler<EditRoomFormValues> = async (values) => {
    if (!currentUser || !token) {
      // Check for token
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be logged in to edit rooms.",
      });
      return;
    }
    // The backend API should verify if currentUser.id is the admin of room.id

    try {
      const tagsArray = values.tags
        ? values.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag)
        : [];

      const roomUpdates = {
        name: values.name,
        description: values.description,
        visibility: values.visibility as RoomVisibility,
        votingSystem: values.votingSystem as VotingSystem,
        tags: tagsArray,
        rules: values.rules,
      };

      const response = await fetch(`${API_BASE_URL}/rooms/${room.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(roomUpdates),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to update room");
      }

      toast({
        title: "Room Updated",
        description: `"${result.room.name}" details have been saved.`,
      });
      onRoomUpdated(result.room);
      onOpenChange(false); // Close the dialog on success
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description:
          (error as Error).message || "An unexpected error occurred.",
      });
    }
  };

  if (!room) return null; // Don't render if room is not available

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <DialogHeader>
          <DialogTitle>
            Edit Room: {form.watch("name") || room.name}
          </DialogTitle>
          <DialogDescription>
            Modify the details of your room. Changes will be visible to all
            members.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6 py-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea className="resize-y min-h-[80px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visibility</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="votingSystem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Interaction Style</FormLabel>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0 p-2 border rounded-md">
                        <FormControl>
                          <RadioGroupItem value="simple_majority" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Formal Voting & Discussion
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0 p-2 border rounded-md">
                        <FormControl>
                          <RadioGroupItem value="discussion_only" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Discussion & Feedback Only
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags (comma-separated)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rules"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room Guidelines / Rules</FormLabel>
                    <FormControl>
                      <Textarea className="resize-y min-h-[100px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
