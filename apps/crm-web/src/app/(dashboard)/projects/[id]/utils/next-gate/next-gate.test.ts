import { describe, expect, test } from "vitest";

import { GateKey } from "../../../enums";
import type { StageGate } from "../stage-gates/stage-gates";
import { nextGate } from "./next-gate";

const row = (key: GateKey, done = false): StageGate => ({
  key,
  label: key,
  done,
});

describe("nextGate", () => {
  test("the first open row with an action wins", () => {
    const gates = [
      row(GateKey.QUOTE_DEAL, true),
      row(GateKey.CLIENT_SIGNED),
      row(GateKey.DEPOSIT),
    ];
    const actionable = new Set([GateKey.CLIENT_SIGNED, GateKey.DEPOSIT]);
    expect(nextGate(gates, actionable)?.key).toBe(GateKey.CLIENT_SIGNED);
  });

  // The bug this guards: a row with nothing to press (survey data is typed
  // into the panel, not a button) must not swallow the green button.
  test("an open row with no action is skipped", () => {
    const gates = [row(GateKey.SURVEY_DATA), row(GateKey.QUOTE_FROM_SURVEY)];
    expect(nextGate(gates, new Set([GateKey.QUOTE_FROM_SURVEY]))?.key).toBe(
      GateKey.QUOTE_FROM_SURVEY
    );
  });

  test("done rows never come back", () => {
    const gates = [row(GateKey.DEPOSIT, true)];
    expect(nextGate(gates, new Set([GateKey.DEPOSIT]))).toBeUndefined();
  });

  test("nothing actionable → no green button", () => {
    expect(nextGate([row(GateKey.BILL_OFFICIAL)], new Set())).toBeUndefined();
  });
});
