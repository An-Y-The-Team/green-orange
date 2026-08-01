"use client";

import {
  type KeyboardEvent,
  useActionState,
  useState,
  useTransition,
} from "react";

import { useServerAction } from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
import { Input } from "@yan/ui/components/input";

import { createCrewMember } from "@/app/(dashboard)/crew/actions/members";
import { CrewMemberStatus, EmploymentType } from "@/app/(dashboard)/crew/enums";
import type { CrewMember } from "@/app/(dashboard)/crew/types";
import { ACTIONS, FIELDS, PLACEHOLDERS } from "@/constants/labels";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";

import { toCrewMember } from "../../utils/to-crew-member/to-crew-member";

/**
 * Inline "tạo nhanh nhân sự" for the phân công form — the common case of a
 * worker who turns up on site and is not in the roster yet.
 *
 * ponytail: name + phone only. Hình thức/vị trí mặc định/ghi chú are edited in
 * Nhân sự; the phân công form's own Vị trí select already covers this project.
 */
export function QuickCreateCrewMember({
  onCreated,
}: {
  onCreated: (member: CrewMember) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [state, formAction] = useActionState(
    createCrewMember,
    INITIAL_ACTION_STATE
  );
  const [isPending, startTransition] = useTransition();

  const handleCreated = (data?: unknown) => {
    const member = toCrewMember(data, phone.trim());
    if (!member) return;
    setName("");
    setPhone("");
    onCreated(member);
  };

  useServerAction(state, isPending, {
    ...ACTION_TOAST_TITLES,
    onSuccess: handleCreated,
  });

  const trimmedName = name.trim();

  const submit = () => {
    if (!trimmedName) return;
    startTransition(() =>
      formAction({
        name: trimmedName,
        phone: phone.trim() || undefined,
        employment_type: EmploymentType.PERMANENT,
        // The picker only offers members who are working, and this one is being
        // created to be phân công right now.
        status: CrewMemberStatus.WORKING,
      })
    );
  };

  // Enter submits the quick-create without submitting an enclosing form.
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    submit();
  };

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-background p-2">
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        {FIELDS.fullName}
        <Input
          className="h-8 w-48"
          placeholder={PLACEHOLDERS.personName}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        {FIELDS.phone}
        <Input
          className="h-8 w-40"
          placeholder="0901 234 567"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </label>
      <Button size="sm" disabled={isPending || !trimmedName} onClick={submit}>
        {isPending ? ACTIONS.saving : "Tạo nhân sự"}
      </Button>
    </div>
  );
}
