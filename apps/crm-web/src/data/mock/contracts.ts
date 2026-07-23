import { ContractStatus } from "@/app/(dashboard)/contracts/enums";
import type { Contract } from "@/app/(dashboard)/contracts/types";

// Hợp đồng — v2: optional (0..n per project), party/value data lives on the
// project + chốt quote. HD-2026-001 belongs to CT-2026-002 and renders from
// template 2 (no per-contract body). The `project` embed mirrors the Nest
// include exactly so pages render the same in mock and live mode.
export const contracts: Contract[] = [
  {
    id: 1,
    project_id: 2,
    code: "HD-2026-001",
    status: ContractStatus.SIGNED,
    signed_date: "2026-06-20",
    note: "Ký tại văn phòng BQL Thảo Điền, đã nhận cọc 60%.",
    template_id: 2,
    body: null,
    project: {
      id: 2,
      code: "CT-2026-002",
      name: "Thi công cải tạo sảnh Vincom Mega Mall Thảo Điền",
      client: { id: 1, name: "Vincom Retail" },
    },
  },
];
