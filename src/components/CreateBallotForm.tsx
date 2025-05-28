"use client";

import React from "react";
import { useForm, useFieldArray, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
// import {
//   Card, // Not used if form is in a dialog
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
import { PlusCircle, XCircle, CalendarClock, ListChecks } from "lucide-react"; // VoteIconLucide removed
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "./ui/scroll-area";

const choiceSchema = z.object({
  text: z
    .string()
    .min(1, "Choice text cannot be empty.")
    .max(100, "Choice text is too long."),
});

const ballotFormSchema = z
  .object({
    title: z
      .string()
      .min(3, "Ballot title must be at least 3 characters.")
      .max(100, "Ballot title is too long."),
    choices: z
      .array(choiceSchema)
      .min(2, "A ballot must have at least 2 choices.")
      .max(10, "Cannot have more than 10 choices."),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    maxChoicesPerVoter: z.coerce
      .number()
      .min(1, "Must allow at least 1 choice.")
      .default(1)
      .optional(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return new Date(data.endTime) > new Date(data.startTime);
      }
      return true;
    },
    {
      message: "End time must be after start time.",
      path: ["endTime"],
    }
  );

type BallotFormValues = z.infer<typeof ballotFormSchema>;

interface CreateBallotFormProps {
  onSubmitSuccess: (
    title: string,
    choiceTexts: string[],
    startTime?: string,
    endTime?: string,
    maxChoicesPerVoter?: number
  ) => Promise<void>; // Make async
}

export function CreateBallotForm({ onSubmitSuccess }: CreateBallotFormProps) {
  const { toast } = useToast();

  const form = useForm<BallotFormValues>({
    resolver: zodResolver(ballotFormSchema),
    defaultValues: {
      title: "",
      choices: [{ text: "" }, { text: "" }],
      startTime: "",
      endTime: "",
      maxChoicesPerVoter: 1,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "choices",
  });

  const {
    formState: { isSubmitting },
  } = form;

  const handleSubmit: SubmitHandler<BallotFormValues> = async (values) => {
    try {
      const choiceTexts = values.choices.map((choice) => choice.text);
      await onSubmitSuccess(
        values.title,
        choiceTexts,
        values.startTime || undefined,
        values.endTime || undefined,
        values.maxChoicesPerVoter
      );
      form.reset();
      // Success toast handled by RoomPage
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to Submit Ballot",
        description:
          (error as Error).message || "An unexpected error occurred.",
      });
    }
  };

  return (
    <div className="max-h-[70vh] px-1">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ballot Title</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Elect Team Lead for Q3"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-xs">
                  A clear title for the voting process.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div>
            <FormLabel className="flex items-center gap-1">
              <ListChecks className="h-4 w-4 text-muted-foreground" />
              Choices
            </FormLabel>
            <FormDescription className="text-xs">
              Define the options for members to vote on (min 2, max 10).
            </FormDescription>
            <div className="space-y-3 mt-2">
              {fields.map((field, index) => (
                <FormField
                  key={field.id}
                  control={form.control}
                  name={`choices.${index}.text`}
                  render={({ field: choiceField }) => (
                    <FormItem>
                      <div className="flex items-center space-x-2">
                        <FormControl>
                          <Input
                            placeholder={`Choice ${index + 1}`}
                            {...choiceField}
                          />
                        </FormControl>
                        {fields.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                            aria-label="Remove choice"
                            className="h-8 w-8"
                          >
                            <XCircle className="h-5 w-5 text-destructive" />
                          </Button>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            {fields.length < 10 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ text: "" })}
                className="mt-3"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Add Choice
              </Button>
            )}
            {form.formState.errors.choices &&
              !Array.isArray(form.formState.errors.choices) && (
                <p className="text-sm font-medium text-destructive mt-1">
                  {form.formState.errors.choices.message}
                </p>
              )}
            {form.formState.errors.choices?.root && (
              <p className="text-sm font-medium text-destructive mt-1">
                {form.formState.errors.choices.root.message}
              </p>
            )}
          </div>

          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                  Start Time (Optional)
                </FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormDescription className="text-xs">
                  When voting opens. If blank, voting opens immediately.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                  End Time (Optional)
                </FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormDescription className="text-xs">
                  When voting closes. If blank, voting remains open
                  indefinitely.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maxChoicesPerVoter"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Choices Per Voter</FormLabel>
                <FormControl>
                  <Input type="number" min="1" {...field} />
                </FormControl>
                <FormDescription className="text-xs">
                  How many options a single voter can select (default is 1).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating Ballot..." : "Create Ballot"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
