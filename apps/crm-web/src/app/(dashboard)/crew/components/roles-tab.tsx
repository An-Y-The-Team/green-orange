"use client";

import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useActionState, useState, useTransition } from "react";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
import { Card, CardContent } from "@yan/ui/components/card";
import { Input } from "@yan/ui/components/input";

import { createRole, deleteRole, renameRole } from "../actions/roles";
import type { CrewRole } from "../types";

const initialState: ServerActionState = { success: false };

export function RolesTab({ roles: initial }: { roles: CrewRole[] }) {
  // Local list so inline add/rename/delete reflect immediately (revalidatePath
  // refreshes the server data too, but client state wouldn't otherwise reset).
  const [roles, setRoles] = useState<CrewRole[]>(initial);
  const [newName, setNewName] = useState("");

  const [state, formAction] = useActionState(createRole, initialState);
  const [isPending, startTransition] = useTransition();
  useServerAction(state, isPending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
    onSuccess: (data) => {
      setRoles((prev) => [...prev, data as CrewRole]);
      setNewName("");
    },
  });

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    startTransition(() => formAction({ name }));
  };

  return (
    <Card>
      <CardContent className="space-y-2">
        <ul className="divide-y">
          {roles.map((role) => (
            <RoleRow
              key={role.id}
              role={role}
              onRenamed={(r) =>
                setRoles((prev) => prev.map((x) => (x.id === r.id ? r : x)))
              }
              onDeleted={(id) =>
                setRoles((prev) => prev.filter((x) => x.id !== id))
              }
            />
          ))}
        </ul>

        <div className="flex items-center gap-2 pt-2">
          <Input
            placeholder="Tên vai trò mới…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
          />
          <Button
            size="sm"
            disabled={isPending || !newName.trim()}
            onClick={add}
          >
            <Plus className="size-4" />
            Thêm
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
    initialState
  );
  const [renamePending, startRename] = useTransition();
  useServerAction(renameState, renamePending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
    onSuccess: (data) => {
      onRenamed(data as CrewRole);
      setEditing(false);
    },
  });

  const [deleteState, deleteAction] = useActionState(
    deleteRole.bind(null, role.id),
    initialState
  );
  const [deletePending, startDelete] = useTransition();
  useServerAction(deleteState, deletePending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
    onSuccess: () => onDeleted(role.id),
  });

  const save = () => {
    const next = name.trim();
    if (!next) return;
    startRename(() => renameAction({ name: next }));
  };

  return (
    <li className="flex items-center gap-2 py-2">
      {editing ? (
        <>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              }
            }}
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
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              setName(role.name);
              setEditing(false);
            }}
          >
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
