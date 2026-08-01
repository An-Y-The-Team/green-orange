"use client";

import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@yan/ui/components/button";

import { ACTIONS } from "@/constants/labels";

/**
 * Trailing edit/delete buttons for a contact or location row. Delete is a
 * two-tap inline confirm (tap the bin, then "Xóa?") rather than a dialog.
 */
export function EntityRowActions({
  id,
  confirmId,
  setConfirmId,
  onEdit,
  onRemove,
  removing,
}: {
  id: number;
  confirmId: number | null;
  setConfirmId: (id: number | null) => void;
  onEdit: () => void;
  onRemove: () => void;
  removing: boolean;
}) {
  if (confirmId === id) {
    return (
      <>
        <Button
          size="sm"
          variant="destructive"
          disabled={removing}
          onClick={onRemove}
        >
          Xóa?
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>
          {ACTIONS.cancel}
        </Button>
      </>
    );
  }

  return (
    <>
      <Button size="sm" variant="ghost" onClick={onEdit}>
        <Pencil className="size-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-destructive"
        onClick={() => setConfirmId(id)}
      >
        <Trash2 className="size-4" />
      </Button>
    </>
  );
}
