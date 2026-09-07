import { notFound } from "next/navigation";

import { Badge } from "@yan/ui/components/badge";

import { BackLink } from "@/components/back-link/back-link";
import {
  BACK_TO,
  QUOTE_STATUSES,
  QUOTE_SUPERSEDED_LABEL,
} from "@/constants/labels";
import { labelOf } from "@/utils/label-of/label-of";

import { getQuote, isSuperseded } from "../../queries";
import { QuoteDocument } from "../quote-document/quote-document";

// The customer-facing sheet, nothing else — editing lives on /quotes/[id].
export default async function QuotePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await getQuote(Number(id));

  if (!quote) {
    notFound();
  }

  const superseded = await isSuperseded(quote);
  const badge = superseded
    ? QUOTE_SUPERSEDED_LABEL
    : labelOf(QUOTE_STATUSES, quote.status);

  return (
    <>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <BackLink href={`/quotes/${quote.id}`} className="mb-0">
          {BACK_TO.quote}
        </BackLink>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>

      <QuoteDocument quote={quote} superseded={superseded} />
    </>
  );
}
