"use client";

import { useActionState, useState, useTransition } from "react";

import { useServerAction } from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
import { DateInput } from "@yan/ui/components/date-input/date-input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@yan/ui/components/dialog";
import { Label } from "@yan/ui/components/label";

import type { Quote } from "@/app/(dashboard)/quotes/types";
import { recordDeposit } from "@/app/(dashboard)/receivables/actions/record-deposit";
import { MoneyInput } from "@/components/money-input/money-input";
import { ACTIONS } from "@/constants/labels";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";
import { todayISO } from "@/utils/today-iso/today-iso";
import { vndInWords } from "@/utils/vnd-in-words/vnd-in-words";

import type { Project } from "../../../../types";
import { gateButtonProps } from "../../../utils/gate-button-props/gate-button-props";

/**
 * Gate action for `GateKey.DEPOSIT`: records the cọc as one paid deposit
 * milestone. Asked for in Hợp đồng and again in Hồ sơ while it's missing — the
 * server moves the job on when it lands (crm-api-nest common/stage.ts).
 */
export function RecordDeposit({
  project,
  dealQuote,
  primary,
}: {
  project: Project;
  dealQuote?: Quote;
  primary: boolean;
}) {
  const [state, action] = useActionState(
    recordDeposit.bind(null, project.id),
    INITIAL_ACTION_STATE
  );
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  // 60% of the chốt quote — blank when there is none, never a number from a
  // quote the client did not agree to.
  const [amount, setAmount] = useState<number | null>(
    dealQuote ? Math.round(dealQuote.total_amount * 0.6) : null
  );
  const [receivedDate, setReceivedDate] = useState(todayISO);
  useServerAction(state, isPending, {
    ...ACTION_TOAST_TITLES,
    onSuccess: () => setOpen(false),
  });

  // Confirm — records the paid cọc with its amount and received date.
  const handleConfirm = () =>
    startTransition(() =>
      action({ amount: amount ?? 0, received_date: receivedDate })
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button {...gateButtonProps(primary)} onClick={() => setOpen(true)}>
        Ghi nhận cọc
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ghi nhận cọc (tạm ứng)</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="deposit-amount">Số tiền (VND)</Label>
            <MoneyInput
              id="deposit-amount"
              value={amount}
              onChange={setAmount}
            />
            {amount ? (
              <p className="text-xs text-muted-foreground">
                {vndInWords(amount)}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="deposit-date">Ngày nhận</Label>
            <DateInput
              id="deposit-date"
              value={receivedDate}
              onChange={setReceivedDate}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose
            render={<Button variant="outline">{ACTIONS.close}</Button>}
          />
          <Button
            disabled={isPending || !amount || !receivedDate}
            onClick={handleConfirm}
          >
            {ACTIONS.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
