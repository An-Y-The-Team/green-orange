import { Printer } from "lucide-react";
import Link from "next/link";

import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";

import {
  QuoteBuilderForm,
  type QuoteBuilderInitial,
} from "@/app/(dashboard)/projects/[id]/quotes/new/quote-builder-form/quote-builder-form";
import { BackLink } from "@/components/back-link/back-link";
import { PageHeader } from "@/components/page-header/page-header";
import { QUOTE_STATUSES, QUOTE_SUPERSEDED_LABEL } from "@/constants/labels";
import { labelOf } from "@/utils/label-of/label-of";

import { QuoteStatus } from "../../enums";
import { quoteFormSeed } from "../../queries";
import type { Quote } from "../../types";
import { quotePrintHref } from "../../utils/quote-href/quote-href";
import { ReviseQuoteButton } from "../revise-quote-button/revise-quote-button";

/**
 * A quote's own page — the line grid, editable in place. Rendered by both
 * addresses of a quote: `/projects/{pid}/quotes/{id}` for a project quote (so
 * the operator never leaves the job) and `/quotes/{id}` for a standalone one.
 * Sent/decided versions are frozen (the backend 409s on PATCH), so those render
 * the same grid read-only with "Sửa Báo giá này". The customer-facing sheet is
 * the print route.
 */
export function QuoteDetail({
  quote,
  superseded,
  backHref,
  backLabel,
}: {
  quote: Quote;
  superseded: boolean;
  backHref: string;
  backLabel: string;
}) {
  const frozen = quote.status !== QuoteStatus.DRAFT;
  const badge = superseded
    ? QUOTE_SUPERSEDED_LABEL
    : labelOf(QUOTE_STATUSES, quote.status);
  const label = quote.project
    ? quote.project.code
    : `BG-${String(quote.id).padStart(3, "0")}`;

  const initial: QuoteBuilderInitial = {
    projectId: quote.project_id ?? undefined,
    version: quote.version,
    editId: quote.id,
    project: quote.project,
    ...quoteFormSeed(quote),
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <BackLink href={backHref} className="mb-0">
          {backLabel}
        </BackLink>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>

      <PageHeader
        title="Báo giá"
        description={
          frozen
            ? `${label} · v${quote.version} · chỉ đọc — tạo phiên bản mới để sửa`
            : `${label} · v${quote.version}`
        }
        action={
          <div className="flex gap-2">
            {frozen && !superseded ? (
              <ReviseQuoteButton
                quoteId={quote.id}
                projectId={quote.project_id}
              />
            ) : null}
            <Button
              variant="outline"
              size="sm"
              render={<Link href={quotePrintHref(quote)} />}
            >
              <Printer />
              Bản in
            </Button>
          </div>
        }
      />

      <QuoteBuilderForm initial={initial} readOnly={frozen} />
    </>
  );
}
