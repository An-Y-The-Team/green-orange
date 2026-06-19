import { TaskPriority, TaskStatus } from "@/app/(dashboard)/tasks/enums";
import type { Task } from "@/app/(dashboard)/tasks/types";

export const tasks: Task[] = [
  {
    id: 1,
    title: "Gọi điện theo dõi với Acme Corp",
    due_date: "2026-06-16",
    status: TaskStatus.TODO,
    priority: TaskPriority.HIGH,
    assignee: "Mai Anh",
  },
  {
    id: 2,
    title: "Gửi báo giá cho Globex",
    due_date: "2026-06-14",
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    assignee: "Quốc Bảo",
  },
  {
    id: 3,
    title: "Chuẩn bị demo cho Initech",
    due_date: "2026-06-20",
    status: TaskStatus.TODO,
    priority: TaskPriority.MEDIUM,
    assignee: "Mai Anh",
  },
  {
    id: 4,
    title: "Cập nhật hồ sơ khách hàng Hooli",
    due_date: "2026-06-12",
    status: TaskStatus.DONE,
    priority: TaskPriority.LOW,
    assignee: "Quốc Bảo",
  },
];
