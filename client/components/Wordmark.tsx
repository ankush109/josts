import Image from "next/image";
import { cn } from "@/lib/utils";

interface WordmarkProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showDot?: boolean;
  caption?: string;
  className?: string;
}

const SIZE_MAP: Record<NonNullable<WordmarkProps["size"]>, string> = {
  xs: "h-4",
  sm: "h-5",
  md: "h-6",
  lg: "h-8",
  xl: "h-12",
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
        {/* Light mode logo — hidden in dark mode */}
        <Image
          src="/jasper_dark.png"
          alt="Jasper"
          width={200}
          height={60}
          className={cn("w-auto dark:hidden jasper-logo-dark", SIZE_MAP[size])}
        />
        {/* Dark mode logo — hidden in light mode */}
        <Image
          src="/jasper_light.png"
          alt="Jasper"
          width={200}
          height={60}
          className={cn("w-auto hidden dark:block jasper-logo-light", SIZE_MAP[size])}
        />
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
