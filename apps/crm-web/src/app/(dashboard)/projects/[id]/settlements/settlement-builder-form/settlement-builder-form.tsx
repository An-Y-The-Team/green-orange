"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useTransition } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";

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

import { createSettlement } from "@/app/(dashboard)/receivables/actions/create-settlement";
import { updateSettlement } from "@/app/(dashboard)/receivables/actions/update-settlement";
import {
  type SettlementFormValues,
  settlementFormSchema,
} from "@/app/(dashboard)/receivables/schema";
import { fieldError } from "@/components/form-bits/form-bits";
import { FormErrorSummary } from "@/components/form-error-summary/form-error-summary";
import { MoneyInput } from "@/components/money-input/money-input";
import { ACTIONS, FIELDS, LINE_ITEM_COLUMNS } from "@/constants/labels";
import { ACTION_TOAST_TITLES } from "@/constants/server-action";
import { useUnsavedGuard } from "@/hooks/use-unsaved-guard/use-unsaved-guard";
import { applyFieldErrors } from "@/utils/apply-field-errors/apply-field-errors";
import { formatVND } from "@/utils/format-vnd/format-vnd";
import {
  itemAmount,
  settlementTotals,
} from "@/utils/quote-totals/quote-totals";

export interface SettlementBuilderInitial {
  projectId: number;
  projectCode: string;
  editId?: number;
  items: {
    description: string;
    unit?: string;
    quantity: number;
    unit_price: number;
  }[];
  /** Giảm giá trước thuế, VND. */
  discountAmount: number;
  /** VAT as a percent (8 = 8%); the deal quote's rate when starting fresh. */
  vatPercent: number;
  note: string;
}

const BLANK_ROW = { description: "", unit: "", quantity: 1, unit_price: 0 };

