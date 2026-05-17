"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Sun, Moon, Monitor, Bell, Shield, Palette, LogOut } from "lucide-react";
import { useAuth } from "@/app/provider/AuthProvider";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const THEME_OPTIONS = [
  { value: "light",  label: "Light",  icon: Sun },
  { value: "dark",   label: "Dark",   icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [notifications, setNotifications] = useState({
    syncAlerts:  true,
    pdfReady:    true,
    statusChange: true,
  });

  function handleLogout() {
    queryClient.clear();
    logout();
    router.push("/login");
  }

  return (
    <div className="w-full min-h-screen pt-24">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-6">

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your preferences and account settings.</p>
        </div>

        {/* Appearance */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Appearance</CardTitle>
            </div>
            <CardDescription>Choose how Jasper looks on your device.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all",
                    theme === value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-border/80 hover:bg-accent",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Notifications</CardTitle>
            </div>
            <CardDescription>Control which in-app notifications you receive.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: "syncAlerts"   as const, label: "Sync alerts",    desc: "Notify when offline drafts finish syncing" },
              { key: "pdfReady"     as const, label: "PDF ready",      desc: "Notify when a certificate PDF is generated" },
              { key: "statusChange" as const, label: "Status changes", desc: "Notify when a report is verified or rejected" },
            ].map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Label className="text-sm font-medium">{label}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
                <Switch
                  checked={notifications[key]}
                  onCheckedChange={(v) => setNotifications((prev) => ({ ...prev, [key]: v }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Account */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Account</CardTitle>
            </div>
            <CardDescription>Manage your account details and session.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Signed in as</span>
              <span className="font-medium">{user?.email ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Role</span>
              <span className="capitalize font-medium">{user?.role ?? "—"}</span>
            </div>
            <Separator />
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={() => router.push("/profile")}>
                Edit profile
              </Button>
              <Button
                variant="destructive"
                className="flex-1 gap-2"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
