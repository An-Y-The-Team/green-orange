"use client";

import { Plus } from "lucide-react";

import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";
import { Input } from "@yan/ui/components/input";

import { ACTIONS, FIELDS } from "@/constants/labels";

import {
  createContact,
  deleteContact,
  updateContact,
} from "../../../../actions/contacts";
import type { ContactFormValues } from "../../../../schema";
import type { Contact } from "../../../../types";
import { ADD_MODE } from "../../hooks/use-entity-list/constants";
import { useEntityList } from "../../hooks/use-entity-list/use-entity-list";
import { EntityRowActions } from "../entity-row-actions/entity-row-actions";
import { EMPTY_CONTACT_DRAFT } from "./constants";

export function ContactsSection({
  clientId,
  contacts,
  setContacts,
  isCompany,
}: {
  clientId: number;
  contacts: Contact[];
  setContacts: React.Dispatch<React.SetStateAction<Contact[]>>;
  isCompany: boolean;
}) {
  const list = useEntityList<Contact, ContactFormValues>({
    setItems: setContacts,
    emptyDraft: EMPTY_CONTACT_DRAFT,
    toDraft: (c) => ({
      name: c.name,
      phone: c.phone ?? "",
      email: c.email ?? "",
      title: c.title ?? "",
    }),
    create: (prev: ServerActionState, values) =>
      createContact(clientId, prev, values),
    update: (prev: ServerActionState, { id, values }) =>
      updateContact(id, clientId, prev, values),
    remove: (prev: ServerActionState, id) => deleteContact(id, clientId, prev),
  });

  const { draft, setDraft } = list;

  const editForm = (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder="Tên"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
        <Input
          placeholder={FIELDS.phone}
          value={draft.phone}
          onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
        />
        <Input
          placeholder="Email"
          value={draft.email}
          onChange={(e) => setDraft({ ...draft, email: e.target.value })}
        />
        <Input
          placeholder={FIELDS.jobTitle}
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={list.saving || !draft.name.trim()}
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
          <CardTitle className="text-base">
            Liên hệ ({contacts.length})
          </CardTitle>
          {list.mode !== ADD_MODE ? (
            <Button size="sm" variant="ghost" onClick={list.startAdd}>
              <Plus className="size-4" />
              {ACTIONS.add}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {contacts.map((c) =>
          list.mode === c.id ? (
            <div key={c.id} className="rounded-md border p-2">
              {editForm}
            </div>
          ) : (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-md border p-2 text-sm"
            >
              <span className="flex-1 font-medium">{c.name}</span>
              <span className="flex-1 text-muted-foreground">
                {c.phone ?? "—"}
              </span>
              <span className="flex-1 text-muted-foreground">
                {c.email ?? "—"}
              </span>
              <span className="flex-1 text-muted-foreground">
                {c.title ?? "—"}
              </span>
              <EntityRowActions
                id={c.id}
                confirmId={list.confirmId}
                setConfirmId={list.setConfirmId}
                onEdit={() => list.startEdit(c)}
                onRemove={() => list.confirmRemove(c.id)}
                removing={list.removing}
              />
            </div>
          )
        )}
        {contacts.length === 0 && list.mode !== ADD_MODE ? (
          <p className="text-sm text-muted-foreground">Chưa có liên hệ.</p>
        ) : null}
        {list.mode === ADD_MODE ? (
          <div className="rounded-md border border-dashed p-2">{editForm}</div>
        ) : null}
        {isCompany ? null : (
          <p className="text-xs text-muted-foreground">
            Khách cá nhân: liên hệ đầu tiên là chính họ.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
