import Link from "next/link";

import { Button } from "@yan/ui/components/button";

/**
 * Bargaining — opens the quote builder seeded from this quote (?copy=). Nothing
 * is persisted until that draft is saved; sent versions stay frozen. Lives here
 * so both the stage panel and the quote's own page can offer it.
 */
export function ReviseQuoteButton({
  quoteId,
  projectId,
  disabled,
}: {
  quoteId: number;
  projectId?: number | null;
  disabled?: boolean;
}) {
  const href = projectId
    ? `/projects/${projectId}/quotes/new?copy=${quoteId}`
    : `/quotes/new?copy=${quoteId}`;
  // A disabled control must not stay navigable, so it drops the link render.
  if (disabled) {
    return (
      <Button variant="outline" size="sm" disabled>
        Tạo phiên bản mới
      </Button>
    );
  }
  return (
    <Button variant="outline" size="sm" render={<Link href={href} />}>
      Tạo phiên bản mới
    </Button>
  );
}
