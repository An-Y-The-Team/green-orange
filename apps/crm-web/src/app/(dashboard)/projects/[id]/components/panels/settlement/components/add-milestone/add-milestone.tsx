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
import { Label } from "@yan/ui/components/label";

import { createMilestone } from "@/app/(dashboard)/receivables/actions/milestones";
import { MoneyInput } from "@/components/money-input/money-input";
import { useRun } from "@/hooks/use-run/use-run";
import { vndInWords } from "@/utils/vnd-in-words/vnd-in-words";

/** "+ Thêm đợt" — adds a payment milestone against the settlement's bill. */
export function AddMilestone({
  projectId,
  billId,
}: {
  projectId: number;
  billId: number;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState("");

  const [pending, run] = useRun(createMilestone.bind(null, projectId), () => {
    setOpen(false);
    setAmount(null);
    setDueDate("");
  });

  const submit = () =>
    run({
      bill_id: billId,
      amount: amount ?? 0,
      due_date: dueDate || undefined,
    });

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
              <MoneyInput id="dot-amount" value={amount} onChange={setAmount} />
              {amount ? (
                <p className="text-xs text-muted-foreground">
                  {vndInWords(amount)}
                </p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="dot-due">Hạn thu (tùy chọn)</Label>
              <DateInput id="dot-due" value={dueDate} onChange={setDueDate} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Đóng
            </Button>
            <Button disabled={pending || !amount} onClick={submit}>
              Thêm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
