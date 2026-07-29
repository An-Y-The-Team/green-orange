"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { apiSend } from "@/utils/http/http";
import { unknownTokens } from "@/utils/merge-template/merge-template";

import {
  type ContractTemplateFormValues,
  contractTemplateSchema,
} from "../schema";
import type { ContractTemplate } from "../types";

/**
 * Create or update a contract template. When `id` is provided it PATCHes the
 * existing row; otherwise it POSTs a new one.
 *
 * A body may only use tokens from CONTRACT_TOKENS. Anything else has no value to
 * resolve to and would print as `⟨token?⟩` on a signed contract, so the save is
 * refused here — the last place before the body becomes a legal document.
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

  const unresolvable = unknownTokens(parsed.data.body);
  if (unresolvable.length > 0) {
    const list = unresolvable.map((t) => `{{${t}}}`).join(", ");
    return {
      success: false,
      message: `Không thể lưu: mẫu dùng trường trộn không tồn tại (${list}).`,
      errors: {
        body: [
          `Trường trộn không tồn tại: ${list}. Hãy xoá hoặc thay bằng trường trong danh sách bên phải — nếu để lại, hợp đồng in ra sẽ hiện ⟨…?⟩ thay vì dữ liệu.`,
        ],
      },
    };
  }

  try {
    const template = id
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
