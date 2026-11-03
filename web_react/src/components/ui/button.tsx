import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-[background-color,border-color,color,transform] duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-y-px disabled:cursor-not-allowed disabled:opacity-[0.55] disabled:active:translate-y-0 aria-[busy=true]:cursor-progress [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border border-signal bg-signal text-signal-ink hover:border-signal-hi hover:bg-signal-hi",
        destructive: "border border-bad bg-bad text-paper-3 hover:bg-bad/85",
        outline: "border border-rule-2 bg-transparent text-ink hover:bg-paper-3",
        secondary: "border border-rule-2 bg-paper-2 text-ink-2 hover:text-ink hover:bg-paper-3",
        ghost: "text-ink-2 hover:bg-paper-3 hover:text-ink",
        link: "h-auto px-0 text-ink underline decoration-rule-2 underline-offset-4 hover:text-signal hover:decoration-signal",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3",
        lg: "h-10 px-5",
        icon: "h-10 w-10",
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
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
