import type {
  Client,
  Contact,
  Location,
} from "@/app/(dashboard)/clients/types";

import type { Project, ProjectType } from "../../../types";
import type { ParsedWorkbook } from "../../types";
import {
  fold,
  normalizePhone,
} from "../parse-quote-workbook/parse-quote-workbook";

/**
 * Comparison key for names and addresses typed by hand: no diacritics, no
 * case, punctuation and runs of spaces collapsed — "72 Lê Thánh Tôn, Q.1" and
 * "72 le thanh ton q 1" match. Only EXACT keys match: a near miss is a new row
 * the operator can still point at an existing one, never a silent merge.
 */
export const sameKey = (value: string | null | undefined) =>
  fold(value ?? "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

const taxDigits = (value: string | null | undefined) =>
  (value ?? "").replace(/[^\d-]/g, "");

/**
 * The existing client this Bên A is, or null for a new one. MST first — it IS
 * the legal identity; a name only matches a client that has no other MST.
 */
export function pickClient({
  candidates,
  client,
}: {
  candidates: Client[];
  client: Pick<ParsedWorkbook["client"], "name" | "tax_code">;
}): Client | null {
  const name = sameKey(client?.name);
  if (client?.tax_code) {
    const byTax = candidates.filter(
      (c) => taxDigits(c?.tax_code) === client.tax_code
    );
    if (byTax.length === 1) return byTax[0] ?? null;
    if (byTax.length > 1)
      return byTax.find((c) => sameKey(c?.name) === name) ?? null;
  }
  const byName = candidates.filter(
    (c) =>
      sameKey(c?.name) === name &&
      (!c?.tax_code ||
        !client?.tax_code ||
        taxDigits(c.tax_code) === client.tax_code)
  );
  return byName.length === 1 ? (byName[0] ?? null) : null;
}

/** The client's site at this address, or null for a new one. */
export function pickLocation({
  locations,
  address,
}: {
  locations: Location[];
  address: string;
}): Location | null {
  const key = sameKey(address);
  return locations.find((l) => sameKey(l?.address) === key) ?? null;
}

/** The client's contact with this phone, else this exact name. */
export function pickContact({
  contacts,
  contact,
}: {
  contacts: Contact[];
  contact: Pick<NonNullable<ParsedWorkbook["contact"]>, "name" | "phone">;
}): Contact | null {
  const phone = contact?.phone
    ? (normalizePhone(contact.phone) ?? contact.phone)
    : null;
  const byPhone = phone
    ? contacts.find(
        (c) => c?.phone && (normalizePhone(c.phone) ?? c.phone) === phone
      )
    : undefined;
  return (
    byPhone ??
    contacts.find((c) => sameKey(c?.name) === sameKey(contact?.name)) ??
    null
  );
}

/** "Công việc" names → project type ids; the misses are the operator's pick. */
export function pickTypes({
  types,
  names,
}: {
  types: ProjectType[];
  names: string[];
}): { ids: number[]; unmatched: string[] } {
  const ids: number[] = [];
  const unmatched: string[] = [];
  for (const name of names) {
    const hit = types.find((t) => sameKey(t?.name) === sameKey(name));
    if (!hit) unmatched.push(name);
    else if (!ids.includes(hit.id)) ids.push(hit.id);
  }
  return { ids, unmatched };
}

/** Codes of this client's projects with the same name — a re-dropped file. */
export function duplicateCodes({
  projects,
  name,
}: {
  projects: Pick<Project, "code" | "name">[];
  name: string;
}): string[] {
  return projects
    .filter((p) => sameKey(p?.name) === sameKey(name))
    .map((p) => p.code);
}
