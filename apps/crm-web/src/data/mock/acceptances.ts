import type { Acceptance } from "@/types";

// Nghiệm thu — acceptance / hand-over records (step 12). One per project that
// has reached the acceptance stage. CT-2026-002 is still awaiting the client's
// final check, which is why its "khi nghiệm thu" payment milestone stays locked.
export const acceptances: Acceptance[] = [
  {
    id: 1,
    project_code: "CT-2026-002",
    date: "2026-05-10",
    status: "cho_nghiem_thu",
    inspector: "Lê Thị Hồng",
    client_rep: "Circle K — Ông Park",
    notes: "Chờ khách hàng kiểm tra lần cuối khu vực quầy thu ngân.",
  },
  {
    id: 2,
    project_code: "CT-2026-003",
    date: "2026-03-08",
    status: "da_nghiem_thu",
    inspector: "Trần Quốc Bảo",
    client_rep: "FPT — Bà Lan",
    notes: "Đã nghiệm thu toàn bộ, bàn giao mặt bằng sạch sẵn sàng sử dụng.",
  },
  {
    id: 3,
    project_code: "CT-2026-005",
    date: "2026-03-04",
    status: "da_nghiem_thu",
    inspector: "Nguyễn Minh Khoa",
    client_rep: "GS25 — Ông Minh",
    notes: "Hoàn thành sớm hơn kế hoạch 1 ngày, khách hàng hài lòng.",
  },
];
