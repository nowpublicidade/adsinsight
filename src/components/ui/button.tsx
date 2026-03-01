import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primário com glow de 3 camadas (estilo Superneon)
        default:
          "relative overflow-hidden bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-glow-primary hover:-translate-y-0.5 active:translate-y-0",
        // Com gradiente primário completo
        glow:
          "relative overflow-hidden text-white btn-primary-glow font-semibold",
        // Borda sutil com hover glow
        outline:
          "border border-border bg-transparent text-foreground hover:border-primary/50 hover:bg-[hsl(var(--surface))] hover:shadow-glow-periwinkle hover:text-foreground",
        // Secundário sólido
        secondary:
          "bg-[hsl(var(--surface-2))] text-foreground hover:bg-[hsl(var(--surface-2))/80] border border-border hover:border-primary/30",
        // Ghost
        ghost:
          "hover:bg-[hsl(var(--surface))] hover:text-foreground text-muted-foreground",
        // Destrutivo
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-[0_0_20px_hsl(0_84%_60%/0.35)]",
        // Link
        link:
          "text-primary underline-offset-4 hover:underline p-0 h-auto",
        // Meta branding
        meta:
          "bg-[hsl(var(--meta))] text-white hover:bg-[hsl(214_89%_45%)] hover:shadow-glow-meta",
        // Google branding
        google:
          "bg-[hsl(var(--google))] text-white hover:bg-[hsl(4_90%_52%)] hover:shadow-glow-google",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-lg px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-base font-semibold",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
