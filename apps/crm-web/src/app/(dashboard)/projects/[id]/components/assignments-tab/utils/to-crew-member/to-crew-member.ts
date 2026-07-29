import { isObject } from "@yan/shared/utils";

import { CrewMemberStatus, EmploymentType } from "@/app/(dashboard)/crew/enums";
import type { CrewMember } from "@/app/(dashboard)/crew/types";

/**
 * Rebuilds the created nhân sự from `ServerActionState.data`, which is
 * `unknown` — only the fields the phân công picker reads. A payload without a
 * numeric id and a name is rejected instead of putting a blank option in the
 * select.
 *
 * `employment_type`/`status` are what the quick-create form just sent (the
 * echoed payload is untyped, so they are not trusted from it), and `created_at`
 * is only read by the roster, not by the picker.
 */
export function toCrewMember(data: unknown, phone: string): CrewMember | null {
  if (!isObject(data)) return null;
  const { id, name } = data;
  if (typeof id !== "number" || typeof name !== "string") return null;
  return {
    id,
    name,
    phone: typeof data.phone === "string" ? data.phone : phone || null,
    employment_type: EmploymentType.PERMANENT,
    status: CrewMemberStatus.WORKING,
    created_at: typeof data.created_at === "string" ? data.created_at : "",
  };
}
