"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { crew } from "@/data/mock/crew";
import { API_URL, apiSend, nextId } from "@/lib/http";
import type { CrewMember } from "@/types";

import { type CrewFormValues, crewSchema } from "../schema";

// Server action for the "add crew member" form. Wired into the dialog via
// useActionState; the client reads the returned ServerActionState through the
// shared useServerAction hook (toast + onSuccess). The client passes the
// already-typed form values, and we re-validate here as defense.
export async function addCrew(
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
    // Live mode → POST /crew. Mock mode → no store, so synthesize the
    // server-side fields for the demo flow.
    const member: CrewMember = API_URL
      ? await apiSend<CrewMember>("/crew", "POST", parsed.data)
      : {
          ...parsed.data,
          id: nextId(crew),
          created_at: new Date().toISOString().slice(0, 10),
        };
    revalidatePath("/crew");
    return {
      success: true,
      message: `Đã thêm nhân sự "${member.name}".`,
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
