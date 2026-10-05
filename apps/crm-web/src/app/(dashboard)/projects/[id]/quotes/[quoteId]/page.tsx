import { notFound } from "next/navigation";

import { QuoteDetail } from "@/app/(dashboard)/quotes/components/quote-detail/quote-detail";
import { getQuote, isSuperseded } from "@/app/(dashboard)/quotes/queries";
import { BACK_TO } from "@/constants/labels";

import { ProjectStage } from "../../../enums";

// A project quote's page, inside its công trình so opening, printing and going
// back never leave the job. A quote from another project is a 404, not a
// silent cross-link.
export default async function ProjectQuotePage({
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
    <QuoteDetail
      quote={quote}
      superseded={await isSuperseded(quote)}
      backHref={`/projects/${id}?view=${ProjectStage.QUOTE}`}
      backLabel={BACK_TO.project}
    />
  );
}
