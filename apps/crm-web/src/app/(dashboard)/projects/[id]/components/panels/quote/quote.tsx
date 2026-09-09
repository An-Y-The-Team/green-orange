"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import { DateInput } from "@yan/ui/components/date-input/date-input";
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
import { ReviseQuoteButton } from "@/app/(dashboard)/quotes/components/revise-quote-button/revise-quote-button";
import { SendQuoteDialog } from "@/app/(dashboard)/quotes/components/send-quote-dialog/send-quote-dialog";
import {
  type QuoteDecision as QuoteDecisionStatus,
  QuoteStatus,
} from "@/app/(dashboard)/quotes/enums";
import type { Quote, QuoteSendLog } from "@/app/(dashboard)/quotes/types";
import { ConfirmAction } from "@/components/confirm-action/confirm-action";
import { EmptyState } from "@/components/empty-state/empty-state";
import {
  ACTIONS,
  QUOTE_CHANNELS,
  QUOTE_STATUSES,
  QUOTE_SUPERSEDED_LABEL,
} from "@/constants/labels";
import { useRun } from "@/hooks/use-run/use-run";
import { formatDate } from "@/utils/format-date/format-date";
import { formatTime } from "@/utils/format-time/format-time";
import { formatVND } from "@/utils/format-vnd/format-vnd";
import { labelOf } from "@/utils/label-of/label-of";
import { storedTotals } from "@/utils/quote-totals/quote-totals";

import type { Project } from "../../../../types";
import { StageCard } from "../../stage-card/stage-card";

/**
 * When and how this version reached the client, written by POST /quotes/:id/send.
 *
 * Only the newest send shows inline, with its date and clock time. The line
 * used to concatenate every one of them, so a quote chased four times wrapped
 * across the card and buried the actions under it; the earlier sends — with
 * who sent each one, and where to chase the reply — live one click away.
 *
 * The dialog link appears from the second send on. A single send has no
 * history to browse, so the link would open a dialog restating the line.
 *
 * The guard tests the array itself, not `length === 0`: `send_logs` can be
 * absent rather than empty (an older payload, a shape that doesn't select it),
 * and `undefined === 0` is false — which is exactly how this rendered a bare
 * "Gửi:" label with nothing after it.
 */
