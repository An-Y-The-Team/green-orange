"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { apiSend } from "@/utils/http/http";

import { type UpdateCompanyFormValues, updateCompanySchema } from "../schema";

/** Save the company profile (letterhead + Bên B details on every document). */
export async function updateCompany(
  _prev: ServerActionState,
  input: UpdateCompanyFormValues
): Promise<ServerActionState> {
  const parsed = updateCompanySchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const profile = await apiSend("/company-profile", "PATCH", parsed.data);
    // The profile prints on every document — refresh the whole dashboard tree.
    revalidatePath("/", "layout");
    return {
      success: true,
      message: "Đã lưu thông tin công ty.",
      data: profile,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Không thể lưu thông tin công ty.",
    };
  }
}
