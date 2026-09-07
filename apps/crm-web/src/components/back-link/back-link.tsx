import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@yan/ui/lib/utils";

/**
 * "Quay lại …" out of a detail, print or create page.
 *
 * This markup was copy-pasted into **23 pages**, byte-identical apart from the
 * href and the label — and two of them had drifted into hardcoded strings, so
 * "back to the clients list" was worded three different ways. Upward navigation
 * is the app's only way out of a detail page, so it is worth exactly one
 * implementation.
 *
 * Lives here rather than in `@yan/ui` because it is a `next/link`, and that
 * package deliberately has no Next dependency.
 *
 * Labels come from `BACK_TO` in `constants/labels.ts` — pass one, don't inline
 * a string.
 */
export function BackLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground",
        className
      )}
    >
      <ArrowLeft className="size-4" />
      {children}
    </Link>
  );
}
