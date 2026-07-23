import { QuoteChannel, QuoteStatus } from "@/app/(dashboard)/quotes/enums";
import type { Quote } from "@/app/(dashboard)/quotes/types";

// Báo giá — v2 shapes, exactly as GET /quotes serializes them. Project 1 shows
// the bargaining loop (v1 rejected + superseded by v2 waiting); projects 2 and
// 3 each have a single chốt (deal) version driving their contract/settlement.
export const quotes: Quote[] = [
  // CT-2026-001 · v1 — first offer, bargained down and superseded by v2.
  {
    id: 1,
    project_id: 1,
    version: 1,
    status: QuoteStatus.REJECTED,
    total_amount: 40_000_000,
    vat_rate: 0.08,
    decided_date: "2026-07-18",
    note: "Báo giá hiệu lực 30 ngày. Đã bao gồm hóa chất và vật tư tiêu hao.",
    items: [
      {
        description: "Vệ sinh kính mặt ngoài",
        unit: "m²",
        quantity: 400,
        unit_price: 100_000,
        amount: 40_000_000,
        sort_order: 0,
      },
    ],
    send_logs: [
      {
        id: 1,
        quote_id: 1,
        channel: QuoteChannel.ZALO,
        sent_by: "Thư ký",
        sent_at: "2026-07-15T02:30:00.000Z",
        follow_up_ref: "Zalo chị Lan (BQL)",
      },
    ],
  },
  // CT-2026-001 · v2 — the live version, waiting on the client.
  {
    id: 2,
    project_id: 1,
    version: 2,
    status: QuoteStatus.WAITING,
    total_amount: 36_050_000,
    vat_rate: 0.08,
    note: "Báo giá hiệu lực 30 ngày. Chưa gồm chi phí xe nâng cho tầng 4-6.",
    items: [
      {
        description: "Kính mặt ngoài",
        unit: "m²",
        quantity: 320,
        unit_price: 100_000,
        amount: 32_000_000,
        sort_order: 0,
      },
      {
        description: "Kính sảnh",
        unit: "m²",
        quantity: 45,
        unit_price: 90_000,
        amount: 4_050_000,
        sort_order: 1,
      },
    ],
    send_logs: [
      {
        id: 2,
        quote_id: 2,
        channel: QuoteChannel.ZALO,
        sent_by: "Thư ký",
        sent_at: "2026-07-23T02:00:00.000Z",
        follow_up_ref: "Zalo chị Lan (BQL)",
      },
    ],
  },
  // CT-2026-002 — single version, chốt; drives HD-2026-001.
  {
    id: 3,
    project_id: 2,
    version: 1,
    status: QuoteStatus.DEAL,
    total_amount: 213_600_000,
    vat_rate: 0.08,
    decided_date: "2026-06-18",
    note: "Thời gian thi công dự kiến 45 ngày. Bảo hành 12 tháng.",
    items: [
      {
        description: "Thi công trần thạch cao sảnh",
        unit: "m²",
        quantity: 180,
        unit_price: 350_000,
        amount: 63_000_000,
        sort_order: 0,
      },
      {
        description: "Lát đá granite sàn sảnh",
        unit: "m²",
        quantity: 220,
        unit_price: 480_000,
        amount: 105_600_000,
        sort_order: 1,
      },
      {
        description: "Hệ thống chiếu sáng sảnh",
        unit: "gói",
        quantity: 1,
        unit_price: 45_000_000,
        amount: 45_000_000,
        sort_order: 2,
      },
    ],
    send_logs: [
      {
        id: 3,
        quote_id: 3,
        channel: QuoteChannel.EMAIL,
        sent_by: "Thư ký",
        sent_at: "2026-06-10T07:00:00.000Z",
        follow_up_ref: "bql.thaodien@vincom.vn",
      },
    ],
  },
  // CT-2026-003 — single version, chốt; the project has since closed.
  {
    id: 4,
    project_id: 3,
    version: 1,
    status: QuoteStatus.DEAL,
    total_amount: 39_000_000,
    vat_rate: 0.08,
    decided_date: "2026-02-12",
    note: "Bàn giao mặt bằng sạch trong 14 ngày kể từ ngày khởi công.",
    items: [
      {
        description: "Tháo dỡ nội thất cửa hàng",
        unit: "gói",
        quantity: 1,
        unit_price: 25_000_000,
        amount: 25_000_000,
        sort_order: 0,
      },
      {
        description: "Vệ sinh hoàn trả mặt bằng",
        unit: "m²",
        quantity: 350,
        unit_price: 40_000,
        amount: 14_000_000,
        sort_order: 1,
      },
    ],
    send_logs: [
      {
        id: 4,
        quote_id: 4,
        channel: QuoteChannel.PRINT,
        sent_by: "Thư ký",
        sent_at: "2026-02-06T03:00:00.000Z",
      },
    ],
  },
];
