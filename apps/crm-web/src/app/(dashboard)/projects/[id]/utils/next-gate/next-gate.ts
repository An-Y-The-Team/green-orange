import type { GateKey } from "../../../enums";
import type { StageGate } from "../stage-gates/stage-gates";

/**
 * The one row the operator should act on now: the first open gate that has an
 * action available. Its button is the stage's only green button; every other
 * row's action renders outline (crm-ui-redesign.md, "Buttons vs badges").
 *
 * `actionable` is the set of keys the panel can satisfy right now — a key is
 * missing when its button doesn't apply yet (no quote to send, no settlement to
 * sign), so a blocked row never steals the green button from the one that can
 * actually move.
 */
export function nextGate({
  gates,
  actionable,
}: {
  gates: StageGate[];
  actionable: ReadonlySet<GateKey>;
}): StageGate | undefined {
  return gates.find((g) => !g.done && actionable.has(g.key));
}
