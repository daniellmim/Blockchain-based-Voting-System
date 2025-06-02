"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "./Logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Home,
  Folder,
  Bell,
  MessageSquare,
  Settings,
  HelpCircle,
  LineChart,
  LogOutIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, logoutUser, isLoading: authLoading, token } = useAuth(); // Added token
  const [isClient, setIsClient] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [totalUnreadChatCount, setTotalUnreadChatCount] = useState(0);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchNotificationCount = useCallback(async () => {
    if (currentUser && token && isClient) {
      // check isClient here too
      try {
        const response = await fetch(`${API_BASE_URL}/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setUnreadNotificationsCount(data.unreadCount || 0);
        } else {
          setUnreadNotificationsCount(0); // Reset on error
        }
      } catch (error) {
        console.error("Failed to fetch unread notification count", error);
        setUnreadNotificationsCount(0);
      }
    } else {
      setUnreadNotificationsCount(0);
    }
  }, [currentUser, token, isClient]); // Added isClient

  const fetchChatCount = useCallback(async () => {
    if (currentUser && token && isClient) {
      try {
        const response = await fetch(`${API_BASE_URL}/chat/conversations`, {
          // Assuming this endpoint returns unread summary or recalculate from all convos
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          // Sum up unread counts from each conversation
          const totalUnread = data.conversations.reduce(
            (sum: number, convo: any) => sum + (convo.unreadCount || 0),
            0
          );
          setTotalUnreadChatCount(totalUnread);
        } else {
          setTotalUnreadChatCount(0);
        }
      } catch (error) {
        console.error("Failed to fetch unread chat count:", error);
        setTotalUnreadChatCount(0);
      }
    } else {
      setTotalUnreadChatCount(0);
    }
  }, [currentUser, token, isClient]);

  useEffect(() => {
    if (currentUser && isClient) {
      fetchNotificationCount();
      fetchChatCount();

      // Setup interval polling for counts as a simple real-time update mechanism
      const intervalId = setInterval(() => {
        fetchNotificationCount();
        fetchChatCount();
      }, 30000); // Poll every 30 seconds

      return () => clearInterval(intervalId); // Cleanup interval on component unmount
    }
  }, [currentUser, isClient, fetchNotificationCount, fetchChatCount]);

  const handleLogout = () => {
    logoutUser();
    router.push("/login");
  };

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

  if (!isClient || authLoading || !currentUser) {
    // Avoid rendering the full sidebar or making API calls until client is mounted and user is loaded
    return <div className="w-64 bg-muted p-4 h-full">Loading sidebar...</div>;
  }

  const isActive = (path: string) =>
    pathname === path ||
    (pathname.startsWith(path) &&
      path !== "/dashboard" &&
      !(path === "/dashboard" && pathname.startsWith("/dashboard/room")));

  return (
    <div className="w-64 bg-gradient-to-r from-muted/80 to-blue-100/80 dark:from-muted/90 dark:to-blue-900/90 p-4 h-full flex flex-col shadow-lg md:rounded-r-lg md:fixed md:top-0 md:left-0">
      <div className="mb-6">
        <Logo />
      </div>

      <nav
        className="mb-6 flex-grow overflow-y-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <ul className="space-y-1">
          <li>
            <Button
              variant={
                isActive("/dashboard") &&
                !pathname.startsWith("/dashboard/room") &&
                !pathname.startsWith("/dashboard/create-room") &&
                !pathname.startsWith("/dashboard/profile") &&
                !pathname.startsWith("/dashboard/settings") &&
                !pathname.startsWith("/dashboard/notifications") &&
                !pathname.startsWith("/dashboard/chat")
                  ? "secondary"
                  : "ghost"
              }
              className="w-full justify-start"
              asChild
            >
              <Link href="/dashboard">
                <Home
                  className={cn(
                    "mr-3 h-5 w-5",
                    isActive("/dashboard") &&
                      !pathname.startsWith("/dashboard/room") &&
                      !pathname.startsWith("/dashboard/create-room") &&
                      !pathname.startsWith("/dashboard/profile") &&
                      !pathname.startsWith("/dashboard/settings") &&
                      !pathname.startsWith("/dashboard/notifications") &&
                      !pathname.startsWith("/dashboard/chat")
                      ? "text-secondary-foreground"
                      : "text-primary"
                  )}
                />
                <span
                  className={cn(
                    isActive("/dashboard") &&
                      !pathname.startsWith("/dashboard/room") &&
                      !pathname.startsWith("/dashboard/create-room") &&
                      !pathname.startsWith("/dashboard/profile") &&
                      !pathname.startsWith("/dashboard/settings") &&
                      !pathname.startsWith("/dashboard/notifications") &&
                      !pathname.startsWith("/dashboard/chat")
                      ? "text-secondary-foreground"
                      : "text-foreground"
                  )}
                >
                  Dashboard
                </span>
              </Link>
            </Button>
          </li>

          <Accordion
            type="single"
            collapsible
            className="w-full"
            defaultValue={
              pathname.startsWith("/dashboard/room") ||
              pathname === "/dashboard/create-room"
                ? "my-rooms"
                : ""
            }
          >
            <AccordionItem value="my-rooms" className="border-b-0">
              <AccordionTrigger
                className={cn(
                  "hover:no-underline hover:bg-blue-200/50 dark:hover:bg-blue-800/50 rounded-md py-2 px-3 w-full justify-between text-foreground",
                  (pathname.startsWith("/dashboard/room") ||
                    pathname === "/dashboard/create-room") &&
                    "bg-blue-200/50 dark:bg-blue-800/50"
                )}
              >
                <div className="flex items-center">
                  <Folder className="text-primary mr-3 h-5 w-5" />
                  My Rooms
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-0 pl-3">
                <ul className="space-y-1 mt-1">
                  <li>
                    <Button
                      variant={
                        pathname.startsWith("/dashboard/room")
                          ? "secondary"
                          : "ghost"
                      }
                      size="sm"
                      className="w-full justify-start"
                      asChild
                    >
                      <Link href="/dashboard">
                        <span
                          className={cn(
                            pathname.startsWith("/dashboard/room")
                              ? "text-secondary-foreground"
                              : "text-foreground"
                          )}
                        >
                          Active Rooms
                        </span>
                      </Link>
                    </Button>
                  </li>
                  <li>
                    <Button
                      variant={
                        isActive("/dashboard/create-room")
                          ? "secondary"
                          : "ghost"
                      }
                      size="sm"
                      className="w-full justify-start"
                      asChild
                    >
                      <Link href="/dashboard/create-room">
                        <span
                          className={cn(
                            isActive("/dashboard/create-room")
                              ? "text-secondary-foreground"
                              : "text-foreground"
                          )}
                        >
                          Create Room
                        </span>
                      </Link>
                    </Button>
                  </li>
                  <li>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      disabled
                    >
                      <span className="text-muted-foreground">
                        Archived Rooms
                      </span>
                    </Button>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <li>
            <Button
              variant={
                isActive("/dashboard/notifications") ? "secondary" : "ghost"
              }
              className="w-full justify-start"
              asChild
            >
              <Link
                href="/dashboard/notifications"
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center">
                  <Bell
                    className={cn(
                      "mr-3 h-5 w-5",
                      isActive("/dashboard/notifications")
                        ? "text-secondary-foreground"
                        : "text-primary"
                    )}
                  />
                  <span
                    className={cn(
                      isActive("/dashboard/notifications")
                        ? "text-secondary-foreground"
                        : "text-foreground"
                    )}
                  >
                    Notifications
                  </span>
                </div>
                {unreadNotificationsCount > 0 && (
                  <Badge
                    variant={
                      isActive("/dashboard/notifications")
                        ? "default"
                        : "destructive"
                    }
                    className="h-5 px-1.5 text-xs"
                  >
                    {unreadNotificationsCount}
                  </Badge>
                )}
              </Link>
            </Button>
          </li>
          <li>
            <Button
              variant={isActive("/dashboard/chat") ? "secondary" : "ghost"}
              className="w-full justify-start"
              asChild
            >
              <Link
                href="/dashboard/chat"
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center">
                  <MessageSquare
                    className={cn(
                      "mr-3 h-5 w-5",
                      isActive("/dashboard/chat")
                        ? "text-secondary-foreground"
                        : "text-primary"
                    )}
                  />
                  <span
                    className={cn(
                      isActive("/dashboard/chat")
                        ? "text-secondary-foreground"
                        : "text-foreground"
                    )}
                  >
                    Chat
                  </span>
                </div>
                {totalUnreadChatCount > 0 && (
                  <Badge
                    variant={
                      isActive("/dashboard/chat") ? "default" : "destructive"
                    }
                    className="h-5 px-1.5 text-xs"
                  >
                    {totalUnreadChatCount}
                  </Badge>
                )}
              </Link>
            </Button>
          </li>
          <li>
            <Button
              variant="ghost"
              className="w-full justify-start"
              asChild
              disabled
            >
              <Link href="/dashboard/analytics">
                <LineChart className="text-primary mr-3 h-5 w-5" />
                <span className="text-muted-foreground">Analytics</span>
              </Link>
            </Button>
          </li>
        </ul>
      </nav>

      <div className="border-t border-gray-300 dark:border-gray-700 my-4"></div>

      <nav className="mb-6">
        <ul className="space-y-1">
          <li>
            <Button
              variant={isActive("/dashboard/settings") ? "secondary" : "ghost"}
              className="w-full justify-start"
              asChild
            >
              <Link href="/dashboard/settings">
                <Settings
                  className={cn(
                    "mr-3 h-5 w-5",
                    isActive("/dashboard/settings")
                      ? "text-secondary-foreground"
                      : "text-primary"
                  )}
                />
                <span
                  className={cn(
                    isActive("/dashboard/settings")
                      ? "text-secondary-foreground"
                      : "text-foreground"
                  )}
                >
                  Settings
                </span>
              </Link>
            </Button>
          </li>
          <li>
            <Button
              variant={
                isActive("/dashboard/help-support") ? "secondary" : "ghost"
              }
              className="w-full justify-start"
              asChild
            >
              <Link href="/dashboard/help-support">
                <HelpCircle
                  className={cn(
                    "mr-3 h-5 w-5",
                    isActive("/dashboard/help-support")
                      ? "text-secondary-foreground"
                      : "text-primary"
                  )}
                />
                <span
                  className={cn(
                    isActive("/dashboard/help-support")
                      ? "text-secondary-foreground"
                      : "text-foreground"
                  )}
                >
                  About Us
                </span>
              </Link>
            </Button>
          </li>
        </ul>
      </nav>

      <div className="border-t border-gray-300 dark:border-gray-700 my-4"></div>

      <div className="mt-auto mb-2">
        <Button
          variant={isActive("/dashboard/profile") ? "secondary" : "ghost"}
          className="w-full h-auto justify-start p-2 hover:bg-blue-200/50 dark:hover:bg-blue-800/50"
          asChild
        >
          <Link href="/dashboard/profile">
            <Avatar className="h-10 w-10 mr-2">
              <AvatarImage
                src={currentUser.avatarUrl}
                alt={currentUser.name || "User Avatar"}
                data-ai-hint="profile avatar"
              />
              <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
            </Avatar>
            <div>
              <p
                className={cn(
                  "font-semibold text-sm",
                  isActive("/dashboard/profile")
                    ? "text-secondary-foreground"
                    : "text-foreground"
                )}
              >
                {currentUser.name || "User"}
              </p>
              <p
                className={cn(
                  "text-xs",
                  isActive("/dashboard/profile")
                    ? "text-secondary-foreground/80"
                    : "text-muted-foreground"
                )}
              >
                View Profile
              </p>
            </div>
          </Link>
        </Button>

        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full mt-4"
        >
          <LogOutIcon className="mr-2 h-4 w-4" /> Logout
        </Button>
      </div>
    </div>
  );
}
