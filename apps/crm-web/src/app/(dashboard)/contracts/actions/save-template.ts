"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { contractTemplates } from "@/data/mock/contract-templates";
import { API_URL, apiSend, nextId } from "@/lib/http";

import {
  type ContractTemplateFormValues,
  contractTemplateSchema,
} from "../schema";
import type { ContractTemplate } from "../types";

/**
 * Create or update a contract template. When `id` is provided it PATCHes the
 * existing row; otherwise it POSTs a new one. In mock mode it just synthesises
 * the saved record (mutations aren't persisted across reloads) so the editor
 * flow is demoable without a backend.
 */
export async function saveTemplate(
  id: number | undefined,
  _prevState: ServerActionState,
  input: ContractTemplateFormValues
): Promise<ServerActionState> {
  const parsed = contractTemplateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    let template: ContractTemplate;
    if (API_URL) {
      template = id
        ? await apiSend<ContractTemplate>(
            `/contract-templates/${id}`,
            "PATCH",
            parsed.data
          )
        : await apiSend<ContractTemplate>(
            "/contract-templates",
            "POST",
            parsed.data
          );
    } else {
      template = { ...parsed.data, id: id ?? nextId(contractTemplates) };
    }

    revalidatePath("/contracts/templates");
    if (id) revalidatePath(`/contracts/templates/${id}/edit`);

    return {
      success: true,
      message: id
        ? `Đã cập nhật mẫu "${template.name}".`
        : `Đã tạo mẫu "${template.name}".`,
      data: template,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Không thể lưu mẫu.",
    };
  }
}
