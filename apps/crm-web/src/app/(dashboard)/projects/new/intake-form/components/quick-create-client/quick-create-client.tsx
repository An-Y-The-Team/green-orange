"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type Ref, useImperativeHandle, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { isObject } from "@yan/shared/utils";
import { Button } from "@yan/ui/components/button";
import { Input } from "@yan/ui/components/input";
import { Select } from "@yan/ui/components/select";

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
  ACTION_MESSAGES,
  INITIAL_ACTION_STATE,
  NOUNS,
} from "@/constants/server-action";

import { createContact } from "../../../../../clients/actions/contacts";
import { createClient } from "../../../../../clients/actions/create-client";
import { createLocation } from "../../../../../clients/actions/locations";
import { ClientType } from "../../../../../clients/enums";
import type { Contact, Location } from "../../../../../clients/types";
import {
  type QuickClientFormValues,
  quickClientSchema,
} from "../../../../schema";
import { DEFAULT_QUICK_CLIENT_VALUES } from "../../constants";
import type {
  ClientOption,
  QuickCreateHandle,
  QuickCreateResult,
} from "../../types";
import { InsetPanel } from "../inset-panel/inset-panel";

/** Nullable string field off an untyped payload — mirrors the API's `| null`. */
const str = (value: unknown) => (typeof value === "string" ? value : null);

/**
 * The create actions hand back `ServerActionState.data`, which is `unknown`, so
 * each row is rebuilt from the fields this flow reads. A payload without a
 * numeric id is rejected here instead of surfacing as a blank select later.
 */
function toClientOption(data: unknown): ClientOption | null {
  if (!isObject(data)) return null;
  const { id, name } = data;
  if (typeof id !== "number" || typeof name !== "string") return null;
  return { id, name };
}

export function toContact(data: unknown, clientId: number): Contact | null {
  if (!isObject(data)) return null;
  const { id, client_id } = data;
  if (typeof id !== "number") return null;
  return {
    id,
    client_id: typeof client_id === "number" ? client_id : clientId,
    name: str(data.name) ?? "",
    phone: str(data.phone),
    email: str(data.email),
    title: str(data.title),
    note: str(data.note),
  };
}

export function toLocation(data: unknown, clientId: number): Location | null {
  if (!isObject(data)) return null;
  const { id, client_id, manager_contact_id } = data;
  if (typeof id !== "number") return null;
  return {
    id,
    client_id: typeof client_id === "number" ? client_id : clientId,
    name: str(data.name) ?? "",
    address: str(data.address) ?? "",
    manager_contact_id:
      typeof manager_contact_id === "number" ? manager_contact_id : null,
  };
}

/**
 * Inline "tạo nhanh khách hàng" block. Creates the client and — for a company —
 * its first contact + location, then reports them back so the intake form can
 * pre-select them.
 *
 * Chained through the raw actions rather than `useActionState` so the follow-up
 * creates run in order and can be reported as one result.
 */
