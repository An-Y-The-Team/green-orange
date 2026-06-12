import type { Deal } from "@/types";

export const deals: Deal[] = [
  {
    id: 1,
    title: "Acme — Gói Enterprise",
    company: "Acme Corp",
    stage: "negotiation",
    amount: 85000,
    close_date: "2026-07-15",
  },
  {
    id: 2,
    title: "Globex — Gia hạn năm",
    company: "Globex",
    stage: "proposal",
    amount: 42000,
    close_date: "2026-06-30",
  },
  {
    id: 3,
    title: "Initech — Triển khai mới",
    company: "Initech",
    stage: "prospect",
    amount: 18000,
    close_date: "2026-08-01",
  },
  {
    id: 4,
    title: "Hooli — Mở rộng chỗ ngồi",
    company: "Hooli",
    stage: "won",
    amount: 60000,
    close_date: "2026-05-20",
  },
  {
    id: 5,
    title: "Umbrella — Thí điểm",
    company: "Umbrella",
    stage: "lost",
    amount: 15000,
    close_date: "2026-04-10",
  },
];
