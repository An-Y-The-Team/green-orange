import type { ProjectType } from "@/app/(dashboard)/projects/types";

// User-managed tags — mirrors the seeded catalog in crm-api-nest.
export const projectTypes: ProjectType[] = [
  { id: 1, name: "Vệ sinh" },
  { id: 2, name: "Thi công" },
  { id: 3, name: "Tháo dỡ" },
];
