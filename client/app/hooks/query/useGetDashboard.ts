import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_DASHBOARD } from "@/lib/endpoints";

export interface TrendPoint {
  day:       string;
  draft:     number;
  submitted: number;
  verified:  number;
  rejected:  number;
  total:     number;
}

export interface TopCustomer {
  customerName: string;
  reportCount:  number;
  lastReportAt: string;
}

export interface TopViewedReport {
  _id:          string;
  customerName: string;
  status:       string;
  viewCount:    number;
  lastViewedAt: string | null;
  createdBy:    { name: string };
}

export interface AuditFeedEntry {
  _id:        string;
  action:     "created" | "updated" | "status_changed" | "deleted";
  changes:    { field: string; from: string; to: string }[];
  createdAt:  string;
  performedBy: { name: string; email: string } | null;
  reportId:    { _id: string; customerName: string; status: string } | null;
}

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
    expiringBuckets: { critical: number; soon: number; upcoming: number };
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
    viewCount: number;
  }[];
  trend:         TrendPoint[];
  topCustomers:  TopCustomer[];
  topViewed:     TopViewedReport[];
  auditFeed:     AuditFeedEntry[];
  avgVerifyDays: { value: number; sampleSize: number } | null;
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
