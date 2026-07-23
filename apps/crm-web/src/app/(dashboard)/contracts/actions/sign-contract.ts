"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { updateProject } from "@/app/(dashboard)/projects/actions/update-project";
import { API_URL, apiSend } from "@/lib/http";

import type { Contract } from "../types";

const signContractSchema = z.object({
  signed_date: z.string().optional(),
  // Panel-supplied: is the project's client_signed_date still empty? Signing a
  // contract IS the client confirmation, so when empty we chain-stamp it.
  client_has_signed: z.boolean().optional(),
});
export type SignContractFormValues = z.infer<typeof signContractSchema>;

/**
 * Mark a contract Đã ký. The server stamps `signed_date` (today default) when
 * absent. CHAIN: if the project has no `client_signed_date` yet, mirror the
 * signing onto the project — both sides signing IS the client confirmation.
 */
export async function signContract(
  id: number,
  projectId: number,
  _prev: ServerActionState,
  input: SignContractFormValues
): Promise<ServerActionState> {
  const parsed = signContractSchema.safeParse(input ?? {});

  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const signedDate =
    parsed.data.signed_date || new Date().toISOString().slice(0, 10);

  try {
    let contract: Contract | { id: number; signed_date: string };
    if (API_URL) {
      contract = await apiSend<Contract>(`/contracts/${id}`, "PATCH", {
        status: "signed",
        signed_date: signedDate,
      });
    } else {
      contract = { id, signed_date: signedDate };
    }

    // Chain the client confirmation onto the project when not already set.
    if (!parsed.data.client_has_signed) {
      await updateProject(projectId, _prev, { client_signed_date: signedDate });
    }

    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/contracts/${id}`);

    return { success: true, message: "Đã ký hợp đồng.", data: contract };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể ký hợp đồng.",
    };
  }
}
