import { cn } from "@/lib/utils";

interface WordmarkProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** When true, shows the caption line under the wordmark. */
  showDot?: boolean;
  caption?: string;
  /** Extra className for the outer element. */
  className?: string;
  /** When true, only renders the mark (no wordmark text). */
  markOnly?: boolean;
}

const MARK_SIZE: Record<NonNullable<WordmarkProps["size"]>, string> = {
  xs: "h-5 w-5",
  sm: "h-6 w-6",
  md: "h-7 w-7",
  lg: "h-9 w-9",
  xl: "h-10 w-10",
};

const TEXT_SIZE: Record<NonNullable<WordmarkProps["size"]>, string> = {
  xs: "text-[13px]",
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-xl",
};

const CAPTION_SIZE: Record<NonNullable<WordmarkProps["size"]>, string> = {
  xs: "text-[8px]",
  sm: "text-[9px]",
  md: "text-[10px]",
  lg: "text-[10px]",
  xl: "text-[11px]",
};

/**
 * Jasper wordmark — inline SVG mark + typographic wordmark.
 */
export default function Wordmark({
  size = "md",
  caption,
  className,
  markOnly = false,
}: WordmarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <JasperMark className={MARK_SIZE[size]} />
      {!markOnly && (
        <span className="inline-flex flex-col leading-none gap-1">
          <span
            className={cn(
              "font-bold tracking-[-0.01em] text-foreground",
              TEXT_SIZE[size],
            )}
          >
            Jasper
          </span>
          {caption && (
            <span
              className={cn(
                "uppercase tracking-[0.18em] text-muted-foreground/80 font-medium",
                CAPTION_SIZE[size],
              )}
            >
              {caption}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

/**
 * The mark: a rounded-square with a gradient background and a serif J
 * with a small precision accent dot.
 */
function JasperMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="Jasper logo"
    >
      <defs>
        <linearGradient id="jasper-mark-bg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4F8DFC" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="jasper-mark-sheen" x1="0" y1="0" x2="0" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="white" stopOpacity="0.18" />
          <stop offset="0.5" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Base squircle */}
      <rect width="40" height="40" rx="10" fill="url(#jasper-mark-bg)" />
      {/* Subtle top sheen for depth */}
      <rect width="40" height="40" rx="10" fill="url(#jasper-mark-sheen)" />
      {/* Inner ring for a subtle depth cue */}
      <rect
        x="0.75"
        y="0.75"
        width="38.5"
        height="38.5"
        rx="9.25"
        fill="none"
        stroke="white"
        strokeOpacity="0.14"
        strokeWidth="1"
      />

      {/* Top serif */}
      <path
        d="M 15.5 12 L 28.5 12"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* J descender + hook */}
      <path
        d="M 24 12 L 24 25.5 Q 24 30.5 19 30.5 Q 14 30.5 14 25.5"
        stroke="white"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Precision accent dot */}
      <circle cx="30" cy="12" r="1.7" fill="white" fillOpacity="0.9" />
    </svg>
  );
}
