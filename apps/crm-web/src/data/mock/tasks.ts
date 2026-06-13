import type { Task } from "@/types";

export const tasks: Task[] = [
  {
    id: 1,
    title: "Gọi điện theo dõi với Acme Corp",
    due_date: "2026-06-16",
    status: "todo",
    priority: "high",
    assignee: "Mai Anh",
  },
  {
    id: 2,
    title: "Gửi báo giá cho Globex",
    due_date: "2026-06-14",
    status: "in_progress",
    priority: "high",
    assignee: "Quốc Bảo",
  },
  {
    id: 3,
    title: "Chuẩn bị demo cho Initech",
    due_date: "2026-06-20",
    status: "todo",
    priority: "medium",
    assignee: "Mai Anh",
  },
  {
    id: 4,
    title: "Cập nhật hồ sơ khách hàng Hooli",
    due_date: "2026-06-12",
    status: "done",
    priority: "low",
    assignee: "Quốc Bảo",
  },
];
