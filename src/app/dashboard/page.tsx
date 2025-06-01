
"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { PlusCircle, Users, AlertTriangle, Search } from "lucide-react";
import { RoomCard } from "@/components/RoomCard";
import type { Room } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

export default function DashboardPage() {
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [displayedRooms, setDisplayedRooms] = useState<Room[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { currentUser, isLoading: authIsLoading, token } = useAuth();
  const [pendingJoinRequestRoomIds, setPendingJoinRequestRoomIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const fetchRooms = useCallback(async () => {
    setIsLoadingRooms(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/rooms`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }), // Include token if user is logged in
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch rooms: ${response.statusText}`);
      }
      const data = await response.json();
      setAllRooms(data.rooms || []);
    } catch (err: any) {
      console.error("Failed to load rooms:", err);
      setError(err.message || "Failed to load rooms. Please try again later.");
      setAllRooms([]);
    } finally {
      setIsLoadingRooms(false);
    }
  }, [token]);

  useEffect(() => {
    // No need to wait for authIsLoading if we want to show public rooms immediately
    // Auth check is primarily for user-specific actions or filtering private rooms if API supports it
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    let filtered = allRooms;

    if (currentUser) {
      // If your /api/rooms endpoint already filters by membership for logged-in users,
      // this client-side filter might be redundant or could be more specific.
      // For now, assuming allRooms contains what the current user is allowed to see based on token.
    } else {
      // For non-logged-in users, ensure only public rooms are shown (API should enforce this too)
      filtered = allRooms.filter(room => room.visibility === "public");
    }
    
    if (searchTerm) {
      filtered = filtered.filter(
        (room) =>
          room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (room.description &&
            room.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    setDisplayedRooms(filtered.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));

  }, [allRooms, currentUser, searchTerm]);

  const handleJoinRequestStatusChange = useCallback((roomId: string, isPending: boolean) => {
    setPendingJoinRequestRoomIds(prev => {
      const newSet = new Set(prev);
      if (isPending) {
        newSet.add(roomId);
      } else {
        newSet.delete(roomId); // Not strictly used to remove, but good for completeness
      }
      return newSet;
    });
  }, []);


  const RoomsGrid = () => {
    if (isLoadingRooms) {
      return (
        <div className="mt-6 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-card p-5 space-y-3 h-full flex flex-col"
            >
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <div className="flex justify-between pt-2 mt-auto">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return <p className="mt-6 text-destructive text-center">{error}</p>;
    }

    if (displayedRooms.length === 0) {
      return (
        <div className="mt-10 text-center py-12 bg-card border border-border border-dashed rounded-lg">
          <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            {searchTerm ? "No Rooms Match Your Search" : "No Rooms Available"}
          </h3>
          <p className="text-muted-foreground text-sm sm:text-base">
            {searchTerm
              ? "Try adjusting your search terms."
              : "No public rooms found."}
            <br />
            {currentUser && "Get started by creating a new room."}
          </p>
        </div>
      );
    }

    return (
      <div className="mt-6 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {displayedRooms.map((room) => (
          <RoomCard 
            key={room.id} 
            room={room} 
            isRequestPendingForThisRoom={pendingJoinRequestRoomIds.has(room.id)}
            onJoinRequestStatusChange={handleJoinRequestStatusChange}
          />
        ))}
      </div>
    );
  };

  if (authIsLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center px-4 sm:px-0">
      <section className="w-full max-w-4xl text-center py-6 sm:py-8">
        <h3 className="mb-2 text-2xl sm:text-3xl font-semibold text-foreground">
          Welcome{currentUser?.name ? `, ${currentUser.name}` : ""}!
        </h3>

        <p className="mb-6 text-muted-foreground text-sm sm:text-base">
          {currentUser ? "Create rooms for discussion and voting, or manage your existing ones." : "Explore public discussion rooms."}
        </p>

        {currentUser && (
            <div className="mb-8 sm:mb-10 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-sm sm:text-base">
                <Link href="/dashboard/create-room">
                <PlusCircle className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Create New Room
                </Link>
            </Button>
            </div>
        )}

        <div className="flex justify-center mb-8 max-w-md sm:max-w-lg md:max-w-xl mx-auto">
          <Image
            src="/images/dashboard-illustration.gif"
            alt="Dashboard Illustration"
            width={600}
            height={300}
            className="rounded-lg shadow-md object-cover w-full"
            data-ai-hint="team meeting"
            priority
          />
        </div>
      </section>

      <section className="w-full max-w-5xl mt-6 sm:mt-10">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2 sm:mb-0">
            Available Rooms
          </h1>
          <div className="relative w-full sm:w-auto max-w-xs sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search rooms..."
              className="pl-10 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left mb-6">
          Public rooms. Click on a room to view details or request to join.
        </p>
        <RoomsGrid />
      </section>
    </div>
  );
}
