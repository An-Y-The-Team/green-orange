"use client";

import { Plus } from "lucide-react";
import {
  type KeyboardEvent,
  useActionState,
  useState,
  useTransition,
} from "react";

import { useServerAction } from "@yan/shared/hooks/use-server-actions";
import { isObject } from "@yan/shared/utils";
import { Button } from "@yan/ui/components/button";
import { Input } from "@yan/ui/components/input";

import { ACTIONS, FIELDS } from "@/constants/labels";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";

import { createProjectType } from "../../actions/project-types";
import type { ProjectType } from "../../types";

/** Action payloads arrive as `unknown`; a loại công trình row is `{ id, name }`. */
function toProjectType(data: unknown): ProjectType | null {
  if (!isObject(data)) return null;
  const { id, name } = data;
  return typeof id === "number" && typeof name === "string"
    ? { id, name }
    : null;
}

/**
 * Loại công trình picker — a project has 1..n types, so these are toggle chips,
 * never a single select. Types created here are real rows (same list Settings
 * manages); the inline add exists because scope is discovered mid-call and
 * leaving intake to go to Settings loses the form.
 */
export function TypeChips({
  types,
  selected,
  onToggle,
}: {
  types: ProjectType[];
  selected: number[];
  onToggle: (typeId: number) => void;
}) {
  const [added, setAdded] = useState<ProjectType[]>([]);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  const [state, formAction] = useActionState(
    createProjectType,
    INITIAL_ACTION_STATE
  );
  const [isPending, startTransition] = useTransition();

  // A new type is only ever created to be used — select it right away.
  const handleCreated = (data?: unknown) => {
    const type = toProjectType(data);
    if (!type) return;
    setAdded((prev) => [...prev, type]);
    onToggle(type.id);
    setName("");
    setAdding(false);
  };

  useServerAction(state, isPending, {
    ...ACTION_TOAST_TITLES,
    onSuccess: handleCreated,
  });

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(() => formAction({ name: trimmed }));
  };

  // Enter saves, Escape backs out — the input is one field, no form to submit.
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
    if (event.key === "Escape") setAdding(false);
  };

  // Server list + anything created in this session (dedup: a refresh may have
  // already folded a local row into `types`).
  const all = [
    ...types,
    ...added.filter((a) => !types.some((t) => t.id === a.id)),
  ];

  return (
    // The visible <Label> beside this is a sibling of a *group of buttons*, so
    // it associates with nothing — the group names itself instead. And each
    // chip is a toggle: without aria-pressed its selected state was carried by
    // the button variant, i.e. by colour alone.
    <div
      role="group"
      aria-label={FIELDS.projectType}
      className="flex flex-wrap items-center gap-2"
    >
      {all.map((t) => (
        <Button
          key={t.id}
          type="button"
          size="sm"
          aria-pressed={selected.includes(t.id)}
          variant={selected.includes(t.id) ? "default" : "outline"}
          onClick={() => onToggle(t.id)}
        >
          {t.name}
        </Button>
      ))}

      {adding ? (
        <>
          <Input
            // Focus follows the reveal: this input only exists because the user
            // clicked "Loại khác", and the next thing they do is type in it.
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            aria-label="Tên loại công trình mới"
            className="h-8 w-40"
            placeholder="Tên loại mới"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button
            type="button"
            size="sm"
            disabled={isPending || !name.trim()}
            onClick={submit}
          >
            {isPending ? ACTIONS.saving : ACTIONS.save}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setAdding(false)}
          >
            {ACTIONS.cancel}
          </Button>
        </>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setAdding(true)}
        >
          <Plus className="size-4" />
          Loại khác
        </Button>
      )}
    </div>
  );
}
