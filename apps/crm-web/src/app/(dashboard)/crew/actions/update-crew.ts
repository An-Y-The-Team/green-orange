"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { crew } from "@/data/mock/crew";
import { API_URL, apiSend } from "@/lib/http";
import type { CrewMember } from "@/types";

import { type CrewFormValues, crewSchema } from "../schema";

// Update a crew member. PATCHes the row when a backend is configured; in mock
// mode the change isn't persisted across reloads, so the flow is demoable
// without a backend. `id` is bound by the dialog (updateCrew.bind(null, id)).
export async function updateCrew(
  id: number,
  _prevState: ServerActionState,
  input: CrewFormValues
): Promise<ServerActionState> {
  const parsed = crewSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const member: CrewMember | undefined = API_URL
      ? await apiSend<CrewMember>(`/crew/${id}`, "PATCH", parsed.data)
      : crew.find((c) => c.id === id);

    revalidatePath("/crew");
    revalidatePath(`/crew/${id}`);

    return {
      success: true,
      message: `Đã cập nhật nhân sự "${parsed.data.name}".`,
      data: member,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể cập nhật nhân sự.",
    };
  }
}
