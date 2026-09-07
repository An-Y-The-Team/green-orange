import { describe, expect, test } from "vitest";

import { QuoteStatus } from "@/app/(dashboard)/quotes/enums";
import type { Quote } from "@/app/(dashboard)/quotes/types";
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

import {
  AcceptanceSubStatus,
  PaperworkStatus,
  ProjectStage,
} from "../../../enums";
import type { PaperworkItem, Project } from "../../../types";
import { gateProgress, stageGates } from "./stage-gates";

// One fixture per stage, shaped like the seeded dataset (one project per stage).
const base = {
  id: 1,
  code: "CT-2026-001",
  client_id: 1,
  location_id: 1,
  working_contact_id: 1,
  decision_maker_contact_id: 1,
  name: "Nhà anh Tuấn",
  status: "active",
  types: [],
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
} as unknown as Project;

const project = (over: Partial<Project>): Project => ({ ...base, ...over });
const quote = (over: Partial<Quote>): Quote =>
  ({ id: 1, version: 1, status: QuoteStatus.DRAFT, ...over }) as Quote;
const paperwork = (status: PaperworkStatus, id = 1): PaperworkItem =>
  ({ id, project_id: 1, name: "Giấy phép", status }) as PaperworkItem;
const milestone = (
  type: MilestoneType,
  status: MilestoneStatus
): PaymentMilestone => ({ id: 1, type, status }) as PaymentMilestone;

const keys = (gs: { key: string; done: boolean }[]) =>
  Object.fromEntries(gs.map((g) => [g.key, g.done]));

describe("stage 1 — Yêu cầu & Khảo sát", () => {
  test("a bare request has nothing done", () => {
    const gs = stageGates({
      project: project({ stage: ProjectStage.REQUEST }),
    });
    expect(keys(gs)).toEqual({
      appointment: false,
      visit: false,
      survey_data: false,
    });
  });

  // The appointment IS the survey visit (one stage), so survey data can arrive
  // as measured items, a note, or a photo row — any of the three counts.
  test.each([
    ["survey_items", { survey_items: [{ name: "Kính mặt ngoài" }] }],
    ["survey_note", { survey_note: "Đo lại tầng 15" }],
  ])("survey data via %s", (_label, over) => {
    const gs = stageGates({
      project: project({ stage: ProjectStage.REQUEST, ...over }),
    });
    expect(keys(gs).survey_data).toBe(true);
  });

  test("survey data via an attachment row", () => {
    const gs = stageGates({
      project: project({ stage: ProjectStage.REQUEST }),
      attachments: [{ id: 1 }] as never,
    });
    expect(keys(gs).survey_data).toBe(true);
  });

  test("a whitespace-only survey note does not count", () => {
    const gs = stageGates({
      project: project({ stage: ProjectStage.REQUEST, survey_note: "   " }),
    });
    expect(keys(gs).survey_data).toBe(false);
  });
});

describe("stage 2 — Báo giá", () => {
  test("versions exist but none is chốt", () => {
    const gs = stageGates({
      project: project({ stage: ProjectStage.QUOTE }),
      quotes: [
        quote({ version: 1, status: QuoteStatus.REJECTED }),
        quote({ version: 2, status: QuoteStatus.WAITING }),
      ],
    });
    expect(keys(gs)).toEqual({ quote_exists: true, quote_deal: false });
    expect(gs.find((g) => g.key === "quote_exists")?.detail).toBe(
      "2 phiên bản"
    );
  });

  test("a deal quote closes the stage and names its version", () => {
    const gs = stageGates({
      project: project({ stage: ProjectStage.QUOTE }),
      quotes: [quote({ version: 2, status: QuoteStatus.DEAL })],
    });
    expect(keys(gs).quote_deal).toBe(true);
    expect(gs.find((g) => g.key === "quote_deal")?.detail).toBe("v2");
  });

  // The panel reads quotes off GET /projects/:id; an explicit list is the
  // fresher one and must win.
  test("falls back to project.quotes, and an explicit list overrides it", () => {
    const withEmbedded = project({
      stage: ProjectStage.QUOTE,
      quotes: [quote({ status: QuoteStatus.DEAL })],
    });
    expect(keys(stageGates({ project: withEmbedded })).quote_deal).toBe(true);
    expect(
      keys(stageGates({ project: withEmbedded, quotes: [] })).quote_deal
    ).toBe(false);
  });
});

describe("stage 3 — Hợp đồng", () => {
  test("all three conditions, independently", () => {
    const gs = stageGates({
      project: project({
        stage: ProjectStage.CONTRACT,
        client_signed_date: "2026-09-03",
        quotes: [quote({ status: QuoteStatus.DEAL })],
      }),
      milestones: [milestone(MilestoneType.DEPOSIT, MilestoneStatus.PAID)],
    });
    expect(keys(gs)).toEqual({
      quote_deal: true,
      client_signed: true,
      deposit: true,
    });
  });

  // The rule is the *deposit* milestone paid, not any paid milestone.
  test("a paid progress milestone is not the cọc", () => {
    const gs = stageGates({
      project: project({ stage: ProjectStage.CONTRACT }),
      milestones: [milestone(MilestoneType.PROGRESS, MilestoneStatus.PAID)],
    });
    expect(keys(gs).deposit).toBe(false);
  });

  test("an unpaid deposit is not the cọc either", () => {
    const gs = stageGates({
      project: project({ stage: ProjectStage.CONTRACT }),
      milestones: [
        milestone(MilestoneType.DEPOSIT, MilestoneStatus.AWAITING_PAYMENT),
      ],
    });
    expect(keys(gs).deposit).toBe(false);
  });
});

