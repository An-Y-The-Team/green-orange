import { USER_ADMIN_GROUP } from "@/utils/authentik-admin/authentik-admin";

import type { AkGroup } from "./types";

/** A group change the CRM refuses to make; the message is user-facing. */
export class GroupChangeRefused extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GroupChangeRefused";
  }
}

/**
 * Turns "these boxes are ticked" into the add/remove calls to make, with the
 * two rules that keep this page from being a privilege-escalation surface:
 *
 * - Superuser groups (`authentik Admins`) are not manageable here at all: the
 *   picker never shows them and a payload naming one is refused, so nobody in
 *   `crm-admins` can mint an Authentik superuser from the CRM. A superuser
 *   membership the user already has is simply left alone.
 * - You cannot take yourself out of `crm-admins` — that would lock you out of
 *   this very page mid-request (and, with one admin, everyone).
 */
export function planGroupChanges({
  current,
  wanted,
  all,
  self,
}: {
  /** Group pks the user is in now. */
  current: string[];
  /** Group pks that should be ticked afterwards. */
  wanted: string[];
  all: AkGroup[];
  /** Is the user being edited the one signed in? */
  self: boolean;
}): { add: string[]; remove: string[] } {
  const manageable = new Map(
    all.filter((g) => !g.is_superuser).map((g) => [g.pk, g])
  );
  for (const pk of wanted) {
    if (!manageable.has(pk))
      throw new GroupChangeRefused("Không thể gán nhóm này từ CRM.");
  }
  const currentManageable = current.filter((pk) => manageable.has(pk));
  const add = wanted.filter((pk) => !currentManageable.includes(pk));
  const remove = currentManageable.filter((pk) => !wanted.includes(pk));
  if (
    self &&
    remove.some((pk) => manageable.get(pk)?.name === USER_ADMIN_GROUP)
  ) {
    throw new GroupChangeRefused(
      `Không thể tự rời nhóm ${USER_ADMIN_GROUP} — nhờ quản trị viên khác thực hiện.`
    );
  }
  return { add, remove };
}
