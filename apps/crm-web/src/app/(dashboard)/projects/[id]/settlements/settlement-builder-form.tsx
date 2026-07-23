"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useTransition } from "react";
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

import { createSettlement } from "@/app/(dashboard)/receivables/actions/create-settlement";
import { updateSettlement } from "@/app/(dashboard)/receivables/actions/update-settlement";
import {
  type SettlementFormValues,
  settlementFormSchema,
} from "@/app/(dashboard)/receivables/schema";
import { fieldError } from "@/components/form-bits";
import { formatVND } from "@/lib/format";

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
    mode: "onChange",
    defaultValues: {
      items: initial.items.length ? initial.items : [BLANK_ROW],
      note: initial.note,
    },
  });
  const { register, control, handleSubmit, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  useServerAction(state, isPending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
    onSuccess: () => router.push(`/projects/${initial.projectId}`),
  });

  // Live total — server recomputes on save and is authoritative. No VAT.
  const watchedItems = useWatch({ control, name: "items" });
  const rows = (watchedItems ?? []).map((it) => ({
    quantity: Number(it?.quantity) || 0,
    unit_price: Number(it?.unit_price) || 0,
  }));
  const total = rows.reduce((s, r) => s + r.quantity * r.unit_price, 0);

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
      note: values.note || undefined,
    };
    startTransition(() => formAction(payload));
  };

  return (
    <Card>
      <CardContent className="space-y-5">
        <form onSubmit={handleSubmit(onValid)} className="space-y-5">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-48">Hạng mục</TableHead>
                  <TableHead className="w-20">ĐV</TableHead>
                  <TableHead className="w-24">Khối lượng</TableHead>
                  <TableHead className="w-36">Đơn giá</TableHead>
                  <TableHead className="w-36 text-right">Thành tiền</TableHead>
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
                          placeholder="Vệ sinh sau xây dựng"
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

          <div className="flex justify-end">
            <dl className="w-56 space-y-1 text-sm">
              <div className="flex justify-between border-t pt-1 font-semibold">
                <dt>Tổng quyết toán</dt>
                <dd className="tabular-nums">{formatVND(total)}</dd>
              </div>
            </dl>
          </div>

          <div className="space-y-1">
            <Label htmlFor="note">Ghi chú</Label>
            <Textarea
              id="note"
              rows={3}
              placeholder="Khối lượng chốt theo biên bản nghiệm thu…"
              {...register("note")}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Đang lưu…" : "Lưu nháp"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
