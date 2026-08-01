"use client";

import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  type KeyboardEvent,
  useActionState,
  useState,
  useTransition,
} from "react";

import { useServerAction } from "@yan/shared/hooks/use-server-actions";
import { isObject } from "@yan/shared/utils";
import { Button } from "@yan/ui/components/button";
import { Card, CardContent } from "@yan/ui/components/card";
import { Input } from "@yan/ui/components/input";

import { ACTIONS } from "@/constants/labels";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";

import { createRole, deleteRole, renameRole } from "../../actions/roles";
import type { CrewRole } from "../../types";

/**
 * Action payloads arrive as `unknown`; a vị trí row is just `{ id, name }`, so
 * anything else is dropped here instead of putting a blank row in the list.
 */
function toRole(data: unknown): CrewRole | null {
  if (!isObject(data)) return null;
  const { id, name } = data;
  return typeof id === "number" && typeof name === "string"
    ? { id, name }
    : null;
}

export function RolesTab({ roles: initial }: { roles: CrewRole[] }) {
  // Local list so inline add/rename/delete reflect immediately (revalidatePath
  // refreshes the server data too, but client state wouldn't otherwise reset).
  const [roles, setRoles] = useState<CrewRole[]>(initial);
  const [newName, setNewName] = useState("");

  const [state, formAction] = useActionState(createRole, INITIAL_ACTION_STATE);
  const [isPending, startTransition] = useTransition();

  // Append the row the server created and clear the input.
  const handleCreated = (data?: unknown) => {
    const role = toRole(data);
    if (!role) return;
    setRoles((prev) => [...prev, role]);
    setNewName("");
  };

  useServerAction(state, isPending, {
    ...ACTION_TOAST_TITLES,
    onSuccess: handleCreated,
  });

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    startTransition(() => formAction({ name }));
  };

  // Enter submits the new-role input without submitting an enclosing form.
  const handleNewNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    add();
  };

  // Row callbacks live here so the map below allocates no closure per role.
  const handleRenamed = (role: CrewRole) =>
    setRoles((prev) => prev.map((x) => (x.id === role.id ? role : x)));

  const handleDeleted = (id: number) =>
    setRoles((prev) => prev.filter((x) => x.id !== id));

  return (
    <Card>
      <CardContent className="space-y-2">
        <ul className="divide-y">
          {roles.map((role) => (
            <RoleRow
              key={role.id}
              role={role}
              onRenamed={handleRenamed}
              onDeleted={handleDeleted}
            />
          ))}
        </ul>

        <div className="flex items-center gap-2 pt-2">
          <Input
            placeholder="Tên vị trí mới…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleNewNameKeyDown}
          />
          <Button
            size="sm"
            disabled={isPending || !newName.trim()}
            onClick={add}
          >
            <Plus className="size-4" />
            {ACTIONS.add}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RoleRow({
  role,
  onRenamed,
  onDeleted,
}: {
  role: CrewRole;
  onRenamed: (role: CrewRole) => void;
  onDeleted: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(role.name);

  const [renameState, renameAction] = useActionState(
    renameRole.bind(null, role.id),
    INITIAL_ACTION_STATE
  );
  const [renamePending, startRename] = useTransition();

  // Push the renamed row back up to the list, then close the inline input.
  const handleRenamed = (data?: unknown) => {
    const role = toRole(data);
    if (!role) return;
    onRenamed(role);
    setEditing(false);
  };

  useServerAction(renameState, renamePending, {
    ...ACTION_TOAST_TITLES,
    onSuccess: handleRenamed,
  });

  const [deleteState, deleteAction] = useActionState(
    deleteRole.bind(null, role.id),
    INITIAL_ACTION_STATE
  );
  const [deletePending, startDelete] = useTransition();
  useServerAction(deleteState, deletePending, {
    ...ACTION_TOAST_TITLES,
    onSuccess: () => onDeleted(role.id),
  });

  const save = () => {
    const next = name.trim();
    if (!next) return;
    startRename(() => renameAction({ name: next }));
  };

  // Enter saves the rename without submitting an enclosing form.
  const handleNameKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    save();
  };

  // Discard the edit: restore the row's stored name and close the input.
  const cancelEdit = () => {
    setName(role.name);
    setEditing(false);
  };

  return (
    <li className="flex items-center gap-2 py-2">
      {editing ? (
        <>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleNameKeyDown}
            className="h-8"
          />
          <Button
            size="icon"
            variant="ghost"
            disabled={renamePending || !name.trim()}
            onClick={save}
          >
            <Check className="size-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={cancelEdit}>
            <X className="size-4" />
          </Button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm">{role.name}</span>
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled={deletePending}
            onClick={() => startDelete(() => deleteAction())}
          >
            <Trash2 className="size-4" />
          </Button>
        </>
      )}
    </li>
  );
}
