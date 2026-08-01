"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import {
  ACTION_MESSAGES,
  INVALID_INPUT_MESSAGE,
  NOUNS,
} from "@/constants/server-action";
import { apiSend } from "@/utils/http/http";

import type { CrewRole } from "../types";

const roleSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên vị trí."),
});
export type RoleFormValues = z.infer<typeof roleSchema>;

export async function createRole(
  _prev: ServerActionState,
  input: RoleFormValues
): Promise<ServerActionState> {
  const parsed = roleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: INVALID_INPUT_MESSAGE,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const role = await apiSend<CrewRole>("/crew-roles", "POST", parsed.data);

    revalidatePath("/crew");

    return {
      success: true,
      message: ACTION_MESSAGES.added(`${NOUNS.role} "${role.name}"`),
      data: role,
    };
  } catch (error) {
    // Name is @unique — a duplicate surfaces here as a raw error.
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : ACTION_MESSAGES.addFailed(NOUNS.role),
    };
  }
}

export async function renameRole(
  id: number,
  _prev: ServerActionState,
  input: RoleFormValues
): Promise<ServerActionState> {
  const parsed = roleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: INVALID_INPUT_MESSAGE,
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const role = await apiSend<CrewRole>(
      `/crew-roles/${id}`,
      "PATCH",
      parsed.data
    );

    revalidatePath("/crew");

    return {
      success: true,
      message: `Đã đổi tên ${NOUNS.role}.`,
      data: role,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : `Không thể đổi tên ${NOUNS.role}.`,
    };
  }
}

export async function deleteRole(
  id: number,
  _prev: ServerActionState
): Promise<ServerActionState> {
  try {
    await apiSend(`/crew-roles/${id}`, "DELETE");

    revalidatePath("/crew");

    return {
      success: true,
      message: ACTION_MESSAGES.deleted(NOUNS.role),
      data: { id },
    };
  } catch (error) {
    // 409 when the role is in use by members or assignments.
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Vị trí đang được sử dụng, không thể xóa.",
    };
  }
}
