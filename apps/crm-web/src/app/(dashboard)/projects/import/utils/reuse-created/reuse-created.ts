import type {
  ImportResult,
  MatchedRef,
  ParsedWorkbook,
  WorkbookMatch,
} from "../../types";
import { sameKey } from "../match-workbook/match-workbook";
import { normalizePhone } from "../parse-quote-workbook/parse-quote-workbook";

/** What one successful import created or reused, keyed as the next file will look for it. */
export interface CreatedRefs {
  clientKey: string;
  client: MatchedRef;
  addressKey: string;
  location: MatchedRef;
  contactKey: string | null;
  contact: MatchedRef | null;
}

/** MST when the file has one — it is the legal identity — else the name. */
export const clientKey = (
  client: Pick<ParsedWorkbook["client"], "name" | "tax_code">
) =>
  client?.tax_code ? `mst:${client.tax_code}` : `name:${sameKey(client?.name)}`;

const contactKey = (contact: NonNullable<ParsedWorkbook["contact"]>) =>
  contact?.phone
    ? `tel:${normalizePhone(contact.phone) ?? contact.phone}`
    : `name:${sameKey(contact?.name)}`;

/**
 * Matching ran once, when the files were picked. Within one run, a file for a
 * client / site / contact that an EARLIER file just created must point at that
 * row, not create its twin — three báo giá for one new customer are one
 * client, not three.
 */
export function reuseCreated({
  match,
  workbook,
  created,
}: {
  match: WorkbookMatch;
  workbook: ParsedWorkbook;
  created: CreatedRefs[];
}): WorkbookMatch {
  const client =
    match?.client ??
    created.find((c) => c.clientKey === clientKey(workbook.client))?.client ??
    null;
  if (!client) return match;
  const same = created.filter((c) => c.client.id === client.id);
  const address = sameKey(workbook?.project?.site_address);
  const location =
    match?.location ??
    same.find((c) => c.addressKey === address)?.location ??
    null;
  const key = workbook?.contact ? contactKey(workbook.contact) : null;
  const contact =
    match?.contact ??
    (key ? (same.find((c) => c.contactKey === key)?.contact ?? null) : null);
  return { ...match, client, location, contact };
}

/** The refs a successful import leaves for the files after it. */
export function createdRefs({
  match,
  workbook,
  project,
}: {
  match: WorkbookMatch;
  workbook: ParsedWorkbook;
  project: Extract<ImportResult, { ok: true }>["project"];
}): CreatedRefs {
  const contact = workbook?.contact;
  return {
    clientKey: clientKey(workbook.client),
    client: {
      id: project.client_id,
      name: match?.client?.name ?? workbook.client.name,
    },
    addressKey: sameKey(workbook?.project?.site_address),
    location: {
      id: project.location_id,
      name: match?.location?.name ?? workbook.project.name,
    },
    // The file's named contact became the job's working contact.
    contactKey: contact ? contactKey(contact) : null,
    contact:
      contact && project.working_contact_id
        ? {
            id: project.working_contact_id,
            name: match?.contact?.name ?? contact.name,
          }
        : null,
  };
}
