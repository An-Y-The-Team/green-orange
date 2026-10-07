"use client";

import { FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import type { ChangeEvent } from "react";

import { Badge } from "@yan/ui/components/badge";
import { Card, CardContent } from "@yan/ui/components/card";
import { Label } from "@yan/ui/components/label";
import { Select } from "@yan/ui/components/select";

import { EntityCombobox } from "@/components/entity-combobox/entity-combobox";
import { IMPORT_ROW_STATES, PROJECT_STAGES } from "@/constants/labels";
import { formatVND } from "@/utils/format-vnd/format-vnd";
import { quoteTotals } from "@/utils/quote-totals/quote-totals";

import { TypeChips } from "../../../../../components/type-chips/type-chips";
import type { ProjectStage } from "../../../../../enums";
import type { ProjectType } from "../../../../../types";
import { ImportRowState } from "../../../../enums";
import { IMPORT_STAGES } from "../../../../schema";
import type { ImportRow } from "../../types";
import { rowState } from "../../utils/row-state/row-state";

/**
 * One dropped workbook: what will be created or reused, and the three things
 * the operator may change — the client it belongs to, the stage, the loại. A
 * file that matched everything needs no touch at all.
 */
export function WorkbookCard({
  row,
  projectTypes,
  onClientChange,
  onStageChange,
  onTypeToggle,
}: {
  row: ImportRow;
  projectTypes: ProjectType[];
  onClientChange: (row: ImportRow, clientId: number | null) => void;
  onStageChange: (row: ImportRow, stage: ProjectStage) => void;
  onTypeToggle: (row: ImportRow, typeId: number) => void;
}) {
  const state = rowState(row);
  const badge = IMPORT_ROW_STATES[state];
  const workbook = row?.workbook;
  const match = row?.match;
  // Once created (or while checking), the choices are what was sent.
  const locked =
    state === ImportRowState.IMPORTED || state === ImportRowState.CHECKING;

  // Client picker — an existing client re-runs the site/contact lookup under
  // it; clearing it means "create the client from the file".
  const handleClientChange = (clientId: number | null) =>
    onClientChange(row, clientId);
  // Stage select — the detected stage is only a default.
  const handleStageChange = (event: ChangeEvent<HTMLSelectElement>) =>
    onStageChange(row, event.target.value as ProjectStage);
  const handleTypeToggle = (typeId: number) => onTypeToggle(row, typeId);

  const total = workbook
    ? quoteTotals(
        workbook.quote.items,
        workbook.quote.vat_rate,
        workbook.quote.discount_amount
      ).total
    : 0;

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <FileSpreadsheet className="size-4 shrink-0" />
              <span className="truncate">{row.file.name}</span>
            </p>
            <p className="font-medium">
              {workbook?.project?.name || "—"}
              {workbook ? (
                <span className="ml-2 font-normal tabular-nums text-muted-foreground">
                  {formatVND(total)} sau VAT
                </span>
              ) : null}
            </p>
          </div>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>

        {!workbook ? (
          <p className="text-sm text-problem">
            Không đọc được file. Cần file .xlsx theo mẫu Báo giá – Nghiệm thu –
            Quyết toán (sheet Bia + Bảng báo giá).
          </p>
        ) : (
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[9rem_1fr]">
            <dt className="text-muted-foreground">Khách hàng</dt>
            <dd className="space-y-1.5">
              <EntityCombobox
                // Remount on a new match so the label follows the value.
                key={match?.client?.id ?? "new"}
                resource="clients"
                value={match?.client?.id ?? null}
                initialLabel={match?.client?.name}
                onChange={handleClientChange}
                placeholder="Khách mới — tạo từ file"
                className="max-w-md"
                disabled={locked}
              />
              <p className="text-xs text-muted-foreground">
                {match?.client
                  ? "Khách có sẵn — đúng mã số thuế hoặc tên."
                  : `Sẽ tạo khách mới: ${workbook.client.name || "—"}${
                      workbook.client.tax_code
                        ? ` · MST ${workbook.client.tax_code}`
                        : ""
                    }`}
              </p>
            </dd>

            <dt className="text-muted-foreground">Địa điểm</dt>
            <dd>
              {match?.location
                ? `Có sẵn: ${match.location.name}`
                : `Tạo mới: ${workbook.project.site_address || "—"}`}
            </dd>

            <dt className="text-muted-foreground">Người liên hệ</dt>
            <dd>
              {match?.contact
                ? `Có sẵn: ${match.contact.name}`
                : workbook.contact
                  ? `Tạo mới: ${workbook.contact.name}${
                      workbook.contact.phone
                        ? ` · ${workbook.contact.phone}`
                        : ""
                    }`
                  : "— (chưa có trong file)"}
            </dd>

            <dt>
              <Label htmlFor={`${row.key}-stage`}>Giai đoạn</Label>
            </dt>
            <dd className="space-y-1">
              <Select
                id={`${row.key}-stage`}
                className="max-w-xs"
                value={row.stage}
                onChange={handleStageChange}
                disabled={locked}
              >
                {IMPORT_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {PROJECT_STAGES[stage].label}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                {workbook.settlement
                  ? "File có khối lượng quyết toán thực tế — kèm bảng quyết toán khi để ở Quyết toán."
                  : `Theo file: ${PROJECT_STAGES[workbook.stage].label}.`}
              </p>
            </dd>

            <dt className="text-muted-foreground">Loại</dt>
            <dd className="space-y-1.5">
              {locked ? (
                <p>
                  {projectTypes
                    .filter((t) => row.typeIds.includes(t.id))
                    .map((t) => t.name)
                    .join(", ") || "—"}
                </p>
              ) : (
                <TypeChips
                  types={projectTypes}
                  selected={row.typeIds}
                  onToggle={handleTypeToggle}
                />
              )}
              {match?.unmatched_types?.length ? (
                <p className="text-xs text-waiting">
                  Chưa có loại “{match.unmatched_types.join("”, “")}” — chọn
                  loại gần nhất hoặc thêm loại mới.
                </p>
              ) : null}
            </dd>
          </dl>
        )}

        <Notes row={row} />
      </CardContent>
    </Card>
  );
}

/** Errors (block), warnings and the outcome, in that order. */
function Notes({ row }: { row: ImportRow }) {
  const errors = [
    ...(row?.workbook?.errors ?? []),
    ...(row?.matchError ? [row.matchError] : []),
  ];
  const warnings = [
    ...(row?.workbook?.warnings ?? []),
    ...(row?.match?.duplicates?.length
      ? [
          `Khách này đã có công trình cùng tên: ${row.match.duplicates.join(", ")} — kiểm tra kẻo tạo trùng.`,
        ]
      : []),
  ];
  const result = row?.result;

  return (
    <>
      {errors.length ? (
        <ul className="list-disc space-y-0.5 pl-5 text-sm text-problem">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
      {warnings.length ? (
        <ul className="list-disc space-y-0.5 pl-5 text-sm text-waiting">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}
      {result?.ok ? (
        <p className="text-sm">
          Đã tạo{" "}
          <Link
            href={`/projects/${result.project.id}`}
            className="font-medium underline underline-offset-2"
          >
            {result.project.code} · {result.project.name}
          </Link>
          {row?.attachError
            ? ` — chưa đính kèm được file gốc: ${row.attachError}`
            : null}
        </p>
      ) : result ? (
        <p className="text-sm text-problem">{result.message}</p>
      ) : null}
    </>
  );
}
