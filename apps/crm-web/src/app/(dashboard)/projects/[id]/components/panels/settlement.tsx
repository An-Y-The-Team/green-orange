"use client";

import { Printer } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@yan/ui/components/dialog";
import { Input } from "@yan/ui/components/input";
import { Label } from "@yan/ui/components/label";
import { Separator } from "@yan/ui/components/separator";

import type { Quote } from "@/app/(dashboard)/quotes/types";
import { deleteSettlement } from "@/app/(dashboard)/receivables/actions/delete-settlement";
import {
  createMilestone,
  markMilestonePaid,
} from "@/app/(dashboard)/receivables/actions/milestones";
import {
  sendSettlement,
  signSettlement,
} from "@/app/(dashboard)/receivables/actions/settlement-status";
import { updateBill } from "@/app/(dashboard)/receivables/actions/update-bill";
import {
  BillStatus,
  MilestoneStatus,
  SettlementStatus,
} from "@/app/(dashboard)/receivables/enums";
import type {
  Bill,
  PaymentMilestone,
  Settlement,
} from "@/app/(dashboard)/receivables/types";
import { formatDate, formatVND, isOverdue } from "@/lib/format";
import {
  billStatus,
  milestoneStatus,
  milestoneType,
  overdue,
  projectStage,
  settlementStatus,
} from "@/lib/labels";

import { ProjectStage } from "../../../enums";
import type { Project } from "../../../types";

const TODAY = () => new Date().toISOString().slice(0, 10);
const BILL_ORDER: BillStatus[] = [
  BillStatus.DRAFT,
  BillStatus.OFFICIAL,
  BillStatus.SENT,
  BillStatus.PAID,
];

// Thin wrapper over the shared server-action plumbing (same as the quote panel).
function useRun(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: (prev: ServerActionState, input: any) => Promise<ServerActionState>,
  onSuccess?: () => void
) {
  const [state, formAction] = useActionState(fn, {
    success: false,
  } as ServerActionState);
  const [isPending, startTransition] = useTransition();
  useServerAction(state, isPending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
    onSuccess,
  });
  const run = (input?: unknown) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startTransition(() => formAction(input as any));
  return [isPending, run] as const;
}

// ---- milestone row --------------------------------------------------------

function MilestoneRow({
  milestone,
  projectId,
}: {
  milestone: PaymentMilestone;
  projectId: number;
}) {
  const [open, setOpen] = useState(false);
  const [paidDate, setPaidDate] = useState(TODAY);
  const paid = milestone.status === MilestoneStatus.PAID;
  const late = isOverdue(milestone.due_date, paid);

  const [pending, run] = useRun(
    markMilestonePaid.bind(
      null,
      milestone.id,
      projectId,
      milestone.status
    ) as never,
    () => setOpen(false)
  );

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-medium">{milestoneType[milestone.type]}</span>
      <span className="tabular-nums">{formatVND(milestone.amount)}</span>
      {milestone.due_date ? (
        <span className="text-muted-foreground">
          hạn {formatDate(milestone.due_date)}
        </span>
      ) : null}
      {late ? (
        <Badge variant={overdue.variant}>{overdue.label}</Badge>
      ) : (
        <Badge variant={milestoneStatus[milestone.status].variant}>
          {milestoneStatus[milestone.status].label}
        </Badge>
      )}
      {paid && milestone.paid_date ? (
        <span className="text-muted-foreground">
          {formatDate(milestone.paid_date)}
        </span>
      ) : null}

      {!paid ? (
        <>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => setOpen(true)}
          >
            Ghi nhận đã thu
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ghi nhận đã thu</DialogTitle>
              </DialogHeader>
              <div className="space-y-1">
                <Label htmlFor={`paid-${milestone.id}`}>Ngày thu</Label>
                <Input
                  id={`paid-${milestone.id}`}
                  type="date"
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Đóng
                </Button>
                <Button
                  disabled={pending || !paidDate}
                  onClick={() => run({ paid_date: paidDate })}
                >
                  Xác nhận
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </div>
  );
}

// ---- add đợt dialog -------------------------------------------------------

