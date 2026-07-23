"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { projects } from "@/data/mock/projects";
import { API_URL, apiSend, nextId, seq } from "@/lib/http";

import type { Project } from "../types";

export const createProjectSchema = z.object({
  client_id: z.number().int().positive(),
  location_id: z.number().int().positive(),
  working_contact_id: z.number().int().positive().optional(),
  decision_maker_contact_id: z.number().int().positive().optional(),
  name: z.string().min(1),
  type_ids: z.array(z.number().int().positive()).min(1),
  request_note: z.string().optional(),
  referral_source: z.string().optional(),
  appointment_at: z.string().optional(),
});

export type CreateProjectFormValues = z.infer<typeof createProjectSchema>;

export async function createProject(
  _prev: ServerActionState,
  input: CreateProjectFormValues
): Promise<ServerActionState> {
  const parsed = createProjectSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  // POST /projects takes everything except appointment_at, which is only
  // settable via PATCH (see NEST contract).
  const { appointment_at, ...createBody } = parsed.data;

  try {
    let project: Project;
    if (API_URL) {
      project = await apiSend<Project>("/projects", "POST", createBody);
      if (appointment_at) {
        project = await apiSend<Project>(`/projects/${project.id}`, "PATCH", {
          appointment_at,
        });
      }
    } else {
      const id = nextId(projects);
      project = {
        ...createBody,
        id,
        code: `CT-2026-${seq(id)}`,
        working_contact_id: createBody.working_contact_id ?? 0,
        decision_maker_contact_id: createBody.decision_maker_contact_id ?? 0,
        stage: "request",
        status: "active",
        appointment_at: appointment_at ?? null,
        types: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Project;
    }

    revalidatePath("/projects");

    return {
      success: true,
      message: `Đã tạo công trình "${project.name}".`,
      data: project,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể tạo công trình.",
    };
  }
}
