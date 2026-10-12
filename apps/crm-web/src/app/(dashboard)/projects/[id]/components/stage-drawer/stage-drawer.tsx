import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import { buttonVariants } from "@yan/ui/components/button";
import { cn } from "@yan/ui/lib/utils";

/**
 * The "In thư · Giấy tờ · Lịch sử" drawer under a stage card.
 *
 * A native `<details>`, on purpose: like `AttachmentList compact`, it stays
 * openable inside a closed project's `<fieldset disabled>`. Closed by default.
 * Section headings are `h3`, one level under StageCard's `h2` title.
 */
export function StageDrawer({
  label,
  sections,
}: {
  label: string;
  sections: { title: string; content: ReactNode }[];
}) {
  return (
    <details className="group">
      <summary
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "cursor-pointer list-none [&::-webkit-details-marker]:hidden"
        )}
      >
        {label}
        <ChevronDown className="transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-2 space-y-4">
        {sections.map((section) => (
          <section key={section.title} className="space-y-2">
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {section.title}
            </h3>
            {section.content}
          </section>
        ))}
      </div>
    </details>
  );
}
