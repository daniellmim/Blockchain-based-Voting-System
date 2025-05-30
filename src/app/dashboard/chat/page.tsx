"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type {
  User,
  Conversation as AppConversation,
  ChatMessage as AppChatMessage,
  Room,
} from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Send,
  Info,
  Users,
  MessageSquare,
  Search,
  Link as LinkIcon,
  ArrowLeft,
  X,
  Loader2,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";

interface SocketNewMessagePayload {
  conversationId: string;
  message: AppChatMessage;
}
interface SocketConversationUpdatedPayload {
  conversationId: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";
const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4001";

interface UserDetailModalProps {
  user: User | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

function UserDetailModal({ user, isOpen, onOpenChange }: UserDetailModalProps) {
  if (!user) return null;

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return (
      name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "U"
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Info className="h-5 w-5 text-primary" />
            User Details
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Information about {user.name || user.username}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="flex flex-col items-center space-y-3">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
              <AvatarImage
                src={user.avatarUrl}
                alt={user.name || user.username}
                data-ai-hint="profile avatar large"
              />
              <AvatarFallback className="text-2xl sm:text-3xl">
                {getInitials(user.name || user.username)}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-lg sm:text-xl font-semibold">
              {user.name || "Unnamed User"}
            </h2>
            {user.username && (
              <p className="text-muted-foreground text-sm sm:text-base">
                @{user.username}
              </p>
            )}
          </div>
          <div className="space-y-1 text-xs sm:text-sm">
            <p>
              <strong className="font-medium">Email:</strong> {user.email}
            </p>
            {/* TODO: Add more user details if available from API */}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ChatMessageBubbleProps {
  message: AppChatMessage;
  isSender: boolean;
  getRoomNameById: (roomId: string) => Promise<string>;
}

function ChatMessageBubble({
  message,
  isSender,
  getRoomNameById,
}: ChatMessageBubbleProps) {
  const router = useRouter();
  const [renderedContent, setRenderedContent] = useState<React.ReactNode>(
    message.content
  );

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) return format(date, "p");
    if (isYesterday(date)) return `Yesterday ${format(date, "p")}`;
    return format(date, "MMM d, p");
  };

  useEffect(() => {
    const processContent = async () => {
      const roomLinkRegex = /\/dashboard\/room\/([a-fA-F0-9]{24})/g; // Regex for MongoDB ObjectId
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      let match;
      const content = message.content;

      while ((match = roomLinkRegex.exec(content)) !== null) {
        const roomId = match[1];
        const roomName = await getRoomNameById(roomId);

        if (match.index > lastIndex) {
          parts.push(content.substring(lastIndex, match.index));
        }
        parts.push(
          <Button
            key={match.index}
            variant="outline"
            size="sm"
            className="my-1 mx-0.5 h-auto py-1 px-2 text-xs bg-primary/10 hover:bg-primary/20 border-primary/30"
            onClick={() => router.push(`/dashboard/room/${roomId}`)}
          >
            <Users className="mr-1.5 h-3 w-3" /> Join Room: {roomName}
          </Button>
        );
        lastIndex = roomLinkRegex.lastIndex;
      }

      if (lastIndex < content.length) {
        parts.push(content.substring(lastIndex));
      }
      setRenderedContent(
        parts.length > 0
          ? parts.map((part, i) => (
              <React.Fragment key={i}>{part}</React.Fragment>
            ))
          : content
      );
    };

    processContent();
  }, [message.content, getRoomNameById, router]);

  return (
    <div
      className={cn(
        "flex mb-2 sm:mb-3",
        isSender ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[70%] p-2 sm:p-2.5 rounded-lg shadow",
          isSender
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-card text-card-foreground rounded-bl-none border"
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words">
          {renderedContent}
        </p>
        <p
          className={cn(
            "text-xs mt-1",
            isSender
              ? "text-primary-foreground/70 text-right"
              : "text-muted-foreground text-left"
          )}
        >
          {formatTimestamp(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

interface ActiveChatViewProps {
  conversation: AppConversation | null;
  currentUser: User;
  messages: AppChatMessage[];
  onSendMessage: (
    content: string,
    receiverId: string,
    conversationId?: string
  ) => Promise<void>;
  onViewUserProfile: (user: User) => void;
  onBackToList: () => void;
  getRoomNameById: (roomId: string) => Promise<string>;
  isLoadingMessages: boolean;
}

function ActiveChatView({
  conversation,
  currentUser,
  messages,
  onSendMessage,
  onViewUserProfile,
  onBackToList,
  getRoomNameById,
  isLoadingMessages,
}: ActiveChatViewProps) {
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!conversation || !conversation.otherParticipant) {
    return (
      <div className="hidden md:flex flex-1 flex-col items-center justify-center h-full bg-muted/30 p-6">
        <MessageSquare className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/50 mb-4" />
        <p className="text-md sm:text-lg text-muted-foreground">
          Select a conversation to start chatting.
        </p>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Or, search for a user to begin a new chat.
        </p>
      </div>
    );
  }
  const otherParticipant = conversation.otherParticipant as User;

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

  const handleSend = async () => {
    if (newMessage.trim() && otherParticipant) {
      await onSendMessage(
        newMessage.trim(),
        otherParticipant.id,
        conversation.id
      );
      setNewMessage("");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background shadow-inner w-full">
      <div className="p-2.5 sm:p-3 border-b flex items-center gap-2 sm:gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden mr-1"
          onClick={onBackToList}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div
          onClick={() => onViewUserProfile(otherParticipant)}
          className="flex items-center gap-2 sm:gap-3 flex-grow cursor-pointer hover:bg-muted/50 transition-colors p-1 rounded"
        >
          <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
            <AvatarImage
              src={otherParticipant.avatarUrl}
              alt={
                otherParticipant.name ||
                otherParticipant.username ||
                "User Avatar"
              }
              data-ai-hint="profile avatar"
            />
            <AvatarFallback>
              {getInitials(otherParticipant.name || otherParticipant.username)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-foreground text-sm sm:text-base">
              {otherParticipant.name || otherParticipant.username}
            </h3>
            {/* TODO: Add online/offline status here */}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 p-3 sm:p-4">
        {isLoadingMessages ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-10">
            No messages yet. Start the conversation!
          </p>
        ) : (
          messages.map((msg) => (
            <ChatMessageBubble
              key={msg.id}
              message={msg}
              isSender={
                (msg.senderId as User)?.id === currentUser.id ||
                msg.senderId === currentUser.id
              }
              getRoomNameById={getRoomNameById}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </ScrollArea>

      <div className="p-2.5 sm:p-3 border-t bg-muted/50">
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) =>
              e.key === "Enter" &&
              !e.shiftKey &&
              (e.preventDefault(), handleSend())
            }
            className="flex-1 bg-background text-sm sm:text-base"
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="bg-accent hover:bg-accent/90"
          >
            <Send className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ConversationListItemProps {
  conversation: AppConversation;
  isSelected: boolean;
  onSelect: (conversationId: string) => void;
  currentUserId: string;
}

function ConversationListItem({
  conversation,
  isSelected,
  onSelect,
  currentUserId,
}: ConversationListItemProps) {
  const participant = conversation.otherParticipant as User | undefined;
  if (!participant) return null;

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

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    if (isToday(date)) return format(date, "p");
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MM/dd/yy");
  };

  const lastMessageSenderName =
    conversation.lastMessage?.senderId === currentUserId ? "You: " : "";

  return (
    <div
      className={cn(
        "flex items-center p-2 sm:p-2.5 rounded-lg cursor-pointer transition-colors gap-2 sm:gap-3",
        isSelected ? "bg-primary/15" : "hover:bg-muted/70"
      )}
      onClick={() => onSelect(conversation.id)}
    >
      <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
        <AvatarImage
          src={participant.avatarUrl}
          alt={participant.name || participant.username || "User Avatar"}
          data-ai-hint="profile avatar small"
        />
        <AvatarFallback>
          {getInitials(participant.name || participant.username)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <h4 className="font-medium text-sm text-foreground truncate">
            {participant.name || participant.username}
          </h4>
          {conversation.updatedAt && ( // Use updatedAt from conversation for overall last activity
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatTimestamp(conversation.updatedAt)}
            </span>
          )}
        </div>
        <div className="flex justify-between items-center mt-0.5">
          <p className="text-xs text-muted-foreground truncate">
            {lastMessageSenderName}
            {conversation.lastMessage?.content || "No messages yet"}
          </p>
          {(conversation as any).unreadCount > 0 && ( // Cast to any if unreadCount is not strongly typed
            <span className="ml-2 bg-accent text-accent-foreground text-xs font-semibold px-1.5 py-0.5 rounded-full">
              {(conversation as any).unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface SearchResultItemProps {
  user: User;
  onSelect: (user: User) => void;
}
function SearchResultItem({ user, onSelect }: SearchResultItemProps) {
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
  return (
    <div
      className="flex items-center p-2 sm:p-2.5 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors gap-2 sm:gap-3"
      onClick={() => onSelect(user)}
    >
      <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
        <AvatarImage
          src={user.avatarUrl}
          alt={user.name || user.username || "User Avatar"}
          data-ai-hint="profile avatar search"
        />
        <AvatarFallback>
          {getInitials(user.name || user.username)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-foreground truncate">
          {user.name || user.username}
        </h4>
        {user.username && (
          <p className="text-xs text-muted-foreground truncate">
            @{user.username}
          </p>
        )}
      </div>
    </div>
  );
}

interface ConversationListColumnProps {
  showChatViewMobile: boolean;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  searchResults: User[];
  isSearching: boolean;
  onSelectUserFromSearch: (user: User) => void;
  isLoadingConversations: boolean;
  conversations: AppConversation[];
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  currentUserId: string;
}

const ConversationListColumnInternal: React.FC<ConversationListColumnProps> = ({
  showChatViewMobile,
  searchInput,
  onSearchInputChange,
  searchResults,
  isSearching,
  onSelectUserFromSearch,
  isLoadingConversations,
  conversations,
  activeConversationId,
  onSelectConversation,
  currentUserId,
}) => {
  return (
    <div
      className={cn(
        "w-full md:max-w-xs border-r bg-muted/20 flex flex-col h-full",
        showChatViewMobile && "hidden md:flex"
      )}
    >
      <div className="p-3 border-b">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
          Chats
        </h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name or @username"
            className="pl-8 w-full text-sm"
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
          />
          {searchInput && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => onSearchInputChange("")}
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>

      {isSearching && searchInput.length > 0 && (
        <div className="p-3 text-sm text-muted-foreground">Searching...</div>
      )}

      {searchResults.length > 0 && searchInput.length > 0 && (
        <ScrollArea className="flex-1 p-1.5 sm:p-2 space-y-1 sm:space-y-1.5 border-b">
          <p className="px-1.5 py-1 text-xs font-semibold text-muted-foreground">
            Search Results:
          </p>
          {searchResults.map((user) => (
            <SearchResultItem
              key={user.id}
              user={user}
              onSelect={onSelectUserFromSearch}
            />
          ))}
        </ScrollArea>
      )}

      {searchResults.length === 0 && searchInput.length > 0 && !isSearching && (
        <div className="p-3 text-sm text-muted-foreground text-center border-b">
          No users found matching "{searchInput}".
        </div>
      )}

      <ScrollArea className="flex-1 p-1.5 sm:p-2 space-y-1 sm:space-y-1.5">
        {isLoadingConversations ? (
          <div className="p-3 space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : conversations.length === 0 && searchInput.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground text-center">
            No conversations yet. Search for a user to start chatting!
          </p>
        ) : (
          conversations.map((convo) => (
            <ConversationListItem
              key={convo.id}
              conversation={convo}
              isSelected={activeConversationId === convo.id}
              onSelect={onSelectConversation}
              currentUserId={currentUserId}
            />
          ))
        )}
      </ScrollArea>
    </div>
  );
};

const MemoizedConversationListColumn = React.memo(
  ConversationListColumnInternal
);

export default function ChatPage() {
  const { currentUser, isLoading: authLoading, token } = useAuth();
  const [conversations, setConversations] = useState<AppConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<AppChatMessage[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [userDetailModalOpen, setUserDetailModalOpen] = useState(false);
  const [selectedUserForModal, setSelectedUserForModal] = useState<User | null>(
    null
  );
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  const [showChatViewMobile, setShowChatViewMobile] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getRoomNameById = useCallback(
    async (roomId: string): Promise<string> => {
      if (!token) return `Room ${roomId.substring(0, 5)}...`;
      try {
        const response = await fetch(`${API_BASE_URL}/rooms/${roomId}`, {
          // API returns full room object
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return `Room ${roomId.substring(0, 5)}...`;
        const data = await response.json();
        return data.room?.name || `Room ${roomId.substring(0, 5)}...`;
      } catch (error) {
        console.error("Error fetching room name:", error);
        return `Room ${roomId.substring(0, 5)}...`;
      }
    },
    [token]
  );

  const fetchConversations = useCallback(async () => {
    if (currentUser && token) {
      setIsLoadingConversations(true);
      try {
        const response = await fetch(`${API_BASE_URL}/chat/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to fetch conversations");
        const data = await response.json();
        setConversations(data.conversations || []);
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: `Failed to load conversations: ${error.message}`,
        });
        setConversations([]);
      } finally {
        setIsLoadingConversations(false);
      }
    }
  }, [currentUser, token, toast]);

  // Utility to check for valid MongoDB ObjectId
  const isValidObjectId = (id?: string) => !!id && /^[a-fA-F0-9]{24}$/.test(id);

  const fetchMessages = useCallback(
    async (conversationId: string) => {
      if (currentUser && token) {
        // Only fetch for real conversations
        if (!isValidObjectId(conversationId)) {
          setMessages([]);
          setIsLoadingMessages(false);
          return;
        }
        setIsLoadingMessages(true);
        try {
          const response = await fetch(
            `${API_BASE_URL}/chat/conversations/${conversationId}/messages`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (!response.ok) {
            // If 404, treat as empty (new chat), don't show error toast
            if (response.status === 404) {
              setMessages([]);
              setIsLoadingMessages(false);
              return;
            }
            throw new Error("Failed to fetch messages");
          }
          const data = await response.json();
          setMessages(data.messages || []);

          // Mark messages as read
          await fetch(
            `${API_BASE_URL}/chat/conversations/${conversationId}/read`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          // After marking as read, re-fetch conversations to update unread counts
          fetchConversations();
        } catch (error: any) {
          // Only show toast for non-404 errors
          if (!error?.message?.includes("404")) {
            toast({
              variant: "destructive",
              title: "Error",
              description: `Failed to load messages: ${error.message}`,
            });
          }
          setMessages([]);
        } finally {
          setIsLoadingMessages(false);
        }
      }
    },
    [currentUser, token, toast, fetchConversations]
  );

  useEffect(() => {
    if (activeConversationId && currentUser) {
      // Only fetch for real conversations
      if (isValidObjectId(activeConversationId)) {
        fetchMessages(activeConversationId);
      } else {
        setMessages([]);
      }
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        setShowChatViewMobile(true);
      }
    } else {
      setMessages([]);
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        setShowChatViewMobile(false);
      }
    }
  }, [activeConversationId, currentUser, fetchMessages]);

  // Poll for new messages and conversations every 3 seconds
  useEffect(() => {
    if (!currentUser || !token) return;
    const pollInterval = setInterval(() => {
      fetchConversations();
      if (activeConversationId && isValidObjectId(activeConversationId)) {
        fetchMessages(activeConversationId);
      }
    }, 3000); // Poll every 3 seconds
    return () => clearInterval(pollInterval);
  }, [
    currentUser,
    token,
    activeConversationId,
    fetchConversations,
    fetchMessages,
  ]);

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (!value.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      if (currentUser && token && value.trim()) {
        try {
          const response = await fetch(
            `${API_BASE_URL}/users/search?q=${encodeURIComponent(
              value.trim()
            )}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          if (!response.ok) throw new Error("Failed to search users");
          const data = await response.json();
          setSearchResults(
            data.users.filter((u: User) => u.id !== currentUser.id)
          );
        } catch (error: any) {
          toast({
            variant: "destructive",
            title: "Search Error",
            description: error.message,
          });
          setSearchResults([]);
        }
      }
      setIsSearching(false);
    }, 300); // 300ms debounce
  };

  const handleSelectConversation = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
    setSearchInput("");
    setSearchResults([]);
  }, []);

  const handleSendMessage = useCallback(
    async (content: string, receiverId: string, conversationId?: string) => {
      if (currentUser && token) {
        try {
          // Only include conversationId if it's a valid MongoDB ObjectId (24 hex chars)
          const isValidObjectId = (id?: string) =>
            !!id && /^[a-fA-F0-9]{24}$/.test(id);
          const body: any = { receiverId, content };
          if (isValidObjectId(conversationId)) {
            body.conversationId = conversationId;
          }
          const response = await fetch(`${API_BASE_URL}/chat/messages`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to send message");
          }
          const data = await response.json();
          // Return conversationId for chaining
          fetchMessages(data.conversationId || activeConversationId!);
          fetchConversations();
          return data.conversationId || activeConversationId!;
        } catch (error: any) {
          toast({
            variant: "destructive",
            title: "Send Error",
            description: `Failed to send message: ${error.message}`,
          });
          return null;
        }
      }
      return null;
    },
    [
      currentUser,
      token,
      toast,
      fetchConversations,
      fetchMessages,
      activeConversationId,
    ]
  );

  const handleSelectUserFromSearch = useCallback(
    async (targetUser: User) => {
      if (!currentUser || !token) return;
      if (targetUser.id === currentUser.id) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Cannot chat with yourself.",
        });
        return;
      }
      setIsSearching(true);
      try {
        let existingConvo = conversations.find((c) =>
          c.participants.some((p) => (p as User).id === targetUser.id)
        );

        if (existingConvo) {
          setActiveConversationId(existingConvo.id);
        } else {
          // Send a 'hi' message to create the conversation in the DB
          const newConversationId = await handleSendMessage(
            "hi",
            targetUser.id
          );
          if (newConversationId) {
            setActiveConversationId(newConversationId);
            await fetchMessages(newConversationId);
          }
          toast({
            title: "New Chat",
            description: `Started a chat with ${targetUser.name}. Say hi!`,
          });
        }
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Chat Error",
          description: `Could not start chat: ${error.message}`,
        });
      } finally {
        setSearchInput("");
        setSearchResults([]);
        setIsSearching(false);
      }
    },
    [
      currentUser,
      token,
      toast,
      conversations,
      fetchConversations,
      handleSendMessage,
      fetchMessages,
    ]
  );

  const handleViewUserProfile = (user: User) => {
    setSelectedUserForModal(user);
    setUserDetailModalOpen(true);
  };

  const handleBackToListMobile = () => {
    setShowChatViewMobile(false);
    setActiveConversationId(null);
  };

  if (authLoading || !currentUser) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <p>Loading chat...</p>
      </div>
    );
  }

  const currentActiveConversation = conversations.find(
    (c) => c.id === activeConversationId
  );

  return (
    <div className="flex h-[calc(100vh-var(--header-height,4rem))] border-t">
      <MemoizedConversationListColumn
        showChatViewMobile={showChatViewMobile}
        searchInput={searchInput}
        onSearchInputChange={handleSearchInputChange}
        searchResults={searchResults}
        isSearching={isSearching}
        onSelectUserFromSearch={handleSelectUserFromSearch}
        isLoadingConversations={isLoadingConversations}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        currentUserId={currentUser.id}
      />

      <div
        className={cn(
          "flex-1 h-full",
          !showChatViewMobile && "hidden md:flex",
          showChatViewMobile && "flex"
        )}
      >
        <ActiveChatView
          conversation={currentActiveConversation || null}
          currentUser={currentUser}
          messages={messages}
          onSendMessage={handleSendMessage}
          onViewUserProfile={handleViewUserProfile}
          onBackToList={handleBackToListMobile}
          getRoomNameById={getRoomNameById}
          isLoadingMessages={isLoadingMessages}
        />
      </div>

      <UserDetailModal
        user={selectedUserForModal}
        isOpen={userDetailModalOpen}
        onOpenChange={setUserDetailModalOpen}
      />
    </div>
  );
}
