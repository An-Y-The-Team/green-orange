import { ClientStatus } from "@/app/(dashboard)/clients/enums";
import type { Client } from "@/app/(dashboard)/clients/types";

// Cleaning & construction clients — retail chains, malls and offices that hire
// GreenOrange for vệ sinh / thi công work. `company` here is what Project,
// Quote and Contract records reference via their `client` field.
export const clients: Client[] = [
  {
    id: 1,
    name: "Nguyễn Văn An",
    email: "an.nguyen@vincom.vn",
    phone: "+84 90 123 4567",
    company: "Vincom Retail",
    status: ClientStatus.ACTIVE,
    created_at: "2026-01-08",
  },
  {
    id: 2,
    name: "Trần Thị Bình",
    email: "binh.tran@circlek.vn",
    phone: "+84 91 234 5678",
    company: "Circle K Việt Nam",
    status: ClientStatus.ACTIVE,
    created_at: "2026-01-20",
  },
  {
    id: 3,
    name: "Lê Hoàng Cường",
    email: "cuong.le@fpt.com.vn",
    phone: "+84 92 345 6789",
    company: "FPT Software",
    status: ClientStatus.ACTIVE,
    created_at: "2025-12-28",
  },
  {
    id: 4,
    name: "Phạm Thu Dung",
    email: "dung.pham@aeonmall.vn",
    phone: "+84 93 456 7890",
    company: "Aeon Mall Việt Nam",
    status: ClientStatus.LEAD,
    created_at: "2026-04-17",
  },
  {
    id: 5,
    name: "Vũ Minh Đức",
    email: "duc.vu@gs25.vn",
    phone: "+84 94 567 8901",
    company: "GS25 Việt Nam",
    status: ClientStatus.ACTIVE,
    created_at: "2025-11-15",
  },
  {
    id: 6,
    name: "Đặng Quỳnh Hoa",
    email: "hoa.dang@highlandscoffee.vn",
    phone: "+84 95 678 9012",
    company: "Highlands Coffee",
    status: ClientStatus.LEAD,
    created_at: "2026-05-29",
  },
];
