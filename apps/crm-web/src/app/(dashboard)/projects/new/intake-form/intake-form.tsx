"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";

import { useServerAction } from "@yan/shared/hooks/use-server-actions";
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

import { selectClass } from "@/components/form-bits/form-bits";
import { projectStage, projectStageOrder } from "@/constants/labels";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";

import { loadClient } from "../../../clients/actions/load-client";
import { ClientType } from "../../../clients/enums";
import type { ClientListItem } from "../../../clients/types";
import { createProject } from "../../actions/create-project";
import { ProjectStage } from "../../enums";
import {
  type CreateProjectFormValues,
  createProjectSchema,
} from "../../schema";
import type { ProjectType } from "../../types";
import { ClientCascadeSelects } from "./components/client-cascade-selects/client-cascade-selects";
import { QuickCreateClient } from "./components/quick-create-client/quick-create-client";
import { RequestFields } from "./components/request-fields/request-fields";
import type {
  ClientDetail,
  ClientOption,
  Prefill,
  QuickCreateResult,
} from "./types";
import { localDateISO, localTimeHHmm } from "./utils/local-now/local-now";

export function IntakeForm({
  clients,
  projectTypes,
  prefill,
  initialClientDetail,
}: {
  clients: ClientListItem[];
  projectTypes: ProjectType[];
  prefill?: Prefill;
  initialClientDetail?: ClientDetail;
}) {
  const router = useRouter();

  const [clientOptions, setClientOptions] = useState<ClientOption[]>(
    clients.map((c) => ({ id: c.id, name: c.name }))
  );
  // Lazy init from prefill (repeat business): the client/contact/location
  // selects render already populated + selected, no useEffect.
  const [detail, setDetail] = useState<ClientDetail | null>(
    () => initialClientDetail ?? null
  );
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [apptDate, setApptDate] = useState(localDateISO);
  const [apptTime, setApptTime] = useState(localTimeHHmm);
  const [, startDetail] = useTransition();

  const [state, formAction] = useActionState(
    createProject,
    INITIAL_ACTION_STATE
  );
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    mode: "onChange",
    defaultValues: {
      client_id: prefill?.client_id ?? 0,
      location_id: prefill?.location_id ?? 0,
      working_contact_id: prefill?.working_contact_id,
      decision_maker_contact_id: prefill?.decision_maker_contact_id,
      name: "",
      type_ids: [],
      stage: ProjectStage.REQUEST,
      request_note: "",
      referral_source: "",
      appointment_at: undefined,
    },
  });

  // Stage-1 (Yêu cầu) fields only apply when the project starts at request;
  // a direct-create / backfill at a later stage skips them.
  const stage = useWatch({ control: form.control, name: "stage" });
  const isRequest = stage === ProjectStage.REQUEST;

  useServerAction(state, isPending, {
    ...ACTION_TOAST_TITLES,
    onSuccess: (data) => router.push(`/projects/${data.id}`),
  });

  const isIndividual = detail?.type === ClientType.INDIVIDUAL;

  // "{first type name} {location name}" — only while the user hasn't edited it.
  function maybeSuggestName(typeIds: number[], locationId: number, d = detail) {
    if (nameTouched) return;
    const firstType = projectTypes.find((t) => t.id === typeIds[0]);
    const loc = d?.locations.find((l) => l.id === locationId);
    form.setValue(
      "name",
      [firstType?.name, loc?.name].filter(Boolean).join(" ")
    );
  }

  // Load a client's contacts/locations for the cascading selects. For
  // individuals the backend owns the single contact/location, so we just
  // auto-pick the returned location and hide those selects.
  function selectClient(id: number) {
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
  }

  // Quick-create finished: add the option, then pre-select whatever came back so
  // the intake form is immediately usable.
  function handleQuickCreated({
    client,
    type,
    contact,
    location,
  }: QuickCreateResult) {
    setClientOptions((prev) => [...prev, client]);
    setShowQuickCreate(false);

    if (!contact || !location) {
      selectClient(client.id);
      return;
    }

    const nextDetail: ClientDetail = {
      type,
      contacts: [contact],
      locations: [location],
    };
    setDetail(nextDetail);
    form.setValue("client_id", client.id, { shouldValidate: true });
    form.setValue("working_contact_id", contact.id, { shouldValidate: true });
    form.setValue("location_id", location.id, { shouldValidate: true });
    maybeSuggestName(form.getValues("type_ids"), location.id, nextDetail);
  }

  const onValid = (values: CreateProjectFormValues) => {
    const appointment_at =
      values.stage !== ProjectStage.REQUEST
        ? undefined
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

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onValid)}
        className="max-w-2xl space-y-6"
      >
        <Card>
          <CardContent className="space-y-4">
            {/* Giai đoạn bắt đầu — default Yêu cầu; later stages = direct
                create / backfill and hide the stage-1 fields below. */}
            <FormField
              control={form.control}
              name="stage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Giai đoạn</FormLabel>
                  <FormControl>
                    <select
                      className={selectClass}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                    >
                      {projectStageOrder.map((s) => (
                        <option key={s} value={s}>
                          {projectStage[s].label}
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
              <QuickCreateClient onCreated={handleQuickCreated} />
            ) : null}

            {detail && !isIndividual ? (
              <ClientCascadeSelects
                form={form}
                detail={detail}
                onLocationChange={(id) =>
                  maybeSuggestName(form.getValues("type_ids"), id)
                }
              />
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

            {isRequest ? (
              <RequestFields
                form={form}
                apptDate={apptDate}
                setApptDate={setApptDate}
                apptTime={apptTime}
                setApptTime={setApptTime}
              />
            ) : null}
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
