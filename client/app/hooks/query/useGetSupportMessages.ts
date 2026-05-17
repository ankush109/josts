import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_SUPPORT_MY, EP_SUPPORT_ALL } from "@/lib/endpoints";

export interface SupportMessage {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  message: string;
  reply: string | null;
  repliedBy: string | null;
  repliedAt: string | null;
  seenByAdmin: boolean;
  seenAt: string | null;
  status: "open" | "replied";
  createdAt: string;
  updatedAt: string;
}

export const SUPPORT_MY_KEY = ["support", "my"] as const;
export const SUPPORT_ALL_KEY = ["support", "all"] as const;

export function useGetMySupport() {
  return useQuery({
    queryKey: SUPPORT_MY_KEY,
    queryFn: async () => {
      const res = await authClient.get(EP_SUPPORT_MY());
      return res.data.messages as SupportMessage[];
    },
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}

export function useGetAllSupport() {
  return useQuery({
    queryKey: SUPPORT_ALL_KEY,
    queryFn: async () => {
      const res = await authClient.get(EP_SUPPORT_ALL());
      return res.data.messages as SupportMessage[];
    },
    refetchOnWindowFocus: true,
    staleTime: 20_000,
  });
}
