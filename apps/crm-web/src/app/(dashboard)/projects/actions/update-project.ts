"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { API_URL, apiSend } from "@/lib/http";

import {
  AcceptanceSubStatus,
  ExecutionSubStatus,
  ProjectStage,
  ProjectStatus,
} from "../enums";
import type { Project } from "../types";

const surveyItemSchema = z.object({
  name: z.string(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  note: z.string().optional(),
});

// Every PATCH field is optional — callers send only what changed.
const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  working_contact_id: z.number().int().positive().optional(),
  decision_maker_contact_id: z.number().int().positive().optional(),
  type_ids: z.array(z.number().int().positive()).optional(),
  request_note: z.string().optional(),
  referral_source: z.string().optional(),
  survey_items: z.array(surveyItemSchema).optional(),
  survey_note: z.string().optional(),
  stage: z.nativeEnum(ProjectStage).optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  cancel_reason: z.string().optional(),
  follow_up_date: z.string().optional(),
  appointment_at: z.string().optional(),
  visit_date: z.string().optional(),
  client_signed_date: z.string().optional(),
  execution_sub_status: z.nativeEnum(ExecutionSubStatus).optional(),
  start_date: z.string().optional(),
  est_duration_days: z.number().optional(),
  actual_duration_days: z.number().optional(),
  approaches: z.string().optional(),
  works_done_at: z.string().optional(),
  acceptance_sub_status: z.nativeEnum(AcceptanceSubStatus).optional(),
});

export type UpdateProjectFormValues = z.infer<typeof updateProjectSchema>;

export async function updateProject(
  id: number,
  _prev: ServerActionState,
  input: UpdateProjectFormValues
): Promise<ServerActionState> {
  const parsed = updateProjectSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    let data: Project | ({ id: number } & UpdateProjectFormValues);
    if (API_URL) {
      data = await apiSend<Project>(`/projects/${id}`, "PATCH", parsed.data);
    } else {
      data = { id, ...parsed.data };
    }

    revalidatePath(`/projects/${id}`);
    revalidatePath("/projects");

    return { success: true, message: "Đã cập nhật công trình.", data };
  } catch (error) {
    // Live backend surfaces stage-gate / lock failures as the error message.
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Không thể cập nhật công trình.",
    };
  }
}