function SendHistory({ quote }: { quote: Quote }) {
  const [open, setOpen] = useState(false);
  const logs = quote.send_logs ?? [];
  if (logs.length === 0) return null;

  // Both backends order the logs by id ascending (quotes.module.ts /
  // Quote.send_logs), so the newest send is the last row.
  const latest = logs[logs.length - 1];
  const channelOf = (l: QuoteSendLog) => QUOTE_CHANNELS[l.channel] ?? l.channel;

  return (
    <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
      <span>
        Gửi: {channelOf(latest)} {formatDate(latest.sent_at)}{" "}
        {formatTime(latest.sent_at)}
      </span>
      {/* Inside running text, so a link rather than a box — and only from the
          second send on, when there is actually a history to open. */}
      {logs.length > 1 ? (
        <Button variant="link" size="xs" onClick={() => setOpen(true)}>
          Lịch sử gửi ({logs.length})
        </Button>
      ) : null}

      {/* Read-only detail, not an edit form — a dialog is the right shape. */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lịch sử gửi · v{quote.version}</DialogTitle>
          </DialogHeader>
          <ul className="space-y-3 text-sm">
            {/* Newest first: the last chase is what the operator is acting on. */}
            {[...logs].reverse().map((l) => (
              <li key={l.id} className="space-y-0.5">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="tabular-nums">
                    {formatDate(l.sent_at)} {formatTime(l.sent_at)}
                  </span>
                  <Badge variant="outline">{channelOf(l)}</Badge>
                  <span className="text-muted-foreground">{l.sent_by}</span>
                </span>
                {l.follow_up_ref ? (
                  <span className="block text-xs text-muted-foreground">
                    {l.follow_up_ref}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {ACTIONS.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * The latest version's identity and its *utility* actions (edit, revise, print,
 * delete a draft). Deciding the quote — send, chốt, hoãn, hủy — is the stage's
 * next step and lives in the panel footer (`QuoteDecision`), so the strip here
 * no longer mixes "look at this" with "advance the pipeline".
 */
function LatestVersion({ quote, project }: { quote: Quote; project: Project }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, runDelete] = useRun(
    deleteQuote.bind(null, quote.id),
    () => setDeleteOpen(false)
  );

  const isDeal = quote.status === QuoteStatus.DEAL;
  const statusBadge = labelOf(QUOTE_STATUSES, quote.status);

  const printBtn = (
    <Button
      variant="outline"
      size="sm"
      render={<Link href={`/quotes/${quote.id}/print`} />}
    >
      Xem bản in
    </Button>
  );
  const reviseBtn = (
    <ReviseQuoteButton
      quoteId={quote.id}
      projectId={project.id}
      disabled={deletePending}
    />
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
        <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
        <span className="ml-auto font-semibold tabular-nums">
          {formatVND(storedTotals(quote).total)}
        </span>
      </div>

      <SendHistory quote={quote} />

      <div className="flex flex-wrap gap-2">
        {quote.status === QuoteStatus.DRAFT ? (
          <>
            <Button
              variant="outline"
              size="sm"
              render={<Link href={`/quotes/${quote.id}`} />}
            >
              {ACTIONS.edit}
            </Button>
            {printBtn}
            <Button
              variant="destructive"
              size="sm"
              disabled={deletePending}
              onClick={() => setDeleteOpen(true)}
            >
              Xóa nháp
            </Button>
          </>
        ) : (
          /* Every non-draft version — waiting, chốt, hoãn, hủy — is frozen but
             revisable: bargaining can reopen after a chốt (client changes scope,
             price gets renegotiated), so no status hard-locks "phiên bản mới".
             The chốt version stays chốt until the new one is decided, so the
             contract keeps reading a real figure meanwhile. */
          <>
            {reviseBtn}
            {printBtn}
          </>
        )}
      </div>

      {isDeal ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          Báo giá đã chốt — dùng nút “→ Hợp đồng” ở thanh giai đoạn để chuyển
          bước, hoặc tạo phiên bản mới nếu khách đổi ý.
        </p>
      ) : null}

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
              {ACTIONS.close}
            </Button>
            <Button
              variant="destructive"
              disabled={deletePending}
              onClick={() => runDelete()}
            >
              {ACTIONS.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * The stage's next step: what happens to the quote. Draft → gửi; waiting →
 * gửi lại / hoãn / hủy / chốt. Rendered in the StageCard footer with chốt as
 * the primary, so the one button that advances the pipeline is never a small
 * outline lost in a row of print links (which is where it used to sit).
 */
function QuoteDecision({ quote, project }: { quote: Quote; project: Project }) {
  const [sendOpen, setSendOpen] = useState(false);
  const [holdOpen, setHoldOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const [reason, setReason] = useState(`Khách hủy báo giá v${quote.version}`);

  const [busy, runDecide] = useRun(decideQuote.bind(null, quote.id));

  const decide = (
    status: QuoteDecisionStatus,
    extra?: { follow_up_date?: string; cancel_reason?: string }
  ) =>
    runDecide({
      status,
      projectId: project.id,
      version: quote.version,
      ...extra,
    });

  // Hoãn — sends the follow-up date with the decision, then closes the dialog.
  const handleConfirmHold = () => {
    decide(QuoteStatus.ON_HOLD, { follow_up_date: followUp });
    setHoldOpen(false);
  };

  // Hủy — sends the cancel reason with the decision, then closes the dialog.
  const handleConfirmCancel = () => {
    decide(QuoteStatus.REJECTED, { cancel_reason: reason.trim() });
    setCancelOpen(false);
  };

  const isDraft = quote.status === QuoteStatus.DRAFT;
  const isWaiting = quote.status === QuoteStatus.WAITING;

  // Chốt/hoãn/hủy are decisions on a quote the client has seen; a frozen or
  // already-decided version offers none, and the stepper carries the stage hop.
  if (!isDraft && !isWaiting) return null;

  return (
    <>
      {isWaiting ? (
        <>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setSendOpen(true)}
          >
            Gửi lại
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setHoldOpen(true)}
          >
            Hoãn
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => setCancelOpen(true)}
          >
            {ACTIONS.cancel}
          </Button>
          <ConfirmAction
            trigger={<Button disabled={busy}>Chốt ✓</Button>}
            title={`Chốt báo giá v${quote.version}?`}
            consequence={`Chốt ${formatVND(storedTotals(quote).total)} và đưa công trình sang Hợp đồng. Bản này khóa lại — muốn đổi giá phải lập phiên bản mới.`}
            confirmLabel="Chốt báo giá"
            pending={busy}
            onConfirm={() => decide(QuoteStatus.DEAL)}
          />
        </>
      ) : (
        <Button disabled={busy} onClick={() => setSendOpen(true)}>
          {ACTIONS.send}
        </Button>
      )}

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
            <DateInput
              id="follow_up_date"
              value={followUp}
              onChange={setFollowUp}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHoldOpen(false)}>
              {ACTIONS.close}
            </Button>
            <Button disabled={busy || !followUp} onClick={handleConfirmHold}>
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
              {ACTIONS.close}
            </Button>
            <Button
              variant="destructive"
              disabled={busy || !reason.trim()}
              onClick={handleConfirmCancel}
            >
              Xác nhận hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function QuotePanel({ project }: { project: Project }) {
  const versions = [...(project.quotes ?? [])].sort(
    (a, b) => b.version - a.version
  );
  const [latest, ...older] = versions;

  return (
    <StageCard
      project={project}
      contentClassName="space-y-4"
      footer={
        latest ? <QuoteDecision quote={latest} project={project} /> : undefined
      }
    >
      {latest ? (
        <LatestVersion quote={latest} project={project} />
      ) : (
        <EmptyState
          message="Chưa có báo giá."
          action={
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
          }
        />
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
              <Badge variant={QUOTE_SUPERSEDED_LABEL.variant}>
                {QUOTE_SUPERSEDED_LABEL.label}
              </Badge>
              <span className="tabular-nums">
                {formatVND(storedTotals(q).total)}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                render={<Link href={`/quotes/${q.id}/print`} />}
              >
                Xem bản in
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </StageCard>
  );
}
