import type { Assignment } from "@/app/(dashboard)/crew/types";

// Phân công — which crew members are staffed onto which công trình. Joins
// crew (data/mock/crew.ts) to projects (data/mock/projects.ts) by `project_code`.
// Mirrors the cross-reference-by-code pattern the project detail page already
// uses for quotes/contracts/costs.
export const assignments: Assignment[] = [
  // CT-2026-001 — Vệ sinh tổng thể Vincom Plaza Q.1 (đang thi công)
  {
    id: 1,
    crew_id: 1,
    project_code: "CT-2026-001",
    role_on_site: "Giám sát công trình",
    start_date: "2026-03-15",
  },
  { id: 2, crew_id: 7, project_code: "CT-2026-001", start_date: "2026-03-15" },
  { id: 3, crew_id: 8, project_code: "CT-2026-001", start_date: "2026-03-15" },
  { id: 4, crew_id: 5, project_code: "CT-2026-001", start_date: "2026-03-18" },
  { id: 5, crew_id: 10, project_code: "CT-2026-001", start_date: "2026-03-15" },

  // CT-2026-002 — Thi công cải tạo Circle K Q.7 (nghiệm thu)
  {
    id: 6,
    crew_id: 2,
    project_code: "CT-2026-002",
    role_on_site: "Giám sát công trình",
    start_date: "2026-02-25",
  },
  {
    id: 7,
    crew_id: 3,
    project_code: "CT-2026-002",
    role_on_site: "Tổ trưởng thi công",
    start_date: "2026-02-25",
  },
  { id: 8, crew_id: 6, project_code: "CT-2026-002", start_date: "2026-02-28" },
  { id: 9, crew_id: 11, project_code: "CT-2026-002", start_date: "2026-02-28" },

  // CT-2026-003 — Vệ sinh sau xây dựng FPT Tower (chờ thanh toán)
  {
    id: 10,
    crew_id: 1,
    project_code: "CT-2026-003",
    role_on_site: "Giám sát công trình",
    start_date: "2026-01-20",
  },
  { id: 11, crew_id: 4, project_code: "CT-2026-003", start_date: "2026-01-20" },
  { id: 12, crew_id: 8, project_code: "CT-2026-003", start_date: "2026-01-22" },
];
