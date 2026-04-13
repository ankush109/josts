"use client";

/**
 * @fileoverview Application top navigation bar.
 *
 * Renders the Josts logo, primary nav links, and the user dropdown.
 * Uses `usePathname` to highlight the active route.
 */

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FileText, FilePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserMenu } from "./UserMenu";
import jostLogo from "../public/logo.png";

/** Primary navigation links rendered in the navbar. */
const NAV_LINKS = [
  { href: "/calibration", label: "Calibration Reports", icon: FileText },
  { href: "/drafts",      label: "Drafts",               icon: FilePlus  },
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

  return (
    <nav className="fixed top-0 left-0 w-full bg-card/95 backdrop-blur border-b border-border z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image
              src={jostLogo}
              alt="Josts Technologies"
              width={250}
              height={80}
              className="h-12 w-auto"
              priority
            />
          </Link>

          <div className="flex items-center gap-1">
            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-0.5 mr-2">
              {NAV_LINKS.map(({ href, label, icon: Icon }) => (
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

            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  );
}
