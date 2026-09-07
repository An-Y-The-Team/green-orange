"use client";

import type { UseFormReturn } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@yan/ui/components/form";
import { Select } from "@yan/ui/components/select";

import { FIELDS } from "@/constants/labels";

import type { CreateProjectFormValues } from "../../../../schema";
import type { ClientDetail } from "../../types";

/**
 * Người liên hệ + Địa điểm for the selected client. Rendered only for companies —
 * an individual's single contact/location is owned by the backend.
 */
export function ClientCascadeSelects({
  form,
  detail,
  onContactChange,
  onLocationChange,
}: {
  form: UseFormReturn<CreateProjectFormValues>;
  detail: ClientDetail;
  onContactChange: (contactId: number) => void;
  onLocationChange: (locationId: number) => void;
}) {
  return (
    <>
      <FormField
        control={form.control}
        name="working_contact_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{FIELDS.contactPerson}</FormLabel>
            <FormControl>
              <Select
                value={field.value ?? ""}
                onChange={(e) => {
                  const id = e.target.value
                    ? Number(e.target.value)
                    : undefined;
                  field.onChange(id);
                  onContactChange(id ?? 0);
                }}
              >
                <option value="">— Chọn người liên hệ —</option>
                {detail.contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.title ? ` — ${c.title}` : ""}
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Người quyết định — who approves the báo giá / signs the hợp đồng, which
          crm-business-flow.md says is often someone at HQ rather than the
          day-to-day contact. The form used to overwrite it with the working
          contact on submit, with no way to say otherwise; "giống người liên hệ"
          is now the visible default instead of a silent one. */}
      <FormField
        control={form.control}
        name="decision_maker_contact_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Người quyết định</FormLabel>
            <FormControl>
              <Select
                value={field.value ?? ""}
                onChange={(e) =>
                  field.onChange(
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
              >
                <option value="">— Giống người liên hệ —</option>
                {detail.contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.title ? ` — ${c.title}` : ""}
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="location_id"
        render={({ field }) => (
          <FormItem required>
            <FormLabel>{FIELDS.location}</FormLabel>
            <FormControl>
              <Select
                value={field.value || ""}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  field.onChange(id);
                  onLocationChange(id);
                }}
              >
                <option value="">— Chọn địa điểm —</option>
                {detail.locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
