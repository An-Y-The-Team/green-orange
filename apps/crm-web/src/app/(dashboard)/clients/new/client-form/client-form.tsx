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
import { Select } from "@yan/ui/components/select";

import { CancelButton } from "@/components/cancel-button/cancel-button";
import {
  FieldLabel,
  fieldError,
  fieldProps,
} from "@/components/form-bits/form-bits";
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
import { useUnsavedGuard } from "@/hooks/use-unsaved-guard/use-unsaved-guard";
import { applyFieldErrors } from "@/utils/apply-field-errors/apply-field-errors";

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
    mode: "onTouched",
    defaultValues: {
      name: "",
      type: ClientType.COMPANY,
      tax_code: "",
      email: "",
      address: "",
    },
  });
  const type = useWatch({ control: form.control, name: "type" });

  useServerAction(state, isPending, {
    ...ACTION_TOAST_TITLES,
    // A rejection used to highlight nothing: the server's fieldErrors were
    // flattened into the toast description and the fields stayed clean.
    onFieldErrors: (errors) => applyFieldErrors(form, errors),
    onSuccess: () => router.push("/clients"),
  });

  useUnsavedGuard(form.formState.isDirty);

  const onValid = (values: CreateClientFormValues) =>
    startTransition(() => formAction(values));

  return (
    <form onSubmit={form.handleSubmit(onValid)} className="max-w-xl space-y-6">
      <Card>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <FieldLabel htmlFor="name" required>
              {FIELDS.clientName}
            </FieldLabel>
            <Input
              {...fieldProps("name", form.formState.errors.name)}
              placeholder={PLACEHOLDERS.companyName}
              aria-required
              {...form.register("name")}
            />
            {fieldError(form.formState.errors.name, "name")}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="type">{FIELDS.clientType}</Label>
            <Select id="type" {...form.register("type")}>
              <option value={ClientType.COMPANY}>
                {CLIENT_TYPES[ClientType.COMPANY]}
              </option>
              <option value={ClientType.INDIVIDUAL}>
                {CLIENT_TYPES[ClientType.INDIVIDUAL]}
              </option>
            </Select>
          </div>

          {type === ClientType.COMPANY ? (
            <div className="space-y-1.5">
              <Label htmlFor="tax_code">{FIELDS.taxCode}</Label>
              <Input
                {...fieldProps("tax_code", form.formState.errors.tax_code)}
                placeholder="0312345678"
                {...form.register("tax_code")}
              />
              {fieldError(form.formState.errors.tax_code, "tax_code")}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              {...fieldProps("email", form.formState.errors.email)}
              type="email"
              placeholder="ketoan@congty.com"
              {...form.register("email")}
            />
            {fieldError(form.formState.errors.email, "email")}
          </div>

          {/* Shown for both types: a company's registered address is Bên A's
              address on its contracts. Only individuals must fill it (it also
              seeds their default location) — see createClientSchema. */}
          <div className="space-y-1.5">
            <FieldLabel
              htmlFor="address"
              required={type === ClientType.INDIVIDUAL}
            >
              {type === ClientType.INDIVIDUAL
                ? FIELDS.address
                : FIELDS.registeredAddress}
            </FieldLabel>
            <Input
              {...fieldProps("address", form.formState.errors.address)}
              placeholder={PLACEHOLDERS.address}
              aria-required={type === ClientType.INDIVIDUAL || undefined}
              {...form.register("address")}
            />
            {fieldError(form.formState.errors.address, "address")}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <CancelButton
          dirty={form.formState.isDirty}
          onCancel={() => router.push("/clients")}
        />
        <Button type="submit" disabled={isPending}>
          {isPending ? ACTIONS.creating : "Tạo khách hàng"}
        </Button>
      </div>
    </form>
  );
}
