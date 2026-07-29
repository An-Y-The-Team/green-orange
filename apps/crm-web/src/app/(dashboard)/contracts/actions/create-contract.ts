"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { apiSend } from "@/utils/http/http";

import { type CreateContractFormValues, createContractSchema } from "../schema";
import type { Contract } from "../types";

/**
 * Create a contract from a project (stage-4 panel). Status starts `draft`; the
 * code auto-mints server-side. The template body must already be flattened into
 * `body` by the caller — the server does NOT copy the template.
 */
export async function createContract(
  _prev: ServerActionState,
  input: CreateContractFormValues
): Promise<ServerActionState> {
  const parsed = createContractSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const contract = await apiSend<Contract>("/contracts", "POST", parsed.data);

    if (parsed.data.project_id)
      revalidatePath(`/projects/${parsed.data.project_id}`);
    revalidatePath("/contracts");

    return { success: true, message: "Đã tạo hợp đồng.", data: contract };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể tạo hợp đồng.",
    };
  }
}
