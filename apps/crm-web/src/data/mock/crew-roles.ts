import type { CrewRole } from "@/app/(dashboard)/crew/types";

// Vai trò — user-managed list, mirrors the API seed
// (crm-api-nest prisma: Thợ chính, Thợ phụ, Nhân viên vệ sinh, Giám sát, Lái xe).
export const crewRoles: CrewRole[] = [
  { id: 1, name: "Thợ chính" },
  { id: 2, name: "Thợ phụ" },
  { id: 3, name: "Nhân viên vệ sinh" },
  { id: 4, name: "Giám sát" },
  { id: 5, name: "Lái xe" },
];
