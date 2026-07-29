"use client";

import { useActionState, useState, useTransition } from "react";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { isObject } from "@yan/shared/utils";
import { Button } from "@yan/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@yan/ui/components/dialog";
import { Input } from "@yan/ui/components/input";

import {
  createProjectType,
  deleteProjectType,
  renameProjectType,
} from "../../projects/actions/project-types";
import type { ProjectType } from "../../projects/types";

const initialState: ServerActionState = {
  success: false,
  message: null,
  errors: {},
};

const toastTitles = { successToastTitle: "Thành công", errorToastTitle: "Lỗi" };

/**
 * Action payloads arrive as `unknown`; a loại công trình row is `{ id, name }`.
 * Anything else is dropped so the list never gains a blank entry.
 */
function toProjectType(data: unknown): ProjectType | null {
  if (!isObject(data)) return null;
  const { id, name } = data;
  return typeof id === "number" && typeof name === "string"
    ? { id, name }
    : null;
}

/** Delete echoes back just the removed row's id. */
function toDeletedId(data: unknown): number | null {
  if (!isObject(data)) return null;
  const { id } = data;
  return typeof id === "number" ? id : null;
}

export function ProjectTypesManager({
  types: initial,
}: {
  types: ProjectType[];
}) {
  const [types, setTypes] = useState<ProjectType[]>(initial);

  // --- add -----------------------------------------------------------------
  const [newName, setNewName] = useState("");
  const [createState, createAction] = useActionState(
    createProjectType,
    initialState
  );
  const [createPending, startCreate] = useTransition();

  // Append the row the server created and clear the input.
  const handleCreated = (data?: unknown) => {
    const type = toProjectType(data);
    if (!type) return;
    setTypes((prev) => [...prev, type]);
    setNewName("");
  };

  useServerAction(createState, createPending, {
    ...toastTitles,
    onSuccess: handleCreated,
  });

  // --- rename (payload carries the row id) ---------------------------------
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [renameState, renameAction] = useActionState(
    (_prev: ServerActionState, p: { id: number; name: string }) =>
      renameProjectType(p.id, _prev, { name: p.name }),
    initialState
  );
  const [renamePending, startRename] = useTransition();

  // Swap in the renamed row and close the inline input.
  const handleRenamed = (data?: unknown) => {
    const renamed = toProjectType(data);
    if (!renamed) return;
    setTypes((prev) => prev.map((t) => (t.id === renamed.id ? renamed : t)));
    setEditingId(null);
  };

  useServerAction(renameState, renamePending, {
    ...toastTitles,
    onSuccess: handleRenamed,
  });

  // --- delete (tiny confirm) -----------------------------------------------
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [deleteState, deleteAction] = useActionState(
    (_prev: ServerActionState, id: number) => deleteProjectType(id, _prev),
    initialState
  );
  const [deletePending, startDelete] = useTransition();

  // Drop the removed row and close the confirm dialog.
  const handleDeleted = (data?: unknown) => {
    const removedId = toDeletedId(data);
    if (removedId === null) return;
    setTypes((prev) => prev.filter((t) => t.id !== removedId));
    setConfirmId(null);
  };

  useServerAction(deleteState, deletePending, {
    ...toastTitles,
    onSuccess: handleDeleted,
  });

  const confirmType = types.find((t) => t.id === confirmId);

  // Row actions take the id/row so the list below allocates no closure per item.
  const saveRename = (id: number) =>
    startRename(() => renameAction({ id, name: editName.trim() }));

  const startEdit = (type: ProjectType) => {
    setEditingId(type.id);
    setEditName(type.name);
  };

  const cancelEdit = () => setEditingId(null);

  const addType = () =>
    startCreate(() => createAction({ name: newName.trim() }));

  const confirmDelete = () => {
    if (confirmId === null) return;
    startDelete(() => deleteAction(confirmId));
  };

  // Dialog closes on backdrop/escape as well as the buttons.
  const handleConfirmOpenChange = (open: boolean) => {
    if (!open) setConfirmId(null);
  };

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {types.map((t) => (
          <li key={t.id} className="flex items-center gap-2">
            {editingId === t.id ? (
              <>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="max-w-xs"
                  autoFocus
                />
                <Button
                  size="sm"
                  disabled={renamePending || !editName.trim()}
                  onClick={() => saveRename(t.id)}
                >
                  Lưu
                </Button>
                <Button size="sm" variant="ghost" onClick={cancelEdit}>
                  Hủy
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm">{t.name}</span>
                <Button size="sm" variant="ghost" onClick={() => startEdit(t)}>
                  Sửa
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => setConfirmId(t.id)}
                >
                  Xóa
                </Button>
              </>
            )}
          </li>
        ))}
        {types.length === 0 ? (
          <li className="text-sm text-muted-foreground">
            Chưa có loại công trình nào.
          </li>
        ) : null}
      </ul>

      {/* add row */}
      <div className="flex items-center gap-2 border-t pt-3">
        <Input
          placeholder="Thêm loại công trình..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="max-w-xs"
        />
        <Button
          size="sm"
          disabled={createPending || !newName.trim()}
          onClick={addType}
        >
          {createPending ? "Đang thêm..." : "Thêm"}
        </Button>
      </div>

      {/* delete confirm */}
      <Dialog open={confirmId !== null} onOpenChange={handleConfirmOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa loại công trình</DialogTitle>
            <DialogDescription>
              Xóa &ldquo;{confirmType?.name}&rdquo;? Không thể xóa nếu đang được
              sử dụng bởi công trình.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="ghost">Đóng</Button>} />
            <Button
              variant="destructive"
              disabled={deletePending || confirmId === null}
              onClick={confirmDelete}
            >
              {deletePending ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
