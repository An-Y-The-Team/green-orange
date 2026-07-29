import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";

import {
  QuoteBuilderForm,
  type QuoteBuilderInitial,
} from "@/app/(dashboard)/projects/[id]/quotes/new/quote-builder-form/quote-builder-form";
import { PageHeader } from "@/components/page-header/page-header";
import { QUOTE_STATUSES, QUOTE_SUPERSEDED_LABEL } from "@/constants/labels";
import { labelOf } from "@/utils/label-of/label-of";

import { ReviseQuoteButton } from "../components/revise-quote-button/revise-quote-button";
import { QuoteStatus } from "../enums";
import { getQuote, isSuperseded } from "../queries";
import { QuoteDocument } from "./quote-document/quote-document";

/**
 * A quote's own page. A draft opens in the builder — this is where a báo giá is
 * edited, no need to go through the project's stage panel. Sent/decided versions
 * are frozen (the backend 409s on PATCH), so those show the sheet plus "Tạo
 * phiên bản mới". The customer-facing printable is /quotes/[id]/print.
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

  const superseded = await isSuperseded(quote);
  const badge = superseded
    ? QUOTE_SUPERSEDED_LABEL
    : labelOf(QUOTE_STATUSES, quote.status);
  const code = `BG-${String(quote.id).padStart(3, "0")}`;

  const printBtn = (
    <Button
      variant="outline"
      size="sm"
      render={<Link href={`/quotes/${quote.id}/print`} />}
    >
      <Printer />
      Bản in
    </Button>
  );

  const header = (
    <div className="mb-4 flex items-center justify-between">
      <Link
        href={quote.project_id ? `/projects/${quote.project_id}` : "/quotes"}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {quote.project_id ? "Quay lại công trình" : "Quay lại danh sách"}
      </Link>
      <Badge variant={badge.variant}>{badge.label}</Badge>
    </div>
  );

  // Frozen: the sheet is the view, and revising is the only way to change it.
  if (quote.status !== QuoteStatus.DRAFT) {
    return (
      <>
        {header}
        <QuoteDocument
          quote={quote}
          superseded={superseded}
          actions={superseded ? null : <ReviseQuoteButton quoteId={quote.id} />}
        />
      </>
    );
  }

  const initial: QuoteBuilderInitial = {
    projectId: quote.project_id ?? undefined,
    version: quote.version,
    editId: quote.id,
    items: quote.items.map((it) => ({
      description: it.description,
      unit: it.unit ?? undefined,
      quantity: it.quantity,
      unit_price: it.unit_price,
    })),
    vatPercent: Math.round(quote.vat_rate * 100),
    note: quote.note ?? "",
  };

  return (
    <>
      {header}

      <PageHeader
        title="Báo giá"
        description={
          quote.project
            ? `${quote.project.code} · v${quote.version}`
            : `${code} · v${quote.version}`
        }
        action={printBtn}
      />

      <QuoteBuilderForm initial={initial} />
    </>
  );
}
