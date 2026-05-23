"use client";

/**
 * @fileoverview Application top navigation bar.
 *
 * Renders the Jasper wordmark, primary nav links, and the user dropdown.
 * Uses `usePathname` to highlight the active route.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, FileText, FilePlus, FlaskConical, Users, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "./UserMenu";
import OfflineBanner from "@/app/components/OfflineBanner";
import SyncIndicator from "@/app/components/SyncIndicator";
import Wordmark from "./Wordmark";
import { useAuth } from "@/app/provider/AuthProvider";

const NAV_LINKS = [
  { href: "/dashboard",   label: "Dashboard",           icon: LayoutDashboard, adminOnly: true },
  { href: "/calibration", label: "Calibration Reports", icon: FileText,        adminOnly: false },
  { href: "/equipments",  label: "Standard Equipments", icon: FilePlus,        adminOnly: false },
  { href: "/parameters",  label: "Parameter Config",    icon: FlaskConical,    adminOnly: true },
  { href: "/users",       label: "Users",               icon: Users,           adminOnly: true },
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const visibleLinks = NAV_LINKS.filter((l) => !l.adminOnly || isAdmin);

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
    <nav className="fixed top-0 left-0 w-full bg-card/95 backdrop-blur border-b border-border z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Jasper wordmark */}
          <Link href="/" className="flex-shrink-0 flex items-center group">
            <div className="hidden sm:block">
              <Wordmark size="xl" showDot caption="Calibration Suite" />
            </div>
            <div className="sm:hidden">
              <Wordmark size="md" showDot />
            </div>
          </Link>

          <div className="flex items-center gap-1">
            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-0.5 mr-2">
              {visibleLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-all",
                    isActivePath(pathname, href)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </div>

            <SyncIndicator />
            <UserMenu />

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
    {mobileOpen && (
      <div
        className="fixed inset-0 bg-black/40 z-40 md:hidden"
        onClick={() => setMobileOpen(false)}
      />
    )}
    <div
      className={cn(
        "fixed top-16 right-0 w-72 max-w-[85vw] bg-card border-l border-b border-border shadow-xl z-50 md:hidden transition-transform duration-200 ease-in-out",
        mobileOpen ? "translate-x-0" : "translate-x-full",
      )}
      role="dialog"
      aria-label="Mobile navigation"
    >
      <div className="flex flex-col py-2">
        {visibleLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
              isActivePath(pathname, href)
                ? "bg-primary/10 text-primary border-l-2 border-primary"
                : "text-foreground hover:bg-accent border-l-2 border-transparent",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </div>
    </div>
    </>
  );
}
