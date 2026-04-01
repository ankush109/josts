"use client";

import Link from "next/link";
import { DropdownMenuDemo } from "./DropDown";
import jostLogo from '../public/logo.png';
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FileText, FilePlus, Layout, User, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const [userDetails, setUserDetails] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUserDetails(JSON.parse(storedUser));
      } catch {
        // ignore
      }
    }
  }, []);

  const navLinks = [
    { href: "/calibration", label: "Calibration Reports", icon: FileText },
    { href: "/drafts", label: "Drafts", icon: FilePlus },
    { href: "/templates", label: "Templates", icon: Layout },
  ];

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  return (
    <nav className="fixed top-0 left-0 w-full bg-white/95 backdrop-blur border-b border-zinc-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image
              alt="logo"
              width={200}
              height={80}
              src={jostLogo}
              className="h-9 w-auto"
            />
          </Link>

          <div className="flex items-center gap-4">

            {/* Nav links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all",
                      active
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* User chip */}
            {userDetails && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-zinc-50 rounded-lg border border-zinc-200">
                <div className="h-6 w-6 rounded-full bg-zinc-200 flex items-center justify-center shrink-0">
                  <User className="h-3.5 w-3.5 text-zinc-500" />
                </div>
                <span className="text-sm font-medium text-zinc-800 max-w-[120px] truncate">
                  {userDetails.name}
                </span>
              </div>
            )}

            <DropdownMenuDemo />
          </div>
        </div>
      </div>
    </nav>
  );
}