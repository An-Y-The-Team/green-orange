import { describe, expect, test } from "vitest";

import { SettlementStatus } from "@/app/(dashboard)/receivables/enums";
import type { Settlement } from "@/app/(dashboard)/receivables/types";
import { StepState } from "@/components/step-list/enums";

import { settlementSteps } from "./settlement-steps";

const settlement = (status: SettlementStatus): Settlement => ({
  id: 7,
  project_id: 1,
  status,
  total_amount: 350_000_000,
  discount_amount: 0,
  vat_rate: 0,
  signed_date: status === SettlementStatus.SIGNED ? "2026-10-05" : null,
  items: [],
});

const states = (s?: Settlement) =>
  settlementSteps({ settlement: s }).map((step) => step.state);

const { DONE, NOW, FUTURE } = StepState;

describe("settlementSteps", () => {
  test("none: only Lập is now", () => {
    expect(states()).toEqual([NOW, FUTURE, FUTURE, FUTURE]);
  });
  test("draft", () => {
    expect(states(settlement(SettlementStatus.DRAFT))).toEqual([
      DONE,
      NOW,
      FUTURE,
      FUTURE,
    ]);
  });
  test("sent", () => {
    expect(states(settlement(SettlementStatus.SENT))).toEqual([
      DONE,
      DONE,
      NOW,
      FUTURE,
    ]);
  });
  test("signed", () => {
    expect(states(settlement(SettlementStatus.SIGNED))).toEqual([
      DONE,
      DONE,
      DONE,
      NOW,
    ]);
  });
  test("summaries", () => {
    const steps = settlementSteps({
      settlement: settlement(SettlementStatus.SIGNED),
      signedFileName: "bien-ban.pdf",
    });
    expect(steps[0]?.summary).toContain("QT #7");
    expect(steps[0]?.summary).toContain("350.000.000");
    expect(steps[1]?.summary).toBe("Đã gửi");
    expect(steps[2]?.summary).toBe("Đã ký 05/10/2026 · bien-ban.pdf");
    expect(settlementSteps({})[3]?.summary).toBe(
      "Các đợt còn lại tạo khi khách ký"
    );
  });
});
