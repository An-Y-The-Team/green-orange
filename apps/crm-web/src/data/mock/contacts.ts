import type { Contact } from "@/app/(dashboard)/clients/types";

export const contacts: Contact[] = [
  {
    id: 1,
    client_id: 1,
    name: "Trần Văn B",
    phone: "0901234567",
    email: "b.tran@anphat.vn",
    title: "Quản lý toà nhà",
    note: null,
  },
  {
    id: 2,
    client_id: 1,
    name: "Nguyễn Thị C",
    phone: "0912345678",
    email: "c.nguyen@anphat.vn",
    title: "Kế toán",
    note: null,
  },
  {
    // Individual client — the client is their own contact.
    id: 3,
    client_id: 2,
    name: "Chị Hoa",
    phone: "0987654321",
    email: null,
    title: null,
    note: null,
  },
];
