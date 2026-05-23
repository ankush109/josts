"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/app/provider/AuthProvider";
import UserManagement from "./UserManagement";

export default function UsersPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/calibration");
  }, [user, router]);

  if (!user || user.role !== "admin") return null;

  return (
    <div className="w-full min-h-screen pt-24 flex flex-col items-center bg-background">
      <Navbar />
      <div className="w-full mt-10 max-w-7xl px-4 sm:px-6 lg:px-8 mb-10">
        <UserManagement />
      </div>
    </div>
  );
}
