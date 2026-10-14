import { useActionState, useTransition } from "react";

import { useServerAction } from "@yan/shared/hooks/use-server-actions";

import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";

import { updateProjectWithNote } from "../../../../../../actions/update-project-with-note";

type Input = Parameters<typeof updateProjectWithNote>[2];

/**
 * One acceptance step: a patch plus its history note, through
 * updateProjectWithNote. `onSuccess` lets a form close itself.
 */
export function useAcceptanceAction({
  projectId,
  onSuccess,
}: {
  projectId: number;
  onSuccess?: () => void;
}) {
  const [state, action] = useActionState(
    updateProjectWithNote.bind(null, projectId),
    INITIAL_ACTION_STATE
  );
  const [pending, start] = useTransition();
  useServerAction(state, pending, { ...ACTION_TOAST_TITLES, onSuccess });

  // Fires the action inside the transition so `pending` tracks it.
  const run = (input: Input) => start(() => action(input));

  return { run, pending };
}
