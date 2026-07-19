"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import {
  User, MapPin, Mail, PenLine, Save, Loader2, BadgeCheck,
  Sun, Moon, Monitor, Shield, ArrowLeft,
} from "lucide-react";
import { AUTH_API } from "@/app/hooks/client";
import { ENDPOINTS } from "@/app/hooks/endpoints";
import { useAuth } from "@/app/provider/AuthProvider";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import Link from "next/link";

function getInitials(name?: string | null): string {
  if (!name) return "U";
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

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
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const hasUnsavedChanges =
    formData.signatureName !== (user?.signatureName || "") ||
    formData.location !== (user?.location || "");

  const handleReset = () => {
    setFormData({
      name: user?.name || "",
      email: user?.email || "",
      location: user?.location || "",
      signatureName: user?.signatureName || "",
    });
    toast.info("Changes discarded");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <div className="pt-24 pb-10 border-b border-border/60 bg-gradient-to-b from-card/60 to-transparent">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to dashboard
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end gap-5">
            <div className="relative shrink-0">
              <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center text-3xl font-semibold shadow-lg shadow-primary/20">
                {getInitials(formData.name)}
              </div>
              <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-green-500 border-4 border-background flex items-center justify-center">
                <BadgeCheck className="h-3.5 w-3.5 text-white" />
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight truncate">
                {formData.name || "Your profile"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1 truncate">
                {formData.email || "—"}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ring-primary/20">
                  <Shield className="h-3 w-3" />
                  {user?.role ? user.role[0].toUpperCase() + user.role.slice(1) : "Member"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 text-green-500 px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ring-green-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32">
        <div className="grid gap-6 lg:grid-cols-3">

          {/* Left: personal info */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="overflow-hidden">
              <CardHeader className="pb-4 border-b border-border/60 bg-muted/20">
                <CardTitle className="text-base">Personal information</CardTitle>
                <CardDescription>Details visible on your calibration certificates.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-5">
                <FormField
                  id="name"
                  label="Full name"
                  icon={User}
                  value={formData.name}
                  disabled
                  hint="Set from your email address."
                />
                <FormField
                  id="email"
                  label="Email address"
                  icon={Mail}
                  type="email"
                  value={formData.email}
                  disabled
                  hint="Contact an administrator to change your email."
                />
                <FormField
                  id="signatureName"
                  label="Signature name"
                  icon={PenLine}
                  value={formData.signatureName}
                  onChange={(v) => handleInputChange("signatureName", v)}
                  placeholder="Name to appear on certificates"
                  hint="This is printed on every PDF you sign off on."
                />
                <FormField
                  id="location"
                  label="Location"
                  icon={MapPin}
                  value={formData.location}
                  onChange={(v) => handleInputChange("location", v)}
                  placeholder="e.g. Kolkata, India"
                />
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="pb-4 border-b border-border/60 bg-muted/20">
                <CardTitle className="text-base">Appearance</CardTitle>
                <CardDescription>Choose how the app looks on this device.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { value: "light",  label: "Light",  icon: Sun },
                    { value: "dark",   label: "Dark",   icon: Moon },
                    { value: "system", label: "System", icon: Monitor },
                  ] as const).map(({ value, label, icon: Icon }) => {
                    const active = theme === value;
                    return (
                      <button
                        key={value}
                        onClick={() => setTheme(value)}
                        className={cn(
                          "group flex flex-col items-center gap-2.5 rounded-xl p-4 transition-all",
                          "ring-1 ring-inset",
                          active
                            ? "ring-primary bg-primary/5 shadow-sm shadow-primary/10"
                            : "ring-border hover:ring-border/80 hover:bg-accent/40",
                        )}
                        aria-pressed={active}
                      >
                        <div className={cn(
                          "rounded-lg p-2 transition-colors",
                          active ? "bg-primary/15 text-primary" : "bg-muted/60 text-muted-foreground group-hover:text-foreground",
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className={cn("text-sm font-medium", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")}>
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: account summary */}
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <CardHeader className="pb-4 border-b border-border/60 bg-muted/20">
                <CardTitle className="text-base">Account</CardTitle>
                <CardDescription>Read-only account snapshot.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-0">
                <InfoRow label="Status">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                    Active
                  </span>
                </InfoRow>
                <Separator />
                <InfoRow label="Role">
                  <span className="text-sm font-medium capitalize">{user?.role ?? "—"}</span>
                </InfoRow>
                <Separator />
                <InfoRow label="Signature">
                  <span className="text-sm font-medium">
                    {user?.signatureName || <span className="text-amber-500 text-xs">Not set</span>}
                  </span>
                </InfoRow>
                <Separator />
                <InfoRow label="Location">
                  <span className="text-sm font-medium">
                    {user?.location || <span className="text-muted-foreground/70 text-xs">—</span>}
                  </span>
                </InfoRow>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Sticky action bar */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40 transition-transform duration-200",
          hasUnsavedChanges ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="bg-card/95 backdrop-blur border-t border-border shadow-[0_-8px_24px_-8px_rgba(0,0,0,0.3)]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground hidden sm:block">You have unsaved changes.</p>
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="ghost" onClick={handleReset} disabled={isSaving}>
                Discard
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Save changes</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Local building blocks ─────────────────────────────────────────── */

function FormField({
  id, label, icon: Icon, value, onChange, disabled, placeholder, hint, type,
}: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange?: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
  hint?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="flex items-center gap-2 text-sm font-medium">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className={cn("max-w-md", disabled && "bg-muted/40 cursor-not-allowed")}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
