
"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { PostType, Comment as CommentType, User } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare,
  Send,
  ThumbsUp,
  Eye,
  CalendarDays,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { CommentItem } from "./CommentItem";
import { useToast } from "@/hooks/use-toast";
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
import NextImage from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

interface PostCardProps {
  post: PostType;
  onPostUpdated?: (updatedPost: PostType) => void; // For likes, etc.
  // onCommentAdded?: (postId: string) => void; // To trigger comment refresh - Removed for now, PostCard handles its own
}

const commentSchema = z.object({
  commentContent: z
    .string()
    .min(1, "Comment cannot be empty.")
    .max(1000, "Comment is too long."),
});
type CommentFormValues = z.infer<typeof commentSchema>;

export function PostCard({
  post: initialPost,
  onPostUpdated,
  // onCommentAdded, // Removed
}: PostCardProps) {
  const { currentUser, token } = useAuth();
  const { toast } = useToast();
  
  const [post, setPost] = useState<PostType>(initialPost);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [showComments, setShowComments] = useState(false);
  
  const [isLikedByCurrentUser, setIsLikedByCurrentUser] = useState(
    currentUser && initialPost.likedBy ? initialPost.likedBy.includes(currentUser.id) : false
  );
  const [currentLikeCount, setCurrentLikeCount] = useState(initialPost.likes || 0);


  useEffect(() => {
    setPost(initialPost);
    setCurrentLikeCount(initialPost.likes || 0);
    setIsLikedByCurrentUser(
      currentUser && initialPost.likedBy ? initialPost.likedBy.some(id => id === currentUser.id) : false
    );
  }, [initialPost, currentUser]);

  const fetchComments = useCallback(async () => {
    if (!post.id) return;
    setIsLoadingComments(true);
    try {
      const response = await fetch(`${API_BASE_URL}/posts/${post.id}/comments`, {
        headers: {
          ...(token && {'Authorization': `Bearer ${token}`})
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch comments');
      }
      const data = await response.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
      toast({ variant: "destructive", title: "Error", description: (error as Error).message });
      setComments([]);
    } finally {
      setIsLoadingComments(false);
    }
  }, [post.id, token, toast]);


  useEffect(() => {
    if (showComments) {
      fetchComments();
    }
  }, [showComments, fetchComments]);


  const commentForm = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { commentContent: "" },
  });

  const handleCommentSubmit: SubmitHandler<CommentFormValues> = async (values) => {
    if (!currentUser || !token) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to comment." });
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/posts/${post.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content: values.commentContent, parentCommentId: null }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to add comment');
      
      toast({ title: "Comment Added" });
      commentForm.reset();
      fetchComments(); // Re-fetch comments to show the new one
      // if (onCommentAdded) onCommentAdded(post.id); // Removed to prevent full page refresh
      if (onPostUpdated && result.comment?.postId) { // Assuming comment creation might update post (e.g. comment count)
        // A more robust solution might fetch just the updated post
        // For now, if onPostUpdated is used, it will trigger a wider refresh.
        // Consider if only comment count on post needs to be updated in parent.
      }

    } catch (error) {
      toast({ variant: "destructive", title: "Failed to add comment", description: (error as Error).message });
    }
  };

  const handleAddReplyWrapper = async (content: string, parentCommentId: string) => {
    if (!currentUser || !token) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to reply." });
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/posts/${post.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content, parentCommentId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to add reply');
      toast({ title: "Reply Added" });
      fetchComments(); // Re-fetch comments to show the new reply and its parent's updated replies list
      // if (onCommentAdded) onCommentAdded(post.id); // Removed
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed to add reply", description: error.message });
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return (
      name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "?"
    );
  };

  const handleLikeToggle = async () => {
    if (!currentUser || !token) {
      toast({ variant: "destructive", title: "Login Required", description: "Please log in to like posts." });
      return;
    }
    
    const originallyLiked = isLikedByCurrentUser;
    const originalLikeCount = currentLikeCount;

    setIsLikedByCurrentUser(!originallyLiked);
    setCurrentLikeCount(prev => originallyLiked ? Math.max(0, prev - 1) : prev + 1);

    try {
      const response = await fetch(`${API_BASE_URL}/posts/${post.id}/like`, {
        method: 'POST', 
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update like status");
      }
      
      // Use server response to ensure consistency
      const updatedPostFromServer = data.post as PostType;
      setPost(updatedPostFromServer); 
      setCurrentLikeCount(updatedPostFromServer.likes);
      setIsLikedByCurrentUser(updatedPostFromServer.likedBy ? updatedPostFromServer.likedBy.includes(currentUser.id) : false); 
      if (onPostUpdated) {
        onPostUpdated(updatedPostFromServer);
      }

    } catch (error) {
      setIsLikedByCurrentUser(originallyLiked);
      setCurrentLikeCount(originalLikeCount);
      toast({ variant: "destructive", title: "Like Error", description: (error as Error).message });
    }
  };
  
  // Calculate total comments from the fetched comments state
  const calculateTotalComments = (commentsList: CommentType[]): number => {
    let count = commentsList.length;
    commentsList.forEach(comment => {
      if (comment.replies && comment.replies.length > 0) {
        count += calculateTotalComments(comment.replies);
      }
    });
    return count;
  };
  const totalCommentsCount = calculateTotalComments(comments);


  const author = post.authorId as User; 
  const authorName = author?.name || 'Anonymous';
  const authorAvatar = author?.avatarUrl || '/images/avatars/default-new-user.png';


  return (
    <Card className="shadow-lg mb-6 overflow-hidden bg-card w-full max-w-2xl mx-auto">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage
              src={authorAvatar}
              alt={authorName}
              data-ai-hint="profile avatar"
            />
            <AvatarFallback>{getInitials(authorName)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg line-clamp-2">{post.title}</CardTitle>
            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
              <span>{authorName}</span>
              <span className="flex items-center">
                <CalendarDays className="h-3 w-3 mr-1" />
                {formatDistanceToNow(new Date(post.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
          {currentUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {currentUser.id === author?.id && ( 
                  <DropdownMenuItem disabled>Edit Post (Not Implemented)</DropdownMenuItem>
                )}
                {currentUser.id === author?.id && (
                  <DropdownMenuItem
                    disabled
                    className="text-destructive focus:text-destructive"
                  >
                    Delete Post (Not Implemented)
                  </DropdownMenuItem>
                )}
                {currentUser.id !== author?.id && (
                  <DropdownMenuItem
                    onClick={() => {
                      toast({
                        title: "Post Reported (Mock)",
                        description: "This post has been flagged for review.",
                      });
                    }}
                  >
                    Report Post
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-2 pb-3">
        {post.description && (
          <CardDescription className="whitespace-pre-wrap text-sm mb-3">
            {post.description}
          </CardDescription>
        )}
        {post.imageUrl && (
          <div className="w-full aspect-video relative bg-muted rounded-md overflow-hidden my-3">
            <NextImage
              src={post.imageUrl}
              alt={`Image for ${post.title}`}
              layout="fill"
              objectFit="contain"
              data-ai-hint="post image"
            />
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col items-start pt-0 pb-4">
        <div className="flex items-center justify-between w-full text-sm text-muted-foreground mb-3 px-2">
          <div className="flex items-center gap-1">
            <ThumbsUp
              className={`h-4 w-4 ${
                isLikedByCurrentUser ? "text-primary fill-primary/20" : ""
              }`}
            />
            <span>{currentLikeCount} Likes</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            <span>{post.views || 0} Views</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className="text-muted-foreground hover:text-primary px-1 py-0 h-auto"
          >
            {isLoadingComments ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {totalCommentsCount} Comment{totalCommentsCount !== 1 && "s"}
          </Button>
        </div>

        <div className="flex items-center border-t pt-2 w-full">
          <Button
            variant="ghost"
            onClick={handleLikeToggle}
            className="flex-1 text-muted-foreground hover:text-primary"
            disabled={!currentUser}
          >
            <ThumbsUp
              className={`h-5 w-5 mr-2 ${
                isLikedByCurrentUser ? "text-primary fill-primary/20" : ""
              }`}
            />{" "}
            {isLikedByCurrentUser ? "Unlike" : "Like"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setShowComments((prev) => !prev)}
            className="flex-1 text-muted-foreground hover:text-primary"
          >
            <MessageSquare className="h-5 w-5 mr-2" /> Comment
          </Button>
        </div>

        {showComments && (
          <div className="w-full mt-4 pt-3 border-t">
            <h4 className="font-semibold text-md mb-3 flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-primary" />
              Discussion ({totalCommentsCount})
            </h4>
            {currentUser && (
              <Form {...commentForm}>
                <form
                  onSubmit={commentForm.handleSubmit(handleCommentSubmit)}
                  className="mb-4 flex items-start space-x-2"
                >
                  <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                    <AvatarImage
                      src={currentUser.avatarUrl || '/images/avatars/default-new-user.png'}
                      alt={currentUser.name || "Current User"}
                      data-ai-hint="profile avatar small"
                    />
                    <AvatarFallback>
                      {getInitials(currentUser.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <FormField
                      control={commentForm.control}
                      name="commentContent"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              placeholder="Add a public comment..."
                              {...field}
                              className="min-h-[60px]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      size="sm"
                      className="mt-2"
                      disabled={commentForm.formState.isSubmitting}
                    >
                      {commentForm.formState.isSubmitting ? (
                        "Posting..."
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" /> Post Comment
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
            {!currentUser && (
              <p className="text-sm text-muted-foreground mb-4">
                Log in to post comments.
              </p>
            )}

            {isLoadingComments ? (
              <div className="flex justify-center items-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Loading comments...</p>
              </div>
            ) : comments.length > 0 ? (
                <div className="space-y-2">
                {comments.map((comment) => (
                    <CommentItem
                    key={comment.id}
                    comment={comment}
                    currentUser={currentUser}
                    onAddReply={(content, parentId) => handleAddReplyWrapper(content, parentId)}
                    postId={post.id}
                    />
                ))}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">
                  No comments yet. Be the first to discuss!
                </p>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

    