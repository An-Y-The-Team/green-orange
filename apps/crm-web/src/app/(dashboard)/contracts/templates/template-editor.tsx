"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useActionState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";

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

import { DocumentShell, SignatureBlocks } from "@/components/document-shell";
import { DocxExportButton } from "@/components/editor/docx-export-button";
import {
  LexicalDocument,
  type LineItemsData,
} from "@/components/editor/lexical-document";
import { RichEditor } from "@/components/editor/rich-editor";
import { selectClass } from "@/components/form-bits";
import { previewContext } from "@/lib/merge-template";

import { saveTemplate } from "../actions/save-template";
import {
  type ContractTemplateFormValues,
  contractTemplateSchema,
} from "../schema";
import type { ContractTemplate } from "../types";

const initialState: ServerActionState = {
  success: false,
  message: null,
  errors: {},
};

const SAMPLE_CTX = previewContext();

// Stand-in pricing so authors see the báo giá block's shape in the preview.
const SAMPLE_LINE_ITEMS: LineItemsData = {
  vatRate: 0.08,
  items: [
    {
      description: "Bảo hiểm công trình",
      unit: "Gói",
      quantity: 1,
      unit_price: 4_000_000,
    },
    {
      description: "Cung cấp & thay tấm trần",
      unit: "Tấm",
      quantity: 65,
      unit_price: 130_000,
    },
    {
      description: "Lăn epoxy sàn",
      unit: "m²",
      quantity: 143,
      unit_price: 165_000,
    },
  ],
};

export function TemplateEditor({ template }: { template?: ContractTemplate }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Bind the template id (edit) or undefined (create) to the action so the
  // useActionState signature stays (prevState, input).
  const action = saveTemplate.bind(null, template?.id);
  const [state, formAction] = useActionState(action, initialState);

  const form = useForm<ContractTemplateFormValues>({
    resolver: zodResolver(contractTemplateSchema),
    mode: "onChange",
    defaultValues: {
      name: template?.name ?? "",
      doc_title: template?.doc_title ?? "",
      body: template?.body ?? "",
      header_style: template?.header_style ?? "national",
      is_active: template?.is_active ?? true,
    },
  });

  useServerAction(state, isPending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
    onSuccess: () => router.push("/contracts/templates"),
  });

  const onValid = (values: ContractTemplateFormValues) => {
    startTransition(() => formAction(values));
  };

  // useWatch (vs form.watch) is React-Compiler-safe — it subscribes via a hook
  // rather than returning a non-memoizable function, so the live preview stays
  // in sync without stale-UI warnings.
  const watchedBody = useWatch({ control: form.control, name: "body" });
  const watchedTitle = useWatch({ control: form.control, name: "doc_title" });
  const watchedHeader = useWatch({
    control: form.control,
    name: "header_style",
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onValid)}
        className="grid gap-8 lg:grid-cols-2"
      >
        {/* Editor column */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tên mẫu</FormLabel>
                <FormControl>
                  <Input placeholder="Hợp đồng dịch vụ vệ sinh" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="doc_title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tiêu đề tài liệu (in trên đầu trang)</FormLabel>
                <FormControl>
                  <Input placeholder="HỢP ĐỒNG DỊCH VỤ VỆ SINH" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="body"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nội dung mẫu</FormLabel>
                <FormControl>
                  <RichEditor value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="header_style"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kiểu đầu trang</FormLabel>
                <FormControl>
                  <select {...field} className={selectClass}>
                    <option value="national">
                      Quốc hiệu (CHXHCN Việt Nam) — hợp đồng
                    </option>
                    <option value="letterhead">
                      Letterhead công ty — báo giá/khác
                    </option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    className="size-4"
                  />
                </FormControl>
                <FormLabel className="!mt-0">
                  Đang sử dụng (hiện trong danh sách chọn mẫu)
                </FormLabel>
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/contracts/templates")}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Đang lưu..." : "Lưu mẫu"}
            </Button>
          </div>
        </div>

        {/* Live preview column */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Xem trước (dữ liệu mẫu)
            </p>
            <DocxExportButton
              body={watchedBody}
              lineItems={SAMPLE_LINE_ITEMS}
              title={watchedTitle || "MẪU HỢP ĐỒNG"}
              fileName={`${watchedTitle || "mau-hop-dong"}.docx`}
              label="Xuất .docx (mẫu)"
            />
          </div>
          <DocumentShell
            title={watchedTitle || "TIÊU ĐỀ TÀI LIỆU"}
            headerVariant={watchedHeader}
          >
            <LexicalDocument
              body={watchedBody}
              ctx={SAMPLE_CTX}
              lineItems={SAMPLE_LINE_ITEMS}
            />
            <SignatureBlocks />
          </DocumentShell>
        </div>
      </form>
    </Form>
  );
}
