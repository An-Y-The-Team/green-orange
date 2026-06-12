/**
 * CRM domain types.
 *
 * These shapes are the contract between the UI and the FastAPI backend
 * (apps/crm-api). Field names use snake_case for multi-word fields (created_at,
 * close_date, due_date) so a response from the API maps 1:1 onto these types
 * with no transformation — that is what makes the mock→API swap in
 * src/lib/api trivial. Keep them in sync with the backend's `*Public` schemas.
 */

export type CustomerStatus = "active" | "lead" | "churned";

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: CustomerStatus;
  created_at: string;
}

export interface Contact {
  id: number;
  name: string;
  email: string;
  phone: string;
  title: string;
  company: string;
}

export type LeadStatus = "new" | "contacted" | "qualified" | "lost";

export interface Lead {
  id: number;
  name: string;
  company: string;
  source: string;
  status: LeadStatus;
  value: number;
  owner: string;
}

export type DealStage =
  | "prospect"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export interface Deal {
  id: number;
  title: string;
  company: string;
  stage: DealStage;
  amount: number;
  close_date: string;
}

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: number;
  title: string;
  due_date: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
}
