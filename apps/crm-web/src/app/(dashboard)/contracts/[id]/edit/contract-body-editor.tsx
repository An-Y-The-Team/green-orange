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
  FormMessage,
} from "@yan/ui/components/form";

import {
  DocumentShell,
  type HeaderVariant,
  SignatureBlocks,
} from "@/components/document-shell";
import {
  LexicalDocument,
  type LineItemsData,
} from "@/components/editor/lexical-document";
import { RichEditor } from "@/components/editor/rich-editor";
import { buildContractContext } from "@/lib/merge-template";

import { updateContract } from "../../actions/update-contract";
import { type ContractBodyFormValues, contractBodySchema } from "../../schema";
import type { Contract } from "../../types";

const initialState: ServerActionState = {
  success: false,
  message: null,
  errors: {},
};

export function ContractBodyEditor({
  contract,
  initialBody,
  docTitle,
  headerVariant,
  lineItems,
}: {
  contract: Contract;
  initialBody: string;
  docTitle: string;
  headerVariant: HeaderVariant;
  lineItems: LineItemsData | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const action = updateContract.bind(null, contract.id);
  const [state, formAction] = useActionState(action, initialState);

  const form = useForm<ContractBodyFormValues>({
    resolver: zodResolver(contractBodySchema),
    mode: "onChange",
    defaultValues: { body: initialBody },
  });

  useServerAction(state, isPending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
    onSuccess: () => router.push(`/contracts/${contract.id}`),
  });

  const onValid = (values: ContractBodyFormValues) => {
    startTransition(() => formAction(values));
  };

  // Real contract data for the preview — tokens resolve to this contract.
  const ctx = buildContractContext(contract);
  const watchedBody = useWatch({ control: form.control, name: "body" });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onValid)}
        className="grid gap-8 lg:grid-cols-2"
      >
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="body"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <RichEditor value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/contracts/${contract.id}`)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Đang lưu..." : "Lưu nội dung"}
            </Button>
          </div>
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <p className="mb-2 text-sm font-medium text-muted-foreground">
            Xem trước (dữ liệu hợp đồng)
          </p>
          <DocumentShell
            title={docTitle}
            subtitle={`Số: ${contract.code}`}
            headerVariant={headerVariant}
          >
            <LexicalDocument
              body={watchedBody}
              ctx={ctx}
              lineItems={lineItems}
            />
            <SignatureBlocks />
          </DocumentShell>
        </div>
      </form>
    </Form>
  );
}
