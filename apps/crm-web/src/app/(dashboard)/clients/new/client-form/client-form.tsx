"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useActionState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";

import { useServerAction } from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
import { Card, CardContent } from "@yan/ui/components/card";
import { Input } from "@yan/ui/components/input";
import { Label } from "@yan/ui/components/label";

import { SELECT_CLASS, fieldError } from "@/components/form-bits/form-bits";
import {
  ACTIONS,
  CLIENT_TYPES,
  FIELDS,
  PLACEHOLDERS,
} from "@/constants/labels";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";

import { createClient } from "../../actions/create-client";
import { ClientType } from "../../enums";
import { type CreateClientFormValues, createClientSchema } from "../../schema";

// Standalone client create. Core fields (name, type, client email); companies
// add locations/contacts inline on the detail page; individuals need an address
// (backend derives their single location/contact). Redirects to the list — mock
// data isn't persisted, and in live mode the new client shows there.
export function ClientForm() {
  const router = useRouter();
  const [state, formAction] = useActionState(
    createClient,
    INITIAL_ACTION_STATE
  );
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreateClientFormValues>({
    resolver: zodResolver(createClientSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      type: ClientType.COMPANY,
      email: "",
      address: "",
    },
  });
  const type = useWatch({ control: form.control, name: "type" });

  useServerAction(state, isPending, {
    ...ACTION_TOAST_TITLES,
    onSuccess: () => router.push("/clients"),
  });

  const onValid = (values: CreateClientFormValues) =>
    startTransition(() => formAction(values));

  return (
    <form onSubmit={form.handleSubmit(onValid)} className="max-w-xl space-y-6">
      <Card>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">{FIELDS.clientName}</Label>
            <Input
              id="name"
              placeholder={PLACEHOLDERS.companyName}
              {...form.register("name")}
            />
            {fieldError(form.formState.errors.name)}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="type">{FIELDS.clientType}</Label>
            <select
              id="type"
              className={SELECT_CLASS}
              {...form.register("type")}
            >
              <option value={ClientType.COMPANY}>
                {CLIENT_TYPES[ClientType.COMPANY]}
              </option>
              <option value={ClientType.INDIVIDUAL}>
                {CLIENT_TYPES[ClientType.INDIVIDUAL]}
              </option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="ketoan@congty.com"
              {...form.register("email")}
            />
            {fieldError(form.formState.errors.email)}
          </div>

          {type === ClientType.INDIVIDUAL ? (
            <div className="space-y-1.5">
              <Label htmlFor="address">{FIELDS.address}</Label>
              <Input
                id="address"
                placeholder={PLACEHOLDERS.address}
                {...form.register("address")}
              />
              {fieldError(form.formState.errors.address)}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/clients")}
        >
          {ACTIONS.cancel}
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? ACTIONS.creating : "Tạo khách hàng"}
        </Button>
      </div>
    </form>
  );
}
