"use client";

import { useCompany } from "@/components/company-provider/company-provider";
import { LexicalDocument } from "@/components/editor/lexical-document/lexical-document";
import { ensureLexicalBody } from "@/utils/lexical-build/lexical-build";
import { buildQuoteContext } from "@/utils/merge-template/merge-template";

import type { Quote } from "../../../types";

/**
 * The "Điều khoản & ghi chú" block on the printable — the quote's rich-text
 * note, with its merge chips resolved against the quote and the live company
 * profile. A client component only because the profile comes from the same
 * provider DocumentShell reads for the letterhead.
 *
 * `ensureLexicalBody` covers the notes written before the field was rich text:
 * plain text becomes one paragraph per line, so their line breaks still print.
 */
export function QuoteTerms({ quote }: { quote: Quote }) {
  const company = useCompany();

  return (
    <div className="mt-5 text-xs text-zinc-600">
      <p className="font-medium">Điều khoản & ghi chú:</p>
      <LexicalDocument
        body={ensureLexicalBody(quote.note)}
        ctx={buildQuoteContext({ quote, company })}
        className="mt-1 space-y-1 text-xs leading-relaxed text-zinc-600"
      />
    </div>
  );
}
