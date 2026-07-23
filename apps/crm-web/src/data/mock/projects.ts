import {
  AcceptanceSubStatus,
  ExecutionSubStatus,
  ProjectStage,
  ProjectStatus,
} from "@/app/(dashboard)/projects/enums";
import type { Project } from "@/app/(dashboard)/projects/types";

import { projectTypes } from "./project-types";

// Công Trình — the v2 spine. Relations (client/location/types) are embedded
// exactly as GET /projects includes them; ids match mock clients/locations.
const anPhat = { id: 1, name: "Công ty TNHH An Phát" };
const chiHoa = { id: 2, name: "Chị Hoa" };
const toaNhaA = {
  id: 1,
  client_id: 1,
  name: "Toà nhà A — Q.1",
  address: "12 Nguyễn Huệ, Quận 1, TP.HCM",
};
const toaNhaB = {
  id: 2,
  client_id: 1,
  name: "Toà nhà B — Q.7",
  address: "88 Nguyễn Văn Linh, Quận 7, TP.HCM",
};
const macDinh = {
  id: 3,
  client_id: 2,
  name: "Mặc định",
  address: "25 Lê Lợi, Quận 3, TP.HCM",
};

export const projects: Project[] = [
  {
    id: 1,
    code: "CT-2026-001",
    client_id: 1,
    location_id: 1,
    working_contact_id: 1,
    decision_maker_contact_id: 1,
    name: "Vệ sinh kính mặt ngoài Toà nhà A",
    request_note: "Vệ sinh kính mặt ngoài",
    referral_source: "giới thiệu",
    stage: ProjectStage.QUOTE,
    status: ProjectStatus.ACTIVE,
    appointment_at: "2026-07-10T09:00:00.000Z",
    visit_date: "2026-07-10",
    survey_note: "Mặt kính 6 tầng, cần xe nâng cho tầng 4-6.",
    survey_items: [
      { name: "Kính mặt ngoài tầng 1-3", quantity: 420, unit: "m2" },
      {
        name: "Kính mặt ngoài tầng 4-6",
        quantity: 380,
        unit: "m2",
        note: "cần xe nâng",
      },
    ],
    created_at: "2026-07-08T03:00:00.000Z",
    updated_at: "2026-07-15T03:00:00.000Z",
    types: [projectTypes[0]],
    client: anPhat,
    location: toaNhaA,
  },
  {
    id: 2,
    code: "CT-2026-002",
    client_id: 1,
    location_id: 2,
    working_contact_id: 1,
    decision_maker_contact_id: 1,
    name: "Thi công cải tạo sảnh Toà nhà B",
    referral_source: "khách cũ",
    stage: ProjectStage.EXECUTION,
    status: ProjectStatus.ACTIVE,
    visit_date: "2026-06-05",
    client_signed_date: "2026-06-20",
    execution_sub_status: ExecutionSubStatus.WORKS,
    start_date: "2026-07-01",
    est_duration_days: 45,
    created_at: "2026-06-02T03:00:00.000Z",
    updated_at: "2026-07-20T03:00:00.000Z",
    types: [projectTypes[1]],
    client: anPhat,
    location: toaNhaB,
  },
  {
    id: 3,
    code: "CT-2026-003",
    client_id: 2,
    location_id: 3,
    working_contact_id: 3,
    decision_maker_contact_id: 3,
    name: "Tháo dỡ và vệ sinh nhà phố Q.3",
    stage: ProjectStage.CLOSED,
    status: ProjectStatus.ACTIVE,
    appointment_at: "2026-02-03T02:30:00.000Z",
    visit_date: "2026-02-03",
    client_signed_date: "2026-02-14",
    start_date: "2026-02-20",
    est_duration_days: 12,
    actual_duration_days: 14,
    works_done_at: "2026-03-06T10:00:00.000Z",
    acceptance_sub_status: AcceptanceSubStatus.PASSED,
    acceptance_passed_date: "2026-03-10",
    created_at: "2026-02-01T03:00:00.000Z",
    updated_at: "2026-03-25T03:00:00.000Z",
    types: [projectTypes[2], projectTypes[0]],
    client: chiHoa,
    location: macDinh,
  },
];
