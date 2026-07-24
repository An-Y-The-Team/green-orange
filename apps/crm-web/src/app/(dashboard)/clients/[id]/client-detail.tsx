"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
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

import { selectClass } from "@/components/form-bits";
import { formatDate } from "@/lib/format";
import { clientType } from "@/lib/labels";

import {
  createContact,
  deleteContact,
  updateContact,
} from "../actions/contacts";
import {
  createLocation,
  deleteLocation,
  updateLocation,
} from "../actions/locations";
import { updateClient } from "../actions/update-client";
import { ClientType } from "../enums";
import type {
  ContactFormValues,
  LocationFormValues,
  UpdateClientFormValues,
} from "../schema";
import type { Client, ClientDetail, Contact, Location } from "../types";

const initialState: ServerActionState = {
  success: false,
  message: null,
  errors: {},
};
const toastTitles = { successToastTitle: "Thành công", errorToastTitle: "Lỗi" };

export function ClientDetailView({ client }: { client: ClientDetail }) {
  const isCompany = client.type === ClientType.COMPANY;
  // Contacts live at the parent so the location manager dropdown sees adds/edits.
  const [contacts, setContacts] = useState<Contact[]>(client.contacts);

  return (
    <div className="flex flex-col gap-4">
      <ClientInfoCard client={client} isCompany={isCompany} />
      {isCompany ? (
        <LocationsSection
          clientId={client.id}
          initial={client.locations}
          contacts={contacts}
        />
      ) : (
        <IndividualAddress
          clientId={client.id}
          location={client.locations[0]}
        />
      )}
      <ContactsSection
        clientId={client.id}
        contacts={contacts}
        setContacts={setContacts}
        isCompany={isCompany}
      />
    </div>
  );
}

