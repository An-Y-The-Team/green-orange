"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { ProjectStatus } from "@/app/(dashboard)/projects/enums";
import { API_URL, apiSend } from "@/lib/http";

import { updateProject } from "../../projects/actions/update-project";
import { decideQuoteSchema } from "../schema";
import type { Quote } from "../types";

/**
 * Decide a waiting quote (deal|on_hold|rejected) then CHAIN the project to
 * match — the quote and project never disagree (redesign decision A):
 *   • on_hold  → project on_hold + follow-up date
 *   • rejected → project cancelled + cancel reason
 *   • deal     → nothing extra (the stage stepper advances to Hợp đồng)
 */
export async function decideQuote(
  id: number,
  _prev: ServerActionState,
  input: {
    status: "deal" | "on_hold" | "rejected";
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
    let quote: Quote | { id: number } = { id };
    if (API_URL) {
      quote = await apiSend<Quote>(`/quotes/${id}/decide`, "POST", { status });
    }

    if (status === "on_hold") {
      await updateProject(
        projectId,
        { success: false },
        {
          status: ProjectStatus.ON_HOLD,
          follow_up_date,
        }
      );
    } else if (status === "rejected") {
      await updateProject(
        projectId,
        { success: false },
        {
          status: ProjectStatus.CANCELLED,
          cancel_reason: cancel_reason || `Khách hủy báo giá v${version}`,
        }
      );
    }

    revalidatePath("/projects/[id]", "page");
    revalidatePath("/quotes");

    const messages = {
      deal: "Đã chốt báo giá.",
      on_hold: "Đã hoãn — công trình chuyển sang trạng thái Hoãn.",
      rejected: "Đã hủy — công trình chuyển sang trạng thái Hủy.",
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
