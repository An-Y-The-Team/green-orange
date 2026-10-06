"use client";

import { Info, Plus, Printer } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import { useServerAction } from "@yan/shared/hooks/use-server-actions";
import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import { DateInput } from "@yan/ui/components/date-input/date-input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@yan/ui/components/dialog";
import { Label } from "@yan/ui/components/label";

import { signContract } from "@/app/(dashboard)/contracts/actions/sign-contract";
import type { Contract } from "@/app/(dashboard)/contracts/types";
import { contractHref } from "@/app/(dashboard)/contracts/utils/contract-href/contract-href";
import type { Quote } from "@/app/(dashboard)/quotes/types";
import {
  MilestoneStatus,
  MilestoneType,
} from "@/app/(dashboard)/receivables/enums";
import type { PaymentMilestone } from "@/app/(dashboard)/receivables/types";
import { AttachmentList } from "@/components/attachments/attachment-list/attachment-list";
import { AttachmentKind } from "@/components/attachments/enums";
import type { Attachment } from "@/components/attachments/types";
import { EmptyState } from "@/components/empty-state/empty-state";
import {
  ACTIONS,
  ATTACHMENT_KINDS,
  CONTRACT_STATUSES,
  FIELDS,
  MILESTONE_TYPES,
} from "@/constants/labels";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";
import { formatDate } from "@/utils/format-date/format-date";
import { formatVND } from "@/utils/format-vnd/format-vnd";
import { labelOf } from "@/utils/label-of/label-of";
import { todayISO } from "@/utils/today-iso/today-iso";

import { GateKey, ProjectStage } from "../../../../enums";
import type { Project } from "../../../../types";
import type { StageGate } from "../../../utils/stage-gates/stage-gates";
import { viewHref } from "../../../utils/view-href/view-href";
import { RecordClientSigned } from "../../gate-actions/record-client-signed/record-client-signed";
import { RecordDeposit } from "../../gate-actions/record-deposit/record-deposit";
import {
  type GateActions,
  GateChecklist,
} from "../../gate-checklist/gate-checklist";

