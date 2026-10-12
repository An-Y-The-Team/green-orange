import { AcceptanceNoteTag } from "../../../../../../enums";
import type { ProjectNote } from "../../../../../../types";

const ACCEPTANCE_TAGS: ReadonlySet<string> = new Set(
  Object.values(AcceptanceNoteTag)
);

/** The acceptance events among a project's notes, newest first. */
export function acceptanceHistory({
  notes,
}: {
  notes: ProjectNote[] | null | undefined;
}): ProjectNote[] {
  return (notes ?? [])
    .filter((n) => n.tag && ACCEPTANCE_TAGS.has(n.tag))
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
}
