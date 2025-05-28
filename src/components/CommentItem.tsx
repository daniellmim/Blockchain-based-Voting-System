"use client";

import React, { useState } from "react";
import type { Comment as CommentType, User } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

interface CommentItemProps {
  comment: CommentType;
  currentUser: User | null;
  onAddReply: (content: string, parentCommentId: string) => Promise<void>;
  postId: string; // PostId is needed to know which post the reply belongs to (though API uses parentCommentId)
  depth?: number;
}

const replySchema = z.object({
  replyContent: z
    .string()
    .min(1, "Reply cannot be empty.")
    .max(500, "Reply is too long."),
});
type ReplyFormValues = z.infer<typeof replySchema>;

export function CommentItem({
  comment,
  currentUser,
  onAddReply,
  postId,
  depth = 0,
}: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);

  const form = useForm<ReplyFormValues>({
    resolver: zodResolver(replySchema),
    defaultValues: { replyContent: "" },
  });

  const handleReplySubmit: SubmitHandler<ReplyFormValues> = async (values) => {
    if (!currentUser) return;
    await onAddReply(values.replyContent, comment.id);
    form.reset();
    setShowReplyForm(false);
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
    return initials || (name.length > 0 ? name[0].toUpperCase() : "?");
  };

  const author = comment.authorId as User | undefined; // Assuming authorId is populated
  const authorName = author?.name || "Anonymous";
  const authorAvatar = author?.avatarUrl;

  return (
    <div
      className={`py-3 ${
        depth > 0 ? "pl-4 sm:pl-6 border-l ml-2 sm:ml-4" : ""
      }`}
    >
      <div className="flex items-start space-x-2 sm:space-x-3">
        <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
          <AvatarImage
            src={authorAvatar}
            alt={authorName}
            data-ai-hint="profile avatar small"
          />
          <AvatarFallback className="text-xs sm:text-sm">
            {getInitials(authorName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="bg-muted/50 p-2 sm:p-3 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-xs sm:text-sm text-foreground">
                {authorName}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
            <p className="text-sm text-foreground/90 whitespace-pre-wrap">
              {comment.content}
            </p>
          </div>
          {currentUser && depth < 2 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="mt-1 text-xs text-muted-foreground hover:text-primary px-1 py-0.5 h-auto"
            >
              <MessageSquare className="h-3 w-3 mr-1" /> Reply
            </Button>
          )}
        </div>
      </div>

      {showReplyForm && currentUser && (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleReplySubmit)}
            className={`mt-2 ${depth > 0 ? "ml-4 sm:ml-6" : "ml-8 sm:ml-11"}`}
          >
            <FormField
              control={form.control}
              name="replyContent"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder={`Reply to ${authorName}...`}
                      {...field}
                      className="min-h-[60px] text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 mt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowReplyForm(false);
                  form.reset();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Replying..." : "Post Reply"}
              </Button>
            </div>
          </form>
        </Form>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 comment-thread overflow-y-auto scrollbar-hide max-h-96" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUser={currentUser}
              onAddReply={onAddReply}
              postId={postId}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
