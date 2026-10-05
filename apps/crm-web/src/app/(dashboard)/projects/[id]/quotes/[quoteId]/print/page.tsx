import { notFound } from "next/navigation";

import { QuotePrintSheet } from "@/app/(dashboard)/quotes/components/quote-print-sheet/quote-print-sheet";
import { getQuote, isSuperseded } from "@/app/(dashboard)/quotes/queries";

// A project quote's customer-facing sheet, inside its công trình.
export default async function ProjectQuotePrintPage({
  params,
}: {
  // Next 16 route params are async.
  params: Promise<{ id: string; quoteId: string }>;
}) {
  const { id, quoteId } = await params;
  const quote = await getQuote(Number(quoteId));

  if (!quote || quote.project_id !== Number(id)) {
    notFound();
  }

  return (
    <QuotePrintSheet quote={quote} superseded={await isSuperseded(quote)} />
  );
}
