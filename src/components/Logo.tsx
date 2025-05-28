import { Vote } from "lucide-react";
import type { LucideProps } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  iconOnly?: boolean;
}

export function Logo({ size = "md", className, iconOnly = false }: LogoProps) {
  let textSizeClass = "text-2xl";
  let iconSizeClass = "h-6 w-6";

  if (size === "sm") {
    textSizeClass = "text-xl";
    iconSizeClass = "h-5 w-5";
  } else if (size === "lg") {
    textSizeClass = "text-3xl";
    iconSizeClass = "h-7 w-7";
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Vote className={`${iconSizeClass} text-primary`} />
      {!iconOnly && (
        <span
          className={`font-bold ${textSizeClass} text-foreground whitespace-nowrap`}
        >
          BVS
        </span>
      )}
    </div>
  );
}