describe("stage 4 — Chuẩn bị hồ sơ", () => {
  test("partly approved reports the count", () => {
    const gs = stageGates({
      project: project({ stage: ProjectStage.PAPERWORK }),
      paperworkItems: [
        paperwork(PaperworkStatus.APPROVED, 1),
        paperwork(PaperworkStatus.SUBMITTED, 2),
        paperwork(PaperworkStatus.PREPARING, 3),
      ],
    });
    expect(keys(gs).paperwork_approved).toBe(false);
    expect(gs[0].detail).toBe("1/3 đã duyệt");
  });

  test("all approved closes it", () => {
    const gs = stageGates({
      project: project({ stage: ProjectStage.PAPERWORK }),
      paperworkItems: [paperwork(PaperworkStatus.APPROVED, 1)],
    });
    expect(keys(gs).paperwork_approved).toBe(true);
  });

  // The bug this guards: `every()` on an empty array is true, so a project with
  // no hồ sơ rows would have reported "toàn bộ hồ sơ đã duyệt".
  test("no paperwork rows is NOT done", () => {
    const gs = stageGates({
      project: project({ stage: ProjectStage.PAPERWORK }),
      paperworkItems: [],
    });
    expect(keys(gs).paperwork_approved).toBe(false);
    expect(gs[0].detail).toBe("—");
  });
});

describe("stages 5–6 — Thi công, Nghiệm thu", () => {
  test("execution wants a start date and a finish confirmation", () => {
    expect(
      keys(stageGates({ project: project({ stage: ProjectStage.EXECUTION }) }))
    ).toEqual({ start_date: false, works_done: false });
    expect(
      keys(
        stageGates({
          project: project({
            stage: ProjectStage.EXECUTION,
            start_date: "2026-09-01",
            works_done_at: "2026-09-05T03:00:00.000Z",
          }),
        })
      )
    ).toEqual({ start_date: true, works_done: true });
  });

  test("acceptance is done only at `passed`", () => {
    for (const sub of [
      AcceptanceSubStatus.REQUEST_SENT,
      AcceptanceSubStatus.INSPECTING,
      AcceptanceSubStatus.REWORK,
    ]) {
      const gs = stageGates({
        project: project({
          stage: ProjectStage.ACCEPTANCE,
          acceptance_sub_status: sub,
        }),
      });
      expect(keys(gs).acceptance_passed, sub).toBe(false);
    }
    const passed = stageGates({
      project: project({
        stage: ProjectStage.ACCEPTANCE,
        acceptance_sub_status: AcceptanceSubStatus.PASSED,
        acceptance_passed_date: "2026-09-06",
      }),
    });
    expect(keys(passed).acceptance_passed).toBe(true);
    expect(passed[0].detail).toBe("2026-09-06");
  });
});

describe("stage 7 — Quyết toán & Thanh toán", () => {
  const signed = { id: 1, status: SettlementStatus.SIGNED } as Settlement;
  const bill = (status: BillStatus) => ({ id: 1, status }) as Bill;

  test("a signed settlement, official bill and fully collected milestones", () => {
    const gs = stageGates({
      project: project({ stage: ProjectStage.SETTLEMENT }),
      settlements: [signed],
      bills: [bill(BillStatus.PAID)],
      milestones: [
        milestone(MilestoneType.DEPOSIT, MilestoneStatus.PAID),
        milestone(MilestoneType.ACCEPTANCE, MilestoneStatus.PAID),
      ],
    });
    expect(keys(gs)).toEqual({
      settlement_exists: true,
      settlement_signed: true,
      bill_official: true,
      milestones_paid: true,
    });
  });

  test("a draft settlement exists but is not signed, and a draft bill is not official", () => {
    const gs = stageGates({
      project: project({ stage: ProjectStage.SETTLEMENT }),
      settlements: [{ id: 1, status: SettlementStatus.DRAFT } as Settlement],
      bills: [bill(BillStatus.DRAFT)],
      milestones: [
        milestone(MilestoneType.DEPOSIT, MilestoneStatus.PAID),
        milestone(MilestoneType.ACCEPTANCE, MilestoneStatus.AWAITING_PAYMENT),
      ],
    });
    expect(keys(gs)).toEqual({
      settlement_exists: true,
      settlement_signed: false,
      bill_official: false,
      milestones_paid: false,
    });
    expect(gs.find((g) => g.key === "milestones_paid")?.detail).toBe(
      "1/2 đã thu"
    );
  });

  test("no milestones is NOT collected in full", () => {
    const gs = stageGates({
      project: project({ stage: ProjectStage.SETTLEMENT }),
      milestones: [],
    });
    expect(keys(gs).milestones_paid).toBe(false);
  });
});

describe("stage 8 — Đã đóng, and the progress helper", () => {
  test("closed is terminal: no gates at all", () => {
    expect(
      stageGates({ project: project({ stage: ProjectStage.CLOSED }) })
    ).toEqual([]);
  });

  // An empty list must read as "nothing to show", not "0/0 điều kiện".
  test("gateProgress is null for a stage with no gates", () => {
    expect(gateProgress([])).toBeNull();
    expect(
      gateProgress([
        { key: "a", label: "a", done: true },
        { key: "b", label: "b", done: false },
      ])
    ).toEqual({ done: 1, total: 2 });
  });

  // Every stage in the pipeline must be handled — a missing case returned
  // `undefined` and crashed the panel.
  test("every stage returns an array", () => {
    for (const stage of Object.values(ProjectStage)) {
      expect(
        Array.isArray(stageGates({ project: project({ stage }) })),
        stage
      ).toBe(true);
    }
  });
});
