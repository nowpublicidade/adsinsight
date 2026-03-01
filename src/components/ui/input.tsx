import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base
          "flex h-10 w-full rounded-lg text-sm",
          // Background e borda — Superneon surface
          "bg-[hsl(var(--surface-2))] border border-border",
          // Texto e placeholder
          "text-foreground placeholder:text-muted-foreground",
          // Padding
          "px-3 py-2",
          // File input
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          // Focus — ring roxo
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/60",
          // Transition suave
          "transition-all duration-200",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Ring offset
          "ring-offset-background",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
