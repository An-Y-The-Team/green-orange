"use client";

import { Loader2, Upload } from "lucide-react";
import { type ChangeEvent, useState, useTransition } from "react";
import { toast } from "sonner";

import { batchProcess } from "@yan/shared/utils";
import { Button } from "@yan/ui/components/button";

import { AttachmentKind } from "@/components/attachments/enums";
import { uploadAttachment } from "@/components/attachments/upload-attachment/upload-attachment";
import { ACTION_TOAST_TITLES } from "@/constants/server-action";

import type { ProjectStage } from "../../../enums";
import type { ProjectType } from "../../../types";
import { importProjects } from "../../actions/import-projects";
import {
  type MatchRequest,
  matchWorkbooks,
} from "../../actions/match-workbooks";
import { buildImportPayload } from "../../utils/build-import-payload/build-import-payload";
import { WorkbookCard } from "./components/workbook-card/workbook-card";
import type { ImportRow } from "./types";
import { readWorkbookFile } from "./utils/read-workbook-file/read-workbook-file";
import { isImportable } from "./utils/row-state/row-state";

const INPUT_ID = "quote-workbooks";

/**
 * Only what matching reads — never the priced lines — so a big drop of files
 * stays far below the server-action body limit.
 */
const lookupFields = ({ key, clientId, workbook }: MatchRequest) => ({
  key,
  clientId,
  workbook: {
    project: {
      name: workbook.project.name,
      type_names: workbook.project.type_names,
      site_address: workbook.project.site_address,
    },
    client: { name: workbook.client.name, tax_code: workbook.client?.tax_code },
    contact: workbook.contact
      ? { name: workbook.contact.name, phone: workbook.contact?.phone }
      : null,
  },
});

/**
 * "Nhập từ báo giá": pick the operator's filled workbooks → each is parsed in
 * the browser and matched to existing clients/sites/contacts → one button
 * creates every ready one. Plain `useTransition`, no `useEffect` (AGENTS.md):
 * every step starts from a click or a file pick.
 */
