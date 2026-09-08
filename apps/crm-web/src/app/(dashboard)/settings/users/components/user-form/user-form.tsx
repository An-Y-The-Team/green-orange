"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { useServerAction } from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
import { Card, CardContent } from "@yan/ui/components/card";
import { Input } from "@yan/ui/components/input";

import { CancelButton } from "@/components/cancel-button/cancel-button";
import {
  FieldLabel,
  fieldError,
  fieldProps,
} from "@/components/form-bits/form-bits";
import { ACTIONS, FIELDS, PLACEHOLDERS } from "@/constants/labels";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";
import { useUnsavedGuard } from "@/hooks/use-unsaved-guard/use-unsaved-guard";
import { applyFieldErrors } from "@/utils/apply-field-errors/apply-field-errors";

import { createUser } from "../../actions/create-user";
import { updateUser } from "../../actions/update-user";
import { type UserFormValues, userSchema } from "../../schema";
import type { AkUser, UserActionResult } from "../../types";
import { RecoveryLinkPanel } from "../recovery-link-panel/recovery-link-panel";

/**
 * Create + edit in one form (crew-form pattern). A create does not redirect:
 * the action's payload carries the recovery link, and this swaps itself for
 * the panel showing it — the only render that link ever gets.
 */
export function UserForm({ user }: { user?: AkUser }) {
  const router = useRouter();
  const [created, setCreated] = useState<UserActionResult | null>(null);

  const action = user ? updateUser.bind(null, user.pk) : createUser;
  const [state, formAction] = useActionState(action, INITIAL_ACTION_STATE);
  const [isPending, startTransition] = useTransition();

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    mode: "onTouched",
    defaultValues: {
      username: user?.username ?? "",
      name: user?.name ?? "",
      email: user?.email ?? "",
    },
  });
  const { errors } = form.formState;

  useServerAction(state, isPending, {
    ...ACTION_TOAST_TITLES,
    onFieldErrors: (errors) => applyFieldErrors(form, errors),
    // Annotated: the bound-vs-unbound action union leaves the state's payload
    // type inferred as `{}` (see the hook's note on bivariance).
    onSuccess: (data?: UserActionResult) => {
      if (!user) {
        if (data) setCreated(data);
        return;
      }
      // Edit stays put: mark the saved values as the new baseline so the
      // unsaved-changes guard lets go, and refetch the header/status card.
      form.reset(form.getValues());
      router.refresh();
    },
  });

  useUnsavedGuard(form.formState.isDirty);

  if (created) {
    return (
      <RecoveryLinkPanel
        pk={created.user.pk}
        username={created.user.username}
        link={created.link}
      />
    );
  }

  const onValid = (values: UserFormValues) =>
    startTransition(() => formAction(values));

  return (
    <form onSubmit={form.handleSubmit(onValid)} className="max-w-2xl space-y-6">
      <Card>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <FieldLabel htmlFor="user-username" required>
              Tên đăng nhập
            </FieldLabel>
            <Input
              {...fieldProps("user-username", errors.username)}
              aria-required
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="nguyenvana"
              {...form.register("username")}
            />
            {fieldError(errors.username, "user-username")}
          </div>

          <div className="space-y-1">
            <FieldLabel htmlFor="user-name" required>
              {FIELDS.fullName}
            </FieldLabel>
            <Input
              {...fieldProps("user-name", errors.name)}
              aria-required
              placeholder={PLACEHOLDERS.personName}
              {...form.register("name")}
            />
            {fieldError(errors.name, "user-name")}
          </div>

          <div className="space-y-1">
            <FieldLabel htmlFor="user-email">Email</FieldLabel>
            <Input
              {...fieldProps("user-email", errors.email)}
              type="email"
              placeholder="ten@congty.vn"
              {...form.register("email")}
            />
            {fieldError(errors.email, "user-email")}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <CancelButton
          dirty={form.formState.isDirty}
          onCancel={() => router.push("/settings/users")}
        />
        <Button type="submit" disabled={isPending}>
          {isPending
            ? ACTIONS.saving
            : user
              ? "Lưu thay đổi"
              : "Tạo người dùng"}
        </Button>
      </div>
    </form>
  );
}
