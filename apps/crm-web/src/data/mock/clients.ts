import { ClientType } from "@/app/(dashboard)/clients/enums";
import type { Client } from "@/app/(dashboard)/clients/types";

// Two archetypes: a company with multiple sites, and an individual whose
// contact/location the backend auto-creates. Ids are referenced by mock
// contacts.ts / locations.ts (and other features).
export const clients: Client[] = [
  {
    id: 1,
    name: "Công ty TNHH An Phát",
    type: ClientType.COMPANY,
    tax_code: "0312345678",
    email: "ketoan@anphat.com.vn",
    note: null,
    created_at: "2026-01-08T08:00:00.000Z",
    updated_at: "2026-01-08T08:00:00.000Z",
  },
  {
    id: 2,
    name: "Chị Hoa",
    type: ClientType.INDIVIDUAL,
    tax_code: null,
    email: null,
    note: "Khách lẻ, liên hệ qua Zalo",
    created_at: "2026-03-02T09:30:00.000Z",
    updated_at: "2026-03-02T09:30:00.000Z",
  },
];
