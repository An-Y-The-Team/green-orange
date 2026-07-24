"use client";

import { useActionState, useState, useTransition } from "react";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
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
import { formatVND } from "@/lib/format";

const initialState: ServerActionState = { success: false };
const toastOpts = { successToastTitle: "Thành công", errorToastTitle: "Lỗi" };

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
  const [state, formAction] = useActionState(
    decideQuote.bind(null, quoteId),
    initialState
  );
  const [isPending, startTransition] = useTransition();
  useServerAction(state, isPending, toastOpts);

  const [holdOpen, setHoldOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const [reason, setReason] = useState(`Khách hủy báo giá v${version}`);

  const decide = (
    status: "deal" | "on_hold" | "rejected",
    extra?: { follow_up_date?: string; cancel_reason?: string }
  ) =>
    startTransition(() => formAction({ status, projectId, version, ...extra }));

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
          onClick={() => decide("deal")}
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
          Hủy
        </Button>
      </div>

      <Dialog open={holdOpen} onOpenChange={setHoldOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hoãn báo giá</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="follow_up_date">Hẹn theo dõi lại ngày nào?</Label>
            <Input
              id="follow_up_date"
              type="date"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHoldOpen(false)}>
              Đóng
            </Button>
            <Button
              disabled={isPending || !followUp}
              onClick={() => {
                decide("on_hold", { follow_up_date: followUp });
                setHoldOpen(false);
              }}
            >
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
              Đóng
            </Button>
            <Button
              variant="destructive"
              disabled={isPending || !reason.trim()}
              onClick={() => {
                decide("rejected", { cancel_reason: reason.trim() });
                setCancelOpen(false);
              }}
            >
              Xác nhận hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
