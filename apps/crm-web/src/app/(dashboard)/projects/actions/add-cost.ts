"use server";

import { revalidatePath } from "next/cache";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { costs } from "@/data/mock/costs";
import { API_URL, apiSend, nextId } from "@/lib/http";

import { type CostFormValues, costSchema } from "../schema";
import type { Cost } from "../types";

export async function addCost(
  _prevState: ServerActionState,
  input: CostFormValues
): Promise<ServerActionState> {
  const parsed = costSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const cost: Cost = API_URL
      ? await apiSend<Cost>("/costs", "POST", parsed.data)
      : { ...parsed.data, id: nextId(costs) };
    // Revalidate the projects segment so the công trình detail (cost tab,
    // margin) reflects the new entry.
    revalidatePath("/projects", "layout");
    return { success: true, message: "Đã ghi nhận chi phí.", data: cost };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể lưu chi phí.",
    };
  }
}
