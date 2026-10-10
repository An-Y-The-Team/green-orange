import { ImportField } from "../../enums";
import type { ParsedWorkbook, WorkbookMatch } from "../../types";

/** Where each askable field lives on the parsed workbook. */
const VALUE: Record<ImportField, (workbook: ParsedWorkbook) => string> = {
  [ImportField.PROJECT_NAME]: (w) => w?.project?.name ?? "",
  [ImportField.SITE_ADDRESS]: (w) => w?.project?.site_address ?? "",
  [ImportField.CLIENT_NAME]: (w) => w?.client?.name ?? "",
};

/**
 * The fields this row needs AT ALL. A matched client or site is used as it
 * stands, so the workbook's own name for it never matters.
 */
const needed = (match?: WorkbookMatch): ImportField[] => [
  // Names the công trình AND, when the site is new, that site.
  ImportField.PROJECT_NAME,
  ...(match?.location ? [] : [ImportField.SITE_ADDRESS]),
  ...(match?.client ? [] : [ImportField.CLIENT_NAME]),
];

/** Needed but still blank — what stops the file from importing. */
export function missingFields({
  workbook,
  match,
}: {
  workbook: ParsedWorkbook | null;
  match?: WorkbookMatch;
}): ImportField[] {
  if (!workbook) return [];
  return needed(match).filter((field) => !VALUE[field](workbook)?.trim());
}

/**
 * The inputs the card shows: what the FILE left blank and this row still
 * needs. Asked from the workbook as parsed, never from the live value — the
 * box must not vanish under the operator on the first keystroke.
 */
export function fieldsToAsk({
  blankFields,
  match,
}: {
  blankFields: ImportField[];
  match?: WorkbookMatch;
}): ImportField[] {
  return needed(match).filter((field) => blankFields?.includes(field));
}

/** The one field the operator typed, written onto the workbook. */
export function withField({
  workbook,
  field,
  value,
}: {
  workbook: ParsedWorkbook;
  field: ImportField;
  value: string;
}): ParsedWorkbook {
  switch (field) {
    case ImportField.PROJECT_NAME:
      return { ...workbook, project: { ...workbook.project, name: value } };
    case ImportField.SITE_ADDRESS:
      return {
        ...workbook,
        project: { ...workbook.project, site_address: value },
      };
    case ImportField.CLIENT_NAME:
      return { ...workbook, client: { ...workbook.client, name: value } };
  }
}
