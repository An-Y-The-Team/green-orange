"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useRef, useState, useTransition } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
import { Card, CardContent } from "@yan/ui/components/card";
import { Input } from "@yan/ui/components/input";
import { Label } from "@yan/ui/components/label";
import { Separator } from "@yan/ui/components/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@yan/ui/components/table";
import { Textarea } from "@yan/ui/components/textarea";

import { createQuote } from "@/app/(dashboard)/quotes/actions/create-quote";
import { updateQuote } from "@/app/(dashboard)/quotes/actions/update-quote";
import { SendQuoteDialog } from "@/app/(dashboard)/quotes/components/send-quote-dialog";
import {
  type QuoteFormValues,
  quoteFormSchema,
} from "@/app/(dashboard)/quotes/schema";
import { fieldError } from "@/components/form-bits";
import { formatVND, quoteTotals } from "@/lib/format";

export interface QuoteBuilderInitial {
  projectId: number;
  projectCode: string;
  version: number;
  editId?: number;
  items: {
    description: string;
    unit?: string;
    quantity: number;
    unit_price: number;
  }[];
  vatPercent: number;
  note: string;
}

const BLANK_ROW = { description: "", unit: "", quantity: 1, unit_price: 0 };

export function QuoteBuilderForm({
  initial,
}: {
  initial: QuoteBuilderInitial;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const intentRef = useRef<"draft" | "send">("draft");
  const [sendId, setSendId] = useState<number | null>(null);

  // Bind the draft id (edit) or use create; both collapse to (prevState, input).
  // updateQuote's schema strips project_id, so one create-shaped payload works.
  const action = initial.editId
    ? (updateQuote.bind(null, initial.editId) as typeof createQuote)
    : createQuote;
  const [state, formAction] = useActionState(action, {
    success: false,
  } as ServerActionState);

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    mode: "onChange",
    defaultValues: {
      items: initial.items.length ? initial.items : [BLANK_ROW],
      vat_percent: initial.vatPercent,
      note: initial.note,
    },
  });
  const { register, control, handleSubmit, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  useServerAction(state, isPending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
    onSuccess: (data) => {
      if (intentRef.current === "send" && data?.id) {
        setSendId(data.id);
      } else {
        router.push(`/projects/${initial.projectId}`);
      }
    },
  });

  // Live totals — server recomputes on save and is authoritative.
  const watchedItems = useWatch({ control, name: "items" });
  const watchedVat = useWatch({ control, name: "vat_percent" });
  const rows = (watchedItems ?? []).map((it) => ({
    quantity: Number(it?.quantity) || 0,
    unit_price: Number(it?.unit_price) || 0,
  }));
  const { subtotal, vat, total } = quoteTotals(
    rows,
    (Number(watchedVat) || 0) / 100
  );

  const onValid = (values: QuoteFormValues) => {
    const payload = {
      project_id: initial.projectId,
      items: values.items.map((it) => ({
        description: it.description,
        unit: it.unit || undefined,
        quantity: it.quantity,
        unit_price: it.unit_price,
      })),
      vat_rate: values.vat_percent / 100,
      note: values.note || undefined,
    };
    startTransition(() => formAction(payload));
  };

  return (
    <>
      <Card>
        <CardContent className="space-y-5">
          <form onSubmit={handleSubmit(onValid)} className="space-y-5">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-48">Hạng mục</TableHead>
                    <TableHead className="w-20">ĐV</TableHead>
                    <TableHead className="w-24">SL</TableHead>
                    <TableHead className="w-36">Đơn giá</TableHead>
                    <TableHead className="w-36 text-right">
                      Thành tiền
                    </TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, i) => {
                    const amount =
                      (rows[i]?.quantity ?? 0) * (rows[i]?.unit_price ?? 0);
                    return (
                      <TableRow key={field.id}>
                        <TableCell>
                          <Input
                            placeholder="Kính mặt ngoài"
                            {...register(`items.${i}.description`)}
                          />
                          {fieldError(formState.errors.items?.[i]?.description)}
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="m²"
                            {...register(`items.${i}.unit`)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            {...register(`items.${i}.quantity`, {
                              valueAsNumber: true,
                            })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            {...register(`items.${i}.unit_price`, {
                              valueAsNumber: true,
                            })}
                          />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatVND(amount)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={fields.length === 1}
                            onClick={() => remove(i)}
                            aria-label="Xóa dòng"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append(BLANK_ROW)}
            >
              + Thêm dòng
            </Button>

            <Separator />

            {/* VAT + live totals */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-2">
                <Label htmlFor="vat_percent">VAT</Label>
                <Input
                  id="vat_percent"
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  className="w-20"
                  {...register("vat_percent", { valueAsNumber: true })}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <dl className="ml-auto w-56 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Tạm tính</dt>
                  <dd className="tabular-nums">{formatVND(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">VAT</dt>
                  <dd className="tabular-nums">{formatVND(vat)}</dd>
                </div>
                <div className="flex justify-between border-t pt-1 font-semibold">
                  <dt>Tổng</dt>
                  <dd className="tabular-nums">{formatVND(total)}</dd>
                </div>
              </dl>
            </div>

            <div className="space-y-1">
              <Label htmlFor="note">Điều khoản & ghi chú</Label>
              <Textarea
                id="note"
                rows={3}
                placeholder="Báo giá hiệu lực 30 ngày…"
                {...register("note")}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="submit"
                variant="outline"
                disabled={isPending}
                onClick={() => (intentRef.current = "draft")}
              >
                {isPending ? "Đang lưu…" : "Lưu nháp"}
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                onClick={() => (intentRef.current = "send")}
              >
                Lưu & gửi ngay
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {sendId != null ? (
        <SendQuoteDialog
          quoteId={sendId}
          open={sendId != null}
          onOpenChange={(open) => !open && setSendId(null)}
          onSent={() => router.push(`/projects/${initial.projectId}`)}
        />
      ) : null}
    </>
  );
}
