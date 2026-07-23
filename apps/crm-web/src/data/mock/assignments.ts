import type { Assignment, ProjectRef } from "@/app/(dashboard)/crew/types";
import { crewRoles } from "@/data/mock/crew-roles";

// Phân công — v2. Projects: 1 (CT-2026-001), 2 (CT-2026-002, đang thi công),
// 3 (CT-2026-003, đã đóng). `project` mirrors the API include on GET /crew/:id.
// Member 1 is double-booked (project 2 ↔ project 1) to demo the non-blocking
// "Trùng lịch" warning; `overlaps` is API-computed on writes, carried here for
// the read-only demo.
const project1: ProjectRef = {
  id: 1,
  code: "CT-2026-001",
  name: "Vệ sinh tổng thể TTTM Vincom Plaza Q.1",
};
const project2: ProjectRef = {
  id: 2,
  code: "CT-2026-002",
  name: "Thi công cải tạo cửa hàng Circle K Q.7",
};

export const assignments: Assignment[] = [
  // CT-2026-002 — đang thi công: 3 members on site
  {
    id: 1,
    project_id: 2,
    crew_member_id: 1,
    role_id: 4,
    from_date: "2026-07-10",
    to_date: null,
    role: crewRoles[3],
    project: project2,
    overlaps: [
      {
        id: 4,
        project_id: 1,
        crew_member_id: 1,
        role_id: 4,
        from_date: "2026-07-18",
        to_date: "2026-07-22",
        project: project1,
      },
    ],
  },
  {
    id: 2,
    project_id: 2,
    crew_member_id: 2,
    role_id: 1,
    from_date: "2026-07-10",
    to_date: "2026-07-31",
    role: crewRoles[0],
    project: project2,
  },
  {
    id: 3,
    project_id: 2,
    crew_member_id: 3,
    role_id: null,
    from_date: "2026-07-12",
    to_date: "2026-07-20",
    project: project2,
  },

  // CT-2026-001 — member 1 also booked here, overlapping assignment 1
  {
    id: 4,
    project_id: 1,
    crew_member_id: 1,
    role_id: 4,
    from_date: "2026-07-18",
    to_date: "2026-07-22",
    role: crewRoles[3],
    project: project1,
    overlaps: [
      {
        id: 1,
        project_id: 2,
        crew_member_id: 1,
        role_id: 4,
        from_date: "2026-07-10",
        to_date: null,
        project: project2,
      },
    ],
  },
];