function AddMilestone({
  projectId,
  billId,
}: {
  projectId: number;
  billId: number;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [pending, run] = useRun(
    createMilestone.bind(null, projectId) as never,
    () => {
      setOpen(false);
      setAmount("");
      setDueDate("");
    }
  );

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        + Thêm đợt
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm đợt thanh toán</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="dot-amount">Số tiền</Label>
              <Input
                id="dot-amount"
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dot-due">Hạn thu (tùy chọn)</Label>
              <Input
                id="dot-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Đóng
            </Button>
            <Button
              disabled={pending || !amount}
              onClick={() =>
                run({
                  bill_id: billId,
                  amount: Number(amount),
                  due_date: dueDate || undefined,
                })
              }
            >
              Thêm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---- bill row -------------------------------------------------------------

function BillRow({ bill, projectId }: { bill: Bill; projectId: number }) {
  const idx = BILL_ORDER.indexOf(bill.status);
  const [pending, run] = useRun(
    updateBill.bind(null, bill.id, projectId) as never
  );
  const official = idx >= BILL_ORDER.indexOf(BillStatus.OFFICIAL);

  return (
    <div className="space-y-1 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium">Hóa đơn HĐ #{bill.id}</span>
        <Badge variant={billStatus[bill.status].variant}>
          {billStatus[bill.status].label}
        </Badge>
        {bill.status === BillStatus.DRAFT ? (
          <span className="text-muted-foreground">(chính thức khi ký)</span>
        ) : (
          <span className="ml-auto font-semibold tabular-nums">
            {formatVND(bill.total_amount)}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="ghost"
          size="sm"
          render={
            <Link
              href={`/projects/${projectId}/print/bill/${bill.id}`}
              target="_blank"
            />
          }
        >
          <Printer className="size-4" />
          In đề nghị thanh toán
        </Button>
        {official && idx < BILL_ORDER.indexOf(BillStatus.SENT) ? (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => run({ status: BillStatus.SENT })}
          >
            Đã gửi
          </Button>
        ) : null}
        {official && idx < BILL_ORDER.indexOf(BillStatus.PAID) ? (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => run({ status: BillStatus.PAID })}
          >
            Đã thu
          </Button>
        ) : null}
      </div>
    </div>
  );
}

// ---- settlement stepper ---------------------------------------------------

const STEPPER: SettlementStatus[] = [
  SettlementStatus.DRAFT,
  SettlementStatus.SENT,
  SettlementStatus.SIGNED,
];

function Stepper({ status }: { status: SettlementStatus }) {
  return (
    <ol className="flex items-center gap-x-2 text-xs">
      {STEPPER.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          {i > 0 ? (
            <span aria-hidden className="text-muted-foreground">
              →
            </span>
          ) : null}
          <span
            className={
              s === status
                ? "font-medium text-foreground"
                : "text-muted-foreground"
            }
          >
            {settlementStatus[s].label}
          </span>
        </li>
      ))}
    </ol>
  );
}

// ---- settlement card ------------------------------------------------------

