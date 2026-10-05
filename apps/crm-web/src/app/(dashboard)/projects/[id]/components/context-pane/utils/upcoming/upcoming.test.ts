import { describe, expect, test } from "vitest";

import {
  MilestoneStatus,
  MilestoneType,
} from "@/app/(dashboard)/receivables/enums";
import type { PaymentMilestone } from "@/app/(dashboard)/receivables/types";

import { PaperworkNeededFor, PaperworkStatus } from "../../../../../enums";
import type { PaperworkItem } from "../../../../../types";
import { upcoming } from "./upcoming";

const paper = (status: PaperworkStatus, due_date?: string): PaperworkItem => ({
  id: 1,
  project_id: 1,
  name: "PCCC",
  status,
  due_date,
  needed_for: PaperworkNeededFor.EXECUTION,
});
const ms = (status: MilestoneStatus, due_date?: string): PaymentMilestone => ({
  id: 1,
  project_id: 1,
  type: MilestoneType.PROGRESS,
  amount: 1_000_000,
  status,
  due_date,
});

const today = "2026-10-05";

describe("upcoming", () => {
  test("sorted soonest first, past dates flagged overdue", () => {
    const out = upcoming({
      project: {},
      paperworkItems: [paper(PaperworkStatus.SUBMITTED, "2026-10-08")],
      milestones: [ms(MilestoneStatus.AWAITING_PAYMENT, "2026-10-01")],
      today,
    });
    expect(out.map((i) => [i.date, i.overdue])).toEqual([
      ["2026-10-01", true],
      ["2026-10-08", false],
    ]);
  });

  test("only submitted hồ sơ and unpaid đợt, and only with a date", () => {
    const out = upcoming({
      project: {},
      paperworkItems: [
        paper(PaperworkStatus.PREPARING, "2026-10-08"),
        paper(PaperworkStatus.APPROVED, "2026-10-08"),
        paper(PaperworkStatus.SUBMITTED),
      ],
      milestones: [
        ms(MilestoneStatus.PAID, "2026-10-09"),
        ms(MilestoneStatus.NOT_DUE),
      ],
      today,
    });
    expect(out).toEqual([]);
  });

  test("the appointment shows only until the visit is recorded", () => {
    const appointment_at = "2026-10-05T07:00:00.000Z";
    expect(
      upcoming({
        project: { appointment_at },
        paperworkItems: [],
        milestones: [],
        today,
      })
    ).toHaveLength(1);
    expect(
      upcoming({
        project: { appointment_at, visit_date: "2026-10-05" },
        paperworkItems: [],
        milestones: [],
        today,
      })
    ).toEqual([]);
  });
});