export function ContractPanel({
  project,
  attachments,
  contracts,
  milestones,
  dealQuote,
  gates,
}: {
  project: Project;
  /** Every file of the job; each contract / cọc row filters its own. */
  attachments: Attachment[];
  contracts: Contract[];
  milestones: PaymentMilestone[];
  dealQuote?: Quote;
  gates: StageGate[];
}) {
  const clientSigned = Boolean(project.client_signed_date);
  const deposits = milestones.filter((m) => m.type === MilestoneType.DEPOSIT);
  const depositPaid = deposits.some((m) => m.status === MilestoneStatus.PAID);

  // Gate = task: each open row carries the button that completes it.
  const actions: GateActions = {
    [GateKey.CLIENT_SIGNED]: clientSigned
      ? undefined
      : (primary) => <RecordClientSigned project={project} primary={primary} />,
    [GateKey.DEPOSIT]: depositPaid
      ? undefined
      : (primary) => (
          <RecordDeposit
            project={project}
            dealQuote={dealQuote}
            primary={primary}
          />
        ),
  };

  return (
    <div className="space-y-6">
      <GateChecklist
        stage={ProjectStage.CONTRACT}
        gates={gates}
        actions={actions}
      />

      {/* Hợp đồng (không bắt buộc) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Hợp đồng (không bắt buộc)</h3>
          {/* Only once one exists — otherwise the EmptyState below carries the
              same action, and the section showed two buttons for one route. */}
          {contracts.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              render={
                <Link
                  data-edit-link
                  href={`/projects/${project.id}/contracts/new`}
                >
                  <Plus className="size-4" />
                  Tạo hợp đồng
                </Link>
              }
            />
          ) : null}
        </div>

        {contracts.length === 0 ? (
          <EmptyState
            message="Chưa có hợp đồng."
            action={
              <Button
                size="sm"
                variant="outline"
                render={
                  <Link
                    data-edit-link
                    href={`/projects/${project.id}/contracts/new`}
                  />
                }
              >
                Tạo hợp đồng
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2">
            {contracts.map((c) => (
              <ContractRow
                key={c.id}
                contract={c}
                project={project}
                attachments={attachments}
              />
            ))}
          </ul>
        )}
      </section>

      {/* The recorded cọc, with the client's transfer slip / phiếu thu beside
          it — optional, the gate never waits on a file. */}
      {deposits.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-medium">Tiền cọc</h3>
          <ul className="space-y-2">
            {deposits.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <span className="font-medium">
                  {MILESTONE_TYPES[MilestoneType.DEPOSIT]}
                </span>
                <span className="tabular-nums">{formatVND(m.amount)}</span>
                {m.paid_date ? (
                  <span className="text-muted-foreground">
                    {formatDate(m.paid_date)}
                  </span>
                ) : null}
                <span className="ml-auto">
                  <AttachmentList
                    owner={{ project_id: project.id }}
                    kind={AttachmentKind.PAYMENT_PROOF}
                    link={{ payment_milestone_id: m.id }}
                    initial={attachments.filter(
                      (a) =>
                        a.kind === AttachmentKind.PAYMENT_PROOF &&
                        a.payment_milestone_id === m.id
                    )}
                    title={ATTACHMENT_KINDS[AttachmentKind.PAYMENT_PROOF]}
                    target={`${MILESTONE_TYPES[MilestoneType.DEPOSIT]} ${formatVND(m.amount)}`}
                    emptyMessage="Chưa có chứng từ chuyển khoản / phiếu thu."
                    compact
                  />
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Only while the job is here — opened later from the nav, it's history. */}
      {project.stage === ProjectStage.CONTRACT ? (
        <p className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          <Info className="size-4 shrink-0" />
          Hồ sơ có thể chuẩn bị song song —{" "}
          <Link
            href={viewHref({ project, view: ProjectStage.PAPERWORK })}
            className="font-medium text-foreground underline underline-offset-4"
          >
            mở Chuẩn bị hồ sơ
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function ContractRow({
  contract,
  project,
  attachments,
}: {
  contract: Contract;
  project: Project;
  attachments: Attachment[];
}) {
  const [state, formAction] = useActionState(
    signContract.bind(null, contract.id, project.id),
    INITIAL_ACTION_STATE
  );
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayISO);
  useServerAction(state, isPending, {
    ...ACTION_TOAST_TITLES,
    onSuccess: () => setOpen(false),
  });

  const signed = contract.status === "signed";
  const badge = labelOf(CONTRACT_STATUSES, contract.status);

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm">
      <span className="font-medium">{contract.code}</span>
      <Badge variant={badge.variant}>{badge.label}</Badge>
      {contract.signed_date ? (
        <span className="text-muted-foreground">
          {formatDate(contract.signed_date)}
        </span>
      ) : null}

      <span className="ml-auto flex flex-wrap items-center gap-1.5">
        {/* The signed scan — optional, never needed for "Đánh dấu đã ký". */}
        <AttachmentList
          owner={{ project_id: project.id }}
          kind={AttachmentKind.SIGNED_CONTRACT}
          link={{ contract_id: contract.id }}
          initial={attachments.filter(
            (a) =>
              a.kind === AttachmentKind.SIGNED_CONTRACT &&
              a.contract_id === contract.id
          )}
          title={ATTACHMENT_KINDS[AttachmentKind.SIGNED_CONTRACT]}
          target={contract.code}
          emptyMessage="Chưa có bản hợp đồng đã ký."
          compact
        />
        {/* A signed contract's content is frozen (the server enforces it too). */}
        {signed ? null : (
          <Button
            size="sm"
            variant="outline"
            render={
              <Link
                data-edit-link
                href={`/projects/${project.id}/contracts/new?edit=${contract.id}`}
              >
                {ACTIONS.edit}
              </Link>
            }
          />
        )}
        <Button
          size="sm"
          variant="outline"
          render={
            <Link href={contractHref(contract)}>
              <Printer className="size-4" />
              In
            </Link>
          }
        />
        {signed ? null : (
          <Dialog open={open} onOpenChange={setOpen}>
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              Đánh dấu đã ký
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Đánh dấu hợp đồng đã ký</DialogTitle>
              </DialogHeader>
              <div className="space-y-1.5">
                <Label htmlFor={`contract-signed-${contract.id}`}>
                  {FIELDS.signDate}
                </Label>
                <DateInput
                  id={`contract-signed-${contract.id}`}
                  value={date}
                  onChange={setDate}
                />
              </div>
              <DialogFooter>
                <DialogClose
                  render={<Button variant="outline">{ACTIONS.close}</Button>}
                />
                <Button
                  disabled={isPending || !date}
                  onClick={() =>
                    startTransition(() =>
                      formAction({
                        signed_date: date,
                        client_has_signed: Boolean(project.client_signed_date),
                      })
                    )
                  }
                >
                  {ACTIONS.confirm}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </span>
    </li>
  );
}
