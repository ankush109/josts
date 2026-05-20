import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_DASHBOARD } from "@/lib/endpoints";

export interface DashboardStats {
  reports: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    byStatus: {
      draft: number;
      submitted: number;
      verified: number;
      rejected: number;
    };
  };
  equipment: {
    total: number;
    active: number;
    expiringSoon: {
      _id: string;
      equipmentName: string;
      serialNo?: string;
      nextDue: string;
      daysLeft: number;
    }[];
  };
  engineers: {
    userId: string;
    name: string;
    email: string;
    reportCount: number;
  }[];
  recentReports: {
    _id: string;
    customerName: string;
    status: string;
    createdAt: string;
    createdBy: { name: string };
  }[];
}

export const DASHBOARD_KEY = ["dashboard"] as const;

export function useGetDashboard() {
  return useQuery({
    queryKey: DASHBOARD_KEY,
    queryFn: async () => {
      const res = await authClient.get(EP_DASHBOARD());
      return res.data as DashboardStats;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}
