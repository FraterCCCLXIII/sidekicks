import { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type BadgeProps = HTMLAttributes<HTMLDivElement> & {
  tone?: "default" | "info" | "success" | "warning" | "danger" | "muted";
};

const tones: Record<NonNullable<BadgeProps["tone"]>, string> = {
  default: "border-white/[0.14] bg-white/[0.08] text-foreground",
  info: "border-sky-400/20 bg-sky-400/12 text-sky-200",
  success: "border-emerald-400/20 bg-emerald-400/12 text-emerald-200",
  warning: "border-amber-400/20 bg-amber-400/12 text-amber-200",
  danger: "border-rose-400/20 bg-rose-400/12 text-rose-200",
  muted: "border-white/10 bg-white/[0.05] text-muted-foreground"
};

export function Badge({ className, tone = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
