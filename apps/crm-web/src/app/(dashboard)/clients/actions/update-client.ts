"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { clients } from "@/data/mock/clients";
import { API_URL, apiSend } from "@/lib/http";

import { ClientType } from "../enums";
import { type UpdateClientFormValues, updateClientSchema } from "../schema";
import type { Client } from "../types";

export async function updateClient(
  id: number,
  _prev: ServerActionState,
  input: UpdateClientFormValues
): Promise<ServerActionState> {
  const parsed = updateClientSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    let client: Client;
    if (API_URL) {
      // Drop empty email — backend @IsEmail rejects "".
      const { email, ...rest } = parsed.data;
      client = await apiSend<Client>(
        `/clients/${id}`,
        "PATCH",
        email ? { ...rest, email } : rest
      );
    } else {
      const found = clients.find((c) => c.id === id);
      client = {
        id,
        name: parsed.data.name,
        type: found?.type ?? ClientType.COMPANY,
        tax_code: parsed.data.tax_code ?? null,
        email: parsed.data.email || null,
        note: parsed.data.note ?? null,
        created_at: found?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    revalidatePath(`/clients/${id}`);
    return { success: true, message: "Đã cập nhật khách hàng.", data: client };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Không thể cập nhật.",
    };
  }
}
