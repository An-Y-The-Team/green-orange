import { LeadStatus } from "@/app/(dashboard)/leads/enums";
import type { Lead } from "@/app/(dashboard)/leads/types";

export const leads: Lead[] = [
  {
    id: 1,
    name: "Bùi Thanh Tùng",
    company: "Stark Industries",
    source: "Website",
    status: LeadStatus.NEW,
    value: 12000,
    owner: "Mai Anh",
  },
  {
    id: 2,
    name: "Ngô Bảo Châu",
    company: "Wayne Enterprises",
    source: "Giới thiệu",
    status: LeadStatus.CONTACTED,
    value: 45000,
    owner: "Mai Anh",
  },
  {
    id: 3,
    name: "Dương Tử Quân",
    company: "Wonka Industries",
    source: "Sự kiện",
    status: LeadStatus.QUALIFIED,
    value: 30000,
    owner: "Quốc Bảo",
  },
  {
    id: 4,
    name: "Tạ Quang Huy",
    company: "Cyberdyne",
    source: "Quảng cáo",
    status: LeadStatus.LOST,
    value: 8000,
    owner: "Quốc Bảo",
  },
  {
    id: 5,
    name: "Lý Nhã Kỳ",
    company: "Soylent Corp",
    source: "Website",
    status: LeadStatus.CONTACTED,
    value: 22000,
    owner: "Mai Anh",
  },
];
