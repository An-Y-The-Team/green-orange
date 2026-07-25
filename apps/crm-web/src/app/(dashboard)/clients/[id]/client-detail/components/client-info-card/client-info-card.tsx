"use client";

import { Pencil } from "lucide-react";
import { useActionState, useState, useTransition } from "react";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";
import { Input } from "@yan/ui/components/input";
import { Label } from "@yan/ui/components/label";
import { Textarea } from "@yan/ui/components/textarea";

import { clientType } from "@/constants/labels";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";
import { formatDate } from "@/utils/format-date/format-date";

import { updateClient } from "../../../../actions/update-client";
import type { UpdateClientFormValues } from "../../../../schema";
import type { Client } from "../../../../types";
import { Field } from "../field/field";

/** Client core (name / mã số thuế / email / ghi chú) with inline edit. */
export function ClientInfoCard({
  client,
  isCompany,
}: {
  client: Client;
  isCompany: boolean;
}) {
  const [info, setInfo] = useState({
    name: client.name,
    tax_code: client.tax_code ?? "",
    email: client.email ?? "",
    note: client.note ?? "",
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(info);

  const [state, action] = useActionState(
    (prev: ServerActionState, input: UpdateClientFormValues) =>
      updateClient(client.id, prev, input),
    INITIAL_ACTION_STATE
  );
  const [pending, start] = useTransition();
  useServerAction(state, pending, {
    ...ACTION_TOAST_TITLES,
    onSuccess: (data) => {
      const saved = data as Client;
      setInfo({
        name: saved.name,
        tax_code: saved.tax_code ?? "",
        email: saved.email ?? "",
        note: saved.note ?? "",
      });
      setEditing(false);
    },
  });

  // Seed the draft from the last-saved values, then reveal the form.
  const startEdit = () => {
    setDraft(info);
    setEditing(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          {editing ? (
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="max-w-sm"
            />
          ) : (
            <CardTitle className="text-lg">{info.name}</CardTitle>
          )}
          <div className="flex items-center gap-2">
            <Badge variant={isCompany ? "secondary" : "outline"}>
              {clientType[client.type]}
            </Badge>
            {!editing ? (
              <Button size="sm" variant="ghost" onClick={startEdit}>
                <Pencil className="size-4" />
                Sửa
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            {isCompany ? (
              <div className="space-y-1.5">
                <Label htmlFor="tax_code">Mã số thuế</Label>
                <Input
                  id="tax_code"
                  value={draft.tax_code}
                  onChange={(e) =>
                    setDraft({ ...draft, tax_code: e.target.value })
                  }
                  className="max-w-xs"
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="ketoan@congty.com"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                className="max-w-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note">Ghi chú</Label>
              <Textarea
                id="note"
                rows={2}
                value={draft.note}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={pending || !draft.name.trim()}
                onClick={() => start(() => action(draft))}
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
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Loại" value={clientType[client.type]} />
            <Field label="Ngày tạo" value={formatDate(client.created_at)} />
            {isCompany ? (
              <Field label="Mã số thuế" value={info.tax_code || "—"} />
            ) : null}
            <Field label="Email" value={info.email || "—"} />
            {info.note ? <Field label="Ghi chú" value={info.note} /> : null}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
