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
      
        {/* Light mode logo — hidden in dark mode */}
        <Image
          src="/jasper_light.png"
          alt="Jasper"
          width={300}
          height={100}
          className={cn("w-auto dark:hidden", SIZE_MAP[size])}
        />
        {/* Dark mode logo — hidden in light mode */}
        <Image
          src="/jasper_dark.png"
          alt="Jasper"
         width={300}
          height={100}
          className={cn("w-auto hidden dark:block", SIZE_MAP[size])}
        />
      </span>
   
    </span>
  );
}
