"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { apiSend } from "@/utils/http/http";

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
    // Drop empty email — backend @IsEmail rejects "".
    const { email, ...rest } = parsed.data;
    const client = await apiSend<Client>(
      `/clients/${id}`,
      "PATCH",
      email ? { ...rest, email } : rest
    );
    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);
    return { success: true, message: "Đã cập nhật khách hàng.", data: client };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Không thể cập nhật.",
    };
  }
}
