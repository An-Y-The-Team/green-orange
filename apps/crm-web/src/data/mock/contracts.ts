import type { Contract } from "@/types";

// Hợp đồng — one per project that has reached the contract stage. CT-2026-004
// (Aeon) is still at báo giá so it has no contract yet. `value` matches the
// approved quote total; `payment_terms` drives the milestone schedule.
const STANDARD_TERMS =
  "Tạm ứng 30% khi ký hợp đồng · Theo tiến độ 40% · Khi nghiệm thu 25% · Giữ lại 5% bảo hành (hoàn sau 12 tháng).";

export const contracts: Contract[] = [
  {
    id: 1,
    code: "HD-2026-001",
    project_code: "CT-2026-001",
    customer: "Vincom Retail",
    title: "Hợp đồng vệ sinh tổng thể TTTM Vincom Plaza Q.1",
    value: 450_360_000,
    signed_date: "2026-03-10",
    start_date: "2026-03-15",
    end_date: "2026-06-30",
    status: "dang_thuc_hien",
    payment_terms: STANDARD_TERMS,
  },
  {
    id: 2,
    code: "HD-2026-002",
    project_code: "CT-2026-002",
    customer: "Circle K Việt Nam",
    title: "Hợp đồng thi công cải tạo cửa hàng Circle K Q.7",
    value: 279_072_000,
    signed_date: "2026-02-20",
    start_date: "2026-02-25",
    end_date: "2026-05-15",
    status: "dang_thuc_hien",
    payment_terms: STANDARD_TERMS,
  },
  {
    id: 3,
    code: "HD-2026-003",
    project_code: "CT-2026-003",
    customer: "FPT Software",
    title: "Hợp đồng vệ sinh sau xây dựng văn phòng FPT Tower",
    value: 179_280_000,
    signed_date: "2026-01-15",
    start_date: "2026-01-20",
    end_date: "2026-03-10",
    status: "dang_thuc_hien",
    payment_terms: STANDARD_TERMS,
  },
  {
    id: 4,
    code: "HD-2026-005",
    project_code: "CT-2026-005",
    customer: "GS25 Việt Nam",
    title: "Hợp đồng vệ sinh định kỳ chuỗi cửa hàng GS25",
    value: 95_040_000,
    signed_date: "2025-12-01",
    start_date: "2025-12-05",
    end_date: "2026-03-05",
    status: "thanh_ly",
    payment_terms: STANDARD_TERMS,
  },
];
