"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { updateProject } from "@/app/(dashboard)/projects/actions/update-project";
import { API_URL, apiSend } from "@/utils/http/http";
import { todayISO } from "@/utils/today-iso/today-iso";

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

  const signedDate = parsed.data.signed_date || todayISO();

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

    // The contract is signed from here on — revalidate before the chain so a
    // chained failure still shows it signed.
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/contracts/${id}`);

    // Chain the client confirmation onto the project when not already set.
    // updateProject RETURNS failure instead of throwing, so an unchecked chain
    // left the stage-4 checklist unticked under an "Đã ký hợp đồng" toast.
    if (!parsed.data.client_has_signed) {
      const chained = await updateProject(projectId, _prev, {
        client_signed_date: signedDate,
      });
      if (!chained.success) {
        return {
          success: false,
          message: `Đã ký hợp đồng nhưng chưa ghi được ngày khách ký lên công trình: ${chained.message ?? "Lỗi không xác định."} Vui lòng cập nhật ngày khách ký thủ công — không cần ký lại hợp đồng.`,
          data: contract,
        };
      }
    }

    return { success: true, message: "Đã ký hợp đồng.", data: contract };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể ký hợp đồng.",
    };
  }
}
