"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useActionState, useRef, useTransition } from "react";
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
import { Textarea } from "@yan/ui/components/textarea";

import { DocumentShell, SignatureBlocks } from "@/components/document-shell";
import {
  CONTRACT_TOKENS,
  mergeTemplate,
  previewContext,
} from "@/lib/merge-template";
import type { ContractTemplate } from "@/types";

import { saveTemplate } from "../actions/save-template";
import { ContractDocumentBody } from "../components/contract-document";
import {
  type ContractTemplateFormValues,
  contractTemplateSchema,
} from "../schema";

const initialState: ServerActionState = {
  success: false,
  message: null,
  errors: {},
};

const SAMPLE_CTX = previewContext();

export function TemplateEditor({ template }: { template?: ContractTemplate }) {
  const router = useRouter();
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
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

  // Insert a {{token}} at the caret in the body textarea.
  const insertToken = (token: string) => {
    const el = bodyRef.current;
    const current = form.getValues("body");
    const snippet = `{{${token}}}`;
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;
    const next = current.slice(0, start) + snippet + current.slice(end);
    form.setValue("body", next, { shouldValidate: true, shouldDirty: true });
    // Restore focus and place the caret after the inserted token.
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + snippet.length;
      el?.setSelectionRange(pos, pos);
    });
  };

  // useWatch (vs form.watch) is React-Compiler-safe — it subscribes via a hook
  // rather than returning a non-memoizable function, so the live preview stays
  // in sync without stale-UI warnings.
  const watchedBody = useWatch({ control: form.control, name: "body" });
  const watchedTitle = useWatch({ control: form.control, name: "doc_title" });

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

          {/* Token palette */}
          <div>
            <p className="mb-1.5 text-sm font-medium">Chèn trường dữ liệu</p>
            <div className="flex flex-wrap gap-1.5">
              {CONTRACT_TOKENS.map((t) => (
                <Button
                  key={t.token}
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => insertToken(t.token)}
                  title={`{{${t.token}}}`}
                >
                  {t.label}
                </Button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Dùng <code>## Tiêu đề</code> để tạo điều khoản. Trường lạ sẽ hiện
              ⟨tên?⟩ trong bản xem trước.
            </p>
          </div>

          <FormField
            control={form.control}
            name="body"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nội dung mẫu</FormLabel>
                <FormControl>
                  <Textarea
                    rows={18}
                    className="font-mono text-xs"
                    {...field}
                    ref={(el) => {
                      field.ref(el);
                      bodyRef.current = el;
                    }}
                  />
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
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            Xem trước (dữ liệu mẫu)
          </p>
          <DocumentShell title={watchedTitle || "TIÊU ĐỀ TÀI LIỆU"}>
            <ContractDocumentBody
              body={mergeTemplate(watchedBody, SAMPLE_CTX)}
            />
            <SignatureBlocks />
          </DocumentShell>
        </div>
      </form>
    </Form>
  );
}
