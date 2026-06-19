"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
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

import { addAcceptance } from "@/app/(dashboard)/projects/actions/add-acceptance";
import { AcceptanceStatus } from "@/app/(dashboard)/projects/enums";
import {
  type AcceptanceFormValues,
  acceptanceSchema,
} from "@/app/(dashboard)/projects/schema";
import { selectClass } from "@/components/form-bits";

const initialState: ServerActionState = {
  success: false,
  message: null,
  errors: {},
};

export function AcceptanceFormDialog({
  projectCode,
}: {
  projectCode?: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [state, formAction] = useActionState(addAcceptance, initialState);

  const defaults: AcceptanceFormValues = {
    project_code: projectCode ?? "",
    date: "",
    status: AcceptanceStatus.CHO_NGHIEM_THU,
    inspector: "",
    client_rep: "",
    notes: "",
  };

  const form = useForm<AcceptanceFormValues>({
    resolver: zodResolver(acceptanceSchema),
    mode: "onChange",
    defaultValues: defaults,
  });

  const { resetActionProcessed } = useServerAction(state, isPending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
    onSuccess: () => {
      form.reset(defaults);
      setOpen(false);
    },
  });

  const onValid = (values: AcceptanceFormValues) => {
    resetActionProcessed();
    startTransition(() => formAction(values));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <Plus />
            Tạo biên bản nghiệm thu
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Biên bản nghiệm thu</DialogTitle>
          <DialogDescription>
            Ghi nhận kết quả nghiệm thu / bàn giao công trình.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onValid)} className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="project_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mã công trình</FormLabel>
                    <FormControl>
                      <Input placeholder="CT-2026-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trạng thái</FormLabel>
                  <FormControl>
                    <select {...field} className={selectClass}>
                      <option value={AcceptanceStatus.CHO_NGHIEM_THU}>
                        Chờ nghiệm thu
                      </option>
                      <option value={AcceptanceStatus.DA_NGHIEM_THU}>
                        Đã nghiệm thu
                      </option>
                      <option value={AcceptanceStatus.CO_VAN_DE}>
                        Có vấn đề
                      </option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="inspector"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Người kiểm tra</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="client_rep"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Đại diện khách hàng</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
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
              <Button type="submit" disabled={isPending}>
                {isPending ? "Đang lưu..." : "Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
