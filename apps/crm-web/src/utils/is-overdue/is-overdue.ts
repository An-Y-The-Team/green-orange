import { todayISO } from "@/utils/today-iso/today-iso";

/** Derived overdue (Quá hạn) — due date passed and not yet done/paid. */
export function isOverdue(dueDate: string | null | undefined, done: boolean) {
  if (!dueDate || done) return false;
  return dueDate < todayISO();
}
