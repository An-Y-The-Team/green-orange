// Khách hàng — domain types. snake_case multi-word fields (created_at) map 1:1
// onto the FastAPI backend's CustomerPublic schema.
import type { CustomerStatus } from "./enums";

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: CustomerStatus;
  created_at: string;
}
