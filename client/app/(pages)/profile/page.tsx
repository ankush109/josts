"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import { User, MapPin, Mail, PenLine, Save, Loader2, BadgeCheck, Sun, Moon, Monitor } from "lucide-react";
import { AUTH_API } from "@/app/hooks/client";
import { ENDPOINTS } from "@/app/hooks/endpoints";
import { useAuth } from "@/app/provider/AuthProvider";
import { useTheme } from "next-themes";

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    location: "",
    signatureName: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        location: user.location || "",
        signatureName: user.signatureName || "",
      });
    }
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await AUTH_API.put(ENDPOINTS.UPDATE_PROFILE(), {
        signatureName: formData.signatureName.trim(),
        location: formData.location.trim(),
      });
      const updatedUser = { ...user, ...res.data.user };
      setUser(updatedUser);
      toast.success("Profile updated successfully!");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const initials =
    formData.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  const hasUnsavedChanges =
    formData.signatureName !== (user?.signatureName || "") ||
    formData.location !== (user?.location || "");

  return (
    <div className="min-h-screen bg-background pt-16 pb-12">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Profile Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid gap-5">
          {/* Personal info */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base">Personal Information</CardTitle>
                  <CardDescription>Update your personal details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="flex items-center gap-2 text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  Full Name
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  className="max-w-sm bg-muted/40"
                  disabled
                />
                <p className="text-xs text-muted-foreground">Full name is set from your email and cannot be changed here.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signatureName" className="flex items-center gap-2 text-sm">
                  <PenLine className="h-3.5 w-3.5 text-muted-foreground" />
                  Signature Name
                </Label>
                <Input
                  id="signatureName"
                  placeholder="Name to appear on calibration certificates"
                  value={formData.signatureName}
                  onChange={(e) => handleInputChange("signatureName", e.target.value)}
                  className="max-w-sm"
                />
                <p className="text-xs text-muted-foreground">
                  This name appears on all calibration reports and PDFs under your signature.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="flex items-center gap-2 text-sm">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  className="max-w-sm bg-muted/40"
                  disabled
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="location" className="flex items-center gap-2 text-sm">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  Location
                </Label>
                <Input
                  id="location"
                  placeholder="e.g., Kolkata, India"
                  value={formData.location}
                  onChange={(e) => handleInputChange("location", e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Appearance</CardTitle>
              <CardDescription>Choose how the app looks to you</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { value: "light", label: "Light", icon: Sun },
                  { value: "dark",  label: "Dark",  icon: Moon },
                  { value: "system", label: "System", icon: Monitor },
                ] as const).map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`flex flex-col items-center gap-2.5 rounded-xl border-2 p-4 transition-all ${
                      theme === value
                        ? "border-primary bg-primary/5"
                        : "border-border bg-muted/30 hover:bg-muted/60"
                    }`}
                  >
                    <div className={`rounded-lg p-2 ${theme === value ? "bg-primary/10" : "bg-background"}`}>
                      <Icon className={`h-5 w-5 ${theme === value ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <span className={`text-sm font-medium ${theme === value ? "text-primary" : "text-muted-foreground"}`}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Your preference is saved locally on this device.
              </p>
            </CardContent>
          </Card>

          {/* Account info */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Account Information</CardTitle>
              <CardDescription>View your account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="flex justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Account Status</span>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600">
                  <BadgeCheck className="h-3.5 w-3.5" /> Active
                </span>
              </div>
              <Separator />
              <div className="flex justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Role</span>
                <span className="text-sm font-medium capitalize">{user?.role ?? "—"}</span>
              </div>
              <Separator />
              <div className="flex justify-between py-2.5">
                <span className="text-sm text-muted-foreground">Signature Name</span>
                <span className="text-sm font-medium">{user?.signatureName || <span className="text-amber-500 text-xs">Not set</span>}</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setFormData({
                  name: user?.name || "",
                  email: user?.email || "",
                  location: user?.location || "",
                  signatureName: user?.signatureName || "",
                });
                toast.info("Changes discarded");
              }}
              disabled={!hasUnsavedChanges}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !hasUnsavedChanges}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
