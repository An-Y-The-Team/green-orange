import { SettlementStatus } from "@/app/(dashboard)/receivables/enums";
import type { Settlement } from "@/app/(dashboard)/receivables/types";
import { bills } from "@/data/mock/bills";

// Quyết toán — v2. Project 3 (CT-2026-003, đã đóng) settled and signed;
// signing officialized its bill (bills.ts id 1) with the settlement total.
export const settlements: Settlement[] = [
  {
    id: 1,
    project_id: 3,
    status: SettlementStatus.SIGNED,
    total_amount: 34_050_000,
    signed_date: "2026-06-20",
    note: "Khối lượng chốt theo biên bản nghiệm thu.",
    items: [
      {
        id: 1,
        settlement_id: 1,
        description: "Vệ sinh sau xây dựng sàn văn phòng",
        unit: "m²",
        quantity: 1500,
        unit_price: 18_000,
        amount: 27_000_000,
        sort_order: 0,
      },
      {
        id: 2,
        settlement_id: 1,
        description: "Vệ sinh kính mặt ngoài",
        unit: "m²",
        quantity: 470,
        unit_price: 15_000,
        amount: 7_050_000,
        sort_order: 1,
      },
    ],
    bill: bills[0],
  },
];
