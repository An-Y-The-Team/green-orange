import { tasks } from "@/data/mock/tasks";
import { API_URL, apiFetchSafe } from "@/lib/http";

import type { Task } from "./types";

export async function listTasks(): Promise<Task[]> {
  return API_URL ? apiFetchSafe<Task[]>("/tasks", []) : tasks;
}
