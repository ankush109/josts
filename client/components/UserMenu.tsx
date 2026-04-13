"use client";

/**
 * @fileoverview User avatar dropdown menu.
 *
 * Displays the current user's initials in an avatar button. On click,
 * opens a dropdown with links to profile, reports, settings, help,
 * and a log-out action.
 *
 * Reads user data from `AuthContext` (via `useAuth`) rather than
 * accessing localStorage directly.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { User, Settings, LogOut, FileText, HelpCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/app/provider/AuthProvider";

/**
 * Derives up-to-two uppercase initials from a full name string.
 *
 * @param name - Full name (e.g. "Ankush Das")
 * @returns Initials string (e.g. "AD"), or "U" when name is absent
 */
function getInitials(name?: string | null): string {
  if (!name) return "U";
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

/**
 * Avatar button that opens the user account dropdown menu.
 */
export function UserMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();

  /**
   * Clears the React Query cache, calls the auth logout function,
   * and redirects to the login page.
   */
  function handleLogout() {
    queryClient.clear();
    logout();
    router.push("/login");
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-1.5 px-2 py-1.5 h-auto hover:bg-accent"
          aria-label="Open user menu"
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
              {getInitials(user?.name)}
            </AvatarFallback>
          </Avatar>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-0.5">
            <p className="text-sm font-medium">{user?.name ?? "User"}</p>
            <p className="text-xs text-muted-foreground">{user?.email ?? ""}</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profile" className="flex items-center cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/calibration" className="flex items-center cursor-pointer">
              <FileText className="mr-2 h-4 w-4" />
              My Reports
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="flex items-center cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/help" className="flex items-center cursor-pointer">
              <HelpCircle className="mr-2 h-4 w-4" />
              Help &amp; Support
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleLogout}
          className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** @deprecated Import `UserMenu` instead. */
export { UserMenu as DropdownMenuDemo };
