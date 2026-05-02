import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold shadow-none transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-200 ease-out hover:-translate-y-px active:translate-y-0 active:scale-[0.99] disabled:pointer-events-none disabled:translate-y-0 disabled:scale-100 disabled:opacity-45 focus-visible:outline-none",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-on-accent shadow-[0_18px_42px_rgba(91,224,189,0.18)] hover:bg-accent-hover hover:shadow-[0_20px_48px_rgba(91,224,189,0.24)]",
        secondary:
          "bg-surface-dark text-on-dark shadow-[var(--shadow-soft-layer)] hover:bg-surface-dark-hover",
        outline:
          "border border-outline bg-input-bg text-text-strong hover:border-accent/35 hover:bg-panel-strong hover:shadow-[var(--shadow-soft-layer)]",
        soft:
          "border border-accent/15 bg-accent-soft text-accent hover:border-accent/25 hover:bg-accent/15",
        ghost:
          "text-text-muted hover:bg-inner-panel hover:text-text-strong",
      },
      size: {
        sm: "min-h-9 px-3 text-xs",
        md: "min-h-11 px-4 text-sm",
        lg: "min-h-12 px-5 text-sm",
        icon: "h-11 w-11 rounded-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
);

Button.displayName = "Button";

export { Button, buttonVariants };