// ── Client core (name / mã số thuế / ghi chú) ────────────────────────────────
function ClientInfoCard({
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
    (_p: ServerActionState, input: UpdateClientFormValues) =>
      updateClient(client.id, _p, input),
    initialState
  );
  const [pending, start] = useTransition();
  useServerAction(state, pending, {
    ...toastTitles,
    onSuccess: (data) => {
      const c = data as Client;
      setInfo({
        name: c.name,
        tax_code: c.tax_code ?? "",
        email: c.email ?? "",
        note: c.note ?? "",
      });
      setEditing(false);
    },
  });

  const open = () => {
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
              <Button size="sm" variant="ghost" onClick={open}>
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

// ── Individual address (their single location) ───────────────────────────────
function IndividualAddress({
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
    (_p: ServerActionState, input: LocationFormValues) =>
      updateLocation(location!.id, clientId, _p, input),
    initialState
  );
  const [pending, start] = useTransition();
  useServerAction(state, pending, {
    ...toastTitles,
    onSuccess: (data) => {
      setAddress((data as Location).address);
      setEditing(false);
    },
  });

  if (!location) return null;

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
                onClick={() =>
                  start(() =>
                    action({ name: location.name, address: draft.trim() })
                  )
                }
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

// ── Contacts (add / edit / delete rows) ──────────────────────────────────────
function ContactsSection({
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
  const [mode, setMode] = useState<null | "add" | number>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [draft, setDraft] = useState<ContactFormValues>({
    name: "",
    phone: "",
    email: "",
    title: "",
  });

  const [cState, cAction] = useActionState(
    (_p: ServerActionState, input: ContactFormValues) =>
      createContact(clientId, _p, input),
    initialState
  );
  const [cPending, cStart] = useTransition();
  useServerAction(cState, cPending, {
    ...toastTitles,
    onSuccess: (d) => {
      setContacts((prev) => [...prev, d as Contact]);
      setMode(null);
    },
  });

  const [uState, uAction] = useActionState(
    (_p: ServerActionState, p: { id: number; values: ContactFormValues }) =>
      updateContact(p.id, clientId, _p, p.values),
    initialState
  );
  const [uPending, uStart] = useTransition();
  useServerAction(uState, uPending, {
    ...toastTitles,
    onSuccess: (d) => {
      const c = d as Contact;
      setContacts((prev) => prev.map((x) => (x.id === c.id ? c : x)));
      setMode(null);
    },
  });

  const [dState, dAction] = useActionState(
    (_p: ServerActionState, id: number) => deleteContact(id, clientId, _p),
    initialState
  );
  const [dPending, dStart] = useTransition();
  useServerAction(dState, dPending, {
    ...toastTitles,
    onSuccess: (d) => {
      setContacts((prev) =>
        prev.filter((x) => x.id !== (d as { id: number }).id)
      );
      setConfirmId(null);
    },
  });

  const startEdit = (c: Contact) => {
    setDraft({
      name: c.name,
      phone: c.phone ?? "",
      email: c.email ?? "",
      title: c.title ?? "",
    });
    setMode(c.id);
  };
  const startAdd = () => {
    setDraft({ name: "", phone: "", email: "", title: "" });
    setMode("add");
  };
  const save = () => {
    if (mode === "add") cStart(() => cAction(draft));
    else if (typeof mode === "number")
      uStart(() => uAction({ id: mode, values: draft }));
  };

  const editForm = (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder="Tên"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
        <Input
          placeholder="Số điện thoại / Zalo"
          value={draft.phone}
          onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
        />
        <Input
          placeholder="Email"
          value={draft.email}
          onChange={(e) => setDraft({ ...draft, email: e.target.value })}
        />
        <Input
          placeholder="Chức vụ"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={cPending || uPending || !draft.name.trim()}
          onClick={save}
        >
          Lưu
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setMode(null)}>
          Hủy
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
          {mode !== "add" ? (
            <Button size="sm" variant="ghost" onClick={startAdd}>
              <Plus className="size-4" />
              Thêm
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {contacts.map((c) =>
          mode === c.id ? (
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
              {confirmId === c.id ? (
                <>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={dPending}
                    onClick={() => dStart(() => dAction(c.id))}
                  >
                    Xóa?
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmId(null)}
                  >
                    Hủy
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit(c)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => setConfirmId(c.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </>
              )}
            </div>
          )
        )}
        {contacts.length === 0 && mode !== "add" ? (
          <p className="text-sm text-muted-foreground">Chưa có liên hệ.</p>
        ) : null}
        {mode === "add" ? (
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

// ── Locations (company only: add / edit / delete rows) ───────────────────────
function LocationsSection({
  clientId,
  initial,
  contacts,
}: {
  clientId: number;
  initial: Location[];
  contacts: Contact[];
}) {
  const [items, setItems] = useState<Location[]>(initial);
  const [mode, setMode] = useState<null | "add" | number>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [draft, setDraft] = useState<LocationFormValues>({
    name: "",
    address: "",
    manager_contact_id: null,
  });

  const [cState, cAction] = useActionState(
    (_p: ServerActionState, input: LocationFormValues) =>
      createLocation(clientId, _p, input),
    initialState
  );
  const [cPending, cStart] = useTransition();
  useServerAction(cState, cPending, {
    ...toastTitles,
    onSuccess: (d) => {
      setItems((prev) => [...prev, d as Location]);
      setMode(null);
    },
  });

  const [uState, uAction] = useActionState(
    (_p: ServerActionState, p: { id: number; values: LocationFormValues }) =>
      updateLocation(p.id, clientId, _p, p.values),
    initialState
  );
  const [uPending, uStart] = useTransition();
  useServerAction(uState, uPending, {
    ...toastTitles,
    onSuccess: (d) => {
      const l = d as Location;
      setItems((prev) => prev.map((x) => (x.id === l.id ? l : x)));
      setMode(null);
    },
  });

  const [dState, dAction] = useActionState(
    (_p: ServerActionState, id: number) => deleteLocation(id, clientId, _p),
    initialState
  );
  const [dPending, dStart] = useTransition();
  useServerAction(dState, dPending, {
    ...toastTitles,
    onSuccess: (d) => {
      setItems((prev) => prev.filter((x) => x.id !== (d as { id: number }).id));
      setConfirmId(null);
    },
  });

  const managerName = (id: number | null) =>
    contacts.find((c) => c.id === id)?.name ?? "—";
  const startEdit = (l: Location) => {
    setDraft({
      name: l.name,
      address: l.address,
      manager_contact_id: l.manager_contact_id,
    });
    setMode(l.id);
  };
  const startAdd = () => {
    setDraft({ name: "", address: "", manager_contact_id: null });
    setMode("add");
  };
  const save = () => {
    if (mode === "add") cStart(() => cAction(draft));
    else if (typeof mode === "number")
      uStart(() => uAction({ id: mode, values: draft }));
  };

  const editForm = (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
      <Input
        placeholder="Tên địa điểm"
        value={draft.name}
        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
      />
      <Input
        placeholder="Địa chỉ"
        value={draft.address}
        onChange={(e) => setDraft({ ...draft, address: e.target.value })}
      />
      <select
        className={selectClass}
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
          disabled={
            cPending || uPending || !draft.name.trim() || !draft.address.trim()
          }
          onClick={save}
        >
          Lưu
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setMode(null)}>
          Hủy
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="gap-3">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Địa điểm ({items.length})</CardTitle>
          {mode !== "add" ? (
            <Button size="sm" variant="ghost" onClick={startAdd}>
              <Plus className="size-4" />
              Thêm
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((l) =>
          mode === l.id ? (
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
              {confirmId === l.id ? (
                <>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={dPending}
                    onClick={() => dStart(() => dAction(l.id))}
                  >
                    Xóa?
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmId(null)}
                  >
                    Hủy
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit(l)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => setConfirmId(l.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </>
              )}
            </div>
          )
        )}
        {items.length === 0 && mode !== "add" ? (
          <p className="text-sm text-muted-foreground">Chưa có địa điểm.</p>
        ) : null}
        {mode === "add" ? (
          <div className="rounded-md border border-dashed p-2">{editForm}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}
