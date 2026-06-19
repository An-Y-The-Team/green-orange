"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { contracts } from "@/data/mock/contracts";
import { API_URL, apiSend } from "@/lib/http";
import type { Contract } from "@/types";

import { type ContractBodyFormValues, contractBodySchema } from "../schema";

/**
 * Update a contract's rich body (Lexical JSON). PATCHes the row when a backend
 * is configured; in mock mode the change isn't persisted across reloads, so the
 * flow is demoable without a backend. The body is stored as an opaque string —
 * no server-side parsing.
 */
export async function updateContract(
  id: number,
  _prevState: ServerActionState,
  input: ContractBodyFormValues
): Promise<ServerActionState> {
  const parsed = contractBodySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại nội dung.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    let contract: Contract | undefined;
    if (API_URL) {
      contract = await apiSend<Contract>(`/contracts/${id}`, "PATCH", {
        body: parsed.data.body,
      });
    } else {
      contract = contracts.find((c) => c.id === id);
    }

    revalidatePath(`/contracts/${id}`);
    revalidatePath(`/contracts/${id}/edit`);

    return {
      success: true,
      message: "Đã lưu nội dung hợp đồng.",
      data: contract,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể lưu nội dung.",
    };
  }
}
