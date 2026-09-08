"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";

import { useServerAction } from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";

import { ACTIONS } from "@/constants/labels";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";

import { setUserGroups } from "../../actions/set-groups";
import type { AkGroup } from "../../types";

/**
 * Tick the groups a user belongs to. `groups` is already the manageable set
 * (the page drops superuser groups); `lockedPk` is the one box this user may
 * not untick — their own `crm-admins` — the server refuses it too.
 */
export function GroupPicker({
  pk,
  groups,
  current,
  lockedPk,
}: {
  pk: number;
  groups: AkGroup[];
  current: string[];
  lockedPk?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(current);
  const [state, run] = useActionState(
    setUserGroups.bind(null, pk),
    INITIAL_ACTION_STATE
  );
  const [pending, start] = useTransition();
  useServerAction(state, pending, {
    ...ACTION_TOAST_TITLES,
    onSuccess: () => router.refresh(),
  });

  const dirty =
    selected.length !== current.length ||
    selected.some((g) => !current.includes(g));

  const toggle = (groupPk: string, on: boolean) =>
    setSelected((prev) =>
      on ? [...prev, groupPk] : prev.filter((g) => g !== groupPk)
    );

  if (groups.length === 0) {
    return <p className="text-sm text-muted-foreground">Chưa có nhóm nào.</p>;
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(() => run({ groups: selected }));
      }}
    >
      <ul className="space-y-1.5">
        {groups.map((g) => {
          const locked = g.pk === lockedPk;
          return (
            <li key={g.pk}>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-3.5"
                  checked={selected.includes(g.pk)}
                  disabled={locked || pending}
                  onChange={(e) => toggle(g.pk, e.target.checked)}
                />
                {g.name}
                {locked ? (
                  <span className="text-xs text-muted-foreground">
                    (nhóm của chính bạn)
                  </span>
                ) : null}
              </label>
            </li>
          );
        })}
      </ul>
      <Button type="submit" size="sm" disabled={!dirty || pending}>
        {pending ? ACTIONS.saving : "Lưu nhóm"}
      </Button>
    </form>
  );
}
