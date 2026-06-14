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

import { selectClass } from "@/components/form-bits";

import { addPaymentMilestone } from "../../actions/add-payment-milestone";
import { type MilestoneFormValues, milestoneSchema } from "../../schema";

const initialState: ServerActionState = {
  success: false,
  message: null,
  errors: {},
};

export function PaymentMilestoneFormDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [state, formAction] = useActionState(addPaymentMilestone, initialState);

  const form = useForm<MilestoneFormValues>({
    resolver: zodResolver(milestoneSchema),
    mode: "onChange",
    defaultValues: {
      contract_code: "",
      project_code: "",
      customer: "",
      name: "",
      type: "tam_ung",
      due_amount: 0,
      due_date: "",
      gated_by_acceptance: false,
    },
  });

  const { resetActionProcessed } = useServerAction(state, isPending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
    onSuccess: () => {
      form.reset();
      setOpen(false);
    },
  });

  const onValid = (values: MilestoneFormValues) => {
    resetActionProcessed();
    startTransition(() => formAction(values));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus />
            Thêm đợt thanh toán
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Đợt thanh toán mới</DialogTitle>
          <DialogDescription>
            Thêm một đợt vào lịch thanh toán của hợp đồng.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onValid)} className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="contract_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mã hợp đồng</FormLabel>
                    <FormControl>
                      <Input placeholder="HD-2026-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
            </div>
            <FormField
              control={form.control}
              name="customer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Khách hàng</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên đợt</FormLabel>
                    <FormControl>
                      <Input placeholder="Tạm ứng 30%" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loại đợt</FormLabel>
                    <FormControl>
                      <select {...field} className={selectClass}>
                        <option value="tam_ung">Tạm ứng</option>
                        <option value="tien_do">Theo tiến độ</option>
                        <option value="nghiem_thu">Khi nghiệm thu</option>
                        <option value="giu_bao_hanh">Giữ lại bảo hành</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="due_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số tiền (₫)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày đến hạn</FormLabel>
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
              name="gated_by_acceptance"
              render={({ field }) => (
                <FormItem>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4"
                      checked={!!field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      name={field.name}
                    />
                    Chỉ thu sau khi nghiệm thu
                  </label>
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
