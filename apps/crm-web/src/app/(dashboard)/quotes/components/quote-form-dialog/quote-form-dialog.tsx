"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

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
import { Label } from "@yan/ui/components/label";

import { selectClass } from "@/components/form-bits";
import { formatVND, quoteTotals } from "@/lib/format";

import { addQuote } from "../../actions/add-quote";
import { QuoteType } from "../../enums";
import { type QuoteFormValues, quoteSchema } from "../../schema";

const initialState: ServerActionState = {
  success: false,
  message: null,
  errors: {},
};

const EMPTY_ITEM = { description: "", unit: "", quantity: 1, unit_price: 0 };

export function QuoteFormDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [state, formAction] = useActionState(addQuote, initialState);

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      client: "",
      project_code: "",
      type: QuoteType.BAO_GIA,
      issue_date: "",
      valid_until: "",
      vat_rate: 0.08,
      notes: "",
      items: [{ ...EMPTY_ITEM }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Live total — subscribe to items + VAT via useWatch and recompute. No effect.
  const watchedItems = useWatch({ control: form.control, name: "items" });
  const watchedVat = useWatch({ control: form.control, name: "vat_rate" });
  const { subtotal, vat, total } = quoteTotals(
    (watchedItems ?? []).map((i) => ({
      description: i?.description ?? "",
      unit: i?.unit ?? "",
      quantity: Number(i?.quantity) || 0,
      unit_price: Number(i?.unit_price) || 0,
    })),
    Number(watchedVat) || 0
  );

  const { resetActionProcessed } = useServerAction(state, isPending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
    onSuccess: () => {
      form.reset();
      setOpen(false);
    },
  });

  const onValid = (values: QuoteFormValues) => {
    resetActionProcessed();
    startTransition(() => formAction(values));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus />
            Tạo báo giá
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Báo giá mới</DialogTitle>
          <DialogDescription>
            Thêm các hạng mục — tổng tiền và VAT được tính tự động. Lưu qua
            Server Action.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onValid)} className="grid gap-3">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tiêu đề</FormLabel>
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
                name="client"
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
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loại</FormLabel>
                    <FormControl>
                      <select {...field} className={selectClass}>
                        <option value={QuoteType.BAO_GIA}>Báo giá</option>
                        <option value={QuoteType.QUYET_TOAN}>Quyết toán</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="issue_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ngày lập</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="valid_until"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hết hạn</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Line items — registered directly on the field array. */}
            <div className="grid gap-2">
              <Label>Hạng mục</Label>
              {fields.map((item, index) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2"
                >
                  <Input
                    placeholder="Diễn giải"
                    {...form.register(`items.${index}.description`)}
                  />
                  <Input
                    className="w-16"
                    placeholder="ĐV"
                    {...form.register(`items.${index}.unit`)}
                  />
                  <Input
                    className="w-16"
                    type="number"
                    placeholder="SL"
                    {...form.register(`items.${index}.quantity`)}
                  />
                  <Input
                    className="w-32"
                    type="number"
                    placeholder="Đơn giá"
                    {...form.register(`items.${index}.unit_price`)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              {form.formState.errors.items?.message && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.items.message}
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => append({ ...EMPTY_ITEM })}
              >
                <Plus />
                Thêm hạng mục
              </Button>
            </div>

            <div className="grid grid-cols-2 items-end gap-3">
              <FormField
                control={form.control}
                name="vat_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thuế VAT (vd 0.08 = 8%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tạm tính</span>
                  <span>{formatVND(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VAT</span>
                  <span>{formatVND(vat)}</span>
                </div>
                <div className="mt-1 flex justify-between border-t border-border pt-1 font-semibold">
                  <span>Tổng cộng</span>
                  <span>{formatVND(total)}</span>
                </div>
              </div>
            </div>

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
