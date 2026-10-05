import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";

import { cn } from "../lib/utils";

// A badge is a label, never a control. Pill shape and tinted fills keep it
// visibly distinct from Button (rectangle, solid/bordered fill, shadow, pointer).
//
// Tones have ONE meaning each and none of them is green — green is the primary
// button, "bấm vào đây" (docs/features/crm-ui-redesign.md, "Buttons vs badges"):
//   default     purple  happening now   (Đang hoạt động, Đang làm)
//   secondary   grey    not started / inactive (Nháp, Chưa xong)
//   warning     amber   waiting on someone / leftover (Chờ duyệt, Đã nộp)
//   success     blue    done            (Đã duyệt, Đã ký, Đã thu)
//   destructive red     problem         (Quá hạn, Hủy)
//   outline     grey, no dot — a plain tag (a project type), not a status
// Status tones lead with a dot so a state never rests on colour alone; the
// words carry it, the dot says "this is a status, not a button".
const STATUS_DOT =
  "before:size-1.5 before:shrink-0 before:rounded-full before:bg-current before:content-['']";

const badgeVariants = cva(
  "inline-flex w-fit items-center justify-center gap-1.5 rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3 [&_svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default: `bg-now-soft text-now ${STATUS_DOT}`,
        secondary: `bg-muted text-muted-foreground ${STATUS_DOT}`,
        outline: "bg-muted text-muted-foreground",
        success: `bg-done-soft text-done ${STATUS_DOT}`,
        warning: `bg-waiting-soft text-waiting ${STATUS_DOT}`,
        destructive: `bg-problem-soft text-problem ${STATUS_DOT}`,
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
