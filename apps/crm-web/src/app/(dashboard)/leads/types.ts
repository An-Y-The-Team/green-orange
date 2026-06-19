// Lead — domain types.
import type { LeadStatus } from "./enums";

export interface Lead {
  id: number;
  name: string;
  company: string;
  source: string;
  status: LeadStatus;
  value: number;
  owner: string;
}
