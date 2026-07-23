import type { Location } from "@/app/(dashboard)/clients/types";

export const locations: Location[] = [
  {
    id: 1,
    client_id: 1,
    name: "Toà nhà A — Q.1",
    address: "12 Nguyễn Huệ, Quận 1, TP.HCM",
    manager_contact_id: 1,
  },
  {
    id: 2,
    client_id: 1,
    name: "Toà nhà B — Q.7",
    address: "88 Nguyễn Văn Linh, Quận 7, TP.HCM",
    manager_contact_id: 1,
  },
  {
    // Individual client's auto-created default location.
    id: 3,
    client_id: 2,
    name: "Mặc định",
    address: "25 Lê Lợi, Quận 3, TP.HCM",
    manager_contact_id: 3,
  },
];
