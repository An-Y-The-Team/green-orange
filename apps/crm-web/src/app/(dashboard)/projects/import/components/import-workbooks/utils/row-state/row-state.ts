import { ImportRowState } from "../../../../enums";
import type { ImportRow } from "../../types";

/** Where a dropped file stands — the card's badge and whether it imports. */
export function rowState(row: ImportRow): ImportRowState {
  if (!row?.workbook) return ImportRowState.UNREADABLE;
  if (row?.result?.ok) return ImportRowState.IMPORTED;
  if (row?.matching) return ImportRowState.CHECKING;
  if (row.workbook.errors?.length || row?.matchError || !row?.match)
    return ImportRowState.BLOCKED;
  if (row?.result && !row.result.ok) return ImportRowState.FAILED;
  if (!row?.typeIds?.length) return ImportRowState.NEEDS_PICK;
  return ImportRowState.READY;
}

/** A refused file may be retried as is — the server said why. */
export const isImportable = (row: ImportRow) =>
  [ImportRowState.READY, ImportRowState.FAILED].includes(rowState(row)) &&
  row.typeIds.length > 0;
