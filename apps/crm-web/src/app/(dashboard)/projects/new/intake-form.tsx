"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
import { Card, CardContent } from "@yan/ui/components/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@yan/ui/components/form";
import { Input } from "@yan/ui/components/input";
import { Separator } from "@yan/ui/components/separator";
import { Textarea } from "@yan/ui/components/textarea";

import { fieldError, selectClass } from "@/components/form-bits";
import { clientType } from "@/lib/labels";

import {
  type CreateClientFormValues,
  createClient,
  createClientSchema,
} from "../../clients/actions/create-client";
import { loadClient } from "../../clients/actions/load-client";
import { ClientType } from "../../clients/enums";
import type { ClientListItem, Contact, Location } from "../../clients/types";
import {
  type CreateProjectFormValues,
  createProject,
  createProjectSchema,
} from "../actions/create-project";
import type { ProjectType } from "../types";

const initialState: ServerActionState = {
  success: false,
  message: null,
  errors: {},
};

type ClientOption = { id: number; name: string };
type ClientDetail = {
  type: string;
  contacts: Contact[];
  locations: Location[];
};

// Local YYYY-MM-DD / HH:mm so the date/time inputs default to "now" without
// dragging in a date lib. appointment_at is assembled as a full ISO on submit.
function pad(n: number) {
  return String(n).padStart(2, "0");
}
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function nowTime() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function IntakeForm({
  clients,
  projectTypes,
}: {
  clients: ClientListItem[];
  projectTypes: ProjectType[];
}) {
  const router = useRouter();

  const [clientOptions, setClientOptions] = useState<ClientOption[]>(
    clients.map((c) => ({ id: c.id, name: c.name }))
  );
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [apptDate, setApptDate] = useState(today());
  const [apptTime, setApptTime] = useState(nowTime());
  const [, startDetail] = useTransition();

  // --- main project form -------------------------------------------------
  const [state, formAction] = useActionState(createProject, initialState);
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    mode: "onChange",
    defaultValues: {
      client_id: 0,
      location_id: 0,
      working_contact_id: undefined,
      decision_maker_contact_id: undefined,
      name: "",
      type_ids: [],
      request_note: "",
      referral_source: "",
      appointment_at: undefined,
    },
  });

  useServerAction(state, isPending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
    onSuccess: (data) => router.push(`/projects/${data.id}`),
  });

  const isIndividual = detail?.type === ClientType.INDIVIDUAL;

  // Load a client's contacts/locations for the cascading selects. For
  // individuals the backend owns the single contact/location, so we just
  // auto-pick the returned location and hide those selects.
  const selectClient = (id: number) => {
    form.setValue("client_id", id, { shouldValidate: true });
    form.setValue("location_id", 0);
    form.setValue("working_contact_id", undefined);
    form.setValue("decision_maker_contact_id", undefined);
    setDetail(null);
    if (!id) return;
    startDetail(async () => {
      const d = await loadClient(id);
      setDetail(d);
      if (d && d.type === ClientType.INDIVIDUAL && d.locations[0]) {
        form.setValue("location_id", d.locations[0].id, {
          shouldValidate: true,
        });
        maybeSuggestName(form.getValues("type_ids"), d.locations[0].id, d);
      }
    });
  };

  // "{first type name} {location name}" — only while the user hasn't edited it.
  const maybeSuggestName = (
    typeIds: number[],
    locationId: number,
    d = detail
  ) => {
    if (nameTouched) return;
    const firstType = projectTypes.find((t) => t.id === typeIds[0]);
    const loc = d?.locations.find((l) => l.id === locationId);
    const suggestion = [firstType?.name, loc?.name].filter(Boolean).join(" ");
    form.setValue("name", suggestion);
  };

  const onValid = (values: CreateProjectFormValues) => {
    const appointment_at = values.appointment_at
      ? values.appointment_at
      : apptDate
        ? new Date(`${apptDate}T${apptTime || "00:00"}`).toISOString()
        : undefined;
    // Decision maker defaults to the working contact.
    startTransition(() =>
      formAction({
        ...values,
        decision_maker_contact_id: values.working_contact_id,
        appointment_at,
      })
    );
  };

  // --- quick-create client (inline) -------------------------------------
  const [clientState, clientAction] = useActionState(
    createClient,
    initialState
  );
  const [clientPending, startClient] = useTransition();

  const clientForm = useForm<CreateClientFormValues>({
    resolver: zodResolver(createClientSchema),
    mode: "onChange",
    defaultValues: { name: "", type: ClientType.COMPANY, address: "" },
  });
  const quickType = useWatch({ control: clientForm.control, name: "type" });

  useServerAction(clientState, clientPending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
    onSuccess: (data) => {
      setClientOptions((prev) => [...prev, { id: data.id, name: data.name }]);
      setShowQuickCreate(false);
      clientForm.reset();
      selectClient(data.id);
    },
  });

  const onQuickCreate = (values: CreateClientFormValues) => {
    startClient(() => clientAction(values));
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onValid)}
        className="max-w-2xl space-y-6"
      >
        <Card>
          <CardContent className="space-y-4">
            {/* Khách hàng */}
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Khách hàng</FormLabel>
                  <FormControl>
                    <select
                      className={selectClass}
                      value={field.value || ""}
                      onChange={(e) => selectClient(Number(e.target.value))}
                    >
                      <option value="">— Chọn khách hàng —</option>
                      {clientOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0"
                onClick={() => setShowQuickCreate((v) => !v)}
              >
                + tạo nhanh khách hàng
              </Button>
            </div>

            {showQuickCreate ? (
              <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                <div className="space-y-1">
                  <FormLabel>Tên khách hàng</FormLabel>
                  <Input
                    placeholder="Công ty TNHH ABC"
                    {...clientForm.register("name")}
                  />
                  {fieldError(clientForm.formState.errors.name)}
                </div>
                <div className="space-y-1">
                  <FormLabel>Loại khách hàng</FormLabel>
                  <select
                    className={selectClass}
                    {...clientForm.register("type")}
                  >
                    <option value={ClientType.COMPANY}>
                      {clientType[ClientType.COMPANY]}
                    </option>
                    <option value={ClientType.INDIVIDUAL}>
                      {clientType[ClientType.INDIVIDUAL]}
                    </option>
                  </select>
                </div>
                {quickType === ClientType.INDIVIDUAL ? (
                  <div className="space-y-1">
                    <FormLabel>Địa chỉ</FormLabel>
                    <Input
                      placeholder="123 Đường ABC, Quận 1, TP.HCM"
                      {...clientForm.register("address")}
                    />
                    {fieldError(clientForm.formState.errors.address)}
                  </div>
                ) : null}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    disabled={clientPending}
                    onClick={clientForm.handleSubmit(onQuickCreate)}
                  >
                    {clientPending ? "Đang tạo..." : "Tạo khách hàng"}
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Người liên hệ + Địa điểm — hidden for individuals (backend owns them) */}
            {detail && !isIndividual ? (
              <>
                <FormField
                  control={form.control}
                  name="working_contact_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Người liên hệ</FormLabel>
                      <FormControl>
                        <select
                          className={selectClass}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? Number(e.target.value)
                                : undefined
                            )
                          }
                        >
                          <option value="">— Chọn người liên hệ —</option>
                          {detail.contacts.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                              {c.title ? ` — ${c.title}` : ""}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Địa điểm</FormLabel>
                      <FormControl>
                        <select
                          className={selectClass}
                          value={field.value || ""}
                          onChange={(e) => {
                            const id = Number(e.target.value);
                            field.onChange(id);
                            maybeSuggestName(form.getValues("type_ids"), id);
                          }}
                        >
                          <option value="">— Chọn địa điểm —</option>
                          {detail.locations.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : null}

            <Separator />

            {/* Loại — multi-select chips */}
            <FormField
              control={form.control}
              name="type_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Loại công trình</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {projectTypes.map((t) => {
                      const active = field.value.includes(t.id);
                      return (
                        <Button
                          key={t.id}
                          type="button"
                          size="sm"
                          variant={active ? "default" : "outline"}
                          onClick={() => {
                            const next = active
                              ? field.value.filter((id) => id !== t.id)
                              : [...field.value, t.id];
                            field.onChange(next);
                            maybeSuggestName(
                              next,
                              form.getValues("location_id")
                            );
                          }}
                        >
                          {t.name}
                        </Button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tên công trình */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên công trình</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Vệ sinh Toà nhà A"
                      {...field}
                      onChange={(e) => {
                        setNameTouched(true);
                        field.onChange(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Yêu cầu */}
            <FormField
              control={form.control}
              name="request_note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Yêu cầu</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Mô tả yêu cầu của khách hàng..."
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nguồn */}
            <FormField
              control={form.control}
              name="referral_source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nguồn</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Giới thiệu, Facebook, khách cũ..."
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Hẹn gặp */}
            <FormItem>
              <FormLabel>Hẹn gặp</FormLabel>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={apptDate}
                  onChange={(e) => setApptDate(e.target.value)}
                  className="w-auto"
                />
                <Input
                  type="time"
                  value={apptTime}
                  onChange={(e) => setApptTime(e.target.value)}
                  className="w-auto"
                />
              </div>
            </FormItem>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/projects")}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Đang tạo..." : "Tạo công trình"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
