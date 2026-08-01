"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

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
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const role = await apiSend<CrewRole>("/crew-roles", "POST", parsed.data);

    revalidatePath("/crew");

    return {
      success: true,
      message: `Đã thêm vị trí "${role.name}".`,
      data: role,
    };
  } catch (error) {
    // Name is @unique — a duplicate surfaces here as a raw error.
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể thêm vị trí.",
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
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
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

    return { success: true, message: "Đã đổi tên vị trí.", data: role };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể đổi tên vị trí.",
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

    return { success: true, message: "Đã xóa vị trí.", data: { id } };
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
