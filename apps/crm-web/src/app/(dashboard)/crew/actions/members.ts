"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { crew } from "@/data/mock/crew";
import { crewRoles } from "@/data/mock/crew-roles";
import { API_URL, apiSend, nextId } from "@/lib/http";

import { CrewMemberStatus, EmploymentType } from "../enums";
import type { CrewMember } from "../types";

// POST /crew — name required, everything else optional/defaulted by the API.
export const createCrewMemberSchema = z.object({
  name: z.string().min(1, "Vui lòng nhập họ tên."),
  phone: z.string().optional(),
  employment_type: z.nativeEnum(EmploymentType),
  default_role_id: z.number().int().positive().optional(),
  status: z.nativeEnum(CrewMemberStatus).optional(),
  note: z.string().optional(),
});

export type CreateCrewMemberFormValues = z.infer<typeof createCrewMemberSchema>;

// PATCH /crew/:id — every field optional; also drives the "Nghỉ việc"
// shortcut ({ status: "left" }).
export const updateCrewMemberSchema = createCrewMemberSchema.partial();
export type UpdateCrewMemberFormValues = z.infer<typeof updateCrewMemberSchema>;

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
    let member: CrewMember;
    if (API_URL) {
      member = await apiSend<CrewMember>("/crew", "POST", parsed.data);
    } else {
      const id = nextId(crew);
      member = {
        id,
        ...parsed.data,
        status: parsed.data.status ?? CrewMemberStatus.WORKING,
        created_at: new Date().toISOString(),
        default_role:
          crewRoles.find((r) => r.id === parsed.data.default_role_id) ?? null,
      };
    }

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
    let member: CrewMember | ({ id: number } & UpdateCrewMemberFormValues);
    if (API_URL) {
      member = await apiSend<CrewMember>(`/crew/${id}`, "PATCH", parsed.data);
    } else {
      member = { id, ...parsed.data };
    }

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
    if (API_URL) await apiSend(`/crew/${id}`, "DELETE");

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
