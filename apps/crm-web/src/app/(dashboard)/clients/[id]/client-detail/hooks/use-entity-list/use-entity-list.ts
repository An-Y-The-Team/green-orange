"use client";

import { useActionState, useState, useTransition } from "react";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";

import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";

import { ADD_MODE } from "./constants";

/** `null` = nothing open, `ADD_MODE` = add row open, a number = editing that id. */
export type EntityListMode = null | typeof ADD_MODE | number;

/**
 * The add/edit/delete machinery shared by the contacts and locations lists on
 * the client detail page: which row is open, the in-progress draft, and the
 * three server actions wired to keep `items` in sync optimistically.
 *
 * The caller owns `items` state (contacts are lifted to the page so the location
 * manager dropdown can read them), so only the setter is passed in.
 */
export function useEntityList<T extends { id: number }, V>({
  setItems,
  emptyDraft,
  toDraft,
  create,
  update,
  remove,
}: {
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  emptyDraft: V;
  /** Maps an existing row into an editable draft. */
  toDraft: (item: T) => V;
  create: (prev: ServerActionState, values: V) => Promise<ServerActionState>;
  update: (
    prev: ServerActionState,
    payload: { id: number; values: V }
  ) => Promise<ServerActionState>;
  remove: (prev: ServerActionState, id: number) => Promise<ServerActionState>;
}) {
  const [mode, setMode] = useState<EntityListMode>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [draft, setDraft] = useState<V>(emptyDraft);

  const [createState, createAction] = useActionState(
    create,
    INITIAL_ACTION_STATE
  );
  const [creating, startCreate] = useTransition();
  useServerAction(createState, creating, {
    ...ACTION_TOAST_TITLES,
    onSuccess: (data) => {
      setItems((prev) => [...prev, data as T]);
      setMode(null);
    },
  });

  const [updateState, updateAction] = useActionState(
    update,
    INITIAL_ACTION_STATE
  );
  const [updating, startUpdate] = useTransition();
  useServerAction(updateState, updating, {
    ...ACTION_TOAST_TITLES,
    onSuccess: (data) => {
      const saved = data as T;
      setItems((prev) => prev.map((x) => (x.id === saved.id ? saved : x)));
      setMode(null);
    },
  });

  const [removeState, removeAction] = useActionState(
    remove,
    INITIAL_ACTION_STATE
  );
  const [removing, startRemove] = useTransition();
  useServerAction(removeState, removing, {
    ...ACTION_TOAST_TITLES,
    onSuccess: (data) => {
      const removedId = (data as { id: number }).id;
      setItems((prev) => prev.filter((x) => x.id !== removedId));
      setConfirmId(null);
    },
  });

  // Open a blank add row.
  const startAdd = () => {
    setDraft(emptyDraft);
    setMode(ADD_MODE);
  };

  // Open an existing row for editing, seeded from its current values.
  const startEdit = (item: T) => {
    setDraft(toDraft(item));
    setMode(item.id);
  };

  // Routes to create or update depending on which row is open.
  const save = () => {
    if (mode === ADD_MODE) startCreate(() => createAction(draft));
    else if (typeof mode === "number")
      startUpdate(() => updateAction({ id: mode, values: draft }));
  };

  const confirmRemove = (id: number) => startRemove(() => removeAction(id));

  return {
    mode,
    confirmId,
    setConfirmId,
    draft,
    setDraft,
    startAdd,
    startEdit,
    cancel: () => setMode(null),
    save,
    confirmRemove,
    saving: creating || updating,
    removing,
  };
}
