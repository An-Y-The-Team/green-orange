"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { apiSend } from "@/utils/http/http";

import { type UpdateContractFormValues, updateContractSchema } from "../schema";
import type { Contract } from "../types";

/** Edit a draft contract's body/note/template (stage-4 authoring page). */
export async function updateContract(
  id: number,
  projectId: number,
  _prev: ServerActionState,
  input: UpdateContractFormValues
): Promise<ServerActionState> {
  const parsed = updateContractSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const contract = await apiSend<Contract>(
      `/contracts/${id}`,
      "PATCH",
      parsed.data
    );

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/contracts/${id}`);

    return { success: true, message: "Đã cập nhật hợp đồng.", data: contract };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể cập nhật hợp đồng.",
    };
  }
}
