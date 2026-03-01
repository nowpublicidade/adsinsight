import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-border bg-[hsl(var(--surface))] text-card-foreground shadow-card",
        "transition-all duration-300",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

const CardHover = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-border bg-[hsl(var(--surface))] text-card-foreground shadow-card",
        "transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover hover:border-[hsl(var(--border)/1.5)]",
        className,
      )}
      {...props}
    />
  ),
);
CardHover.displayName = "CardHover";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-xl font-semibold leading-none tracking-tight text-foreground", className)}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground leading-relaxed", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  ),
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

// Card com gradiente sutil (para métricas/KPIs)
const CardMetric = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-border text-card-foreground shadow-card",
        "bg-gradient-to-br from-[hsl(248_30%_11%)] to-[hsl(var(--surface))]",
        "transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover",
        className,
      )}
      {...props}
    />
  ),
);
CardMetric.displayName = "CardMetric";

// Card com borda glow ao hover
const CardGlow = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { glowColor?: "primary" | "periwinkle" | "meta" | "google" }
>(({ className, glowColor = "primary", ...props }, ref) => {
  const glowMap = {
    primary: "hover:shadow-glow-primary hover:border-primary/40",
    periwinkle: "hover:shadow-glow-periwinkle hover:border-[hsl(var(--periwinkle)/0.4)]",
    meta: "hover:shadow-glow-meta hover:border-[hsl(var(--meta)/0.4)]",
    google: "hover:shadow-glow-google hover:border-[hsl(var(--google)/0.4)]",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-border bg-[hsl(var(--surface))] text-card-foreground shadow-card",
        "transition-all duration-300 hover:-translate-y-1",
        glowMap[glowColor],
        className,
      )}
      {...props}
    />
  );
});
CardGlow.displayName = "CardGlow";

export {
  Card,
  CardHover,
  CardMetric,
  CardGlow,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
