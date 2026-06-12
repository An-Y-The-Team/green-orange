import { Badge } from "@yan/ui/components/badge";
import { Card } from "@yan/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@yan/ui/components/table";

import { PageHeader } from "@/components/page-header";
import { listTasks } from "@/lib/api";
import type { TaskPriority, TaskStatus } from "@/types";

const statusVariant: Record<TaskStatus, "secondary" | "warning" | "success"> = {
  todo: "secondary",
  in_progress: "warning",
  done: "success",
};

const statusLabel: Record<TaskStatus, string> = {
  todo: "Cần làm",
  in_progress: "Đang làm",
  done: "Hoàn thành",
};

const priorityVariant: Record<
  TaskPriority,
  "secondary" | "default" | "destructive"
> = {
  low: "secondary",
  medium: "default",
  high: "destructive",
};

export default async function TasksPage() {
  const tasks = await listTasks();

  return (
    <>
      <PageHeader
        title="Công việc"
        description={`${tasks.filter((t) => t.status !== "done").length} chưa hoàn thành`}
      />
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Công việc</TableHead>
              <TableHead>Hạn</TableHead>
              <TableHead>Ưu tiên</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Phụ trách</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell className="font-medium">{task.title}</TableCell>
                <TableCell className="text-muted-foreground">
                  {task.due_date}
                </TableCell>
                <TableCell>
                  <Badge variant={priorityVariant[task.priority]}>
                    {task.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[task.status]}>
                    {statusLabel[task.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {task.assignee}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
