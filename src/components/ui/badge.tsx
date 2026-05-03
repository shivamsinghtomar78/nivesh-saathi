import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors duration-200",
  {
    variants: {
      variant: {
        default: "border border-outline bg-surface-dark text-on-dark",
        soft: "border border-accent-warm/15 bg-accent-warm-soft text-text-strong",
        outline: "border border-outline bg-input-bg text-text-strong",
        accent: "border border-accent/20 bg-accent-soft text-accent",
        success: "border border-success/20 bg-success/10 text-success",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, className }))} {...props} />;
}
