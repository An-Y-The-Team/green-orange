"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@yan/ui/components/button";
import { FormLabel } from "@yan/ui/components/form";
import { Input } from "@yan/ui/components/input";

import { fieldError, selectClass } from "@/components/form-bits/form-bits";
import { clientType } from "@/constants/labels";
import { INITIAL_ACTION_STATE } from "@/constants/server-action";

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
import type { QuickCreateResult } from "../../types";

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
}: {
  onCreated: (result: QuickCreateResult) => void;
}) {
  const [pending, start] = useTransition();

  const form = useForm<QuickClientFormValues>({
    resolver: zodResolver(quickClientSchema),
    mode: "onChange",
    defaultValues: DEFAULT_QUICK_CLIENT_VALUES,
  });
  const type = useWatch({ control: form.control, name: "type" });

  const submit = (values: QuickClientFormValues) => {
    start(async () => {
      const isCompany = values.type === ClientType.COMPANY;
      const clientRes = await createClient(INITIAL_ACTION_STATE, {
        name: values.name,
        type: values.type,
        address: isCompany ? undefined : values.address,
      });
      if (!clientRes.success || !clientRes.data) {
        toast.error("Lỗi", {
          description: clientRes.message ?? "Không thể tạo khách hàng.",
        });
        return;
      }
      const client = clientRes.data as { id: number; name: string };
      form.reset();

      if (!isCompany) {
        onCreated({ client, type: values.type });
        return;
      }

      const [contactRes, locationRes] = await Promise.all([
        createContact(client.id, INITIAL_ACTION_STATE, {
          name: values.contact_name ?? "",
          phone: values.contact_phone,
          email: "",
          title: "",
        }),
        createLocation(client.id, INITIAL_ACTION_STATE, {
          name: values.location_name ?? "",
          address: values.location_address ?? "",
        }),
      ]);
      if (!contactRes.data || !locationRes.data) {
        // Client exists but a dependent failed — report the client alone and let
        // the user fill the rest via the selects.
        toast.error("Lỗi", {
          description:
            contactRes.message ||
            locationRes.message ||
            "Không thể tạo liên hệ/địa điểm.",
        });
        onCreated({ client, type: values.type });
        return;
      }

      onCreated({
        client,
        type: values.type,
        contact: contactRes.data as Contact,
        location: locationRes.data as Location,
      });
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="space-y-1">
        <FormLabel>Tên khách hàng</FormLabel>
        <Input placeholder="Công ty TNHH ABC" {...form.register("name")} />
        {fieldError(form.formState.errors.name)}
      </div>
      <div className="space-y-1">
        <FormLabel>Loại khách hàng</FormLabel>
        <select className={selectClass} {...form.register("type")}>
          <option value={ClientType.COMPANY}>
            {clientType[ClientType.COMPANY]}
          </option>
          <option value={ClientType.INDIVIDUAL}>
            {clientType[ClientType.INDIVIDUAL]}
          </option>
        </select>
      </div>
      {type === ClientType.INDIVIDUAL ? (
        <div className="space-y-1">
          <FormLabel>Địa chỉ</FormLabel>
          <Input
            placeholder="123 Đường ABC, Quận 1, TP.HCM"
            {...form.register("address")}
          />
          {fieldError(form.formState.errors.address)}
        </div>
      ) : (
        <>
          <div className="space-y-1">
            <FormLabel>Người liên hệ</FormLabel>
            <Input
              placeholder="Nguyễn Văn A"
              {...form.register("contact_name")}
            />
            {fieldError(form.formState.errors.contact_name)}
          </div>
          <div className="space-y-1">
            <FormLabel>Số điện thoại liên hệ</FormLabel>
            <Input
              placeholder="0901234567"
              {...form.register("contact_phone")}
            />
            {fieldError(form.formState.errors.contact_phone)}
          </div>
          <div className="space-y-1">
            <FormLabel>Tên địa điểm/Toà nhà</FormLabel>
            <Input
              placeholder="Trụ sở chính"
              {...form.register("location_name")}
            />
            {fieldError(form.formState.errors.location_name)}
          </div>
          <div className="space-y-1">
            <FormLabel>Địa điểm</FormLabel>
            <Input
              placeholder="123 Đường ABC, Quận 1, TP.HCM"
              {...form.register("location_address")}
            />
            {fieldError(form.formState.errors.location_address)}
          </div>
        </>
      )}
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={form.handleSubmit(submit)}
        >
          {pending ? "Đang tạo..." : "Tạo khách hàng"}
        </Button>
      </div>
    </div>
  );
}
