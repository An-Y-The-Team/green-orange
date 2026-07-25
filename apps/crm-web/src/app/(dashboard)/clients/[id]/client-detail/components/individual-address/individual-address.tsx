"use client";

import { Pencil } from "lucide-react";
import { useActionState, useState, useTransition } from "react";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";
import { Input } from "@yan/ui/components/input";

import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";

import { updateLocation } from "../../../../actions/locations";
import type { LocationFormValues } from "../../../../schema";
import type { Location } from "../../../../types";

/**
 * An individual (non-company) client has exactly one location, shown as a plain
 * editable address rather than the full locations manager.
 */
export function IndividualAddress({
  clientId,
  location,
}: {
  clientId: number;
  location?: Location;
}) {
  const [address, setAddress] = useState(location?.address ?? "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(address);

  const [state, action] = useActionState(
    (prev: ServerActionState, input: LocationFormValues) =>
      updateLocation(location!.id, clientId, prev, input),
    INITIAL_ACTION_STATE
  );
  const [pending, start] = useTransition();
  useServerAction(state, pending, {
    ...ACTION_TOAST_TITLES,
    onSuccess: (data) => {
      setAddress((data as Location).address);
      setEditing(false);
    },
  });

  if (!location) return null;

  // Locations keep their name on save; only the address is editable here.
  const save = () =>
    start(() => action({ name: location.name, address: draft.trim() }));

  return (
    <Card className="gap-3">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Địa chỉ</CardTitle>
          {!editing ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setDraft(address);
                setEditing(true);
              }}
            >
              <Pencil className="size-4" />
              Sửa
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={pending || !draft.trim()}
                onClick={save}
              >
                {pending ? "Đang lưu..." : "Lưu"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(false)}
              >
                Hủy
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm">{address || "—"}</p>
        )}
      </CardContent>
    </Card>
  );
}
