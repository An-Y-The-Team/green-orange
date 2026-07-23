"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { crewRoles } from "@/data/mock/crew-roles";
import { API_URL, apiSend, nextId } from "@/lib/http";

import type { CrewRole } from "../types";

export const roleSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập tên vai trò."),
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
    const role = API_URL
      ? await apiSend<CrewRole>("/crew-roles", "POST", parsed.data)
      : { id: nextId(crewRoles), name: parsed.data.name };

    revalidatePath("/crew");

    return {
      success: true,
      message: `Đã thêm vai trò "${role.name}".`,
      data: role,
    };
  } catch (error) {
    // Name is @unique — a duplicate surfaces here as a raw error.
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể thêm vai trò.",
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
    const role = API_URL
      ? await apiSend<CrewRole>(`/crew-roles/${id}`, "PATCH", parsed.data)
      : { id, name: parsed.data.name };

    revalidatePath("/crew");

    return { success: true, message: "Đã đổi tên vai trò.", data: role };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể đổi tên vai trò.",
    };
  }
}

export async function deleteRole(
  id: number,
  _prev: ServerActionState
): Promise<ServerActionState> {
  try {
    if (API_URL) await apiSend(`/crew-roles/${id}`, "DELETE");

    revalidatePath("/crew");

    return { success: true, message: "Đã xóa vai trò.", data: { id } };
  } catch (error) {
    // 409 when the role is in use by members or assignments.
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Vai trò đang được sử dụng, không thể xóa.",
    };
  }
}
