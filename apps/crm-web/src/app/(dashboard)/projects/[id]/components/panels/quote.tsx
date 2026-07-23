"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@yan/ui/components/dialog";
import { Input } from "@yan/ui/components/input";
import { Label } from "@yan/ui/components/label";
import { Separator } from "@yan/ui/components/separator";

import { decideQuote } from "@/app/(dashboard)/quotes/actions/decide-quote";
import { deleteQuote } from "@/app/(dashboard)/quotes/actions/delete-quote";
import { reviseQuote } from "@/app/(dashboard)/quotes/actions/revise-quote";
import { SendQuoteDialog } from "@/app/(dashboard)/quotes/components/send-quote-dialog";
import { QuoteStatus } from "@/app/(dashboard)/quotes/enums";
import type { Quote } from "@/app/(dashboard)/quotes/types";
import { formatDate, formatVND } from "@/lib/format";
import { quoteChannel, quoteStatus, quoteSuperseded } from "@/lib/labels";

import type { Project } from "../../../types";

// Thin wrapper over the shared server-action plumbing so each button stays terse.
function useRun(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: (prev: ServerActionState, input: any) => Promise<ServerActionState>,
  onSuccess?: (data?: { id?: number }) => void
) {
  const [state, formAction] = useActionState(fn, {
    success: false,
  } as ServerActionState);
  const [isPending, startTransition] = useTransition();
  useServerAction(state, isPending, {
    successToastTitle: "Thành công",
    errorToastTitle: "Lỗi",
    onSuccess,
  });
  const run = (input?: unknown) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    startTransition(() => formAction(input as any));
  return [isPending, run] as const;
}

function SendHistory({ quote }: { quote: Quote }) {
  if (quote.send_logs.length === 0) return null;
  return (
    <p className="text-xs text-muted-foreground">
      Gửi:{" "}
      {quote.send_logs
        .map(
          (l) =>
            `${quoteChannel[l.channel]} ${formatDate(l.sent_at)} (${l.sent_by})`
        )
        .join(" · ")}
    </p>
  );
}