function SettlementCard({
  settlement,
  bill,
  billMilestones,
  extraMilestones,
  projectId,
}: {
  settlement: Settlement;
  bill?: Bill | null;
  billMilestones: PaymentMilestone[];
  extraMilestones: PaymentMilestone[];
  projectId: number;
}) {
  const [signOpen, setSignOpen] = useState(false);
  const [signedDate, setSignedDate] = useState(TODAY);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isDraft = settlement.status === SettlementStatus.DRAFT;
  const isSent = settlement.status === SettlementStatus.SENT;
  const isSigned = settlement.status === SettlementStatus.SIGNED;

  const [sendPending, runSend] = useRun(
    sendSettlement.bind(null, settlement.id) as never
  );
  const [signPending, runSign] = useRun(
    signSettlement.bind(null, settlement.id) as never,
    () => setSignOpen(false)
  );
  const [deletePending, runDelete] = useRun(
    deleteSettlement.bind(null, settlement.id) as never,
    () => setDeleteOpen(false)
  );
  const busy = sendPending || signPending || deletePending;

  const milestones = [...extraMilestones, ...billMilestones];

  return (
    <div
      className={
        isSigned
          ? "space-y-3 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4"
          : "space-y-3 rounded-lg border p-4"
      }
    >
      {/* Settlement row */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">QT #{settlement.id}</span>
        <Badge variant={settlementStatus[settlement.status].variant}>
          {settlementStatus[settlement.status].label}
        </Badge>
        <span className="ml-auto font-semibold tabular-nums">
          {formatVND(settlement.total_amount)}
        </span>
      </div>

      <Stepper status={settlement.status} />

      {settlement.signed_date ? (
        <p className="text-xs text-muted-foreground">
          Đã ký {formatDate(settlement.signed_date)}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {isDraft ? (
          <Button
            variant="outline"
            size="sm"
            render={
              <Link
                href={`/projects/${projectId}/settlements/${settlement.id}/edit`}
              />
            }
          >
            Sửa
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          render={
            <Link
              href={`/projects/${projectId}/print/settlement/${settlement.id}`}
              target="_blank"
            />
          }
        >
          <Printer className="size-4" />
          In
        </Button>
        {isDraft ? (
          <Button size="sm" disabled={busy} onClick={() => runSend()}>
            Đã gửi
          </Button>
        ) : null}
        {isSent ? (
          <Button size="sm" disabled={busy} onClick={() => setSignOpen(true)}>
            ✓ Đã ký
          </Button>
        ) : null}
        {isDraft ? (
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => setDeleteOpen(true)}
          >
            Xóa nháp
          </Button>
        ) : null}
      </div>

      {/* Bill row — officializes on sign */}
      {bill ? <BillRow bill={bill} projectId={projectId} /> : null}

      {/* Đợt thanh toán */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Đợt thanh toán</h4>
          {bill ? (
            <AddMilestone projectId={projectId} billId={bill.id} />
          ) : null}
        </div>
        {milestones.length > 0 ? (
          <div className="space-y-1.5">
            {milestones.map((m) => (
              <MilestoneRow key={m.id} milestone={m} projectId={projectId} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Chưa có đợt thanh toán.
          </p>
        )}
      </div>

      {/* Sign — tiny date confirm */}
      <Dialog open={signOpen} onOpenChange={setSignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận khách đã ký</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Hóa đơn sẽ thành chính thức với tổng{" "}
            {formatVND(settlement.total_amount)}, đợt cọc được gắn vào hóa đơn
            và đợt còn lại được tạo tự động.
          </p>
          <div className="space-y-1">
            <Label htmlFor={`signed-${settlement.id}`}>Ngày ký</Label>
            <Input
              id={`signed-${settlement.id}`}
              type="date"
              value={signedDate}
              onChange={(e) => setSignedDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignOpen(false)}>
              Đóng
            </Button>
            <Button
              disabled={busy || !signedDate}
              onClick={() => runSign({ signed_date: signedDate })}
            >
              Xác nhận đã ký
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete draft — tiny confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa quyết toán nháp?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            QT #{settlement.id} và hóa đơn nháp của nó sẽ bị xóa.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Đóng
            </Button>
            <Button
              variant="destructive"
              disabled={deletePending}
              onClick={() => runDelete()}
            >
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- panel ----------------------------------------------------------------

export function SettlementPanel({
  project,
  settlements,
  bills,
  milestones,
  dealQuote,
}: {
  project: Project;
  settlements: Settlement[];
  bills: Bill[];
  milestones: PaymentMilestone[];
  dealQuote?: Quote;
}) {
  const label = projectStage[ProjectStage.SETTLEMENT].label;

  // Newest/active settlement on top.
  const ordered = [...settlements].sort((a, b) => b.id - a.id);

  const billFor = (s: Settlement) =>
    s.bill ?? bills.find((b) => b.settlement_id === s.id) ?? null;

  // Unallocated deposit(s) (pre-bill, stage 4) surface on the top card — that's
  // where the sign transaction attaches them.
  const unallocated = milestones.filter((m) => m.bill_id == null);

  const collected = milestones
    .filter((m) => m.status === MilestoneStatus.PAID)
    .reduce((s, m) => s + m.amount, 0);
  const target = settlements.reduce((s, st) => s + st.total_amount, 0);

  return (
    <Card id="stage-settlement" className="mb-6 scroll-mt-4">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
          Giai đoạn 8 · {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {ordered.length > 0 ? (
          ordered.map((s, i) => {
            const bill = billFor(s);
            return (
              <SettlementCard
                key={s.id}
                settlement={s}
                bill={bill}
                billMilestones={
                  bill ? milestones.filter((m) => m.bill_id === bill.id) : []
                }
                extraMilestones={i === 0 ? unallocated : []}
                projectId={project.id}
              />
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">
            {dealQuote
              ? "Chưa có quyết toán. Quyết toán mới sẽ lấy hạng mục từ báo giá đã chốt."
              : "Chưa có quyết toán."}
          </p>
        )}

        <Separator />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm">
            <span className="text-muted-foreground">Toàn công trình: </span>
            Đã thu{" "}
            <span className="font-semibold tabular-nums">
              {formatVND(collected)}
            </span>{" "}
            / <span className="tabular-nums">{formatVND(target)}</span>
          </p>
          <Button
            size="sm"
            render={<Link href={`/projects/${project.id}/settlements/new`} />}
          >
            + Quyết toán mới
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
