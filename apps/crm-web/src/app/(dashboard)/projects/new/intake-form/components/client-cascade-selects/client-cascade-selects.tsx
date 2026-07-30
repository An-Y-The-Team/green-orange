"use client";

import type { UseFormReturn } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@yan/ui/components/form";

import { SELECT_CLASS } from "@/components/form-bits/form-bits";

import type { CreateProjectFormValues } from "../../../../schema";
import type { ClientDetail } from "../../types";

/**
 * Người liên hệ + Địa điểm for the selected client. Rendered only for companies —
 * an individual's single contact/location is owned by the backend.
 */
export function ClientCascadeSelects({
  form,
  detail,
  onLocationChange,
}: {
  form: UseFormReturn<CreateProjectFormValues>;
  detail: ClientDetail;
  onLocationChange: (locationId: number) => void;
}) {
  return (
    <>
      <FormField
        control={form.control}
        name="working_contact_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Người liên hệ</FormLabel>
            <FormControl>
              <select
                className={SELECT_CLASS}
                value={field.value ?? ""}
                onChange={(e) =>
                  field.onChange(
                    e.target.value ? Number(e.target.value) : undefined
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
                className={SELECT_CLASS}
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
              </select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
