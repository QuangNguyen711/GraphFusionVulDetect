import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-sm border px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-cool/40 bg-cool-soft text-cool",
        secondary: "border-rule bg-paper-3 text-ink-2",
        destructive: "border-bad/40 bg-bad-soft text-bad",
        outline: "border-rule-2 text-ink-2",
        ok: "border-ok/40 bg-ok-soft text-ok",
        signal: "border-signal/40 bg-signal-soft text-signal",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
