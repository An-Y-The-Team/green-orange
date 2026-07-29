"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { apiSend } from "@/utils/http/http";

import {
  type CreateCrewMemberFormValues,
  type UpdateCrewMemberFormValues,
  createCrewMemberSchema,
  updateCrewMemberSchema,
} from "../schema";
import type { CrewMember } from "../types";

export async function createCrewMember(
  _prev: ServerActionState,
  input: CreateCrewMemberFormValues
): Promise<ServerActionState> {
  const parsed = createCrewMemberSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const member = await apiSend<CrewMember>("/crew", "POST", parsed.data);

    revalidatePath("/crew");
    revalidatePath(`/crew/${member.id}`);

    return {
      success: true,
      message: `Đã lưu nhân sự "${member.name}".`,
      data: member,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể lưu nhân sự.",
    };
  }
}

export async function updateCrewMember(
  id: number,
  _prev: ServerActionState,
  input: UpdateCrewMemberFormValues
): Promise<ServerActionState> {
  const parsed = updateCrewMemberSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const member = await apiSend<CrewMember>(
      `/crew/${id}`,
      "PATCH",
      parsed.data
    );

    revalidatePath("/crew");
    revalidatePath(`/crew/${id}`);

    return { success: true, message: "Đã cập nhật nhân sự.", data: member };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể cập nhật nhân sự.",
    };
  }
}

export async function deleteCrewMember(
  id: number,
  _prev: ServerActionState
): Promise<ServerActionState> {
  try {
    await apiSend(`/crew/${id}`, "DELETE");

    revalidatePath("/crew");

    return { success: true, message: "Đã xóa nhân sự.", data: { id } };
  } catch (error) {
    // 409 when the member has assignments/timekeeping — the message tells the
    // user to set status "Nghỉ việc" instead.
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Không thể xóa nhân sự đã có phân công hoặc chấm công.",
    };
  }
}
