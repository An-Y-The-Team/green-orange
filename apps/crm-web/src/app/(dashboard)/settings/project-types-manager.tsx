"use client";

import { useActionState, useState, useTransition } from "react";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
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
} from "../projects/actions/project-types";
import type { ProjectType } from "../projects/types";

const initialState: ServerActionState = {
  success: false,
  message: null,
  errors: {},
};

const toastTitles = { successToastTitle: "Thành công", errorToastTitle: "Lỗi" };

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
  useServerAction(createState, createPending, {
    ...toastTitles,
    onSuccess: (data) => {
      setTypes((prev) => [...prev, data as ProjectType]);
      setNewName("");
    },
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
  useServerAction(renameState, renamePending, {
    ...toastTitles,
    onSuccess: (data) => {
      setTypes((prev) =>
        prev.map((t) =>
          t.id === (data as ProjectType).id ? (data as ProjectType) : t
        )
      );
      setEditingId(null);
    },
  });

  // --- delete (tiny confirm) -----------------------------------------------
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [deleteState, deleteAction] = useActionState(
    (_prev: ServerActionState, id: number) => deleteProjectType(id, _prev),
    initialState
  );
  const [deletePending, startDelete] = useTransition();
  useServerAction(deleteState, deletePending, {
    ...toastTitles,
    onSuccess: (data) => {
      setTypes((prev) =>
        prev.filter((t) => t.id !== (data as { id: number }).id)
      );
      setConfirmId(null);
    },
  });

  const confirmType = types.find((t) => t.id === confirmId);

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
                  onClick={() =>
                    startRename(() =>
                      renameAction({ id: t.id, name: editName.trim() })
                    )
                  }
                >
                  Lưu
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingId(null)}
                >
                  Hủy
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm">{t.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingId(t.id);
                    setEditName(t.name);
                  }}
                >
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
          onClick={() =>
            startCreate(() => createAction({ name: newName.trim() }))
          }
        >
          {createPending ? "Đang thêm..." : "Thêm"}
        </Button>
      </div>

      {/* delete confirm */}
      <Dialog
        open={confirmId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmId(null);
        }}
      >
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
              onClick={() =>
                confirmId !== null && startDelete(() => deleteAction(confirmId))
              }
            >
              {deletePending ? "Đang xóa..." : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
