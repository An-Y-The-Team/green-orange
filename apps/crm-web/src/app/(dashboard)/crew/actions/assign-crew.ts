"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { API_URL, apiSend } from "@/lib/http";

import { type AssignmentFormValues, assignmentSchema } from "../schema";

// Set the crew staffed onto a công trình — replaces the project's current
// assignment set with the chosen crew ids. Live mode → PUT /assignments (the
// backend reconciles add/remove). Mock mode → no store, so the change isn't
// persisted across reloads; the flow stays demoable without a backend.
export async function assignCrew(
  _prevState: ServerActionState,
  input: AssignmentFormValues
): Promise<ServerActionState> {
  const parsed = assignmentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Không thể phân công. Vui lòng thử lại.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    if (API_URL) {
      await apiSend("/assignments", "POST", parsed.data);
    }

    revalidatePath("/crew");
    revalidatePath("/projects");

    return {
      success: true,
      message: "Đã cập nhật đội thi công.",
      data: parsed.data,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể phân công nhân sự.",
    };
  }
}
