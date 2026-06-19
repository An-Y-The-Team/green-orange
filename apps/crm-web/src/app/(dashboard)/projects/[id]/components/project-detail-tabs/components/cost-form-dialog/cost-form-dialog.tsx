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

import { addCost } from "@/app/(dashboard)/projects/actions/add-cost";
import { CostCategory } from "@/app/(dashboard)/projects/enums";
import {
  type CostFormValues,
  costSchema,
} from "@/app/(dashboard)/projects/schema";
import { selectClass } from "@/components/form-bits";

const initialState: ServerActionState = {
  success: false,
  message: null,
  errors: {},
};

/** `projectCode` pre-fills the field when opened from a project's Chi phí tab. */
export function CostFormDialog({ projectCode }: { projectCode?: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [state, formAction] = useActionState(addCost, initialState);

  const defaults: CostFormValues = {
    project_code: projectCode ?? "",
    date: "",
    category: CostCategory.VAT_TU,
    description: "",
    amount: 0,
    is_incident: false,
  };

  const form = useForm<CostFormValues>({
    resolver: zodResolver(costSchema),
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

  const onValid = (values: CostFormValues) => {
    resetActionProcessed();
    startTransition(() => formAction(values));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <Plus />
            Ghi nhận chi phí
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chi phí mới</DialogTitle>
          <DialogDescription>
            Ghi nhận chi phí thực tế / sự cố phát sinh tại công trình.
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
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hạng mục</FormLabel>
                    <FormControl>
                      <select {...field} className={selectClass}>
                        <option value="vat_tu">Vật tư</option>
                        <option value="nhan_cong">Nhân công</option>
                        <option value="thiet_bi">Thiết bị</option>
                        <option value="su_co">Sự cố</option>
                        <option value="khac">Khác</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
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
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Diễn giải</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_incident"
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
                    Đây là sự cố / hư hỏng phát sinh
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
