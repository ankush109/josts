"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import {
  EP_TEMPLATES,
  EP_TEMPLATE_BY_KEY,
  EP_TEMPLATE_VERSION,
  EP_TEMPLATE_CREATE_VERSION,
  EP_TEMPLATE_ACTIVATE,
  EP_TEMPLATE_SAMPLE_DATA,
} from "@/lib/endpoints";

export interface TemplateVersionMeta {
  _id:           string;
  versionNumber: number;
  note:          string;
  createdAt:     string;
  createdBy:     { _id: string; name: string; email: string } | null;
}

export interface TemplateVersionFull extends TemplateVersionMeta {
  body:          string;
  templateKey:   string;
}

export interface AdminTemplate {
  _id:             string;
  key:             string;
  name:            string;
  description:     string;
  activeVersionId: string | null;
  versions:        TemplateVersionMeta[];
  updatedAt:       string;
}

export const TEMPLATES_KEY = ["admin", "templates"] as const;

export function useAdminTemplates() {
  return useQuery({
    queryKey: TEMPLATES_KEY,
    queryFn: async () => {
      const res = await authClient.get<{ success: boolean; data: AdminTemplate[] }>(EP_TEMPLATES());
      return res.data.data;
    },
    staleTime: 30_000,
  });
}

export function useAdminTemplate(key: string | undefined) {
  return useQuery({
    queryKey: [...TEMPLATES_KEY, key],
    queryFn: async () => {
      const res = await authClient.get<{ success: boolean; data: AdminTemplate }>(EP_TEMPLATE_BY_KEY(key!));
      return res.data.data;
    },
    enabled: !!key,
    staleTime: 30_000,
  });
}

export function useAdminTemplateVersion(key: string | undefined, versionId: string | undefined) {
  return useQuery({
    queryKey: [...TEMPLATES_KEY, key, "version", versionId],
    queryFn: async () => {
      const res = await authClient.get<{ success: boolean; data: TemplateVersionFull }>(
        EP_TEMPLATE_VERSION(key!, versionId!),
      );
      return res.data.data;
    },
    enabled: !!key && !!versionId,
    staleTime: Infinity,
  });
}

export function useCreateTemplateVersion(key: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { body: string; note?: string; activate?: boolean }) => {
      const res = await authClient.post<{ success: boolean; data: TemplateVersionFull }>(
        EP_TEMPLATE_CREATE_VERSION(key),
        args,
      );
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TEMPLATES_KEY });
    },
  });
}

export function useActivateTemplateVersion(key: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (versionId: string) => {
      const res = await authClient.post<{ success: boolean; data: AdminTemplate }>(
        EP_TEMPLATE_ACTIVATE(key),
        { versionId },
      );
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TEMPLATES_KEY });
    },
  });
}

export async function fetchTemplateSampleData(reportId: string): Promise<Record<string, unknown>> {
  const res = await authClient.get<{ success: boolean; data: Record<string, unknown> }>(
    EP_TEMPLATE_SAMPLE_DATA(reportId),
  );
  return res.data.data;
}
