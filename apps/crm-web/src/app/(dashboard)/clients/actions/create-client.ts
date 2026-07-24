"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { clients } from "@/data/mock/clients";
import { API_URL, apiSend, nextId } from "@/lib/http";

import { type CreateClientFormValues, createClientSchema } from "../schema";
import type { Client } from "../types";

export async function createClient(
  _prev: ServerActionState,
  input: CreateClientFormValues
): Promise<ServerActionState> {
  const parsed = createClientSchema.safeParse(input);

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
      client = await apiSend<Client>("/clients", "POST", parsed.data);
    } else {
      client = {
        id: nextId(clients),
        name: parsed.data.name,
        type: parsed.data.type,
        tax_code: null,
        note: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    revalidatePath("/clients");

    return {
      success: true,
      message: `Đã tạo khách hàng "${client.name}".`,
      data: client,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể tạo khách hàng.",
    };
  }
}
