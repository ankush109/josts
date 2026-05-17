/**
 * @fileoverview Animated brand wordmark for "Jasper" — the calibration portal.
 *
 * Renders the app name with a subtle blue→violet gradient, a tiny pulsing
 * accent dot, and a serif italic styling so it reads as a product name
 * distinct from the surrounding UI copy.
 */

import { cn } from "@/lib/utils";

interface WordmarkProps {
  /** Visual size preset. */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Show the pulsing accent dot to the left. */
  showDot?: boolean;
  /** Optional caption rendered below the wordmark (e.g. "Calibration Suite"). */
  caption?: string;
  /** Extra classes for the root span. */
  className?: string;
}

const SIZE_MAP: Record<NonNullable<WordmarkProps["size"]>, string> = {
  xs: "text-sm",
  sm: "text-base",
  md: "text-xl",
  lg: "text-3xl",
  xl: "text-5xl",
};

const CAPTION_SIZE_MAP: Record<NonNullable<WordmarkProps["size"]>, string> = {
  xs: "text-[9px]",
  sm: "text-[10px]",
  md: "text-[11px]",
  lg: "text-xs",
  xl: "text-sm",
};

export default function Wordmark({
  size = "md",
  showDot = false,
  caption,
  className,
}: WordmarkProps) {
  return (
    <span className={cn("inline-flex flex-col leading-none", className)}>
      <span className="inline-flex items-center gap-1.5">
        {showDot && (
          <span className="relative inline-flex h-2 w-2 shrink-0">
            <span className="absolute inset-0 rounded-full bg-blue-400 opacity-60 animate-ping" />
            <span className="relative h-2 w-2 rounded-full bg-gradient-to-br from-blue-500 to-violet-500" />
          </span>
        )}
        <span
          className={cn(
            "font-extrabold tracking-tight italic bg-clip-text text-transparent select-none",
            "bg-gradient-to-br from-blue-600 via-indigo-500 to-violet-600",
            "dark:from-blue-400 dark:via-indigo-300 dark:to-violet-400",
            SIZE_MAP[size],
          )}
          style={{ fontFamily: '"Times New Roman", Times, serif' }}
        >
          Jasper
        </span>
      </span>
      {caption && (
        <span
          className={cn(
            "mt-0.5 font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500",
            CAPTION_SIZE_MAP[size],
          )}
        >
          {caption}
        </span>
      )}
    </span>
  );
}
