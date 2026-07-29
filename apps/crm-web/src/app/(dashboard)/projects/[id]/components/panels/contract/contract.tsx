"use client";

import { Circle, CircleCheckBig, Info, Plus, Printer } from "lucide-react";
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
import { updateProject } from "@/app/(dashboard)/projects/actions/update-project";
import type { Quote } from "@/app/(dashboard)/quotes/types";
import { recordDeposit } from "@/app/(dashboard)/receivables/actions/record-deposit";
import {
  MilestoneStatus,
  MilestoneType,
} from "@/app/(dashboard)/receivables/enums";
import type { PaymentMilestone } from "@/app/(dashboard)/receivables/types";
import { MoneyInput } from "@/components/money-input/money-input";
import { CONTRACT_STATUSES, QUOTE_STATUSES } from "@/constants/labels";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";
import { formatDate } from "@/utils/format-date/format-date";
import { formatVND } from "@/utils/format-vnd/format-vnd";
import { labelOf } from "@/utils/label-of/label-of";
import { todayISO } from "@/utils/today-iso/today-iso";
import { vndInWords } from "@/utils/vnd-in-words/vnd-in-words";

import type { Project } from "../../../../types";

function ChecklistRow({
  done,
  label,
  detail,
  action,
}: {
  done: boolean;
  label: string;
  detail?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      {done ? (
        <CircleCheckBig className="size-4 shrink-0 text-emerald-600" />
      ) : (
        <Circle className="size-4 shrink-0 text-muted-foreground" />
      )}
      <span className={done ? "" : "text-muted-foreground"}>{label}</span>
      {detail ? <span className="ml-auto">{detail}</span> : null}
      {action ? (
        <span className={detail ? "" : "ml-auto"}>{action}</span>
      ) : null}
    </div>
  );
}

