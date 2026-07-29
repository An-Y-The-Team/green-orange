import { SETTLEMENT_STEPPER } from "@/app/(dashboard)/receivables/constants";
import type { SettlementStatus } from "@/app/(dashboard)/receivables/enums";
import { settlementStatus } from "@/constants/labels";
import { labelOf } from "@/utils/label-of/label-of";

/** Nháp → Đã gửi → Đã ký, with the current step emphasised. */
export function SettlementStepper({ status }: { status: SettlementStatus }) {
  return (
    <ol className="flex items-center gap-x-2 text-xs">
      {SETTLEMENT_STEPPER.map((step, i) => (
        <li key={step} className="flex items-center gap-2">
          {i > 0 ? (
            <span aria-hidden className="text-muted-foreground">
              →
            </span>
          ) : null}
          <span
            className={
              step === status
                ? "font-medium text-foreground"
                : "text-muted-foreground"
            }
          >
            {labelOf(settlementStatus, step).label}
          </span>
        </li>
      ))}
    </ol>
  );
}
