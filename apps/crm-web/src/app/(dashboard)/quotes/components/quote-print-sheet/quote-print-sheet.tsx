import { Badge } from "@yan/ui/components/badge";

import { BackLink } from "@/components/back-link/back-link";
import {
  BACK_TO,
  QUOTE_STATUSES,
  QUOTE_SUPERSEDED_LABEL,
} from "@/constants/labels";
import { labelOf } from "@/utils/label-of/label-of";

import { QuoteDocument } from "../../[id]/quote-document/quote-document";
import type { Quote } from "../../types";
import { quoteHref } from "../../utils/quote-href/quote-href";

// The customer-facing sheet, nothing else — editing lives on the quote's own
// page. Rendered by both print addresses of a quote.
export function QuotePrintSheet({
  quote,
  superseded,
}: {
  quote: Quote;
  superseded: boolean;
}) {
  const badge = superseded
    ? QUOTE_SUPERSEDED_LABEL
    : labelOf(QUOTE_STATUSES, quote.status);

  return (
    <>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <BackLink href={quoteHref(quote)} className="mb-0">
          {BACK_TO.quote}
        </BackLink>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>

      <QuoteDocument quote={quote} superseded={superseded} />
    </>
  );
}
