"use client";

import { useState } from "react";

import { Button } from "@yan/ui/components/button";
import { DateInput } from "@yan/ui/components/date-input/date-input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@yan/ui/components/dialog";
import { Input } from "@yan/ui/components/input";
import { Label } from "@yan/ui/components/label";

import { decideQuote } from "@/app/(dashboard)/quotes/actions/decide-quote";
import {
  type QuoteDecision,
  QuoteStatus,
} from "@/app/(dashboard)/quotes/enums";
import { ACTIONS } from "@/constants/labels";
import { useRun } from "@/hooks/use-run/use-run";
import { formatVND } from "@/utils/format-vnd/format-vnd";

export function FieldQuoteCard({
  quoteId,
  projectId,
  code,
  version,
  total,
}: {
  quoteId: number;
  projectId: number;
  code: string;
  version: number;
  total: number;
}) {
  const [isPending, runDecide] = useRun(decideQuote.bind(null, quoteId));

  const [holdOpen, setHoldOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const [reason, setReason] = useState(`Khách hủy báo giá v${version}`);

  const decide = (
    status: QuoteDecision,
    extra?: { follow_up_date?: string; cancel_reason?: string }
  ) => runDecide({ status, projectId, version, ...extra });

  // Hoãn — records the follow-up date, then closes the dialog; the toast from
  // useRun reports the outcome.
  const confirmHold = () => {
    decide(QuoteStatus.ON_HOLD, { follow_up_date: followUp });
    setHoldOpen(false);
  };

  // Hủy — same shape as Hoãn, with the required reason instead of a date.
  const confirmCancel = () => {
    decide(QuoteStatus.REJECTED, { cancel_reason: reason.trim() });
    setCancelOpen(false);
  };

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">
          {code} · v{version}
        </span>
        <span className="font-semibold tabular-nums">{formatVND(total)}</span>
      </div>

      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={isPending}
          onClick={() => decide(QuoteStatus.DEAL)}
        >
          Chốt
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          disabled={isPending}
          onClick={() => setHoldOpen(true)}
        >
          Hoãn
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          disabled={isPending}
          onClick={() => setCancelOpen(true)}
        >
          {ACTIONS.cancel}
        </Button>
      </div>

      <Dialog open={holdOpen} onOpenChange={setHoldOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hoãn báo giá</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="follow_up_date">Hẹn theo dõi lại ngày nào?</Label>
            <DateInput
              id="follow_up_date"
              value={followUp}
              onChange={setFollowUp}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHoldOpen(false)}>
              {ACTIONS.close}
            </Button>
            <Button disabled={isPending || !followUp} onClick={confirmHold}>
              Xác nhận hoãn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hủy báo giá</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="cancel_reason">Lý do hủy</Label>
            <Input
              id="cancel_reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              {ACTIONS.close}
            </Button>
            <Button
              variant="destructive"
              disabled={isPending || !reason.trim()}
              onClick={confirmCancel}
            >
              Xác nhận hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
