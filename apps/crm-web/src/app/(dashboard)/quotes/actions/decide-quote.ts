"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { ProjectStatus } from "@/app/(dashboard)/projects/enums";
import { apiSend } from "@/utils/http/http";

import { updateProject } from "../../projects/actions/update-project";
import { type QuoteDecision, QuoteStatus } from "../enums";
import { decideQuoteSchema } from "../schema";
import type { Quote } from "../types";

/**
 * Decide a waiting quote (deal|on_hold|rejected) then CHAIN the project to
 * match — the quote and project must not disagree silently (redesign decision
 * A); when the chain fails the action says so instead of claiming success:
 *   • on_hold  → project on_hold + follow-up date
 *   • rejected → project cancelled + cancel reason
 *   • deal     → nothing extra (the stage stepper advances to Hợp đồng)
 */
export async function decideQuote(
  id: number,
  _prev: ServerActionState,
  input: {
    status: QuoteDecision;
    projectId: number;
    version: number;
    follow_up_date?: string;
    cancel_reason?: string;
  }
): Promise<ServerActionState> {
  const parsed = decideQuoteSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { status, projectId, version, follow_up_date, cancel_reason } =
    parsed.data;

  try {
    const quote = await apiSend<Quote>(`/quotes/${id}/decide`, "POST", {
      status,
    });

    // The quote is decided from here on — revalidate before the chain so a
    // chained failure still shows the new quote state.
    revalidatePath("/projects/[id]", "page");
    revalidatePath("/quotes");

    let chained: ServerActionState | undefined;
    if (status === QuoteStatus.ON_HOLD) {
      chained = await updateProject(
        projectId,
        { success: false },
        {
          status: ProjectStatus.ON_HOLD,
          follow_up_date,
        }
      );
    } else if (status === QuoteStatus.REJECTED) {
      chained = await updateProject(
        projectId,
        { success: false },
        {
          status: ProjectStatus.CANCELLED,
          cancel_reason: cancel_reason || `Khách hủy báo giá v${version}`,
        }
      );
    }

    // updateProject RETURNS failure instead of throwing, so an unchecked chain
    // reports success while quote and project disagree. Say what half-applied —
    // re-deciding the quote would not fix the project.
    if (chained && !chained.success) {
      return {
        success: false,
        message: `Đã lưu quyết định báo giá nhưng chưa cập nhật được công trình: ${chained.message ?? "Lỗi không xác định."} Vui lòng cập nhật trạng thái công trình thủ công — không cần quyết định lại báo giá.`,
        data: quote,
      };
    }

    const messages: Record<QuoteDecision, string> = {
      [QuoteStatus.DEAL]: "Đã chốt báo giá.",
      [QuoteStatus.ON_HOLD]:
        "Đã hoãn — công trình chuyển sang trạng thái Hoãn.",
      [QuoteStatus.REJECTED]: "Đã hủy — công trình chuyển sang trạng thái Hủy.",
    };

    return { success: true, message: messages[status], data: quote };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể xử lý báo giá.",
    };
  }
}
