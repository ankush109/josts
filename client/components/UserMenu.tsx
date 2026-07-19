"use client";

/**
 * @fileoverview User avatar dropdown menu.
 *
 * Displays the current user's initials in an avatar button. On click,
 * opens a dropdown with a user card, links, and a log-out action.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { User, LogOut, FileText, HelpCircle, ChevronDown, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/app/provider/AuthProvider";
import { cn } from "@/lib/utils";

function getInitials(name?: string | null): string {
  if (!name) return "U";
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();

  function handleLogout() {
    setOpen(false);
    queryClient.clear();
    logout();
    router.push("/login");
  }

  const initials = getInitials(user?.name);
  const roleLabel = user?.role ? user.role[0].toUpperCase() + user.role.slice(1) : "Member";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "flex items-center gap-1.5 h-9 pl-1 pr-2 rounded-full",
            "hover:bg-accent/60 data-[state=open]:bg-accent/60 transition-colors",
          )}
          aria-label="Open user menu"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-[11px] font-semibold ring-2 ring-background shadow-sm">
            {initials}
          </span>
          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className={cn(
          "w-72 p-0 overflow-hidden",
          "bg-card/95 backdrop-blur-xl border-border/60",
          "shadow-2xl shadow-black/40",
        )}
      >
        {/* Header: user card */}
        <div className="relative px-4 pt-4 pb-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center text-sm font-semibold shadow-md shadow-primary/20">
                {initials}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 ring-2 ring-card" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">
                {user?.name ?? "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email ?? "—"}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 text-primary px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ring-primary/20">
              <Shield className="h-2.5 w-2.5" />
              {roleLabel}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/12 text-green-500 px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ring-green-500/20">
              <span className="h-1 w-1 rounded-full bg-green-500" />
              Active
            </span>
          </div>
        </div>

        {/* Nav */}
        <div className="p-1.5">
          <MenuLink href="/profile"     icon={User}       onSelect={() => setOpen(false)}>Profile</MenuLink>
          <MenuLink href="/calibration" icon={FileText}   onSelect={() => setOpen(false)}>My reports</MenuLink>
          <MenuLink href="/help"        icon={HelpCircle} onSelect={() => setOpen(false)}>Help &amp; support</MenuLink>
        </div>

        {/* Footer: destructive action */}
        <div className="p-1.5 border-t border-border/50">
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              "group w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium",
              "text-destructive hover:bg-destructive/10 transition-colors",
            )}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-destructive/10 text-destructive group-hover:bg-destructive/15 transition-colors">
              <LogOut className="h-3.5 w-3.5" />
            </span>
            Log out
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MenuLink({
  href, icon: Icon, onSelect, children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onSelect}
      className={cn(
        "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium",
        "text-foreground/85 hover:text-foreground hover:bg-accent/60 transition-colors",
        "focus:outline-none focus:bg-accent/60",
      )}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
        <Icon className="h-3.5 w-3.5" />
      </span>
      {children}
    </Link>
  );
}

/** @deprecated Import `UserMenu` instead. */
export { UserMenu as DropdownMenuDemo };
