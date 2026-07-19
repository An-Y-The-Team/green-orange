// Khách hàng — domain types. snake_case multi-word fields (created_at) map 1:1
// onto the FastAPI backend's ClientPublic schema.
import type { ClientStatus } from "./enums";

export interface Client {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: ClientStatus;
  created_at: string;
}
