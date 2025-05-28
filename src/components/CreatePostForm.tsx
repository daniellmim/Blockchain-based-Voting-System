"use client";

import React, { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
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
  Card,
  CardContent,
  // CardDescription, // Not used directly here now
  // CardHeader, // Not used directly here now
  // CardTitle, // Not used directly here now
} from "@/components/ui/card";
import { FileText, ImageUp, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import type { PostType } from "@/lib/types";
// import { useAuth } from "@/contexts/AuthContext"; // Not directly needed if onSubmitSuccess handles API call

const postFormSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters.")
    .max(100, "Title is too long."),
  description: z.string().max(1000, "Description is too long.").optional(),
});

type PostFormValues = z.infer<typeof postFormSchema>;

interface CreatePostFormProps {
  onSubmitSuccess: (
    postData: Omit<
      PostType,
      | "id"
      | "roomId"
      | "authorId"
      | "authorName"
      | "authorAvatarUrl"
      | "createdAt"
      | "comments"
      | "likes"
      | "views"
    >
  ) => Promise<void>; // Made async
}

export function CreatePostForm({ onSubmitSuccess }: CreatePostFormProps) {
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const form = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  const {
    formState: { isSubmitting },
  } = form;

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "Image Too Large",
          description: "Please select an image smaller than 2MB.",
        });
        event.target.value = "";
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    const fileInput = document.getElementById(
      "postImageUpload"
    ) as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleSubmit: SubmitHandler<PostFormValues> = async (values) => {
    const postDataToSubmit = {
      title: values.title,
      description: values.description,
      imageUrl: imagePreview || undefined,
    };
    try {
      await onSubmitSuccess(postDataToSubmit);
      form.reset();
      setImagePreview(null);
      setImageFile(null);
      // Toast for success is handled in RoomPage after API call
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to Submit Post",
        description:
          (error as Error).message || "An unexpected error occurred.",
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg overflow-y-auto scrollbar-hide max-h-[90vh]" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      <CardContent className="px-2 pb-2">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Post Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., My Thoughts on Project Alpha"
                      {...field}
                    />
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
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Elaborate on your post..."
                      {...field}
                      className="min-h-[100px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel
                htmlFor="postImageUpload"
                className="flex items-center gap-2 cursor-pointer hover:text-primary"
              >
                <ImageUp className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                Upload Image (Optional, max 2MB)
              </FormLabel>
              <Input
                id="postImageUpload"
                type="file"
                accept="image/png, image/jpeg, image/gif"
                onChange={handleImageChange}
                className="mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
              />
              {imagePreview && (
                <div className="mt-4 relative group w-full max-w-sm border rounded-md overflow-hidden shadow-sm">
                  <Image
                    src={imagePreview}
                    alt="Selected preview"
                    width={300}
                    height={200}
                    className="object-contain w-full h-auto max-h-60"
                    data-ai-hint="form image preview"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={removeImage}
                    className="absolute top-2 right-2 opacity-50 group-hover:opacity-100 transition-opacity h-7 w-7"
                    aria-label="Remove image"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <FormDescription className="text-xs">
                Attach an image to visually support your post.
              </FormDescription>
            </FormItem>

            <Button
              type="submit"
              className="w-full sm:w-auto bg-accent hover:bg-accent/90 text-accent-foreground"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating Post..." : "Create Post"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
