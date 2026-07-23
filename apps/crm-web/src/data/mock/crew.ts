import { CrewMemberStatus, EmploymentType } from "@/app/(dashboard)/crew/enums";
import type { CrewMember } from "@/app/(dashboard)/crew/types";
import { crewRoles } from "@/data/mock/crew-roles";

// Nhân sự — v2 roster. `default_role` mirrors the API's include on GET /crew.
// Joins: assignments.ts + timekeeping.ts by crew_member_id.
export const crew: CrewMember[] = [
  {
    id: 1,
    name: "Trần Quốc Bảo",
    phone: "0901 112 233",
    employment_type: EmploymentType.PERMANENT,
    default_role_id: 4,
    status: CrewMemberStatus.WORKING,
    note: "Giám sát chính các công trình khu trung tâm.",
    created_at: "2025-09-02T08:00:00.000Z",
    default_role: crewRoles[3],
  },
  {
    id: 2,
    name: "Nguyễn Minh Khoa",
    phone: "0903 334 455",
    employment_type: EmploymentType.DAY_HIRE,
    default_role_id: 1,
    status: CrewMemberStatus.WORKING,
    created_at: "2025-11-10T08:00:00.000Z",
    default_role: crewRoles[0],
  },
  {
    id: 3,
    name: "Bùi Thị Mai",
    phone: "0907 778 899",
    employment_type: EmploymentType.DAY_HIRE,
    default_role_id: 3,
    status: CrewMemberStatus.ON_LEAVE,
    note: "Tạm nghỉ, dự kiến trở lại tháng 8.",
    created_at: "2026-01-05T08:00:00.000Z",
    default_role: crewRoles[2],
  },
];
