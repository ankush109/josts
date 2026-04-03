"use client";

import Link from "next/link";
import { DropdownMenuDemo } from "./DropDown";
import jostLogo from '../public/logo.png';
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FileText, FilePlus, Layout } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/calibration", label: "Calibration Reports", icon: FileText },
  { href: "/drafts", label: "Drafts", icon: FilePlus },
  { href: "/templates", label: "Templates", icon: Layout },
];

export default function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + "/");

  return (
    <nav className="fixed top-0 left-0 w-full bg-card/95 backdrop-blur border-b border-border z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image
              alt="Josts Technologies"
              width={200}
              height={80}
              src={jostLogo}
              className="h-9 w-auto"
            />
          </Link>

          <div className="flex items-center gap-1">
            {/* Nav links */}
            <div className="hidden md:flex items-center gap-0.5 mr-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-2 rounded-md text-sm font-medium transition-all",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </div>

            <DropdownMenuDemo />
          </div>
        </div>
      </div>
    </nav>
  );
}