export function ContractPanel({
  project,
  contracts,
  milestones,
  dealQuote,
}: {
  project: Project;
  contracts: Contract[];
  milestones: PaymentMilestone[];
  dealQuote?: Quote;
}) {
  // getDealQuote is deal-only, so its presence IS the chốt condition.
  const quoteDeal = Boolean(dealQuote);
  const dealBadge = dealQuote && labelOf(QUOTE_STATUSES, dealQuote.status);
  const clientSigned = Boolean(project.client_signed_date);
  const depositPaid = milestones.some(
    (m) => m.type === MilestoneType.DEPOSIT && m.status === MilestoneStatus.PAID
  );

  // Khách ký xác nhận — stamp client_signed_date.
  const [signState, signAction] = useActionState(
    updateProject.bind(null, project.id),
    INITIAL_ACTION_STATE
  );
  const [signPending, startSign] = useTransition();
  const [signOpen, setSignOpen] = useState(false);
  const [signedDate, setSignedDate] = useState(todayISO);
  useServerAction(signState, signPending, {
    ...ACTION_TOAST_TITLES,
    onSuccess: () => setSignOpen(false),
  });

  // Nhận cọc — record a paid deposit milestone.
  const [depState, depAction] = useActionState(
    recordDeposit.bind(null, project.id),
    INITIAL_ACTION_STATE
  );
  const [depPending, startDep] = useTransition();
  const [depOpen, setDepOpen] = useState(false);
  // 60% of the chốt quote — blank when there is none, never a number from a
  // quote the client did not agree to.
  const [depAmount, setDepAmount] = useState<number | null>(
    dealQuote ? Math.round(dealQuote.total_amount * 0.6) : null
  );
  const [depDate, setDepDate] = useState(todayISO);
  useServerAction(depState, depPending, {
    ...ACTION_TOAST_TITLES,
    onSuccess: () => setDepOpen(false),
  });

  return (
    <div className="space-y-6">
      {/* Điều kiện hoàn thành */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium">Điều kiện hoàn thành</h3>
        <div className="space-y-2 rounded-lg border p-4">
          <ChecklistRow
            done={quoteDeal}
            label="Báo giá đã chốt"
            detail={
              dealQuote ? (
                <span className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">
                    v{dealQuote.version} · {formatVND(dealQuote.total_amount)}
                  </span>
                  <Badge variant={dealBadge?.variant}>{dealBadge?.label}</Badge>
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Chưa có báo giá chốt
                </span>
              )
            }
          />

          <ChecklistRow
            done={clientSigned}
            label="Khách ký xác nhận"
            detail={
              clientSigned ? (
                <span className="text-sm text-muted-foreground">
                  {formatDate(project.client_signed_date!)}
                </span>
              ) : undefined
            }
            action={
              clientSigned ? undefined : (
                <Dialog open={signOpen} onOpenChange={setSignOpen}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSignOpen(true)}
                  >
                    Ghi nhận đã ký
                  </Button>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ghi nhận khách đã ký</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-1.5">
                      <Label htmlFor="client-signed-date">Ngày ký</Label>
                      <DateInput
                        id="client-signed-date"
                        value={signedDate}
                        onChange={setSignedDate}
                      />
                    </div>
                    <DialogFooter>
                      <DialogClose
                        render={<Button variant="ghost">Đóng</Button>}
                      />
                      <Button
                        disabled={signPending || !signedDate}
                        onClick={() =>
                          startSign(() =>
                            signAction({ client_signed_date: signedDate })
                          )
                        }
                      >
                        Xác nhận
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )
            }
          />

          <ChecklistRow
            done={depositPaid}
            label="Nhận cọc (tạm ứng)"
            action={
              depositPaid ? undefined : (
                <Dialog open={depOpen} onOpenChange={setDepOpen}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDepOpen(true)}
                  >
                    Ghi nhận cọc
                  </Button>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ghi nhận cọc (tạm ứng)</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="deposit-amount">Số tiền (VND)</Label>
                        <MoneyInput
                          id="deposit-amount"
                          value={depAmount}
                          onChange={setDepAmount}
                        />
                        {depAmount ? (
                          <p className="text-xs text-muted-foreground">
                            {vndInWords(depAmount)}
                          </p>
                        ) : null}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="deposit-date">Ngày nhận</Label>
                        <DateInput
                          id="deposit-date"
                          value={depDate}
                          onChange={setDepDate}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose
                        render={<Button variant="ghost">Đóng</Button>}
                      />
                      <Button
                        disabled={depPending || !depAmount || !depDate}
                        onClick={() =>
                          startDep(() =>
                            depAction({
                              amount: depAmount ?? 0,
                              received_date: depDate,
                            })
                          )
                        }
                      >
                        Xác nhận
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )
            }
          />
        </div>
      </section>

      {/* Hợp đồng (không bắt buộc) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Hợp đồng (không bắt buộc)</h3>
          <Button
            size="sm"
            render={
              <Link href={`/projects/${project.id}/contracts/new`}>
                <Plus className="size-4" />
                Tạo hợp đồng
              </Link>
            }
          />
        </div>

        {contracts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có hợp đồng.</p>
        ) : (
          <ul className="space-y-2">
            {contracts.map((c) => (
              <ContractRow key={c.id} contract={c} project={project} />
            ))}
          </ul>
        )}
      </section>

      <p className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        <Info className="size-4 shrink-0" />
        Hồ sơ có thể chuẩn bị song song → tab Hồ sơ.
      </p>
    </div>
  );
}

function ContractRow({
  contract,
  project,
}: {
  contract: Contract;
  project: Project;
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
        <Button
          size="sm"
          variant="outline"
          render={
            <Link
              href={`/projects/${project.id}/contracts/new?edit=${contract.id}`}
            >
              Sửa
            </Link>
          }
        />
        <Button
          size="sm"
          variant="outline"
          render={
            <Link href={`/contracts/${contract.id}`}>
              <Printer className="size-4" />
              In
            </Link>
          }
        />
        {signed ? null : (
          <Dialog open={open} onOpenChange={setOpen}>
            <Button size="sm" onClick={() => setOpen(true)}>
              Đánh dấu đã ký
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Đánh dấu hợp đồng đã ký</DialogTitle>
              </DialogHeader>
              <div className="space-y-1.5">
                <Label htmlFor={`contract-signed-${contract.id}`}>
                  Ngày ký
                </Label>
                <DateInput
                  id={`contract-signed-${contract.id}`}
                  value={date}
                  onChange={setDate}
                />
              </div>
              <DialogFooter>
                <DialogClose render={<Button variant="ghost">Đóng</Button>} />
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
                  Xác nhận
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </span>
    </li>
  );
}
