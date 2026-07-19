"use client";

import { useTheme } from "next-themes";
import { useEffect, useLayoutEffect, useState } from "react";

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export const MONO_FF =
  "'Geist Mono', ui-monospace, 'SF Mono', Menlo, monospace";
export const SANS_FF =
  "Geist, ui-sans-serif, system-ui, -apple-system, sans-serif";

export type ThemeTokens = {
  page: string;
  card: string;
  cardElev: string;
  ink: string;
  muted: string;
  faint: string;
  line: string;
  softLine: string;
  hover: string;
  accent: string;
  accentInk: string;
  accentSoft: string;
  accentSoftBorder: string;
  // status
  draftBg: string;   draftFg: string;   draftBorder: string;
  submitBg: string;  submitFg: string;  submitBorder: string;
  verifyBg: string;  verifyFg: string;  verifyBorder: string;
  rejectBg: string;  rejectFg: string;  rejectBorder: string;
  // alerts
  warnBg: string; warnFg: string; warnBorder: string;
  errorBg: string; errorFg: string; errorBorder: string;
};

const LIGHT: ThemeTokens = {
  page: "#f7f8fa",
  card: "#ffffff",
  cardElev: "#ffffff",
  ink: "#0b1424",
  muted: "#616b7a",
  faint: "#a2acbd",
  line: "#e6e8ec",
  softLine: "#eff1f4",
  hover: "#f2f4f8",
  accent: "#2f6fed",
  accentInk: "#ffffff",
  accentSoft: "#eaf1ff",
  accentSoftBorder: "#c7d7f5",
  draftBg: "#f1f3f6",   draftFg: "#4a5468",   draftBorder: "#dfe3ea",
  submitBg: "#eaf4fd",  submitFg: "#1e5aa8",  submitBorder: "#c5dcf5",
  verifyBg: "#e6f6ee",  verifyFg: "#1d7a44",  verifyBorder: "#bde4cd",
  rejectBg: "#fbeaea",  rejectFg: "#b52c2c",  rejectBorder: "#f3c6c6",
  warnBg: "#fdf5e6",  warnFg: "#8f5a09",  warnBorder: "#f0d59c",
  errorBg: "#fbeaea", errorFg: "#b52c2c", errorBorder: "#f3c6c6",
};

const DARK: ThemeTokens = {
  page: "#070d18",
  card: "#0f1a2e",
  cardElev: "#131f36",
  ink: "#eef2f8",
  muted: "#a9b5c8",
  faint: "#6b7689",
  line: "rgba(255,255,255,0.08)",
  softLine: "rgba(255,255,255,0.05)",
  hover: "rgba(255,255,255,0.04)",
  accent: "#4f8cff",
  accentInk: "#ffffff",
  accentSoft: "rgba(79,140,255,0.14)",
  accentSoftBorder: "rgba(79,140,255,0.35)",
  draftBg: "rgba(255,255,255,0.05)",  draftFg: "#c0c8d4",  draftBorder: "rgba(255,255,255,0.1)",
  submitBg: "rgba(96,165,250,0.12)",  submitFg: "#93c5fd",  submitBorder: "rgba(96,165,250,0.35)",
  verifyBg: "rgba(52,211,153,0.12)",  verifyFg: "#6ee7b7",  verifyBorder: "rgba(52,211,153,0.35)",
  rejectBg: "rgba(248,113,113,0.12)", rejectFg: "#fca5a5",  rejectBorder: "rgba(248,113,113,0.35)",
  warnBg: "rgba(251,191,36,0.1)",  warnFg: "#fcd34d",  warnBorder: "rgba(251,191,36,0.3)",
  errorBg: "rgba(248,113,113,0.1)", errorFg: "#fca5a5", errorBorder: "rgba(248,113,113,0.3)",
};

export function useThemeTokens(): {
  t: ThemeTokens;
  isDark: boolean;
  mounted: boolean;
} {
  const { resolvedTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  useIsoLayoutEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);
  useEffect(() => {
    if (resolvedTheme) setIsDark(resolvedTheme === "dark");
  }, [resolvedTheme]);
  return { t: isDark ? DARK : LIGHT, isDark, mounted };
}

export const AVATAR_COLORS = [
  "#7c3aed", "#2563eb", "#059669", "#d97706",
  "#e11d48", "#0891b2", "#4f46e5", "#0d9488",
];

export function avatarColor(name: string) {
  const idx = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}