export function SettlementBuilderForm({
  initial,
}: {
  initial: SettlementBuilderInitial;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // updateSettlement strips project_id, so one create-shaped payload works for
  // both actions; both collapse to (prevState, input).
  const action = initial.editId
    ? (updateSettlement.bind(null, initial.editId) as typeof createSettlement)
    : createSettlement;
  const [state, formAction] = useActionState(action, {
    success: false,
  } as ServerActionState);

  const form = useForm<SettlementFormValues>({
    resolver: zodResolver(settlementFormSchema),
    mode: "onTouched",
    defaultValues: {
      items: initial.items.length ? initial.items : [BLANK_ROW],
      discount_amount: initial.discountAmount,
      vat_percent: initial.vatPercent,
      note: initial.note,
    },
  });
  const { register, control, handleSubmit, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  useUnsavedGuard(form.formState.isDirty);

  useServerAction(state, isPending, {
    ...ACTION_TOAST_TITLES,
    // A rejection used to highlight nothing: the server's fieldErrors were
    // flattened into the toast description and the fields stayed clean.
    onFieldErrors: (errors) => applyFieldErrors(form, errors),
    onSuccess: () => router.push(`/projects/${initial.projectId}`),
  });

  // Live totals — the server recomputes on save and is authoritative.
  const watchedItems = useWatch({ control, name: "items" });
  const watchedDiscount = useWatch({ control, name: "discount_amount" });
  const watchedVat = useWatch({ control, name: "vat_percent" });
  const rows = (watchedItems ?? []).map((it) => ({
    quantity: Number(it?.quantity) || 0,
    unit_price: Number(it?.unit_price) || 0,
  }));
  // Σ of rounded lines, like the server — not a rounded Σ of float products.
  const { subtotal, discount, vat, total } = settlementTotals({
    total_amount: rows.reduce((s, r) => s + itemAmount(r), 0),
    discount_amount: Number(watchedDiscount) || 0,
    vat_rate: (Number(watchedVat) || 0) / 100,
  });

  const onValid = (values: SettlementFormValues) => {
    const payload = {
      project_id: initial.projectId,
      items: values.items.map((it, i) => ({
        description: it.description,
        unit: it.unit || undefined,
        quantity: it.quantity,
        unit_price: it.unit_price,
        sort_order: i,
      })),
      discount_amount: values.discount_amount,
      vat_rate: values.vat_percent / 100,
      note: values.note || undefined,
    };
    startTransition(() => formAction(payload));
  };

  return (
    <Card>
      <CardContent className="space-y-5">
        <form onSubmit={handleSubmit(onValid)} className="space-y-5">
          <FormErrorSummary form={form} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-48">
                  {LINE_ITEM_COLUMNS.item}
                  {/* Marked on the column, not on each of N rows: the
                          asterisk belongs where the rule is stated once. */}
                  <span aria-hidden className="text-destructive">
                    *
                  </span>
                </TableHead>
                <TableHead className="w-20">
                  {LINE_ITEM_COLUMNS.unitShort}
                </TableHead>
                <TableHead className="w-24">
                  {LINE_ITEM_COLUMNS.quantity}
                </TableHead>
                <TableHead className="w-36">
                  {LINE_ITEM_COLUMNS.unitPrice}
                </TableHead>
                <TableHead className="w-36 text-right">
                  {LINE_ITEM_COLUMNS.total}
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field, i) => {
                const amount = itemAmount(rows[i]);
                return (
                  <TableRow key={field.id}>
                    <TableCell>
                      <Input
                        aria-label={`${LINE_ITEM_COLUMNS.item} — dòng ${i + 1}`}
                        aria-invalid={
                          formState.errors.items?.[i]?.description
                            ? true
                            : undefined
                        }
                        placeholder="Vệ sinh sau xây dựng"
                        {...register(`items.${i}.description`)}
                      />
                      {fieldError(formState.errors.items?.[i]?.description)}
                    </TableCell>
                    <TableCell>
                      <Input
                        aria-label={`${LINE_ITEM_COLUMNS.unitShort} — dòng ${i + 1}`}
                        placeholder="m²"
                        {...register(`items.${i}.unit`)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        aria-label={`${LINE_ITEM_COLUMNS.quantity} — dòng ${i + 1}`}
                        type="number"
                        min={0}
                        step="any"
                        {...register(`items.${i}.quantity`, {
                          valueAsNumber: true,
                        })}
                      />
                    </TableCell>
                    <TableCell>
                      <Controller
                        control={control}
                        name={`items.${i}.unit_price`}
                        render={({ field }) => (
                          <MoneyInput
                            aria-label={`${LINE_ITEM_COLUMNS.unitPrice} — dòng ${i + 1}`}
                            value={field.value}
                            // Empty box = 0 đồng, matching BLANK_ROW, so the
                            // live total never reads NaN.
                            onChange={(v) => field.onChange(v ?? 0)}
                            onBlur={field.onBlur}
                          />
                        )}
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
                        aria-label={`${ACTIONS.deleteRow} ${i + 1}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append(BLANK_ROW)}
          >
            {ACTIONS.addRow}
          </Button>

          <Separator />

          {/* Giảm giá + VAT, then the payable. The hóa đơn is billed for
              `total` — the pre-tax Σ never reaches it. */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="discount_amount">Giảm giá trước thuế</Label>
                <Controller
                  control={control}
                  name="discount_amount"
                  render={({ field }) => (
                    <MoneyInput
                      id="discount_amount"
                      className="w-36"
                      value={field.value}
                      // Empty box = no discount, so the live total never NaNs.
                      onChange={(v) => field.onChange(v ?? 0)}
                      onBlur={field.onBlur}
                    />
                  )}
                />
              </div>
              {fieldError(formState.errors.discount_amount)}
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
            </div>
            <dl className="ml-auto w-56 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Cộng</dt>
                <dd className="tabular-nums">{formatVND(subtotal)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Giảm giá</dt>
                  <dd className="tabular-nums">−{formatVND(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  VAT ({Number(watchedVat) || 0}%)
                </dt>
                <dd className="tabular-nums">{formatVND(vat)}</dd>
              </div>
              <div className="flex justify-between border-t pt-1 font-semibold">
                <dt>Tổng quyết toán</dt>
                <dd className="tabular-nums">{formatVND(total)}</dd>
              </div>
            </dl>
          </div>

          <div className="space-y-1">
            <Label htmlFor="note">{FIELDS.note}</Label>
            <Textarea
              id="note"
              rows={3}
              placeholder="Khối lượng chốt theo biên bản nghiệm thu…"
              {...register("note")}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending
                ? ACTIONS.saving
                : initial.editId
                  ? ACTIONS.save
                  : ACTIONS.saveDraft}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
