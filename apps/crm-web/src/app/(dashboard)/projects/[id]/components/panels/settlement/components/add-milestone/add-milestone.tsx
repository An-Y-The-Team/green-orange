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

import { createMilestone } from "@/app/(dashboard)/receivables/actions/milestones";
import { useRun } from "@/hooks/use-run/use-run";

/** "+ Thêm đợt" — adds a payment milestone against the settlement's bill. */
export function AddMilestone({
  projectId,
  billId,
}: {
  projectId: number;
  billId: number;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [pending, run] = useRun(createMilestone.bind(null, projectId), () => {
    setOpen(false);
    setAmount("");
    setDueDate("");
  });

  const submit = () =>
    run({
      bill_id: billId,
      amount: Number(amount),
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
