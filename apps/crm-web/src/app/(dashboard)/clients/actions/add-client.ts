"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { clients } from "@/data/mock/clients";
import { API_URL, apiSend, nextId } from "@/lib/http";

import { type ClientFormValues, clientSchema } from "../schema";
import type { Client } from "../types";

// Server action for the "add client" form. Wired into the dialog via
// useActionState; the client reads the returned ServerActionState through the
// shared useServerAction hook (toast + onSuccess). The client passes the
// already-typed form values, and we re-validate here as defense.
export async function addClient(
  _prevState: ServerActionState,
  input: ClientFormValues
): Promise<ServerActionState> {
  const parsed = clientSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    // Live mode → POST /clients (the worked backend resource). Mock mode →
    // no store, so synthesize the server-side fields for the demo flow.
    const client: Client = API_URL
      ? await apiSend<Client>("/clients", "POST", parsed.data)
      : {
          ...parsed.data,
          id: nextId(clients),
          created_at: new Date().toISOString().slice(0, 10),
        };
    revalidatePath("/clients");
    return {
      success: true,
      message: `Đã thêm khách hàng "${client.name}".`,
      data: client,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể lưu khách hàng.",
    };
  }
}
