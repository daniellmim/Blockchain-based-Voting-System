
"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
// import type { User } from "@/lib/types"; // Not directly used
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Settings as SettingsIcon,
  Shield,
  Palette,
  Bell,
} from "lucide-react";
import Link from "next/link";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

export default function SettingsPage() {
  const { currentUser, logoutUser, isLoading: authLoading, token } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);

  // Mock states for other settings (UI only)
  const [notifications, setNotifications] = useState({
    newProposals: true,
    newComments: false,
    mentions: true,
  });
  const [theme, setTheme] = useState("system");

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      router.push("/login?redirect=/dashboard/settings");
    }
    setIsLoading(false);
  }, [currentUser, authLoading, router]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
        toast({variant: "destructive", title: "Error", description: "Not authenticated."});
        return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "New passwords do not match.",
      });
      return;
    }
    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "New password must be at least 6 characters.",
      });
      return;
    }

    setIsPasswordSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      
      const data = await response.json();
      if (!response.ok) {
          throw new Error(data.message || 'Failed to change password');
      }

      toast({ title: "Password Changed", description: "Your password has been successfully changed." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error Changing Password", description: error.message });
    } finally {
        setIsPasswordSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!token) {
        toast({variant: "destructive", title: "Error", description: "Not authenticated."});
        return;
    }
    setIsDeleteSubmitting(true);
    try {
        const response = await fetch(`${API_BASE_URL}/user/delete`, { 
            method: 'DELETE', 
            headers: { 'Authorization': `Bearer ${token}` } 
        });
        
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Failed to delete account');
        }

        logoutUser(); 
        toast({
            title: "Account Deleted",
            description: "Your account has been successfully deleted. Redirecting to login.",
        });
        router.push("/login");

    } catch (error: any) {
        toast({ variant: "destructive", title: "Error Deleting Account", description: error.message });
    } finally {
        setIsDeleteSubmitting(false);
    }
  };

  if (authLoading || isLoading || !currentUser) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <Button variant="outline" size="sm" asChild className="mb-6">
        <Link href="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </Button>

      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl sm:text-3xl">Settings</CardTitle>
          </div>
          <CardDescription>
            Manage your account, notifications, and appearance preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs defaultValue="account" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="account">
                <Shield className="mr-2 h-4 w-4 sm:hidden md:inline-block" />
                Account
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="mr-2 h-4 w-4 sm:hidden md:inline-block" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="appearance">
                <Palette className="mr-2 h-4 w-4 sm:hidden md:inline-block" />
                Appearance
              </TabsTrigger>
            </TabsList>

            <TabsContent value="account" className="space-y-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Change Password
                  </CardTitle>
                  <CardDescription>
                    Update your account password.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min 6 chars)"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirmNewPassword">
                        Confirm New Password
                      </Label>
                      <Input
                        id="confirmNewPassword"
                        type="password"
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Confirm new password"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="bg-primary hover:bg-primary/90"
                      disabled={isPasswordSubmitting}
                    >
                      {isPasswordSubmitting ? "Changing..." : "Change Password"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Delete Account
                  </CardTitle>
                  <CardDescription>
                    Permanently delete your account and all associated data.
                    This action is irreversible.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={isDeleteSubmitting}>Delete My Account</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete your account and remove your data from our
                          servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleteSubmitting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          className="bg-destructive hover:bg-destructive/90"
                          disabled={isDeleteSubmitting}
                        >
                          {isDeleteSubmitting ? "Deleting..." : "Continue"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Notification Preferences (Mock)
                  </CardTitle>
                  <CardDescription>
                    Choose how you receive notifications. These are UI
                    placeholders. Backend not implemented for these.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <Label htmlFor="notif-proposals" className="font-medium">
                        New Posts in Rooms
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Get notified when a new post is created in rooms
                        you're in.
                      </p>
                    </div>
                    <Switch
                      id="notif-proposals"
                      checked={notifications.newProposals}
                      onCheckedChange={(checked) =>
                        setNotifications((prev) => ({
                          ...prev,
                          newProposals: checked,
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <Label htmlFor="notif-comments" className="font-medium">
                        New Comments on Your Posts/Replies
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Get notified about new comments on your content.
                      </p>
                    </div>
                    <Switch
                      id="notif-comments"
                      checked={notifications.newComments}
                      onCheckedChange={(checked) =>
                        setNotifications((prev) => ({
                          ...prev,
                          newComments: checked,
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-md">
                    <div>
                      <Label htmlFor="notif-mentions" className="font-medium">
                        Mentions (Mock)
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Get notified when someone mentions you.
                      </p>
                    </div>
                    <Switch
                      id="notif-mentions"
                      checked={notifications.mentions}
                      onCheckedChange={(checked) =>
                        setNotifications((prev) => ({
                          ...prev,
                          mentions: checked,
                        }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Theme (Mock)</CardTitle>
                  <CardDescription>
                    Choose your preferred theme. This is a UI placeholder.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    defaultValue={theme}
                    onValueChange={setTheme}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2 p-2 border rounded-md">
                      <RadioGroupItem value="light" id="theme-light" />
                      <Label htmlFor="theme-light">Light</Label>
                    </div>
                    <div className="flex items-center space-x-2 p-2 border rounded-md">
                      <RadioGroupItem value="dark" id="theme-dark" />
                      <Label htmlFor="theme-dark">Dark</Label>
                    </div>
                    <div className="flex items-center space-x-2 p-2 border rounded-md">
                      <RadioGroupItem value="system" id="theme-system" />
                      <Label htmlFor="theme-system">System Default</Label>
                    </div>
                  </RadioGroup>
                  <Button
                    className="mt-4"
                    onClick={() =>
                      toast({ title: "Theme preference saved (mock)." })
                    }
                  >
                    Save Theme
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
