"use client";

/**
 * @fileoverview Application top navigation bar.
 *
 * Renders the Jasper wordmark, primary nav links, and the user dropdown.
 * Uses `usePathname` to highlight the active route.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard, FileText, FilePlus, FlaskConical, Calculator,
  Menu, X, ChevronRight, User, HelpCircle, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "./UserMenu";
import OfflineBanner from "@/app/components/OfflineBanner";
import SyncIndicator from "@/app/components/SyncIndicator";
import Wordmark from "./Wordmark";
import { useAuth } from "@/app/provider/AuthProvider";

const ACCOUNT_LINKS = [
  { href: "/profile", label: "Profile",        icon: User },
  { href: "/help",    label: "Help & Support", icon: HelpCircle },
] as const;

function getInitials(name?: string | null): string {
  if (!name) return "U";
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

const NAV_LINKS = [
  { href: "/dashboard",   label: "Dashboard",           icon: LayoutDashboard, adminOnly: true },
  { href: "/calibration", label: "Calibration Reports", icon: FileText,        adminOnly: false },
  { href: "/equipments",  label: "Standard Equipments", icon: FilePlus,        adminOnly: false },
  { href: "/parameters",  label: "Parameter Config",    icon: FlaskConical,    adminOnly: false },
  { href: "/formula-config", label: "Formula Config",   icon: Calculator,      adminOnly: false },
] as const;

/**
 * Returns true when `pathname` matches or starts with the given `path`.
 *
 * @param pathname - Current Next.js pathname
 * @param path     - Route prefix to test against
 */
function isActivePath(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

/**
 * Fixed top navigation bar with logo, route links, and user menu.
 */
export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";
  const visibleLinks = NAV_LINKS.filter((l) => !l.adminOnly || isAdmin);

  function handleMobileLogout() {
    setMobileOpen(false);
    queryClient.clear();
    logout();
    router.push("/login");
  }

  // Close the mobile menu on route change.
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [mobileOpen]);

  return (
    <>
    <OfflineBanner />
    <nav
      className={cn(
        "fixed top-0 left-0 w-full z-50",
        "bg-card/80 backdrop-blur-xl backdrop-saturate-150",
        "border-b border-border/60",
        "shadow-[0_1px_0_0_rgba(255,255,255,0.02)_inset,0_4px_16px_-4px_rgba(0,0,0,0.25)]",
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 gap-4">

          {/* Jasper wordmark */}
          <Link href="/" className="flex-shrink-0 flex items-center group">
            <div className="hidden sm:block">
              <Wordmark size="xl" showDot caption="Calibration Suite" />
            </div>
            <div className="sm:hidden">
              <Wordmark size="md" showDot />
            </div>
          </Link>

          {/* Desktop nav links — pushed to the right, tight cluster */}
          <div className="hidden md:flex items-center gap-1 ml-auto">
            {visibleLinks.map(({ href, label, icon: Icon }) => {
              const active = isActivePath(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex shrink-0 items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap",
                    active
                      ? "text-primary bg-primary/10 ring-1 ring-inset ring-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
                  )}
                >
                  <Icon className={cn("h-4 w-4 transition-colors shrink-0", active ? "text-primary" : "opacity-70 group-hover:opacity-100")} />
                  <span className="hidden lg:inline">{label}</span>
                  <span className="lg:hidden">{label.split(" ")[0]}</span>
                </Link>
              );
            })}
          </div>

          {/* Right cluster: sync + user (desktop) / hamburger (mobile) */}
          <div className="flex items-center gap-1 ml-auto md:ml-2">
            <SyncIndicator />
            <div className="hidden md:flex items-center pl-2 ml-1 border-l border-border/60">
              <UserMenu />
            </div>

            {/* Mobile menu toggle */}
            <button
              type="button"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden ml-1 p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </nav>

    {/* Mobile nav overlay + drawer */}
    <div
      onClick={() => setMobileOpen(false)}
      className={cn(
        "fixed inset-0 z-40 md:hidden transition-opacity duration-200",
        mobileOpen ? "bg-black/50 backdrop-blur-sm opacity-100" : "opacity-0 pointer-events-none",
      )}
      aria-hidden="true"
    />
    <aside
      className={cn(
        "fixed top-0 right-0 h-full w-[86vw] max-w-sm z-50 md:hidden",
        "bg-gradient-to-b from-card via-card to-background",
        "border-l border-border/60 shadow-2xl shadow-black/40",
        "transition-transform duration-300 ease-out",
        "flex flex-col",
        mobileOpen ? "translate-x-0" : "translate-x-full",
      )}
      role="dialog"
      aria-label="Mobile navigation"
      aria-modal="true"
    >
      {/* Drawer header */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-border/60 shrink-0">
        <Wordmark size="md" showDot />
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="p-2 -mr-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* User card */}
      <div className="px-5 pt-5">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/40 border border-border/40">
          <div className="h-11 w-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold shrink-0">
            {getInitials(user?.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">{user?.name ?? "User"}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email ?? (isAdmin ? "Administrator" : "Signed in")}
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-3 py-5">
        <p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground/70">
          NAVIGATE
        </p>
        <nav className="flex flex-col gap-1">
          {visibleLinks.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-all",
                  active
                    ? "bg-primary/12 text-primary shadow-sm shadow-primary/10"
                    : "text-foreground/85 hover:bg-accent hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg transition-colors shrink-0",
                    active
                      ? "bg-primary/20 text-primary"
                      : "bg-accent/60 text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="flex-1 truncate">{label}</span>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 shrink-0 transition-opacity",
                    active ? "opacity-100 text-primary" : "opacity-0 group-hover:opacity-40",
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="my-5 h-px bg-border/50" />

        <p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground/70">
          ACCOUNT
        </p>
        <nav className="flex flex-col gap-1">
          {ACCOUNT_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground/80 hover:bg-accent hover:text-foreground transition-colors"
            >
              <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              <span className="flex-1">{label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border/60 shrink-0">
        <button
          type="button"
          onClick={handleMobileLogout}
          className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive bg-destructive/10 hover:bg-destructive/15 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </aside>
    </>
  );
}
