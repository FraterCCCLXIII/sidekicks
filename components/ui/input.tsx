import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-11 w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-white/20 focus:ring-2 focus:ring-white/10",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
