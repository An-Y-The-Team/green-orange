"use client";

import { useActionState, useState, useTransition } from "react";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@yan/ui/components/dialog";
import { Input } from "@yan/ui/components/input";
import { Label } from "@yan/ui/components/label";

import { formatDate } from "@/lib/format";
import { projectStage, projectStageOrder } from "@/lib/labels";

import { updateProject } from "../../../actions/update-project";
import { ProjectStage } from "../../../enums";
import type { Project } from "../../../types";

const initialState: ServerActionState = { success: false };

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function RequestPanel({ project }: { project: Project }) {
  const [state, formAction] = useActionState(
    updateProject.bind(null, project.id),
    initialState
  );
  const [isPending, startTransition] = useTransition();
  useServerAction(state, isPending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
  });

  const run = (input: Parameters<typeof updateProject>[2]) =>
    startTransition(() => formAction(input));

  // Dời hẹn dialog — edit appointment_at in place (no history).
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const initialDate = project.appointment_at?.slice(0, 10) ?? today();
  const initialTime = project.appointment_at?.slice(11, 16) ?? "09:00";
  const [apptDate, setApptDate] = useState(initialDate);
  const [apptTime, setApptTime] = useState(initialTime);

  // "Đã gặp khách" — visit date defaults to today, editable inline.
  const [visitDate, setVisitDate] = useState(today());

  const n = projectStageOrder.indexOf(project.stage) + 1;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
          Giai đoạn {n} · {projectStage[project.stage].label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
          {project.request_note ? (
            <div className="contents">
              <dt className="text-muted-foreground">Yêu cầu</dt>
              <dd>{project.request_note}</dd>
            </div>
          ) : null}
          {project.referral_source ? (
            <div className="contents">
              <dt className="text-muted-foreground">Nguồn</dt>
              <dd>{project.referral_source}</dd>
            </div>
          ) : null}
        </dl>

        {project.appointment_at ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>
              📅 Hẹn gặp {formatDate(project.appointment_at)}
              {project.location ? ` · ${project.location.name}` : ""}
            </span>
            <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0"
                onClick={() => setRescheduleOpen(true)}
              >
                Dời hẹn
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Dời hẹn gặp</DialogTitle>
                </DialogHeader>
                <div className="flex gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="appt-date">Ngày</Label>
                    <Input
                      id="appt-date"
                      type="date"
                      value={apptDate}
                      onChange={(e) => setApptDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="appt-time">Giờ</Label>
                    <Input
                      id="appt-time"
                      type="time"
                      value={apptTime}
                      onChange={(e) => setApptTime(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose render={<Button variant="ghost">Đóng</Button>} />
                  <Button
                    disabled={isPending || !apptDate}
                    onClick={() => {
                      run({
                        appointment_at: new Date(
                          `${apptDate}T${apptTime || "00:00"}`
                        ).toISOString(),
                      });
                      setRescheduleOpen(false);
                    }}
                  >
                    Lưu
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : null}

        <div className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
          <div className="space-y-1.5">
            <Label htmlFor="visit-date">Ngày gặp khách</Label>
            <Input
              id="visit-date"
              type="date"
              className="w-auto"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
            />
          </div>
          <Button
            disabled={isPending || !visitDate}
            onClick={() =>
              run({ visit_date: visitDate, stage: ProjectStage.SURVEY })
            }
          >
            ✓ Đã gặp khách — bắt đầu khảo sát
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
