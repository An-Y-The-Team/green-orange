"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";
import { Input } from "@yan/ui/components/input";

import { SELECT_CLASS } from "@/components/form-bits/form-bits";
import { ACTIONS, FIELDS } from "@/constants/labels";

import {
  createLocation,
  deleteLocation,
  updateLocation,
} from "../../../../actions/locations";
import type { LocationFormValues } from "../../../../schema";
import type { Contact, Location } from "../../../../types";
import { ADD_MODE } from "../../hooks/use-entity-list/constants";
import { useEntityList } from "../../hooks/use-entity-list/use-entity-list";
import { EntityRowActions } from "../entity-row-actions/entity-row-actions";
import { EMPTY_LOCATION_DRAFT } from "./constants";

/** Company clients manage many locations, each optionally owned by a contact. */
export function LocationsSection({
  clientId,
  initial,
  contacts,
}: {
  clientId: number;
  initial: Location[];
  contacts: Contact[];
}) {
  const [items, setItems] = useState<Location[]>(initial);

  const list = useEntityList<Location, LocationFormValues>({
    setItems,
    emptyDraft: EMPTY_LOCATION_DRAFT,
    toDraft: (l) => ({
      name: l.name,
      address: l.address,
      manager_contact_id: l.manager_contact_id,
    }),
    create: (prev: ServerActionState, values) =>
      createLocation(clientId, prev, values),
    update: (prev: ServerActionState, { id, values }) =>
      updateLocation(id, clientId, prev, values),
    remove: (prev: ServerActionState, id) => deleteLocation(id, clientId, prev),
  });

  const { draft, setDraft } = list;

  const managerName = (id: number | null) =>
    contacts.find((c) => c.id === id)?.name ?? "—";

  const editForm = (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
      <Input
        placeholder="Tên địa điểm"
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
      />
      <Input
        placeholder={FIELDS.address}
        value={draft.address}
        onChange={(e) => setDraft({ ...draft, address: e.target.value })}
      />
      <select
        className={SELECT_CLASS}
        value={draft.manager_contact_id ?? ""}
        onChange={(e) =>
          setDraft({
            ...draft,
            manager_contact_id: e.target.value ? Number(e.target.value) : null,
          })
        }
      >
        <option value="">— Người quản lý —</option>
        {contacts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={list.saving || !draft.name.trim() || !draft.address.trim()}
          onClick={list.save}
        >
          {ACTIONS.save}
        </Button>
        <Button size="sm" variant="ghost" onClick={list.cancel}>
          {ACTIONS.cancel}
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="gap-3">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Địa điểm ({items.length})</CardTitle>
          {list.mode !== ADD_MODE ? (
            <Button size="sm" variant="ghost" onClick={list.startAdd}>
              <Plus className="size-4" />
              {ACTIONS.add}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((l) =>
          list.mode === l.id ? (
            <div key={l.id} className="rounded-md border p-2">
              {editForm}
            </div>
          ) : (
            <div
              key={l.id}
              className="flex items-center gap-3 rounded-md border p-2 text-sm"
            >
              <span className="flex-1 font-medium">{l.name}</span>
              <span className="flex-1 text-muted-foreground">{l.address}</span>
              <span className="flex-1 text-muted-foreground">
                {managerName(l.manager_contact_id)}
              </span>
              <EntityRowActions
                id={l.id}
                confirmId={list.confirmId}
                setConfirmId={list.setConfirmId}
                onEdit={() => list.startEdit(l)}
                onRemove={() => list.confirmRemove(l.id)}
                removing={list.removing}
              />
            </div>
          )
        )}
        {items.length === 0 && list.mode !== ADD_MODE ? (
          <p className="text-sm text-muted-foreground">Chưa có địa điểm.</p>
        ) : null}
        {list.mode === ADD_MODE ? (
          <div className="rounded-md border border-dashed p-2">{editForm}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}
