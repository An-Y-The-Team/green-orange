"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useActionState, useTransition } from "react";
import { useForm } from "react-hook-form";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
import { Card, CardContent } from "@yan/ui/components/card";
import { Input } from "@yan/ui/components/input";
import { Label } from "@yan/ui/components/label";
import { Textarea } from "@yan/ui/components/textarea";

import { fieldError, selectClass } from "@/components/form-bits";
import { crewMemberStatus, employmentType } from "@/lib/labels";

import { createCrewMember, updateCrewMember } from "./actions/members";
import { CrewMemberStatus, EmploymentType } from "./enums";
import {
  type CreateCrewMemberFormValues,
  createCrewMemberSchema,
} from "./schema";
import type { CrewMember, CrewRole } from "./types";

const initialState: ServerActionState = { success: false };

export function CrewForm({
  roles,
  member,
}: {
  roles: CrewRole[];
  member?: CrewMember;
}) {
  const router = useRouter();

  // One form for create + edit — create schema validates both (name is
  // required either way); only the bound action differs.
  const action = member
    ? updateCrewMember.bind(null, member.id)
    : createCrewMember;
  const [state, formAction] = useActionState(action, initialState);
  const [isPending, startTransition] = useTransition();

  const form = useForm<CreateCrewMemberFormValues>({
    resolver: zodResolver(createCrewMemberSchema),
    mode: "onChange",
    defaultValues: {
      name: member?.name ?? "",
      phone: member?.phone ?? "",
      employment_type: member?.employment_type ?? EmploymentType.PERMANENT,
      default_role_id: member?.default_role_id ?? undefined,
      status: member?.status ?? CrewMemberStatus.WORKING,
      note: member?.note ?? "",
    },
  });
  const { errors } = form.formState;

  useServerAction(state, isPending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
    onSuccess: (data) =>
      router.push(`/crew/${member?.id ?? (data as CrewMember).id}`),
  });

  const onValid = (values: CreateCrewMemberFormValues) =>
    startTransition(() => formAction(values));

  return (
    <form onSubmit={form.handleSubmit(onValid)} className="max-w-2xl space-y-6">
      <Card>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Họ và tên</Label>
            <Input placeholder="Nguyễn Văn A" {...form.register("name")} />
            {fieldError(errors.name)}
          </div>

          <div className="space-y-1">
            <Label>Số điện thoại / Zalo</Label>
            <Input placeholder="0901 234 567" {...form.register("phone")} />
            {fieldError(errors.phone)}
          </div>

          <div className="space-y-1">
            <Label>Hình thức</Label>
            <select
              className={selectClass}
              {...form.register("employment_type")}
            >
              {Object.values(EmploymentType).map((t) => (
                <option key={t} value={t}>
                  {employmentType[t]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label>Vai trò mặc định</Label>
            <select
              className={selectClass}
              {...form.register("default_role_id", {
                setValueAs: (v) =>
                  v === "" || v == null ? undefined : Number(v),
              })}
            >
              <option value="">— Không —</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label>Trạng thái</Label>
            <select className={selectClass} {...form.register("status")}>
              {Object.values(CrewMemberStatus).map((s) => (
                <option key={s} value={s}>
                  {crewMemberStatus[s].label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label>Ghi chú</Label>
            <Textarea
              rows={3}
              placeholder="Ghi chú nội bộ…"
              {...form.register("note")}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(member ? `/crew/${member.id}` : "/crew")}
        >
          Hủy
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Đang lưu…" : member ? "Lưu thay đổi" : "Thêm nhân sự"}
        </Button>
      </div>
    </form>
  );
}
