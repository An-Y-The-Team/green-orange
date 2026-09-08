"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { INVALID_INPUT_MESSAGE } from "@/constants/server-action";
import {
  akFetch,
  requireUserAdmin,
  sessionUsername,
  userActionError,
} from "@/utils/authentik-admin/authentik-admin";

import { GroupChangeRefused, planGroupChanges } from "../group-changes";
import { getUser, listGroups } from "../queries";

const groupsSchema = z.object({ groups: z.array(z.string().uuid()) });

/** Set a user's (non-superuser) group memberships to exactly `groups`. */
export async function setUserGroups(
  pk: number,
  _prev: ServerActionState,
  input: { groups: string[] }
): Promise<ServerActionState> {
  const parsed = groupsSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, message: INVALID_INPUT_MESSAGE };

  try {
    await requireUserAdmin();
    const [user, all, me] = await Promise.all([
      getUser(pk),
      listGroups(),
      sessionUsername(),
    ]);
    if (!user) return { success: false, message: "Người dùng không tồn tại." };

    const { add, remove } = planGroupChanges({
      current: user.groups_obj.map((g) => g.pk),
      wanted: parsed.data.groups,
      all,
      self: user.username === me,
    });
    // Sequential on purpose: a handful of calls, and a half-applied change
    // is easier to reason about when the failing call is the last one made.
    for (const groupPk of add) {
      await akFetch(`/core/groups/${groupPk}/add_user/`, {
        method: "POST",
        body: JSON.stringify({ pk }),
      });
    }
    for (const groupPk of remove) {
      await akFetch(`/core/groups/${groupPk}/remove_user/`, {
        method: "POST",
        body: JSON.stringify({ pk }),
      });
    }
    revalidatePath("/settings/users");
    revalidatePath(`/settings/users/${pk}`);
    return { success: true, message: "Đã cập nhật nhóm." };
  } catch (error) {
    if (error instanceof GroupChangeRefused)
      return { success: false, message: error.message };
    return {
      success: false,
      message: userActionError(error, "Không thể cập nhật nhóm."),
    };
  }
}
