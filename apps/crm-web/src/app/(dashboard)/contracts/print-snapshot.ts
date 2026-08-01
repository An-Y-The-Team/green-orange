import { safeJSONParse } from "@yan/shared/utils";

import type { CompanyData } from "@/config/company";
import {
  DEFAULT_HEADER_BLOCKS,
  type HeaderBlocks,
} from "@/constants/header-blocks";
import { DOCUMENT_TEXT } from "@/constants/labels";

/**
 * Everything OUTSIDE a contract's own `body` that decides how it prints: who
 * Bên B is, the header template, the printed title and header style.
 *
 * These normally come from live sources (the editable company profile, the
 * chosen template), which means editing the company profile — a rename, a new
 * address, a new bank — would silently change what an already-signed contract
 * reprints. For a legal document that is wrong: the reprint must match the
 * paper that was signed. So the signing step freezes them here, and the print
 * page prefers the frozen copy whenever one exists.
 *
 * Drafts have no snapshot and keep rendering live, so edits are still visible
 * while authoring.
 */
export type PrintSnapshot = {
  company: CompanyData;
  header_blocks: HeaderBlocks;
  doc_title: string;
};

export const serializePrintSnapshot = (snapshot: PrintSnapshot): string =>
  JSON.stringify(snapshot);

/**
 * The frozen snapshot of a signed contract, or `undefined` when there is none
 * (a draft, or a contract signed before snapshots existed — those keep
 * rendering live, exactly as they did before).
 */
export function parsePrintSnapshot(
  raw: string | null | undefined
): PrintSnapshot | undefined {
  if (!raw) return undefined;
  const parsed = safeJSONParse<Partial<PrintSnapshot>>(raw);
  // A half-written snapshot must not silently drop the company block and print
  // built-in defaults — fall back to live values instead.
  if (!parsed?.company?.name || !parsed.company.letterhead_body)
    return undefined;
  return {
    company: parsed.company,
    header_blocks: parsed.header_blocks ?? DEFAULT_HEADER_BLOCKS,
    doc_title: parsed.doc_title ?? DOCUMENT_TEXT.contractHeading,
  };
}
