"use client";

import React from "react";
import { useForm, type SubmitHandler, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
import { useRouter } from "next/navigation";
import type { RoomVisibility, VotingSystem } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext"; 
// import { addMockRoom } from "@/lib/mock-data"; // Deprecated
import { PlusCircle, Trash2 } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

const candidateSchema = z.object({
  username: z.string().min(1, "Username cannot be empty.").max(30, "Username is too long."),
});

const formSchema = z.object({
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
  candidateUsernames: z.array(candidateSchema).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateRoomForm() {
  const { toast } = useToast();
  const router = useRouter();
  const { currentUser, token } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      visibility: "public" as RoomVisibility,
      votingSystem: "simple_majority" as VotingSystem,
      tags: "",
      rules:
        "1. Be respectful of all members.\n2. Keep discussions relevant to the room's topic.\n3. No spamming or self-promotion unless permitted by candidates for their proposals.",
      candidateUsernames: [],
    },
  });

  const { fields: candidateFields, append: appendCandidate, remove: removeCandidate } = useFieldArray({
    control: form.control,
    name: "candidateUsernames",
  });

  const {
    formState: { isSubmitting },
  } = form;

  const handleSubmit: SubmitHandler<FormValues> = async (values) => {
    if (!currentUser || !token) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be logged in to create a room.",
      });
      router.push("/login");
      return;
    }

    try {
      const tagsArray = values.tags
        ? values.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag)
        : [];
      
      const candidateUsernamesArray = values.candidateUsernames?.map(c => c.username).filter(Boolean) || [];
      
      const roomDataToSubmit = {
        ...values,
        tags: tagsArray,
        candidateUsernames: candidateUsernamesArray,
      };
      
      const response = await fetch(`${API_BASE_URL}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(roomDataToSubmit),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create room');
      }

      toast({
        title: "Room Created Successfully!",
        description: `Room "${result.room.name}" is now live.`,
      });
      router.push(`/dashboard/room/${result.room.id}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to Create Room",
        description: error.message || "An unexpected error occurred.",
      });
    }
  };

  return (
    <div className="overflow-y-auto scrollbar-hide max-h-[70vh] px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 sm:space-y-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm sm:text-base">Room Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Policy Debate Forum"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-xs sm:text-sm">
                  A clear and concise name for your discussion space.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm sm:text-base">
                  Description (Optional)
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Briefly explain the purpose, main topics, or goals of this room."
                    className="resize-y min-h-[80px] sm:min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-xs sm:text-sm">
                  This helps users understand what the room is about.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="visibility"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm sm:text-base">Visibility</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select room visibility" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private (Invite-only)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription className="text-xs sm:text-sm">
                  Public rooms are discoverable, private rooms require an
                  invitation.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="votingSystem"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel className="text-sm sm:text-base">
                  Primary Interaction Style
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-2"
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0 p-2.5 border rounded-md hover:bg-muted/50">
                      <FormControl>
                        <RadioGroupItem value="simple_majority" />
                      </FormControl>
                      <div>
                        <FormLabel className="font-normal text-sm sm:text-base">
                          Formal Voting & Discussion
                        </FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Best for polls, official decisions, elections.
                        </p>
                      </div>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0 p-2.5 border rounded-md hover:bg-muted/50">
                      <FormControl>
                        <RadioGroupItem value="discussion_only" />
                      </FormControl>
                      <div>
                        <FormLabel className="font-normal text-sm sm:text-base">
                          Discussion & Feedback Only
                        </FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Focus on debate, sharing ideas, no formal voting.
                        </p>
                      </div>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm sm:text-base">Tags (Optional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., politics, tech, Q2_planning"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-xs sm:text-sm">
                  Comma-separated keywords to help categorize the room.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div>
            <FormLabel className="text-sm sm:text-base">Initial Candidates (Optional)</FormLabel>
             <FormDescription className="text-xs sm:text-sm mb-2">
              Enter usernames of users to add as candidates immediately.
            </FormDescription>
            {candidateFields.map((field, index) => (
              <FormField
                key={field.id}
                control={form.control}
                name={`candidateUsernames.${index}.username`}
                render={({ field: candidateField }) => (
                  <FormItem className="flex items-center space-x-2 mb-2">
                    <FormControl>
                      <Input placeholder={`Candidate username ${index + 1}`} {...candidateField} />
                    </FormControl>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCandidate(index)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendCandidate({ username: "" })}
              className="mt-1 text-xs sm:text-sm"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Candidate
            </Button>
            {form.formState.errors.candidateUsernames && !Array.isArray(form.formState.errors.candidateUsernames) && (
                 <p className="text-sm font-medium text-destructive mt-1">{form.formState.errors.candidateUsernames.message}</p>
            )}
          </div>


          <FormField
            control={form.control}
            name="rules"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm sm:text-base">
                  Room Guidelines (Optional)
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="e.g., Be respectful. Cite sources..."
                    className="resize-y min-h-[100px] sm:min-h-[120px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-xs sm:text-sm">
                  Set expectations for participation. Supports Markdown.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            size="lg"
            className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground text-sm sm:text-base"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Creating Room..."
              : "Create Room"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
