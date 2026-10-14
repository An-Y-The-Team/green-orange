import { SettlementStatus } from "@/app/(dashboard)/receivables/enums";
import type { Settlement } from "@/app/(dashboard)/receivables/types";
import { StepState } from "@/components/step-list/enums";
import { formatDate } from "@/utils/format-date/format-date";
import { formatVND } from "@/utils/format-vnd/format-vnd";
import { settlementTotals } from "@/utils/quote-totals/quote-totals";

import { SettlementStepKey } from "../../enums";

export interface SettlementStep {
  key: SettlementStepKey;
  title: string;
  state: StepState;
  summary?: string;
}

// Index of the step being worked on, by settlement status (none = step 0).
const NOW_INDEX: Record<SettlementStatus, number> = {
  [SettlementStatus.DRAFT]: 1,
  [SettlementStatus.SENT]: 2,
  [SettlementStatus.SIGNED]: 3,
};

/**
 * The four steps of the Quyết toán stepper, derived from the one settlement's
 * status. Steps before the current one are done, after it are future.
 */
export function settlementSteps({
  settlement,
  signedFileName,
}: {
  settlement?: Settlement;
  signedFileName?: string;
}): SettlementStep[] {
  const nowIndex = settlement ? NOW_INDEX[settlement.status] : 0;
  const stateOf = (i: number) =>
    i < nowIndex
      ? StepState.DONE
      : i === nowIndex
        ? StepState.NOW
        : StepState.FUTURE;

  const signed = [
    settlement?.signed_date
      ? `Đã ký ${formatDate(settlement.signed_date)}`
      : "Đã ký",
    signedFileName,
  ]
    .filter(Boolean)
    .join(" · ");

  const steps: SettlementStep[] = [
    {
      key: SettlementStepKey.CREATE,
      title: "Lập quyết toán",
      state: stateOf(0),
      summary: settlement
        ? `QT #${settlement.id} · ${formatVND(settlementTotals(settlement).total)}`
        : undefined,
    },
    {
      key: SettlementStepKey.SEND,
      title: "Gửi khách",
      state: stateOf(1),
      summary: "Đã gửi",
    },
    {
      key: SettlementStepKey.SIGN,
      title: "Khách ký quyết toán",
      state: stateOf(2),
      summary: signed,
    },
    {
      key: SettlementStepKey.COLLECT,
      title: "Thu tiền",
      state: stateOf(3),
      summary: "Các đợt còn lại tạo khi khách ký",
    },
  ];
  return steps;
}
