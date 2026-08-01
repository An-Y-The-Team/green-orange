"use client";

import type { UseFormReturn } from "react-hook-form";

import { DateInput } from "@yan/ui/components/date-input/date-input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@yan/ui/components/form";
import { Input } from "@yan/ui/components/input";
import { Textarea } from "@yan/ui/components/textarea";

import { FIELDS } from "@/constants/labels";

import type { CreateProjectFormValues } from "../../../../schema";

/**
 * Stage-1 (Yêu cầu) fields — only shown when the project starts at request. A
 * direct-create or backfill at a later stage skips them entirely.
 *
 * The appointment is split into date + time inputs held by the parent, since it
 * is assembled into one ISO `appointment_at` on submit.
 */
export function RequestFields({
  form,
  apptDate,
  setApptDate,
  apptTime,
  setApptTime,
}: {
  form: UseFormReturn<CreateProjectFormValues>;
  apptDate: string;
  setApptDate: (value: string) => void;
  apptTime: string;
  setApptTime: (value: string) => void;
}) {
  return (
    <>
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

      <FormField
        control={form.control}
        name="referral_source"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{FIELDS.source}</FormLabel>
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

      <FormItem>
        <FormLabel>Hẹn gặp</FormLabel>
        <div className="flex gap-2">
          <DateInput
            value={apptDate}
            onChange={setApptDate}
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
    </>
  );
}
