import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/10",
  {
    variants: {
      variant: {
        primary: "bg-highlight text-surface-dark hover:brightness-105",
        secondary: "bg-surface-dark text-on-dark hover:bg-surface-dark-hover",
        outline:
          "border border-outline bg-input-bg text-text-strong hover:bg-white",
        soft: "bg-highlight-soft text-text-strong hover:bg-highlight/25",
        ghost: "text-text-muted hover:bg-outline hover:text-text-strong",
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
