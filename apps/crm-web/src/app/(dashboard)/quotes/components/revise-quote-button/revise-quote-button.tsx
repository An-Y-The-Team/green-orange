"use client";

import { useRouter } from "next/navigation";

import { Button } from "@yan/ui/components/button";

import { useRun } from "@/hooks/use-run/use-run";

import { reviseQuote } from "../../actions/revise-quote";

/**
 * Bargaining — copies this quote into a new draft, then opens it in the builder.
 * Sent versions are frozen, so this is the only "edit" a non-draft quote gets;
 * lives here so both the stage panel and the printable page can offer it.
 */
export function ReviseQuoteButton({
  quoteId,
  disabled,
}: {
  quoteId: number;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, run] = useRun(
    reviseQuote.bind(null, quoteId),
    // The new version is a draft, so its page opens in the builder.
    (data) => data?.id && router.push(`/quotes/${data.id}`)
  );

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled || isPending}
      onClick={() => run()}
    >
      Tạo phiên bản mới
    </Button>
  );
}
