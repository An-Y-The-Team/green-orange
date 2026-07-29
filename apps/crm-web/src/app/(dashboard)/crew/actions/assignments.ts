"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { apiSend } from "@/utils/http/http";

import type { Assignment } from "../types";

// from_date required; to_date null/absent = open-ended. Double-booking is
// allowed — overlaps come back as a non-blocking warning, never a rejection.
const createSchema = z.object({
  crew_member_id: z.number().int().positive(),
  role_id: z.number().int().positive().optional(),
  from_date: z.string().min(1),
  to_date: z.string().optional(),
});
// PATCH — every field optional.
const updateSchema = createSchema.partial();

// The API refuses a member who is not `working` and an unknown crew_member_id /
// role_id (assertAssignmentRefs in crew.module.ts), in English, wrapped by
// apiSend in the raw HTTP line. This UI is Vietnamese-only, so map the known
// refusals. Only reachable in a race — the picker hides non-working members.
const BACKEND_MESSAGES: Record<string, string> = {
  'status "working"': "Nhân viên này đã nghỉ nên không thể phân công.",
  "crew_member_id does not exist": "Không tìm thấy nhân viên đã chọn.",
  "role_id does not exist": "Không tìm thấy vai trò đã chọn.",
};

function errorMessage(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message : "";
  const mapped = Object.entries(BACKEND_MESSAGES).find(([needle]) =>
    raw.includes(needle)
  );
  return mapped?.[1] ?? (raw || fallback);
}

export async function createAssignment(
  projectId: number,
  _prev: ServerActionState,
  input: z.infer<typeof createSchema>
): Promise<ServerActionState> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const data = await apiSend<Assignment>("/assignments", "POST", {
      project_id: projectId,
      ...parsed.data,
    });

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/crew");
    return { success: true, message: "Đã thêm phân công.", data };
  } catch (error) {
    return {
      success: false,
      message: errorMessage(error, "Không thể thêm phân công."),
    };
  }
}

export async function updateAssignment(
  id: number,
  projectId: number,
  _prev: ServerActionState,
  input: z.infer<typeof updateSchema>
): Promise<ServerActionState> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const data = await apiSend<Assignment>(
      `/assignments/${id}`,
      "PATCH",
      parsed.data
    );

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/crew");
    return { success: true, message: "Đã cập nhật phân công.", data };
  } catch (error) {
    return {
      success: false,
      message: errorMessage(error, "Không thể cập nhật phân công."),
    };
  }
}

export async function deleteAssignment(
  id: number,
  projectId: number,
  _prev: ServerActionState
): Promise<ServerActionState> {
  try {
    await apiSend<unknown>(`/assignments/${id}`, "DELETE");
    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/crew");
    return { success: true, message: "Đã xóa phân công.", data: { id } };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể xóa phân công.",
    };
  }
}
