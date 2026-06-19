"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { contracts } from "@/data/mock/contracts";
import { API_URL, apiSend, nextId, seq } from "@/lib/http";

import { type ContractFormValues, contractSchema } from "../schema";
import type { Contract } from "../types";

export async function addContract(
  _prevState: ServerActionState,
  input: ContractFormValues
): Promise<ServerActionState> {
  const parsed = contractSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const id = nextId(contracts);
    const contract: Contract = API_URL
      ? await apiSend<Contract>("/contracts", "POST", parsed.data)
      : { ...parsed.data, id, code: `HD-2026-${seq(id)}` };
    revalidatePath("/contracts");
    return {
      success: true,
      message: `Đã tạo hợp đồng "${contract.code}".`,
      data: contract,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể lưu hợp đồng.",
    };
  }
}
