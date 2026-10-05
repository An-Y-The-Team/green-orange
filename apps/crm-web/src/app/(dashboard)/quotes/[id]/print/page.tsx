import { notFound, redirect } from "next/navigation";

import { QuotePrintSheet } from "../../components/quote-print-sheet/quote-print-sheet";
import { getQuote, isSuperseded } from "../../queries";
import { quotePrintHref } from "../../utils/quote-href/quote-href";

// A STANDALONE quote's print sheet. A project quote's sheet lives inside the
// công trình (`/projects/{pid}/quotes/{id}/print`); this address redirects there.
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
  if (quote.project_id) {
    redirect(quotePrintHref(quote));
  }

  return (
    <QuotePrintSheet quote={quote} superseded={await isSuperseded(quote)} />
  );
}
