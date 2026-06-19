"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@yan/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@yan/ui/components/form";
import { Input } from "@yan/ui/components/input";
import { Textarea } from "@yan/ui/components/textarea";

import { crewRole, crewStatus } from "@/lib/labels";
import type { CrewMember, CrewRole, CrewStatus } from "@/types";

import { addCrew } from "../../actions/add-crew";
import { updateCrew } from "../../actions/update-crew";
import { type CrewFormValues, crewSchema } from "../../schema";

const initialState: ServerActionState = {
  success: false,
  message: null,
  errors: {},
};

const roleOptions = Object.keys(crewRole) as CrewRole[];
const statusOptions = Object.keys(crewStatus) as CrewStatus[];

// Shared add/edit dialog. When `member` is passed it edits that row (bound
// updateCrew), otherwise it creates a new one (addCrew). The same schema drives
// client-side and server-side validation.
export function CrewFormDialog({ member }: { member?: CrewMember }) {
  const isEdit = Boolean(member);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [state, formAction] = useActionState(
    member ? updateCrew.bind(null, member.id) : addCrew,
    initialState
  );

  const form = useForm<CrewFormValues>({
    resolver: zodResolver(crewSchema),
    mode: "onChange",
    defaultValues: {
      name: member?.name ?? "",
      phone: member?.phone ?? "",
      role: member?.role ?? "tho_phu",
      day_rate: member?.day_rate ?? 0,
      status: member?.status ?? "dang_lam",
      note: member?.note ?? "",
    },
  });

  const { resetActionProcessed } = useServerAction(state, isPending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
    onSuccess: () => {
      // On create, clear the form for the next entry; on edit, keep the values.
      if (!isEdit) form.reset();
      setOpen(false);
    },
  });

  // Runs only after client validation passes: hand the validated values to the
  // server action inside a transition (so isPending tracks it).
  const onValid = (values: CrewFormValues) => {
    resetActionProcessed();
    startTransition(() => formAction(values));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          isEdit ? (
            <Button size="sm" variant="outline">
              <Pencil />
              Chỉnh sửa
            </Button>
          ) : (
            <Button size="sm">
              <Plus />
              Thêm nhân sự
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Chỉnh sửa nhân sự" : "Nhân sự mới"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Cập nhật thông tin nhân sự trong đội ngũ."
              : "Thêm một thành viên mới vào đội ngũ."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onValid)} className="grid gap-3">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Họ và tên</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Số điện thoại</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vai trò</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {crewRole[role]}
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
              name="day_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ngày công (₫)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step={10000} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trạng thái</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {crewStatus[status].label}
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
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="mt-2">
              <DialogClose render={<Button variant="outline" type="button" />}>
                Hủy
              </DialogClose>
              <Button
                type="submit"
                disabled={isPending || (isEdit && !form.formState.isDirty)}
              >
                {isPending ? "Đang lưu..." : "Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
