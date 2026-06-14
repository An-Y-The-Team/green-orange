"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { acceptances } from "@/data/mock/acceptances";
import { API_URL, apiSend, nextId } from "@/lib/http";
import type { Acceptance } from "@/types";

import { type AcceptanceFormValues, acceptanceSchema } from "../schema";

export async function addAcceptance(
  _prevState: ServerActionState,
  input: AcceptanceFormValues
): Promise<ServerActionState> {
  const parsed = acceptanceSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const payload = { ...parsed.data, notes: parsed.data.notes ?? "" };
    const acceptance: Acceptance = API_URL
      ? await apiSend<Acceptance>("/acceptances", "POST", payload)
      : { ...payload, id: nextId(acceptances) };
    revalidatePath("/projects", "layout");
    return {
      success: true,
      message: "Đã lưu biên bản nghiệm thu.",
      data: acceptance,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Không thể lưu biên bản nghiệm thu.",
    };
  }
}
