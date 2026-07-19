/* -------------------------------------------------------------------------- *
 * Công Trình (Project) — the GreenOrange cleaning & construction spine, plus
 * its on-site sub-resources Chi phí (Cost) and Nghiệm thu (Acceptance).
 *
 * A client inquiry is scouted, quoted (Báo giá), put under a Hợp đồng, worked
 * on-site (with tracked Chi phí), accepted (Nghiệm thu), settled with a final
 * Quyết toán, and paid off in milestones (Thanh toán) before the contract
 * closes. Records cross-reference by `code` (CT-…), not numeric id.
 * -------------------------------------------------------------------------- */
import type {
  AcceptanceStatus,
  CostCategory,
  ProjectStage,
  ProjectType,
  ScheduleOutcome,
} from "./enums";

export interface Project {
  id: number;
  code: string;
  name: string;
  client: string;
  type: ProjectType;
  address: string;
  stage: ProjectStage;
  schedule_outcome?: ScheduleOutcome;
  start_date?: string;
  end_date?: string;
  manager: string;
  contract_value?: number; // revenue
  estimated_cost?: number; // budgeted internal cost
  progress: number; // 0..100
}

export interface Cost {
  id: number;
  project_code: string;
  date: string;
  category: CostCategory;
  description: string;
  amount: number;
  is_incident: boolean;
}

export interface Acceptance {
  id: number;
  project_code: string;
  date: string;
  status: AcceptanceStatus;
  inspector: string;
  client_rep: string;
  notes: string;
}
