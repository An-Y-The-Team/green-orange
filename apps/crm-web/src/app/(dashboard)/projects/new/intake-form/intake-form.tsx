"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  useActionState,
  useRef,
  useState,
  useTransition,
} from "react";
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

import { SELECT_CLASS } from "@/components/form-bits/form-bits";
import {
  ACTIONS,
  FIELDS,
  PROJECT_STAGES,
  PROJECT_STAGE_ORDER,
} from "@/constants/labels";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";
import { labelOf } from "@/utils/label-of/label-of";
import { nowHHmm, todayISO } from "@/utils/today-iso/today-iso";

import { loadClient } from "../../../clients/actions/load-client";
import { ClientType } from "../../../clients/enums";
import type { ClientListItem } from "../../../clients/types";
import { createProject } from "../../actions/create-project";
import { TypeChips } from "../../components/type-chips/type-chips";
import { ProjectStage } from "../../enums";
import {
  type CreateProjectFormValues,
  createProjectSchema,
} from "../../schema";
import type { Project, ProjectType } from "../../types";
import { ClientCascadeSelects } from "./components/client-cascade-selects/client-cascade-selects";
import { QuickCreateClient } from "./components/quick-create-client/quick-create-client";
import { RequestFields } from "./components/request-fields/request-fields";
import type {
  ClientDetail,
  ClientOption,
  Prefill,
  QuickCreateHandle,
  QuickCreateResult,
} from "./types";

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
  const [isSavingClient, setIsSavingClient] = useState(false);
  const quickCreate = useRef<QuickCreateHandle>(null);
  const [nameTouched, setNameTouched] = useState(false);
  const [apptDate, setApptDate] = useState(todayISO);
  const [apptTime, setApptTime] = useState(nowHHmm);
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
    onSuccess: (data: Project) => router.push(`/projects/${data?.id}`),
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

  async function applyClient(id: number) {
    const d = await loadClient(id);
    setDetail(d);
    if (d && d.type === ClientType.INDIVIDUAL && d.locations[0]) {
      form.setValue("location_id", d.locations[0].id, { shouldValidate: true });
      maybeSuggestName(form.getValues("type_ids"), d.locations[0].id, d);
    }
  }

  // Load a client's contacts/locations for the cascading selects. For
  // individuals the backend owns the single contact/location, so we just
  // auto-pick the returned location and hide those selects. Returns the load so
  // the submit path can wait for the auto-picked location.
  function selectClient(id: number) {
    form.setValue("client_id", id, { shouldValidate: true });
    form.setValue("location_id", 0);
    form.setValue("working_contact_id", undefined);
    form.setValue("decision_maker_contact_id", undefined);
    setDetail(null);
    if (!id) return Promise.resolve();
    const load = applyClient(id);
    startDetail(() => load);
    return load;
  }

  // Quick-create finished: add the option, then pre-select whatever came back so
  // the intake form is immediately usable.
  async function handleQuickCreated({
    client,
    type,
    contact,
    location,
  }: QuickCreateResult) {
    setClientOptions((prev) => [...prev, client]);
    setShowQuickCreate(false);

    if (!contact || !location) {
      await selectClient(client.id);
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

  // The operator often fills the quick-create block and hits "Tạo công trình"
  // without saving the client first — save it for them, since the resulting
  // "Khách hàng" error sits off-screen above and reads as a dead button.
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (showQuickCreate && !form.getValues("client_id")) {
      setIsSavingClient(true);
      const created = await quickCreate.current?.submit();
      setIsSavingClient(false);
      if (!created) return;
    }
    await form.handleSubmit(onValid)();
  };

  const isBusy = isPending || isSavingClient;

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <Card>
          <CardContent className="space-y-4">
            {/* Giai đoạn bắt đầu — default Yêu cầu; later stages = direct
                create / backfill and hide the stage-1 fields below. */}
            <FormField
              control={form.control}
              name="stage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{FIELDS.stage}</FormLabel>
                  <FormControl>
                    <select
                      className={SELECT_CLASS}
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                    >
                      {PROJECT_STAGE_ORDER.map((s) => (
                        <option key={s} value={s}>
                          {labelOf(PROJECT_STAGES, s).label}
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
                  <FormLabel>{FIELDS.client}</FormLabel>
                  <FormControl>
                    <select
                      className={SELECT_CLASS}
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
              <QuickCreateClient
                ref={quickCreate}
                onCreated={handleQuickCreated}
              />
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
              render={({ field }) => {
                // Chip toggle — adds/removes one type id, then re-suggests the
                // project name from the (possibly new) first type.
                const handleTypeToggle = (typeId: number) => {
                  const next = field.value.includes(typeId)
                    ? field.value.filter((id) => id !== typeId)
                    : [...field.value, typeId];
                  field.onChange(next);
                  maybeSuggestName(next, form.getValues("location_id"));
                };

                return (
                  <FormItem>
                    <FormLabel>{FIELDS.projectType}</FormLabel>
                    <TypeChips
                      types={projectTypes}
                      selected={field.value}
                      onToggle={handleTypeToggle}
                    />
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => {
                // A manual edit stops the auto-suggestion from overwriting it.
                const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
                  setNameTouched(true);
                  field.onChange(e);
                };

                return (
                  <FormItem>
                    <FormLabel>{FIELDS.projectName}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Vệ sinh Toà nhà A"
                        {...field}
                        onChange={handleNameChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
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
            {ACTIONS.cancel}
          </Button>
          <Button type="submit" disabled={isBusy}>
            {isBusy ? ACTIONS.creating : "Tạo công trình"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
