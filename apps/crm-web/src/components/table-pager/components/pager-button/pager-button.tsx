import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@yan/ui/components/button";

/**
 * One pager step. Rendered as a plain disabled button rather than a dead link at
 * the ends of the range, so the control keeps its place instead of disappearing.
 */
export function PagerButton({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: ReactNode;
}) {
  return disabled ? (
    <Button size="sm" variant="outline" disabled>
      {children}
    </Button>
  ) : (
    <Button size="sm" variant="outline" render={<Link href={href} />}>
      {children}
    </Button>
  );
}
