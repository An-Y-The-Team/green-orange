"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

import { assignments as mockAssignments } from "@/data/mock/assignments";
import { crew as mockCrew } from "@/data/mock/crew";
import { crewRoles as mockRoles } from "@/data/mock/crew-roles";
import { API_URL, apiSend, nextId } from "@/lib/http";

import type { Assignment } from "../types";

// from_date required; to_date null/absent = open-ended. Double-booking is
// allowed — overlaps come back as a non-blocking warning, never a rejection.
const createSchema = z.object({
  crew_member_id: z.number().int().positive(),
  role_id: z.number().int().positive().optional(),
  from_date: z.string().min(1),
  to_date: z.string().optional(),
});
// PATCH — every field optional.
const updateSchema = createSchema.partial();

// Mock-mode overlap computation so the "Trùng lịch" warning demos offline the
// same way the API computes it: same member, intersecting [from, to] (null=∞).
// ponytail: O(n) scan over bundled mock rows — fine for a demo dataset.
function mockOverlaps(
  crewMemberId: number,
  from: string,
  to: string | null,
  excludeId?: number
): Assignment[] {
  return mockAssignments.filter(
    (a) =>
      a.id !== excludeId &&
      a.crew_member_id === crewMemberId &&
      a.from_date <= (to ?? "9999-12-31") &&
      (a.to_date ?? "9999-12-31") >= from
  );
}

function mockIncludes(crewMemberId: number, roleId?: number | null) {
  const member = mockCrew.find((c) => c.id === crewMemberId);
  const rid = roleId ?? member?.default_role_id ?? null;
  return {
    crew_member: member,
    role: rid ? mockRoles.find((r) => r.id === rid) : null,
  };
}

export async function createAssignment(
  projectId: number,
  _prev: ServerActionState,
  input: z.infer<typeof createSchema>
): Promise<ServerActionState> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    let data: Assignment;
    if (API_URL) {
      data = await apiSend<Assignment>("/assignments", "POST", {
        project_id: projectId,
        ...parsed.data,
      });
    } else {
      const to = parsed.data.to_date ?? null;
      data = {
        id: nextId(mockAssignments),
        project_id: projectId,
        crew_member_id: parsed.data.crew_member_id,
        role_id: parsed.data.role_id ?? null,
        from_date: parsed.data.from_date,
        to_date: to,
        ...mockIncludes(parsed.data.crew_member_id, parsed.data.role_id),
        overlaps: mockOverlaps(
          parsed.data.crew_member_id,
          parsed.data.from_date,
          to
        ),
      };
    }

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/crew");
    return { success: true, message: "Đã thêm phân công.", data };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể thêm phân công.",
    };
  }
}

export async function updateAssignment(
  id: number,
  projectId: number,
  _prev: ServerActionState,
  input: z.infer<typeof updateSchema>
): Promise<ServerActionState> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Vui lòng kiểm tra lại thông tin đã nhập.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    let data: Assignment;
    if (API_URL) {
      data = await apiSend<Assignment>(
        `/assignments/${id}`,
        "PATCH",
        parsed.data
      );
    } else {
      const existing = mockAssignments.find((a) => a.id === id);
      const crewMemberId =
        parsed.data.crew_member_id ?? existing?.crew_member_id ?? 0;
      const from = parsed.data.from_date ?? existing?.from_date ?? "";
      const to = parsed.data.to_date ?? existing?.to_date ?? null;
      const roleId = parsed.data.role_id ?? existing?.role_id ?? null;
      data = {
        id,
        project_id: projectId,
        crew_member_id: crewMemberId,
        role_id: roleId,
        from_date: from,
        to_date: to,
        ...mockIncludes(crewMemberId, roleId),
        overlaps: mockOverlaps(crewMemberId, from, to, id),
      };
    }

    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/crew");
    return { success: true, message: "Đã cập nhật phân công.", data };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Không thể cập nhật phân công.",
    };
  }
}

export async function deleteAssignment(
  id: number,
  projectId: number,
  _prev: ServerActionState
): Promise<ServerActionState> {
  try {
    if (API_URL) {
      await apiSend<unknown>(`/assignments/${id}`, "DELETE");
    }
    revalidatePath(`/projects/${projectId}`);
    revalidatePath("/crew");
    return { success: true, message: "Đã xóa phân công.", data: { id } };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Không thể xóa phân công.",
    };
  }
}
