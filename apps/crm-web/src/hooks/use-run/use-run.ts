"use client";

import { useQueryClient } from "@tanstack/react-query";
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
 *
 * `D` is the success payload handed to `onSuccess`, so a caller that needs the
 * saved row (the chấm công grid merges it back into the week it renders) can
 * annotate it instead of narrowing `unknown`.
 *
 * `silent` drops the success toast only — a failure still toasts. That is what a
 * grid of autosaving cells wants: 35 "Thành công" toasts for one week of hours
 * is noise, a failed save is not.
 */
export function useRun<I = void, D = { id?: number }>(
  action: (
    prev: ServerActionState,
    input: I
  ) => ServerActionState | Promise<ServerActionState>,
  onSuccess?: (data?: D) => void,
  options?: { silent?: boolean }
) {
  const [state, dispatch] = useActionState(action, INITIAL_ACTION_STATE);
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();

  useServerAction<D>(state as ServerActionState<D>, isPending, {
    ...ACTION_TOAST_TITLES,
    onSuccess: (data) => {
      // A server action's `revalidatePath` refreshes the RSC tree and says
      // nothing to the client-side list queries (use-filter-list). Buttons that
      // write from INSIDE such a table — the money screen's "Ghi nhận đã thu" —
      // toasted success and left the row reading its old status until a manual
      // reload. Invalidating only refetches what is mounted.
      void queryClient.invalidateQueries();
      onSuccess?.(data);
    },
    silent: options?.silent,
  });

  const run = (input: I) => startTransition(() => dispatch(input));

  return [isPending, run] as const;
}
