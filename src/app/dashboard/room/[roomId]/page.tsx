"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import type {
  Room as RoomType,
  PostType,
  BallotType,
  User,
  UserRole,
} from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { InviteUserToRoomCard } from "@/components/InviteUserToRoomCard";
import { PostCard } from "@/components/PostCard";
import { CreatePostForm } from "@/components/CreatePostForm";
import { CreateBallotForm } from "@/components/CreateBallotForm";
import { BallotVoteCard } from "@/components/BallotVoteCard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  AlertTriangle,
  Users,
  Settings2,
  Eye,
  Vote as VoteIconLucide,
  BookOpen,
  Tag,
  Info,
  Edit3,
  ListChecks,
  MessageSquare,
  PlusCircle,
  Trash2,
  LogOut,
  Edit,
  Copy,
  Share2,
  LogIn,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EditRoomDialog } from "@/components/EditRoomDialog";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const roomId = params.roomId as string;

  const { currentUser, isLoading: authLoading, token } = useAuth();

  const [room, setRoom] = useState<RoomType | null>(null);
  const [posts, setPosts] = useState<PostType[]>([]);
  const [ballots, setBallots] = useState<BallotType[]>([]);
  const [isLoadingRoomData, setIsLoadingRoomData] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [activeTab, setActiveTab] = useState("posts_discussion");
  const [isCreatePostDialogOpen, setIsCreatePostDialogOpen] = useState(false);
  const [isCreateBallotDialogOpen, setIsCreateBallotDialogOpen] =
    useState(false);
  const [isEditRoomDialogOpen, setIsEditRoomDialogOpen] = useState(false);
  const [isLeaveRoomAlertOpen, setIsLeaveRoomAlertOpen] = useState(false);
  const [isDeleteRoomAlertOpen, setIsDeleteRoomAlertOpen] = useState(false);
  const [roomMembers, setRoomMembers] = useState<(User & { role: UserRole })[]>(
    []
  );
  const [isViewingAsNonMemberPublic, setIsViewingAsNonMemberPublic] =
    useState(false);
  const [roomUrl, setRoomUrl] = useState("");
  const [isMobileVotingRailOpen, setIsMobileVotingRailOpen] = useState(false);
  const [now, setNow] = useState<Date>(new Date());

  const fetchRoomData = useCallback(async () => {
    if (!roomId) return;

    setIsLoadingRoomData(true);
    setIsViewingAsNonMemberPublic(false);

    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}`, {
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 404) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Room not found.",
          });
          router.push("/dashboard");
          return;
        }
        // Check for specific "VIEW_AS_NON_MEMBER_PUBLIC" type from backend
        if (
          response.status === 403 &&
          errorData.type === "VIEW_AS_NON_MEMBER_PUBLIC" &&
          errorData.room
        ) {
          setRoom(errorData.room);
          setPosts(errorData.room.posts || []); // These will be empty as per current backend
          setBallots(errorData.room.ballots || []); // These will be empty as per current backend
          setRoomMembers(
            (errorData.room.members || []).map((m: any) => {
              const memberUser = m.userId as User | string | null;
              if (typeof memberUser === "string" || !memberUser)
                return {
                  id: typeof memberUser === "string" ? memberUser : "unknown",
                  username: "Unknown",
                  role: m.role as UserRole,
                };
              return { ...memberUser, role: m.role as UserRole };
            })
          );
          setIsViewingAsNonMemberPublic(true);
          setIsLoadingRoomData(false);
          setCurrentUserRole(null);
          return;
        }
        if (response.status === 401 || response.status === 403) {
          toast({
            variant: "destructive",
            title: "Access Denied",
            description:
              errorData.message ||
              "You don't have permission to view this room.",
          });
          router.push("/dashboard");
          return;
        }
        throw new Error(errorData.message || "Failed to fetch room data");
      }

      const fetchedRoomDataContainer = await response.json();
      const fetchedRoom: RoomType = fetchedRoomDataContainer.room;

      setRoom(fetchedRoom);
      // Sort posts: oldest first (newest at bottom)
      setPosts(
        (fetchedRoom.posts || []).sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
      );
      // Sort ballots: newest first
      setBallots(
        (fetchedRoom.ballots || []).sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );

      const membersWithDetails = (fetchedRoom.members || []).map((m: any) => {
        const memberUser = m.userId as User | string | null;
        if (
          typeof memberUser === "string" ||
          !memberUser ||
          typeof memberUser === "undefined"
        ) {
          // Added check for undefined
          return {
            id:
              typeof memberUser === "string"
                ? memberUser
                : `unknown-${Math.random()}`,
            username: "Unknown",
            role: m.role as UserRole,
          };
        }
        return { ...memberUser, role: m.role as UserRole };
      });
      setRoomMembers(membersWithDetails);

      if (currentUser && fetchedRoom.adminId) {
        const adminIdString =
          typeof fetchedRoom.adminId === "string"
            ? fetchedRoom.adminId
            : (fetchedRoom.adminId as User).id;
        if (adminIdString === currentUser.id) {
          setCurrentUserRole("admin");
        } else {
          const member = fetchedRoom.members.find((m: any) => {
            const memberUserIdString =
              typeof m.userId === "string" ? m.userId : (m.userId as User)?.id;
            return memberUserIdString === currentUser.id;
          });
          setCurrentUserRole(member ? (member.role as UserRole) : null);
        }
      } else {
        setCurrentUserRole(null);
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error Loading Room",
        description: err.message || "Failed to load room data.",
      });
    } finally {
      setIsLoadingRoomData(false);
    }
  }, [roomId, token, currentUser, router, toast]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setRoomUrl(window.location.href);
    }
  }, [roomId]);

  useEffect(() => {
    if (roomId && !authLoading) {
      // Ensure currentUser info is available or not needed
      fetchRoomData();
    }
  }, [roomId, fetchRoomData, authLoading]);

  const handleRequestToJoin = async () => {
    if (!currentUser || !token || !room) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Cannot process request.",
      });
      if (!currentUser) router.push("/login");
      return;
    }
    try {
      const response = await fetch(
        `${API_BASE_URL}/rooms/${room.id}/join-request`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409) {
          // Already pending
          toast({
            title: "Request Pending",
            description: data.message,
            variant: "default",
          });
        } else {
          throw new Error(data.message || "Failed to send join request");
        }
      } else {
        toast({
          title: "Request Sent!",
          description: `Request to join "${room.name}" sent! You'll be notified upon admin approval.`,
        });
        router.push("/dashboard/notifications"); // Redirect to notifications page
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Sending Request",
        description: error.message,
      });
    }
  };

  const handleVote = async (
    ballotId: string,
    choiceIdOrIds: string | string[]
  ) => {
    if (!currentUser || !room || !token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/ballots/${ballotId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ choiceIdOrIds, roomId: room.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to cast vote");

      toast({
        title: "Vote Cast!",
        description: `Your vote has been recorded.`,
      });
      // Re-fetch ballots or update specific ballot in state
      const updatedBallots = ballots.map((b) =>
        b.id === ballotId ? data.ballot : b
      );
      setBallots(updatedBallots);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Voting Error",
        description: (error as Error).message,
      });
    }
  };

  const handlePostCreated = async (
    postData: Omit<
      PostType,
      | "id"
      | "roomId"
      | "authorId"
      | "createdAt"
      | "comments"
      | "likes"
      | "likedBy"
      | "views"
    >
  ) => {
    if (!currentUser || !token || !roomId) return;
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(postData),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || "Failed to create post");

      setIsCreatePostDialogOpen(false);
      toast({
        title: "Post Created",
        description: `"${result.post.title}" is now live.`,
      });
      fetchRoomData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Creating Post",
        description: error.message,
      });
    }
  };

  const handleBallotCreated = async (
    title: string,
    choiceTexts: string[],
    startTime?: string,
    endTime?: string,
    maxChoicesPerVoter?: number
  ) => {
    if (!token || !roomId) return;
    try {
      const ballotData = {
        title,
        choices: choiceTexts.map((text) => ({ text })),
        startTime,
        endTime,
        maxChoicesPerVoter,
      };
      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/ballots`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(ballotData),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || "Failed to create ballot");

      setIsCreateBallotDialogOpen(false);
      toast({
        title: "Ballot Created",
        description: `"${result.ballot.title}" is now available for voting.`,
      });
      fetchRoomData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Creating Ballot",
        description: error.message,
      });
    }
  };

  const handleRoomUpdated = (updatedRoomData: RoomType) => {
    setRoom(updatedRoomData);
    if (updatedRoomData.posts) {
      setPosts(
        (updatedRoomData.posts || []).sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
      );
    }
    if (updatedRoomData.ballots) {
      setBallots(
        (updatedRoomData.ballots || []).sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );
    }
    setIsEditRoomDialogOpen(false);
  };

  const handleDeleteRoom = async () => {
    if (!currentUser || !room || !token) return;
    if ((room.adminId as User)?.id !== currentUser.id) {
      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: "Only admin can delete room.",
      });
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete room");
      }
      toast({
        title: "Room Deleted",
        description: `Room "${room.name}" has been deleted.`,
      });
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Deleting Room",
        description: error.message,
      });
    }
    setIsDeleteRoomAlertOpen(false);
  };

  const handleLeaveRoom = async () => {
    if (!currentUser || !room || !token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}/leave`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to leave room");
      }
      toast({
        title: "Left Room",
        description: `You have left "${room.name}".`,
      });
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Leaving Room",
        description: error.message,
      });
    }
    setIsLeaveRoomAlertOpen(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() =>
        toast({
          title: "Link Copied!",
          description: "Room link copied to clipboard.",
        })
      )
      .catch((err) =>
        toast({
          variant: "destructive",
          title: "Copy Failed",
          description: "Could not copy link.",
        })
      );
  };

  const handlePostInteractionUpdate = () => {
    fetchRoomData();
  };

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoadingRoomData || authLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 sm:p-6 w-full">
        <div className="lg:col-span-2 space-y-8">
          <Skeleton className="h-8 w-3/4 sm:w-48 mb-4" />
          <Skeleton className="h-10 w-full sm:w-3/4 mb-1" />
          <Skeleton className="h-6 w-3/4 sm:w-1/2 mb-6" />
          <Skeleton className="h-10 w-full max-w-xs sm:max-w-md mb-6" />
          <div className="space-y-6">
            <Skeleton className="h-40 sm:h-60 w-full rounded-lg" />
            <Skeleton className="h-40 sm:h-60 w-full rounded-lg" />
          </div>
        </div>
        <aside className="hidden lg:block lg:col-span-1 space-y-6">
          <Skeleton className="h-8 w-full sm:w-3/4 mb-4" />
          <Skeleton className="h-32 sm:h-40 w-full rounded-lg mb-4" />
          <Skeleton className="h-32 sm:h-40 w-full rounded-lg" />
        </aside>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="text-center py-10 w-full">
        <p>Room not found or you do not have access. Redirecting...</p>
      </div>
    );
  }

  if (isViewingAsNonMemberPublic && room) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height)-var(--footer-height,0px))] p-4 sm:p-6">
        <Card className="max-w-md sm:max-w-lg w-full shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl md:text-3xl text-center">
              {room.name}
            </CardTitle>
            {room.description && (
              <CardDescription className="text-center mt-2 text-sm sm:text-base">
                {room.description}
              </CardDescription>
            )}
            <div className="mt-3 flex flex-wrap gap-2 justify-center">
              {room.tags &&
                room.tags.length > 0 &&
                room.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground text-center mt-2">
              <Users className="inline h-3 w-3 sm:h-4 sm:w-4 mr-1" />{" "}
              {roomMembers.length} member(s)
            </p>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6 text-sm sm:text-base">
              This is a public room. You can request to join as a voter.
            </p>
            {currentUser ? (
              <Button
                onClick={handleRequestToJoin}
                size="lg"
                className="w-full text-sm sm:text-base"
              >
                <UserPlus className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Request to
                Join as Voter
              </Button>
            ) : (
              <Button asChild size="lg" className="w-full text-sm sm:text-base">
                <Link href={`/login?redirect=/dashboard/room/${roomId}`}>
                  <LogIn className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Login to Join
                </Link>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              asChild
              className="mt-8 w-full text-xs sm:text-sm"
            >
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="text-center py-10 w-full">
        <p>Error loading room.</p>
      </div>
    );
  }

  const canCreatePost =
    currentUserRole === "admin" || currentUserRole === "candidate";
  const isAdmin = currentUserRole === "admin";
  const isMember = !!currentUserRole;

  const VotingRailContent = () => (
    <Card className="sticky top-[calc(var(--header-height)_+_1.5rem)]">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <VoteIconLucide className="h-5 w-5 text-primary" />
            Cast Your Vote
          </CardTitle>
          {isAdmin && (
            <Button
              onClick={() => setIsCreateBallotDialogOpen(true)}
              size="sm"
              variant="outline"
              className="text-xs"
            >
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> New Ballot
            </Button>
          )}
        </div>
        <CardDescription className="text-xs sm:text-sm">
          Select your choice for active ballots.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 ">
        {ballots.length > 0 ? (
          <ScrollArea className="max-h-[calc(100vh-var(--header-height)-12rem)] pr-1">
            <div className="space-y-4">
              {ballots.map((ballot) => (
                <BallotVoteCard
                  key={`ballot-${ballot.id}`}
                  ballot={ballot}
                  now={now}
                  onVote={(ballotId, choiceIdOrIds) =>
                    handleVote(ballotId, choiceIdOrIds)
                  }
                />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">
            No active ballots to vote on right now.
            {isAdmin && " Create one to get started!"}
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="w-full flex flex-col lg:flex-row gap-4 sm:gap-6 p-4 sm:p-6">
      <div className="flex-grow lg:flex-shrink-0 lg:w-2/3 xl:w-3/4 space-y-6 sm:space-y-8 order-1">
        <div>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="mb-4 text-xs sm:text-sm"
          >
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          <div className="pb-4 border-b mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
                {room.name}
              </h1>
              {room.description && (
                <p className="text-sm sm:text-md text-muted-foreground mt-1 max-w-xl">
                  {room.description}
                </p>
              )}
            </div>
            {isMember && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditRoomDialogOpen(true)}
                className="text-xs sm:text-sm"
              >
                <Edit className="mr-2 h-4 w-4" /> Edit Room Details
              </Button>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {room.tags &&
              room.tags.length > 0 &&
              room.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
          </div>
        </div>

        {room.votingSystem === "simple_majority" &&
          !isViewingAsNonMemberPublic &&
          isMember && (
            <div className="lg:hidden mb-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  setIsMobileVotingRailOpen(!isMobileVotingRailOpen)
                }
              >
                {isMobileVotingRailOpen ? (
                  <ChevronUp className="mr-2 h-4 w-4" />
                ) : (
                  <ChevronDown className="mr-2 h-4 w-4" />
                )}
                {isMobileVotingRailOpen
                  ? "Hide Ballots"
                  : "Show Ballots & Vote"}{" "}
                ({ballots.length})
              </Button>
              {isMobileVotingRailOpen && (
                <div className="mt-4 space-y-6">
                  <VotingRailContent />
                </div>
              )}
            </div>
          )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-xs sm:max-w-md mb-4 sm:mb-6 text-xs sm:text-sm">
            <TabsTrigger
              value="posts_discussion"
              className="flex items-center gap-1 sm:gap-2"
            >
              <MessageSquare className="h-4 w-4" /> Posts &amp; Discussion
            </TabsTrigger>
            <TabsTrigger
              value="info_settings"
              className="flex items-center gap-1 sm:gap-2"
            >
              <Info className="h-4 w-4" /> Info &amp; Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts_discussion">
            {canCreatePost && (
              <div className="mb-4 sm:mb-6 flex justify-start">
                <Button
                  onClick={() => setIsCreatePostDialogOpen(true)}
                  className="text-xs sm:text-sm"
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Create New Post
                </Button>
              </div>
            )}
            {posts.length === 0 ? (
              <div className="text-center py-10 sm:py-12 bg-card border border-dashed rounded-lg">
                <AlertTriangle className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                  No Posts Yet
                </h3>
                <p className="text-muted-foreground mb-4 text-sm sm:text-base">
                  {canCreatePost
                    ? "Be the first to create a post!"
                    : "No posts have been made in this room yet."}
                </p>
                {canCreatePost && !isCreatePostDialogOpen && (
                  <Button
                    onClick={() => setIsCreatePostDialogOpen(true)}
                    className="text-xs sm:text-sm"
                  >
                    <Edit3 className="mr-2 h-4 w-4" /> Create First Post
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {posts.map((post) => (
                  <PostCard
                    key={`post-${post.id}`}
                    post={post}
                    onPostUpdated={handlePostInteractionUpdate}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="info_settings" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">
                  Room Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm sm:text-base">
                <div className="flex items-center">
                  <Eye className="mr-2 h-4 w-4 text-muted-foreground" />
                  <strong>Visibility:</strong>{" "}
                  <span className="ml-1 capitalize">{room.visibility}</span>
                </div>
                <div className="flex items-center">
                  <ListChecks className="mr-2 h-4 w-4 text-muted-foreground" />
                  <strong>System:</strong>{" "}
                  <span className="ml-1">
                    {room.votingSystem === "simple_majority"
                      ? "Simple Majority Voting"
                      : "Discussion Only"}
                  </span>
                </div>
                {room.rules && (
                  <div className="pt-2">
                    <h4 className="font-semibold mb-1 flex items-center text-sm sm:text-base">
                      <BookOpen className="mr-2 h-4 w-4 text-muted-foreground" />
                      Room Rules:
                    </h4>
                    <ScrollArea className="max-h-32 sm:max-h-40">
                      <p className="text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-md border text-xs sm:text-sm">
                        {room.rules}
                      </p>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>

            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">
                    Invite Users (Admin Only)
                  </CardTitle>
                  <CardDescription>
                    Invite users to join this room with a specific role.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <InviteUserToRoomCard roomId={roomId} />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Members ({roomMembers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {roomMembers.length > 0 ? (
                  <ScrollArea className="max-h-48 sm:max-h-60">
                    <ul className="space-y-2 text-sm text-muted-foreground border rounded-md p-3">
                      {roomMembers.map((member) => (
                        <li
                          key={member.id}
                          className="flex justify-between items-center p-1.5 sm:p-2 border-b last:border-b-0 hover:bg-muted/50 rounded-sm"
                        >
                          <span>
                            {member.name ||
                              member.username ||
                              member.id?.substring(0, 10) + "..."}
                          </span>
                          <Badge
                            variant={
                              member.role === "admin" ? "default" : "outline"
                            }
                            className="ml-2 capitalize text-xs"
                          >
                            {member.role}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No members yet. Invite users to join!
                  </p>
                )}
              </CardContent>
            </Card>

            {isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl flex items-center">
                    <Settings2 className="mr-2 h-5 w-5" />
                    Admin Panel
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Manage room settings and content.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditRoomDialogOpen(true)}
                    className="flex-1 text-xs sm:text-sm"
                  >
                    <Edit className="mr-2 h-4 w-4" /> Edit Room Details
                  </Button>
                  {room.votingSystem === "simple_majority" && (
                    <Button
                      onClick={() => setIsCreateBallotDialogOpen(true)}
                      className="flex-1 text-xs sm:text-sm"
                    >
                      <PlusCircle className="mr-2 h-4 w-4" /> Create New Ballot
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    onClick={() => setIsDeleteRoomAlertOpen(true)}
                    className="flex-1 text-xs sm:text-sm"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Room
                  </Button>
                </CardContent>
              </Card>
            )}

            {isMember && !isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">
                    Room Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full text-xs sm:text-sm"
                    onClick={() => setIsLeaveRoomAlertOpen(true)}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Leave Room
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {room.votingSystem === "simple_majority" &&
        !isViewingAsNonMemberPublic &&
        isMember && (
          <aside className="hidden lg:block lg:w-1/3 xl:w-1/4 space-y-6 order-2 flex-shrink-0 overflow-y-auto scrollbar-hide max-h-[80vh]" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <Card className="sticky top-[calc(var(--header-height)_+_1.5rem)]">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <VoteIconLucide className="h-5 w-5 text-primary" />
                    Cast Your Vote
                  </CardTitle>
                  {isAdmin && (
                    <Button
                      onClick={() => setIsCreateBallotDialogOpen(true)}
                      size="sm"
                      variant="outline"
                      className="text-xs"
                    >
                      <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> New Ballot
                    </Button>
                  )}
                </div>
                <CardDescription className="text-xs sm:text-sm">
                  Select your choice for active ballots.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {ballots.length > 0 ? (
                  <div className="space-y-4">
                    {ballots.map((ballot) => (
                      <BallotVoteCard
                        key={`ballot-${ballot.id}`}
                        ballot={ballot}
                        now={now}
                        onVote={(ballotId, choiceIdOrIds) =>
                          handleVote(ballotId, choiceIdOrIds)
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-muted-foreground text-center py-4">
                    No active ballots to vote on right now.
                    {isAdmin && " Create one to get started!"}
                  </p>
                )}
              </CardContent>
            </Card>
          </aside>
        )}

      <Dialog
        open={isCreatePostDialogOpen}
        onOpenChange={setIsCreatePostDialogOpen}
      >
        <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl ">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl">
              Create New Post
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Share your idea or proposal for discussion.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[70vh] overflow-y-auto pr-2">
            <CreatePostForm onSubmitSuccess={handlePostCreated} />
          </div>
        </DialogContent>
      </Dialog>

      {room.votingSystem === "simple_majority" && (
        <Dialog
          open={isCreateBallotDialogOpen}
          onOpenChange={setIsCreateBallotDialogOpen}
        >
          <DialogContent className="sm:max-w-md md:max-w-lg ">
            <DialogHeader>
              <DialogTitle className="text-xl sm:text-2xl">
                Create New Ballot
              </DialogTitle>
              <DialogDescription className="text-sm sm:text-base">
                Define a new ballot for voting. Only admins can do this.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 max-h-[70vh] overflow-y-auto pr-2 " style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <CreateBallotForm onSubmitSuccess={handleBallotCreated} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {room && isAdmin && (
        <EditRoomDialog
          room={room}
          isOpen={isEditRoomDialogOpen}
          onOpenChange={setIsEditRoomDialogOpen}
          onRoomUpdated={handleRoomUpdated}
        />
      )}

      <AlertDialog
        open={isLeaveRoomAlertOpen}
        onOpenChange={setIsLeaveRoomAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Room?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave "{room?.name}"? You will lose
              access to its content and discussions unless you are invited back
              or re-join (if public).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveRoom}
              className="bg-destructive hover:bg-destructive/90"
            >
              Leave Room
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isDeleteRoomAlertOpen}
        onOpenChange={setIsDeleteRoomAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Room?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you absolutely sure you want to delete "{room?.name}"? This
              action is irreversible and will remove all associated posts,
              ballots, and comments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRoom}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Room
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
