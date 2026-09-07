import { ExecutionSubStatus } from "../../../../enums";

/** Forward-only, hoarding skippable. Order drives the stepper dots. */
export const EXECUTION_STEPS: ExecutionSubStatus[] =
  Object.values(ExecutionSubStatus);
