"use client";

import { useActionState, useState, useTransition } from "react";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@yan/ui/components/table";
import { Textarea } from "@yan/ui/components/textarea";

import { formatDate, formatVND, isOverdue } from "@/lib/format";
import { overdue, paperworkStatus, quoteStatus } from "@/lib/labels";

import { addNote } from "../../actions/add-note";
import { PaperworkStatus } from "../../enums";
import type { PaperworkItem, Project } from "../../types";

const TABS = ["quotes", "paperwork", "crew", "payment", "notes"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  quotes: "Báo giá",
  paperwork: "Hồ sơ",
  crew: "Nhân sự",
  payment: "Thanh toán",
  notes: "Ghi chú & tệp",
};

export function WorkspaceTabs({
  project,
  paperworkItems,
}: {
  project: Project;
  paperworkItems: PaperworkItem[];
}) {
  const [tab, setTab] = useState<Tab>("quotes");

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={[
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === "quotes" ? <QuotesTab project={project} /> : null}
      {tab === "paperwork" ? <PaperworkTab items={paperworkItems} /> : null}
      {tab === "crew" ? <Stub text="Sẽ có ở giai đoạn 5" /> : null}
      {tab === "payment" ? <Stub text="Sẽ có ở giai đoạn 4" /> : null}
      {tab === "notes" ? <NotesTab project={project} /> : null}
    </div>
  );
}

function Stub({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

function QuotesTab({ project }: { project: Project }) {
  const quotes = project.quotes ?? [];
  if (quotes.length === 0) return <Stub text="Chưa có báo giá." />;
  return (
    <ul className="space-y-2">
      {quotes.map((q) => (
        <li
          key={q.id}
          className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm"
        >
          <span className="font-medium">
            {project.code} · v{q.version}
          </span>
          <span>{formatVND(q.total_amount)}</span>
          <Badge variant={quoteStatus[q.status].variant}>
            {quoteStatus[q.status].label}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function PaperworkTab({ items }: { items: PaperworkItem[] }) {
  if (items.length === 0) return <Stub text="Chưa có hồ sơ." />;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Hạng mục</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead>Hạn</TableHead>
          <TableHead>Ghi chú</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{item.name}</TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Badge variant={paperworkStatus[item.status].variant}>
                  {paperworkStatus[item.status].label}
                </Badge>
                {isOverdue(
                  item.due_date,
                  item.status === PaperworkStatus.APPROVED
                ) ? (
                  <Badge variant={overdue.variant}>{overdue.label}</Badge>
                ) : null}
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {item.due_date ? formatDate(item.due_date) : "—"}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {item.note ?? "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function NotesTab({ project }: { project: Project }) {
  const notes = project.notes ?? [];
  const [body, setBody] = useState("");
  const [state, formAction] = useActionState(addNote.bind(null, project.id), {
    success: false,
  } as ServerActionState);
  const [isPending, startTransition] = useTransition();
  useServerAction(state, isPending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
    onSuccess: () => setBody(""),
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          rows={3}
          placeholder="Thêm ghi chú…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={isPending || !body.trim()}
            onClick={() =>
              startTransition(() => formAction({ body: body.trim() }))
            }
          >
            {isPending ? "Đang lưu…" : "Thêm ghi chú"}
          </Button>
        </div>
      </div>

      {notes.length === 0 ? (
        <Stub text="Chưa có ghi chú." />
      ) : (
        <ul className="space-y-3">
          {[...notes]
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .map((note) => (
              <li key={note.id} className="border-l-2 pl-3 text-sm">
                <div className="text-xs text-muted-foreground">
                  {formatDate(note.created_at)}
                  {note.tag ? ` · ${note.tag}` : ""}
                </div>
                <div className="whitespace-pre-wrap">{note.body}</div>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
