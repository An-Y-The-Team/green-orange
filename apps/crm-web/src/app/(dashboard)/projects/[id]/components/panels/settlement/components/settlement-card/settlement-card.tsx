"use client";

import { Printer } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";
import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import { DateInput } from "@yan/ui/components/date-input/date-input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@yan/ui/components/dialog";
import { Label } from "@yan/ui/components/label";

import { deleteSettlement } from "@/app/(dashboard)/receivables/actions/delete-settlement";
import {
  sendSettlement,
  signSettlement,
  unsignSettlement,
} from "@/app/(dashboard)/receivables/actions/settlement-status";
import {
  BillStatus,
  MilestoneStatus,
  MilestoneType,
  SettlementStatus,
} from "@/app/(dashboard)/receivables/enums";
import type {
  Bill,
  PaymentMilestone,
  Settlement,
} from "@/app/(dashboard)/receivables/types";
import { settlementStatus } from "@/constants/labels";
import { useRun } from "@/hooks/use-run/use-run";
import { formatDate } from "@/utils/format-date/format-date";
import { formatVND } from "@/utils/format-vnd/format-vnd";
import { todayISO } from "@/utils/today-iso/today-iso";

import { AddMilestone } from "../add-milestone/add-milestone";
import { BillRow } from "../bill-row/bill-row";
import { MilestoneRow } from "../milestone-row/milestone-row";
import { SettlementStepper } from "../settlement-stepper/settlement-stepper";

// The server refuses un-signing in English and apiSend wraps it in the raw HTTP
// line; this UI is Vietnamese-only, so map it before the toast. Only reachable
// in a race (a payment recorded while this page is stale) — the button below is
// disabled whenever we can already see the collected đợt.
const COLLECTED_ERROR = "payments have already been collected";
const COLLECTED_MESSAGE =
  "Không thể mở lại quyết toán: hóa đơn đã thu tiền ở đợt ngoài cọc.";

const unsignInVietnamese = async (
  settlementId: number,
  prev: ServerActionState
): Promise<ServerActionState> => {
  const state = await unsignSettlement(settlementId, prev);
  if (!state?.success && state?.message?.includes(COLLECTED_ERROR)) {
    return { ...state, message: COLLECTED_MESSAGE };
  }
  return state;
};

/**
 * The single quyết toán for a công trình (1:1), its hóa đơn, and its đợt
 * thanh toán. Signing is the money-minting step; un-signing is the correction
 * path (there's no second settlement to supersede this one) — available only
 * until a đợt beyond the cọc is collected.
 */
export function SettlementCard({
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
  const [signedDate, setSignedDate] = useState(todayISO);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [unsignOpen, setUnsignOpen] = useState(false);

  const isDraft = settlement.status === SettlementStatus.DRAFT;
  const isSent = settlement.status === SettlementStatus.SENT;
  const isSigned = settlement.status === SettlementStatus.SIGNED;

  const [sendPending, runSend] = useRun(
    sendSettlement.bind(null, settlement.id)
  );
  const [signPending, runSign] = useRun(
    signSettlement.bind(null, settlement.id),
    () => setSignOpen(false)
  );
  const [unsignPending, runUnsign] = useRun(
    unsignInVietnamese.bind(null, settlement.id),
    () => setUnsignOpen(false)
  );
  const [deletePending, runDelete] = useRun(
    deleteSettlement.bind(null, settlement.id),
    () => setDeleteOpen(false)
  );
  const busy = sendPending || signPending || unsignPending || deletePending;

  const milestones = [...extraMilestones, ...billMilestones];

  // Mirrors the server's un-sign guard (receivables.module.ts): once the bill is
  // paid, or any đợt other than the cọc is collected, un-signing is refused —
  // so don't offer it. Correcting a partly-collected quyết toán needs an
  // adjustment đợt, not a re-open.
  const collected =
    bill?.status === BillStatus.PAID ||
    billMilestones.some(
      (m) =>
        m?.status === MilestoneStatus.PAID && m?.type !== MilestoneType.DEPOSIT
    );

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

      <SettlementStepper status={settlement.status} />

      {settlement.signed_date ? (
        <p className="text-xs text-muted-foreground">
          Đã ký {formatDate(settlement.signed_date)}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {isDraft || isSent ? (
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
        {isSigned ? (
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={busy || collected}
              onClick={() => setUnsignOpen(true)}
            >
              Sửa lại (bỏ ký)
            </Button>
            {collected ? (
              <span className="self-center text-xs text-muted-foreground">
                Đã thu tiền ở đợt ngoài cọc nên không mở lại được — điều chỉnh
                bằng một đợt thanh toán mới.
              </span>
            ) : null}
          </>
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
            <DateInput
              id={`signed-${settlement.id}`}
              value={signedDate}
              onChange={setSignedDate}
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

      {/* Un-sign — the correction path (one quyết toán per công trình) */}
      <Dialog open={unsignOpen} onOpenChange={setUnsignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mở lại quyết toán để sửa?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Mỗi công trình chỉ có một quyết toán, nên sai số được sửa trên QT #
            {settlement.id} này. Hóa đơn quay về nháp và các đợt thanh toán của
            hóa đơn bị xóa; đợt cọc được giữ lại và tự gắn lại khi ký lần nữa.
            Chỉ mở lại được khi chưa thu tiền ở đợt nào ngoài đợt cọc.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnsignOpen(false)}>
              Đóng
            </Button>
            <Button disabled={busy} onClick={() => runUnsign()}>
              Mở lại để sửa
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
