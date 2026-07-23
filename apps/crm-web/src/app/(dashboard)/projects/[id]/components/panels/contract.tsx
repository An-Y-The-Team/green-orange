"use client";

import { Circle, CircleCheckBig, Info, Plus, Printer } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@yan/ui/components/dialog";
import { Input } from "@yan/ui/components/input";
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
import { formatDate, formatVND } from "@/lib/format";
import { contractStatus, quoteStatus } from "@/lib/labels";

import type { Project } from "../../../types";

const TODAY = () => new Date().toISOString().slice(0, 10);

const toastOpts = { successToastTitle: "Thành công", errorToastTitle: "Lỗi" };

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
  const quoteDeal = dealQuote?.status === "deal";
  const clientSigned = Boolean(project.client_signed_date);
  const depositPaid = milestones.some(
    (m) => m.type === MilestoneType.DEPOSIT && m.status === MilestoneStatus.PAID
  );

  // Khách ký xác nhận — stamp client_signed_date.
  const [signState, signAction] = useActionState(
    updateProject.bind(null, project.id),
    { success: false } as ServerActionState
  );
  const [signPending, startSign] = useTransition();
  const [signOpen, setSignOpen] = useState(false);
  const [signedDate, setSignedDate] = useState(TODAY);
  useServerAction(signState, signPending, {
    ...toastOpts,
    onSuccess: () => setSignOpen(false),
  });

  // Nhận cọc — record a paid deposit milestone.
  const [depState, depAction] = useActionState(
    recordDeposit.bind(null, project.id),
    { success: false } as ServerActionState
  );
  const [depPending, startDep] = useTransition();
  const [depOpen, setDepOpen] = useState(false);
  const [depAmount, setDepAmount] = useState(
    String(Math.round((dealQuote?.total_amount ?? 0) * 0.6))
  );
  const [depDate, setDepDate] = useState(TODAY);
  useServerAction(depState, depPending, {
    ...toastOpts,
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
                  <Badge variant={quoteStatus[dealQuote.status].variant}>
                    {quoteStatus[dealQuote.status].label}
                  </Badge>
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Chưa có báo giá
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
                      <Input
                        id="client-signed-date"
                        type="date"
                        value={signedDate}
                        onChange={(e) => setSignedDate(e.target.value)}
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
                        <Input
                          id="deposit-amount"
                          type="number"
                          min={0}
                          value={depAmount}
                          onChange={(e) => setDepAmount(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="deposit-date">Ngày nhận</Label>
                        <Input
                          id="deposit-date"
                          type="date"
                          value={depDate}
                          onChange={(e) => setDepDate(e.target.value)}
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
                              amount: Number(depAmount),
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
    { success: false } as ServerActionState
  );
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(TODAY);
  useServerAction(state, isPending, {
    ...toastOpts,
    onSuccess: () => setOpen(false),
  });

  const signed = contract.status === "signed";

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm">
      <span className="font-medium">{contract.code}</span>
      <Badge variant={contractStatus[contract.status].variant}>
        {contractStatus[contract.status].label}
      </Badge>
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
                <Input
                  id={`contract-signed-${contract.id}`}
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
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
