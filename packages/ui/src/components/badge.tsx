import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";

import { cn } from "../lib/utils";

// A badge is a label, never a control. Pill shape and tinted fills keep it
// visibly distinct from Button (rectangle, solid/bordered fill, shadow, pointer).
const badgeVariants = cva(
  "inline-flex w-fit items-center justify-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3 [&_svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-foreground/10 text-foreground",
        secondary: "border-transparent bg-muted text-muted-foreground",
        outline: "border-border text-muted-foreground",
        success:
          "border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        warning:
          "border-transparent bg-amber-500/10 text-amber-700 dark:text-amber-400",
        destructive: "border-transparent bg-destructive/10 text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
