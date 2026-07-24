"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useActionState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
import { Card, CardContent } from "@yan/ui/components/card";
import { Input } from "@yan/ui/components/input";
import { Label } from "@yan/ui/components/label";

import { fieldError, selectClass } from "@/components/form-bits";
import { clientType } from "@/lib/labels";

import { createClient } from "../actions/create-client";
import { ClientType } from "../enums";
import { type CreateClientFormValues, createClientSchema } from "../schema";

const initialState: ServerActionState = {
  success: false,
  message: null,
  errors: {},
};

// Standalone client create. Core fields (name, type, client email); companies
// add locations/contacts inline on the detail page; individuals need an address
// (backend derives their single location/contact). Redirects to the list — mock
// data isn't persisted, and in live mode the new client shows there.
export function ClientForm() {
  const router = useRouter();
  const [state, formAction] = useActionState(createClient, initialState);
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
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
    onSuccess: () => router.push("/clients"),
  });

  const onValid = (values: CreateClientFormValues) =>
    startTransition(() => formAction(values));

  return (
    <form onSubmit={form.handleSubmit(onValid)} className="max-w-xl space-y-6">
      <Card>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Tên khách hàng</Label>
            <Input
              id="name"
              placeholder="Công ty TNHH ABC"
              {...form.register("name")}
            />
            {fieldError(form.formState.errors.name)}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="type">Loại khách hàng</Label>
            <select
              id="type"
              className={selectClass}
              {...form.register("type")}
            >
              <option value={ClientType.COMPANY}>
                {clientType[ClientType.COMPANY]}
              </option>
              <option value={ClientType.INDIVIDUAL}>
                {clientType[ClientType.INDIVIDUAL]}
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
              <Label htmlFor="address">Địa chỉ</Label>
              <Input
                id="address"
                placeholder="123 Đường ABC, Quận 1, TP.HCM"
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
          Hủy
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Đang tạo..." : "Tạo khách hàng"}
        </Button>
      </div>
    </form>
  );
}