export function ImportWorkbooks({
  projectTypes,
}: {
  projectTypes: ProjectType[];
}) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [pending, startTransition] = useTransition();

  const patchRow = (key: string, patch: Partial<ImportRow>) =>
    setRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, ...patch } : r))
    );

  // Server lookup for these rows; the outcome lands on each row. A row whose
  // types the operator already picked keeps them.
  const runMatch = async (requests: MatchRequest[]) => {
    if (!requests.length) return;
    const res = await matchWorkbooks(requests.map(lookupFields));
    const outcomes = res?.data ?? [];
    setRows((prev) =>
      prev.map((row) => {
        if (!requests.some((r) => r.key === row.key)) return row;
        const outcome = outcomes.find((o) => o.key === row.key);
        if (!outcome || "error" in outcome)
          return {
            ...row,
            matching: false,
            match: undefined,
            matchError:
              (outcome && "error" in outcome ? outcome.error : res?.message) ??
              "Không kiểm tra được khách hàng có sẵn.",
          };
        return {
          ...row,
          matching: false,
          matchError: undefined,
          match: outcome.match,
          typeIds: row.typeIds.length ? row.typeIds : outcome.match.type_ids,
        };
      })
    );
  };

  // Files picked → parsed here, appended, then matched in one server call.
  const handleFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    // Let the same file be picked again after it is removed or fixed.
    event.target.value = "";
    if (!files.length) return;
    startTransition(async () => {
      const added = await Promise.all(
        files.map((file) => readWorkbookFile({ file }))
      );
      setRows((prev) => [...prev, ...added]);
      await runMatch(
        added.flatMap((r) =>
          r.workbook ? [{ key: r.key, workbook: r.workbook }] : []
        )
      );
    });
  };

  // A different client (or none = create from file) changes which sites and
  // contacts can be reused, so the row is looked up again under it.
  const handleClientChange = (row: ImportRow, clientId: number | null) => {
    if (!row.workbook) return;
    const workbook = row.workbook;
    patchRow(row.key, { matching: true });
    startTransition(async () => {
      await runMatch([{ key: row.key, workbook, clientId }]);
    });
  };

  const handleStageChange = (row: ImportRow, stage: ProjectStage) =>
    patchRow(row.key, { stage });

  // Chip toggle — adds or removes one loại công trình on this row.
  const handleTypeToggle = (row: ImportRow, typeId: number) =>
    patchRow(row.key, {
      typeIds: row.typeIds.includes(typeId)
        ? row.typeIds.filter((id) => id !== typeId)
        : [...row.typeIds, typeId],
    });

  const ready = rows.filter(isImportable);

  // Create every ready file, then file each original workbook on its new
  // project. Rows already created are never sent again.
  const handleImport = () => {
    const batch = ready.flatMap((row) =>
      row.workbook && row.match
        ? [
            {
              row,
              key: row.key,
              body: buildImportPayload({
                fileName: row.file.name,
                workbook: row.workbook,
                match: row.match,
                stage: row.stage,
                typeIds: row.typeIds,
              }),
            },
          ]
        : []
    );
    if (!batch.length) return;

    startTransition(async () => {
      const res = await importProjects(
        batch.map(({ key, body }) => ({ key, body }))
      );
      const results = res?.data ?? [];
      if (!results.length) {
        toast.error(ACTION_TOAST_TITLES.errorToastTitle, {
          description: res?.message ?? "Không thể tạo công trình.",
        });
        return;
      }
      setRows((prev) =>
        prev.map((row) => {
          const result = results.find((r) => r.key === row.key);
          return result ? { ...row, result } : row;
        })
      );

      // ponytail: the original file is filed AFTER its project committed, so a
      // bucket outage leaves a project without its workbook (said on the card,
      // re-attachable from the project page) — never a lost project.
      const created = results.flatMap((result) => {
        const row = batch.find((b) => b.key === result.key)?.row;
        return result.ok && row ? [{ row, projectId: result.project.id }] : [];
      });
      await batchProcess(
        created,
        async ({ row, projectId }) => {
          const uploaded = await uploadAttachment({
            owner: { project_id: projectId },
            kind: AttachmentKind.OTHER,
            file: row.file,
            note: "File báo giá gốc",
          });
          if (!uploaded.ok)
            patchRow(row.key, { attachError: uploaded.message });
        },
        2
      );

      const notify = res?.success ? toast.success : toast.error;
      notify(
        res?.success
          ? ACTION_TOAST_TITLES.successToastTitle
          : ACTION_TOAST_TITLES.errorToastTitle,
        { description: res?.message }
      );
    });
  };

  return (
    <div className="space-y-4">
      <label
        htmlFor={INPUT_ID}
        className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center text-sm text-muted-foreground hover:bg-muted/40"
      >
        <Upload className="size-6" />
        <span className="font-medium text-foreground">
          Chọn file Báo giá (.xlsx) — chọn được nhiều file một lúc
        </span>
        <span>
          Đúng mẫu đang dùng: sheet Bia + Bảng báo giá (+ Nghiệm thu, Quyết toán
          nếu đã có).
        </span>
        <input
          id={INPUT_ID}
          type="file"
          accept=".xlsx"
          multiple
          className="sr-only"
          onChange={handleFilesChange}
          disabled={pending}
        />
      </label>

      {rows.map((row) => (
        <WorkbookCard
          key={row.key}
          row={row}
          projectTypes={projectTypes}
          onClientChange={handleClientChange}
          onStageChange={handleStageChange}
          onTypeToggle={handleTypeToggle}
        />
      ))}

      {rows.length ? (
        <div className="flex items-center justify-end gap-3">
          <span className="text-sm text-muted-foreground">
            {ready.length}/{rows.length} file sẵn sàng
          </span>
          <Button
            type="button"
            onClick={handleImport}
            disabled={pending || !ready.length}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Tạo {ready.length} công trình
          </Button>
        </div>
      ) : null}
    </div>
  );
}