/** The latest version carries the live status + per-state actions. */
function LatestVersion({ quote, project }: { quote: Quote; project: Project }) {
  const router = useRouter();
  const [sendOpen, setSendOpen] = useState(false);
  const [holdOpen, setHoldOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const [reason, setReason] = useState(`Khách hủy báo giá v${quote.version}`);

  const [decidePending, runDecide] = useRun(
    decideQuote.bind(null, quote.id) as never
  );
  const [revisePending, runRevise] = useRun(
    reviseQuote.bind(null, quote.id) as never,
    (data) =>
      data?.id &&
      router.push(`/projects/${project.id}/quotes/new?edit=${data.id}`)
  );
  const [deletePending, runDelete] = useRun(
    deleteQuote.bind(null, quote.id) as never,
    () => setDeleteOpen(false)
  );

  const busy = decidePending || revisePending || deletePending;
  const isDeal = quote.status === QuoteStatus.DEAL;

  const decide = (
    status: "deal" | "on_hold" | "rejected",
    extra?: { follow_up_date?: string; cancel_reason?: string }
  ) =>
    runDecide({
      status,
      projectId: project.id,
      version: quote.version,
      ...extra,
    });

  const printBtn = (
    <Button
      variant="ghost"
      size="sm"
      render={<Link href={`/quotes/${quote.id}`} />}
    >
      Xem bản in
    </Button>
  );
  const reviseBtn = (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={() => runRevise()}
    >
      Tạo phiên bản mới
    </Button>
  );

  return (
    <div
      className={
        isDeal
          ? "space-y-3 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4"
          : "space-y-3 rounded-lg border p-4"
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">
          {project.code} · v{quote.version}
        </span>
        <Badge variant={quoteStatus[quote.status].variant}>
          {quoteStatus[quote.status].label}
        </Badge>
        <span className="ml-auto font-semibold tabular-nums">
          {formatVND(quote.total_amount)}
        </span>
      </div>

      <SendHistory quote={quote} />

      <div className="flex flex-wrap gap-2">
        {quote.status === QuoteStatus.DRAFT ? (
          <>
            <Button
              variant="outline"
              size="sm"
              render={
                <Link
                  href={`/projects/${project.id}/quotes/new?edit=${quote.id}`}
                />
              }
            >
              Sửa
            </Button>
            <Button size="sm" onClick={() => setSendOpen(true)}>
              Gửi
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setDeleteOpen(true)}
            >
              Xóa nháp
            </Button>
            {printBtn}
          </>
        ) : null}

        {quote.status === QuoteStatus.WAITING ? (
          <>
            <Button size="sm" disabled={busy} onClick={() => decide("deal")}>
              Chốt ✓
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setHoldOpen(true)}
            >
              Hoãn
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setCancelOpen(true)}
            >
              Hủy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSendOpen(true)}
            >
              Gửi lại
            </Button>
            {reviseBtn}
            {printBtn}
          </>
        ) : null}

        {isDeal ? printBtn : null}

        {quote.status === QuoteStatus.ON_HOLD ||
        quote.status === QuoteStatus.REJECTED ? (
          <>
            {reviseBtn}
            {printBtn}
          </>
        ) : null}
      </div>

      {isDeal ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          Báo giá đã chốt — dùng nút “→ Hợp đồng” ở thanh giai đoạn để chuyển
          bước.
        </p>
      ) : null}

      <SendQuoteDialog
        quoteId={quote.id}
        open={sendOpen}
        onOpenChange={setSendOpen}
      />

      {/* Hoãn — asks the follow-up date, then chains project → on_hold. */}
      <Dialog open={holdOpen} onOpenChange={setHoldOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hoãn báo giá</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="follow_up_date">Hẹn theo dõi lại ngày nào?</Label>
            <Input
              id="follow_up_date"
              type="date"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHoldOpen(false)}>
              Đóng
            </Button>
            <Button
              disabled={busy || !followUp}
              onClick={() => {
                decide("on_hold", { follow_up_date: followUp });
                setHoldOpen(false);
              }}
            >
              Xác nhận hoãn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hủy — asks the reason once, then chains project → cancelled. */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hủy báo giá</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="cancel_reason">Lý do hủy</Label>
            <Input
              id="cancel_reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Đóng
            </Button>
            <Button
              variant="destructive"
              disabled={busy || !reason.trim()}
              onClick={() => {
                decide("rejected", { cancel_reason: reason.trim() });
                setCancelOpen(false);
              }}
            >
              Xác nhận hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Xóa nháp — tiny confirm. */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa báo giá nháp?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {project.code} · v{quote.version} sẽ bị xóa.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Đóng
            </Button>
            <Button
              variant="destructive"
              disabled={deletePending}
              onClick={() => runDelete()}
            >
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function QuotePanel({ project }: { project: Project }) {
  const versions = [...(project.quotes ?? [])].sort(
    (a, b) => b.version - a.version
  );
  const [latest, ...older] = versions;

  return (
    <Card id="stage-quote" className="mb-6 scroll-mt-4">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
          Giai đoạn 3 · Báo giá
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {latest ? (
          <LatestVersion quote={latest} project={project} />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Chưa có báo giá.</p>
            <Button
              size="sm"
              render={
                <Link
                  href={`/projects/${project.id}/quotes/new${
                    project.survey_items?.length ? "?from=survey" : ""
                  }`}
                />
              }
            >
              Lập báo giá
            </Button>
          </div>
        )}

        {older.length > 0 ? (
          <div className="space-y-2">
            <Separator />
            {older.map((q) => (
              <div
                key={q.id}
                className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
              >
                <span>v{q.version}</span>
                <Badge variant={quoteSuperseded.variant}>
                  {quoteSuperseded.label}
                </Badge>
                <span className="tabular-nums">
                  {formatVND(q.total_amount)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  render={<Link href={`/quotes/${q.id}`} />}
                >
                  Xem bản in
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
