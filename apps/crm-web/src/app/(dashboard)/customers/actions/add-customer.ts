"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { customers } from "@/data/mock/customers";
import { API_URL, apiSend, nextId } from "@/lib/http";
import type { Customer } from "@/types";

import { type CustomerFormValues, customerSchema } from "../schema";

// Server action for the "add customer" form. Wired into the dialog via
// useActionState; the client reads the returned ServerActionState through the
// shared useServerAction hook (toast + onSuccess). The client passes the
// already-typed form values, and we re-validate here as defense.
export async function addCustomer(
  _prevState: ServerActionState,
  input: CustomerFormValues
): Promise<ServerActionState> {
  const parsed = customerSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    // Live mode → POST /customers (the worked backend resource). Mock mode →
    // no store, so synthesize the server-side fields for the demo flow.
    const customer: Customer = API_URL
      ? await apiSend<Customer>("/customers", "POST", parsed.data)
      : {
          ...parsed.data,
          id: nextId(customers),
          created_at: new Date().toISOString().slice(0, 10),
        };
    revalidatePath("/customers");
    return {
      success: true,
      message: `Đã thêm khách hàng "${customer.name}".`,
      data: customer,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể lưu khách hàng.",
    };
  }
}
