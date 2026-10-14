import { describe, expect, test } from "vitest";

import { StepState } from "@/components/step-list/enums";

import {
  AcceptanceNoteTag,
  AcceptanceSubStatus,
} from "../../../../../../enums";
import type { Project } from "../../../../../../types";
import { AcceptanceStepKey } from "../../enums";
import { acceptanceSteps } from "./acceptance-step";

const note = (id: number, tag: string) => ({
  id,
  project_id: 1,
  tag,
  body: "x",
  created_at: "2026-09-01T00:00:00.000Z",
});

const make = (over: Partial<Project>) =>
  ({ id: 1, notes: [], ...over }) as unknown as Project;

const statesOf = (over: Partial<Project>) =>
  acceptanceSteps({ project: make(over) }).steps.map((s) => s.state);

const { DONE, NOW, FUTURE } = StepState;

describe("acceptanceSteps", () => {
  test("null counts as request_sent", () => {
    expect(statesOf({ acceptance_sub_status: null })).toEqual([
      NOW,
      FUTURE,
      FUTURE,
    ]);
  });

  test("request_sent", () => {
    expect(
      statesOf({ acceptance_sub_status: AcceptanceSubStatus.REQUEST_SENT })
    ).toEqual([NOW, FUTURE, FUTURE]);
  });

  test("inspecting", () => {
    const { steps } = acceptanceSteps({
      project: make({
        acceptance_sub_status: AcceptanceSubStatus.INSPECTING,
        acceptance_scheduled_date: "2026-09-03",
      }),
    });
    expect(steps.map((s) => s.state)).toEqual([DONE, NOW, FUTURE]);
    expect(steps[0].summary).toBe("Ngày hẹn: 03/09/2026");
    expect(steps[1].badge).toBeUndefined();
  });

  test("rework shows the badge with the number of rework notes", () => {
    const { steps, reworkCount } = acceptanceSteps({
      project: make({
        acceptance_sub_status: AcceptanceSubStatus.REWORK,
        notes: [
          note(1, AcceptanceNoteTag.REWORK),
          note(2, AcceptanceNoteTag.REWORK_DONE),
          note(3, AcceptanceNoteTag.REWORK),
        ],
      }),
    });
    expect(reworkCount).toBe(2);
    expect(steps.map((s) => s.state)).toEqual([DONE, NOW, FUTURE]);
    expect(steps[1].badge).toBe("Đang sửa lỗi · lần 2");
  });

  test("signing", () => {
    const { steps } = acceptanceSteps({
      project: make({ acceptance_sub_status: AcceptanceSubStatus.SIGNING }),
    });
    expect(steps.map((s) => s.state)).toEqual([DONE, DONE, NOW]);
    expect(steps[1].summary).toBe("Nghiệm thu Đạt · không phải sửa");
  });

  test("passed is all done with the rework count and the date", () => {
    const { steps } = acceptanceSteps({
      project: make({
        acceptance_sub_status: AcceptanceSubStatus.PASSED,
        acceptance_passed_date: "2026-09-06",
        notes: [note(1, AcceptanceNoteTag.REWORK)],
      }),
    });
    expect(steps.map((s) => s.state)).toEqual([DONE, DONE, DONE]);
    expect(steps[1].summary).toBe("Nghiệm thu Đạt · sửa lỗi 1 lần");
    expect(steps[2].summary).toBe("Hoàn tất 06/09/2026");
    expect(steps.map((s) => s.key)).toEqual([
      AcceptanceStepKey.SCHEDULE,
      AcceptanceStepKey.INSPECT,
      AcceptanceStepKey.SIGN,
    ]);
  });
});
