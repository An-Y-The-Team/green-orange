import type { CrewRole, CrewStatus } from "./enums";

// Nhân sự — the crew that performs the work. A small roster (≈8–20 people)
// assigned onto công trình. Kept deliberately light: identity, role, day-rate
// and employment status — not a payroll system.
export interface CrewMember {
  id: number;
  name: string;
  phone: string;
  role: CrewRole;
  day_rate: number; // ngày công, VND
  status: CrewStatus;
  note?: string;
  created_at: string;
}

// Phân công — assignment of a crew member onto a công trình. A join row that
// cross-references the project by `code`, matching how quotes/contracts/costs
// join on the project detail page (see byProject() there).
export interface Assignment {
  id: number;
  crew_id: number;
  project_code: string;
  role_on_site?: string; // optional free text, e.g. "Tổ trưởng ca sáng"
  start_date?: string;
}
