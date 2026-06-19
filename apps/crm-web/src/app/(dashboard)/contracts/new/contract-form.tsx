"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useActionState, useTransition } from "react";
import { useForm } from "react-hook-form";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";
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

import { selectClass } from "@/components/form-bits";
import type { ContractTemplate } from "@/types";

import { addContract } from "../actions/add-contract";
import { type ContractFormValues, contractSchema } from "../schema";

const initialState: ServerActionState = {
  success: false,
  message: null,
  errors: {},
};

export function ContractForm({ templates }: { templates: ContractTemplate[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, formAction] = useActionState(addContract, initialState);

  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      customer: "",
      project_code: "",
      value: 0,
      signed_date: "",
      start_date: "",
      end_date: "",
      status: "nhap",
      payment_terms: "",
      template_id: undefined,
    },
  });

  const { resetActionProcessed } = useServerAction(state, isPending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
    onSuccess: () => router.push("/contracts"),
  });

  const onValid = (values: ContractFormValues) => {
    // Seed the contract body from the chosen template (copy its Lexical JSON);
    // tokens stay live and the body is editable per contract afterwards.
    const template = templates.find((t) => t.id === values.template_id);
    resetActionProcessed();
    startTransition(() => formAction({ ...values, body: template?.body }));
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onValid)}
        className="max-w-3xl space-y-8"
      >
        {/* Thông tin chung */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Thông tin chung
          </h2>
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
        </section>

        {/* Thời hạn */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Thời hạn
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <FormField
              control={form.control}
              name="signed_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ngày ký</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bắt đầu</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="end_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kết thúc</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        {/* Tài chính & trạng thái */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Tài chính & trạng thái
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Giá trị (₫)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
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
                    <select {...field} className={selectClass}>
                      <option value="nhap">Nháp</option>
                      <option value="da_ky">Đã ký</option>
                      <option value="dang_thuc_hien">Đang thực hiện</option>
                      <option value="thanh_ly">Đã thanh lý</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        {/* Mẫu & điều khoản */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Mẫu & điều khoản
          </h2>
          <FormField
            control={form.control}
            name="template_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mẫu hợp đồng</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    value={field.value ?? ""}
                    className={selectClass}
                  >
                    <option value="">
                      — Không dùng mẫu (bố cục mặc định) —
                    </option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
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
            name="payment_terms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Điều khoản thanh toán</FormLabel>
                <FormControl>
                  <Textarea rows={3} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </section>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/contracts")}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Đang lưu..." : "Lưu hợp đồng"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
