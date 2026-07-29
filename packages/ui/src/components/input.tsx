import { Input as InputPrimitive } from "@base-ui/react/input";
import * as React from "react";

import { cn } from "../lib/utils";

function Input({
  className,
  type,
  onWheel,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      // ponytail: a focused number input swallows wheel events and silently
      // edits its own value while the user is only scrolling the page — on a
      // money field that's a wrong amount nobody typed. Blur instead, so the
      // page scrolls. Here rather than per-caller: nothing in the repo wants
      // wheel-stepping.
      onWheel={
        type === "number"
          ? (e) => {
              e.currentTarget.blur();
              onWheel?.(e);
            }
          : onWheel
      }
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  );
}

export { Input };
