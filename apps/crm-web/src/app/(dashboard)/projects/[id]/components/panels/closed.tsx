"use client";

import { FileText, Plus, RotateCcw } from "lucide-react";
import Link from "next/link";
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

import type { Contract } from "@/app/(dashboard)/contracts/types";
import type {
  Bill,
  PaymentMilestone,
  Settlement,
} from "@/app/(dashboard)/receivables/types";
import { formatDate, formatVND } from "@/lib/format";
import { projectStage } from "@/lib/labels";

import { MilestoneStatus } from "../../../../receivables/enums";
import { updateProject } from "../../../actions/update-project";
import { ProjectStage } from "../../../enums";
import type { Project } from "../../../types";

const emptyState = { success: false } as ServerActionState;

/** Whole days between two ISO/date strings (endStamp - startStamp). */
function daysBetween(start: string, end: string): number {
  return Math.max(
    0,
    Math.round(
      (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000
    )
  );
}

// Terminal-state reopen: the ONLY project mutation a closed project accepts
// (besides notes) is stage: closed → settlement. Tiny confirm, reuses the
// shared updateProject action.
function ReopenButton({ project }: { project: Project }) {
  const [state, action] = useActionState(
    updateProject.bind(null, project.id),
    emptyState
  );
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  useServerAction(state, isPending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
    onSuccess: () => setOpen(false),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <RotateCcw className="size-4" />
        Mở lại
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mở lại công trình?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Công trình sẽ quay lại giai đoạn 8 (Quyết toán & Thanh toán) và được
          mở khóa để chỉnh sửa.
        </p>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost">Đóng</Button>} />
          <Button
            disabled={isPending}
            onClick={() =>
              startTransition(() => action({ stage: ProjectStage.SETTLEMENT }))
            }
          >
            Mở lại
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DocLink({ href, label }: { href: string; label: string }) {
  return (
    <Button
      size="sm"
      variant="outline"
      render={
        <Link href={href} target="_blank">
          <FileText className="size-4" />
          {label}
        </Link>
      }
    />
  );
}

export function ClosedPanel({
  project,
  bills,
  milestones,
  settlements,
  contracts,
}: {
  project: Project;
  bills: Bill[];
  milestones: PaymentMilestone[];
  settlements: Settlement[];
  contracts: Contract[];
}) {
  // Collected total: bills carry the settlement total on sign; fall back to
  // paid milestones (e.g. a deposit-only job that never billed).
  const collected = bills.length
    ? bills.reduce((sum, b) => sum + b.total_amount, 0)
    : milestones
        .filter((m) => m.status === MilestoneStatus.PAID)
        .reduce((sum, m) => sum + m.amount, 0);

  // Elapsed: first contact stamp → close (acceptance-passed proxy, else today).
  const firstStamp = project.appointment_at ?? project.visit_date ?? null;
  const closeStamp =
    project.acceptance_passed_date ?? new Date().toISOString().slice(0, 10);
  const reworkCount =
    project.notes?.filter((n) => n.tag === "rework").length ?? 0;

  const quotes = project.quotes ?? [];

  return (
    <Card id="stage-closed" className="mb-6 scroll-mt-4">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
          Giai đoạn 9 · {projectStage[ProjectStage.CLOSED].label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="font-medium text-emerald-700 dark:text-emerald-400">
          ✓ Hoàn thành · Đã thu đủ {formatVND(collected)}
        </p>

        <div className="space-y-1 text-muted-foreground">
          {firstStamp ? (
            <p>
              Hẹn gặp {formatDate(firstStamp)} → Đóng {formatDate(closeStamp)} (
              {daysBetween(firstStamp, closeStamp)} ngày)
            </p>
          ) : null}
          <p>
            {project.actual_duration_days != null
              ? `Thi công: ${project.actual_duration_days} ngày`
              : null}
            {reworkCount > 0
              ? `${project.actual_duration_days != null ? " · " : ""}Nghiệm thu: ${reworkCount} lần bổ sung`
              : null}
          </p>
        </div>

        <div className="space-y-2">
          <p className="font-medium text-foreground">Tài liệu</p>
          <div className="flex flex-wrap gap-2">
            {quotes.map((q) => (
              <DocLink
                key={`q-${q.id}`}
                href={`/quotes/${q.id}`}
                label={`Báo giá v${q.version}`}
              />
            ))}
            {contracts.map((c) => (
              <DocLink
                key={`c-${c.id}`}
                href={`/contracts/${c.id}`}
                label={c.code}
              />
            ))}
            {settlements.map((s) => (
              <DocLink
                key={`s-${s.id}`}
                href={`/projects/${project.id}/print/settlement/${s.id}`}
                label="Quyết toán"
              />
            ))}
            <DocLink
              href={`/projects/${project.id}/print/acceptance-request`}
              label="BB nghiệm thu"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button
            variant="outline"
            render={
              <Link href={`/projects/new?from=${project.id}`}>
                <Plus className="size-4" />
                Công trình mới tại địa điểm này
              </Link>
            }
          />
          <ReopenButton project={project} />
        </div>
      </CardContent>
    </Card>
  );
}
