"use client";

import Link from "next/link";
import { DropdownMenuDemo } from "./DropDown";
import jostLogo from '../public/logo.png';
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FileText, FilePlus, Layout, User } from "lucide-react";

export default function Navbar() {
  const [userDetails, setUserDetails] = useState<any>(null);
  const pathname = usePathname();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUserDetails(parsedUser);
    }
  }, []);

  const navLinks = [
    { href: "/home", label: "Reports", icon: FileText },
    { href: "/drafts", label: "Drafts", icon: FilePlus },
    { href: "/templates", label: "Templates", icon: Layout },
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="fixed top-0 left-0 w-full bg-white border-b border-gray-200 shadow-sm z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          <Link href="/" className="flex-shrink-0 transition-transform hover:scale-105">
            <Image 
              alt="logo" 
              width={200} 
              height={80}  
              src={jostLogo} 
              className="h-10 w-auto"
            />
          </Link>

          <div className="flex items-center gap-6">
            
            <div className="hidden md:flex items-center gap-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.href);
                
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                      ${active 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {userDetails && (
              <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                <User className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-gray-600">Welcome,</span>
                <span className="text-sm font-semibold text-gray-900">
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