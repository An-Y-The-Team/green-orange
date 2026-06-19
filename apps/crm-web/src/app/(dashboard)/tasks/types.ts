// Công việc — domain types.
import type { TaskPriority, TaskStatus } from "./enums";

export interface Task {
  id: number;
  title: string;
  due_date: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
}
