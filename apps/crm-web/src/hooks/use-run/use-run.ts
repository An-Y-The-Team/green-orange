"use client";

import { useActionState, useTransition } from "react";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";

import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";

/**
 * Thin wrapper over the shared server-action plumbing so each button stays
 * terse: wires `useActionState` + pending state + the standard toast pair.
 *
 * `I` is the action's input payload and is inferred from `action`. Actions that
 * take no payload (a bound `deleteQuote.bind(null, id)`) leave `I` at `void`, so
 * `run()` is callable with no argument — that's what the old `as never` casts and
 * `input: any` were papering over.
 */
export function useRun<I = void>(
  action: (
    prev: ServerActionState,
    input: I
  ) => ServerActionState | Promise<ServerActionState>,
  onSuccess?: (data?: { id?: number }) => void
) {
  const [state, dispatch] = useActionState(action, INITIAL_ACTION_STATE);
  const [isPending, startTransition] = useTransition();

  useServerAction(state, isPending, { ...ACTION_TOAST_TITLES, onSuccess });

  const run = (input: I) => startTransition(() => dispatch(input));

  return [isPending, run] as const;
}