export function QuickCreateClient({
  onCreated,
  ref,
}: {
  onCreated: (result: QuickCreateResult) => void | Promise<void>;
  ref?: Ref<QuickCreateHandle>;
}) {
  const [pending, setPending] = useState(false);

  const form = useForm<QuickClientFormValues>({
    resolver: zodResolver(quickClientSchema),
    mode: "onTouched",
    defaultValues: DEFAULT_QUICK_CLIENT_VALUES,
  });
  const type = useWatch({ control: form.control, name: "type" });
  const isIndividual = type === ClientType.INDIVIDUAL;

  const runCreate = async (values: QuickClientFormValues) => {
    setPending(true);
    try {
      const isCompany = values.type === ClientType.COMPANY;
      const clientRes = await createClient(INITIAL_ACTION_STATE, {
        name: values.name,
        type: values.type,
        tax_code: isCompany ? values.tax_code : undefined,
        // Bên A's registered address on a contract — kept on the client for
        // both types; a company's job sites are separate Locations below.
        address: values.address,
      });
      const client = clientRes.success ? toClientOption(clientRes.data) : null;
      if (!client) {
        toast.error("Lỗi", {
          description:
            clientRes.message ?? ACTION_MESSAGES.createFailed(NOUNS.client),
        });
        return false;
      }
      form.reset();

      if (!isCompany) {
        await onCreated({ client, type: values.type });
        return true;
      }

      // No name typed = no contact person yet; the company + site are enough to
      // open a công trình, and one can be added from the select later.
      const contactName = values.contact_name?.trim();
      const [contactRes, locationRes] = await Promise.all([
        contactName
          ? createContact(client.id, INITIAL_ACTION_STATE, {
              name: contactName,
              phone: values.contact_phone,
              email: "",
              title: "",
            })
          : undefined,
        createLocation(client.id, INITIAL_ACTION_STATE, {
          name: values.location_name ?? "",
          address: values.location_address ?? "",
        }),
      ]);
      const contact = contactRes && toContact(contactRes.data, client.id);
      const location = toLocation(locationRes.data, client.id);
      if (!location || (contactRes && !contact)) {
        // Client exists but a dependent failed — report the client alone and let
        // the user fill the rest via the selects.
        toast.error("Lỗi", {
          description:
            contactRes?.message ||
            locationRes.message ||
            "Không thể tạo liên hệ/địa điểm.",
        });
        await onCreated({ client, type: values.type });
        return true;
      }

      await onCreated({
        client,
        type: values.type,
        contact: contact ?? undefined,
        location,
      });
      return true;
    } finally {
      setPending(false);
    }
  };

  // Awaitable so the intake form can save this block on its own submit; any
  // validation error lands here, in view, instead of on the select above.
  const submit = async () => {
    let created = false;
    await form.handleSubmit(async (values) => {
      created = await runCreate(values);
    })();
    return created;
  };

  useImperativeHandle(ref, () => ({ submit }));

  return (
    <InsetPanel>
      <div className="space-y-1">
        <FieldLabel htmlFor="qc-name" required>
          {FIELDS.clientName}
        </FieldLabel>
        <Input
          {...fieldProps("qc-name", form.formState.errors.name)}
          aria-required
          placeholder={PLACEHOLDERS.companyName}
          {...form.register("name")}
        />
        {fieldError(form.formState.errors.name, "qc-name")}
      </div>
      <div className="space-y-1">
        <FieldLabel htmlFor="qc-type">{FIELDS.clientType}</FieldLabel>
        <Select id="qc-type" {...form.register("type")}>
          <option value={ClientType.COMPANY}>
            {CLIENT_TYPES[ClientType.COMPANY]}
          </option>
          <option value={ClientType.INDIVIDUAL}>
            {CLIENT_TYPES[ClientType.INDIVIDUAL]}
          </option>
        </Select>
      </div>
      {/* Required first: the company and its site are what a công trình needs.
          MST, trụ sở and the contact person are filled in when known — often
          after the phone call this form is being typed during. */}
      {isIndividual ? null : (
        <>
          <div className="space-y-1">
            <FieldLabel htmlFor="qc-location-name" required>
              Tên toà nhà thi công
            </FieldLabel>
            <Input
              {...fieldProps(
                "qc-location-name",
                form.formState.errors.location_name
              )}
              aria-required
              placeholder="Trụ sở chính"
              {...form.register("location_name")}
            />
            {fieldError(
              form.formState.errors.location_name,
              "qc-location-name"
            )}
          </div>
          <div className="space-y-1">
            <FieldLabel htmlFor="qc-location-address" required>
              {FIELDS.location}
            </FieldLabel>
            <Input
              {...fieldProps(
                "qc-location-address",
                form.formState.errors.location_address
              )}
              aria-required
              placeholder={PLACEHOLDERS.address}
              {...form.register("location_address")}
            />
            {fieldError(
              form.formState.errors.location_address,
              "qc-location-address"
            )}
          </div>
        </>
      )}
      {type === ClientType.COMPANY ? (
        <div className="space-y-1">
          <FieldLabel htmlFor="qc-tax-code">{FIELDS.taxCode}</FieldLabel>
          <Input
            {...fieldProps("qc-tax-code", form.formState.errors.tax_code)}
            placeholder="0312345678"
            {...form.register("tax_code")}
          />
          {fieldError(form.formState.errors.tax_code, "qc-tax-code")}
        </div>
      ) : null}
      {/* Shown for both types: a company's registered address is Bên A's
          address on its contracts, printed beside the MST. Only individuals
          must fill it (it also seeds their default location). */}
      <div className="space-y-1">
        <FieldLabel htmlFor="qc-address" required={isIndividual}>
          {isIndividual ? FIELDS.address : FIELDS.registeredAddress}
        </FieldLabel>
        <Input
          {...fieldProps("qc-address", form.formState.errors.address)}
          aria-required={isIndividual || undefined}
          placeholder={PLACEHOLDERS.address}
          {...form.register("address")}
        />
        {fieldError(form.formState.errors.address, "qc-address")}
      </div>
      {isIndividual ? null : (
        <>
          <div className="space-y-1">
            <FieldLabel htmlFor="qc-contact-name">
              {FIELDS.contactPerson}
            </FieldLabel>
            <Input
              {...fieldProps(
                "qc-contact-name",
                form.formState.errors.contact_name
              )}
              placeholder={PLACEHOLDERS.personName}
              {...form.register("contact_name")}
            />
            {fieldError(form.formState.errors.contact_name, "qc-contact-name")}
          </div>
          <div className="space-y-1">
            <FieldLabel htmlFor="qc-contact-phone">
              Số điện thoại liên hệ
            </FieldLabel>
            <Input
              {...fieldProps(
                "qc-contact-phone",
                form.formState.errors.contact_phone
              )}
              placeholder="0901234567"
              {...form.register("contact_phone")}
            />
            {fieldError(
              form.formState.errors.contact_phone,
              "qc-contact-phone"
            )}
          </div>
        </>
      )}
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => void submit()}
        >
          {pending ? ACTIONS.creating : "Tạo khách hàng"}
        </Button>
      </div>
    </InsetPanel>
  );
}
