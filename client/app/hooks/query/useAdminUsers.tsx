"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import {
  EP_ADMIN_USERS,
  EP_ADMIN_USER_PASSWORD,
  EP_ADMIN_USER_ACTIVE,
} from "@/lib/endpoints";

export interface AdminUser {
  id:            string;
  name:          string;
  email:         string;
  role:          "user" | "admin";
  signatureName: string | null;
  location:      string | null;
  isActive:      boolean;
  createdAt:     string;
  deactivatedAt: string | null;
}

export const ADMIN_USERS_KEY = ["admin", "users"] as const;

export function useAdminUsers(search = "", status: "all" | "active" | "inactive" = "all") {
  return useQuery({
    queryKey: [...ADMIN_USERS_KEY, search, status],
    queryFn: async () => {
      const res = await authClient.get<{ users: AdminUser[] }>(EP_ADMIN_USERS(), {
        params: {
          search: search || undefined,
          status: status === "all" ? undefined : status,
        },
      });
      return res.data.users;
    },
    staleTime: 30_000,
  });
}

export function useAdminCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { name?: string; email: string; password: string; role?: "user" | "admin" }) => {
      const res = await authClient.post<{ user: AdminUser }>(EP_ADMIN_USERS(), args);
      return res.data.user;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ADMIN_USERS_KEY }); },
  });
}

export function useAdminResetPassword() {
  return useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      await authClient.put(EP_ADMIN_USER_PASSWORD(userId), { newPassword });
    },
  });
}

export function useAdminSetUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const res = await authClient.patch<{ user: AdminUser }>(
        EP_ADMIN_USER_ACTIVE(userId),
        { isActive },
      );
      return res.data.user;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ADMIN_USERS_KEY }); },
  });
}
