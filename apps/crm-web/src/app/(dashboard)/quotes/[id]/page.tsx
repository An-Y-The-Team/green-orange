import { notFound, redirect } from "next/navigation";

import { BACK_TO } from "@/constants/labels";

import { QuoteDetail } from "../components/quote-detail/quote-detail";
import { getQuote, isSuperseded } from "../queries";
import { quoteHref } from "../utils/quote-href/quote-href";

/**
 * A STANDALONE quote's page. A quote that belongs to a công trình lives inside
 * it (`/projects/{pid}/quotes/{id}`) and this address redirects there, so old
 * bookmarks and cross-project links still land in the job.
 */
export default async function QuotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = await getQuote(Number(id));

  if (!quote) {
    notFound();
  }
  if (quote.project_id) {
    redirect(quoteHref(quote));
  }

  return (
    <QuoteDetail
      quote={quote}
      superseded={await isSuperseded(quote)}
      backHref="/quotes"
      backLabel={BACK_TO.list}
    />
  );
}
