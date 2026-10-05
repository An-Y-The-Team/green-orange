import { Printer } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";

import type { Contract } from "@/app/(dashboard)/contracts/types";
import { contractHref } from "@/app/(dashboard)/contracts/utils/contract-href/contract-href";
import {
  quoteHref,
  quotePrintHref,
} from "@/app/(dashboard)/quotes/utils/quote-href/quote-href";
import type { Bill, Settlement } from "@/app/(dashboard)/receivables/types";
import {
  BILL_STATUSES,
  CONTRACT_STATUSES,
  PROJECT_STAGE_ORDER,
  QUOTE_CHANNELS,
  QUOTE_STATUSES,
  SETTLEMENT_STATUSES,
} from "@/constants/labels";
import { formatDate } from "@/utils/format-date/format-date";
import { formatVND } from "@/utils/format-vnd/format-vnd";
import { labelOf } from "@/utils/label-of/label-of";
import { storedTotals } from "@/utils/quote-totals/quote-totals";

import { ProjectStage } from "../../../enums";
import type { Project } from "../../../types";

/**
 * Giấy tờ — every document of the job in one list: each báo giá version, the
 * hợp đồng, the quyết toán and hóa đơn, and the fixed print sheets. It replaces
 * the read-only Báo giá / Thanh toán tabs, which showed the same rows with no
 * way to open or print them.
 */
export function DocumentsView({
  project,
  contracts,
  settlements,
  bills,
}: {
  project: Project;
  contracts: Contract[];
  settlements: Settlement[];
  bills: Bill[];
}) {
  const base = `/projects/${project.id}`;
  const quotes = [...(project.quotes ?? [])].sort(
    (a, b) => b.version - a.version
  );
  const reachedAcceptance =
    PROJECT_STAGE_ORDER.indexOf(project.stage) >=
    PROJECT_STAGE_ORDER.indexOf(ProjectStage.ACCEPTANCE);

  const rows: ReactNode[] = [
    ...quotes.map((q) => {
      const badge = labelOf(QUOTE_STATUSES, q.status);
      const lastSend = q.send_logs?.at(-1);
      return (
        <DocRow
          key={`quote-${q.id}`}
          kind="Báo giá"
          title={`${project.code} · v${q.version}`}
          badge={<Badge variant={badge.variant}>{badge.label}</Badge>}
          detail={[
            formatVND(storedTotals(q).total),
            lastSend
              ? `gửi ${QUOTE_CHANNELS[lastSend.channel] ?? lastSend.channel} ${formatDate(lastSend.sent_at)}`
              : null,
          ]}
          openHref={quoteHref({ id: q.id, project_id: project.id })}
          printHref={quotePrintHref({ id: q.id, project_id: project.id })}
        />
      );
    }),
    ...contracts.map((c) => {
      const badge = labelOf(CONTRACT_STATUSES, c.status);
      return (
        <DocRow
          key={`contract-${c.id}`}
          kind="Hợp đồng"
          title={c.code}
          badge={<Badge variant={badge.variant}>{badge.label}</Badge>}
          detail={[c.signed_date ? `ký ${formatDate(c.signed_date)}` : null]}
          openHref={contractHref(c)}
        />
      );
    }),
    ...settlements.map((s) => {
      const badge = labelOf(SETTLEMENT_STATUSES, s.status);
      return (
        <DocRow
          key={`settlement-${s.id}`}
          kind="Quyết toán"
          title="Biên bản quyết toán"
          badge={<Badge variant={badge.variant}>{badge.label}</Badge>}
          detail={[s.signed_date ? `ký ${formatDate(s.signed_date)}` : null]}
          printHref={`${base}/print/settlement/${s.id}`}
        />
      );
    }),
    ...bills.map((b) => {
      const badge = labelOf(BILL_STATUSES, b.status);
      return (
        <DocRow
          key={`bill-${b.id}`}
          kind="Hóa đơn"
          title="Đề nghị thanh toán"
          badge={<Badge variant={badge.variant}>{badge.label}</Badge>}
          detail={[formatVND(b.total_amount)]}
          printHref={`${base}/print/bill/${b.id}`}
        />
      );
    }),
    ...(reachedAcceptance
      ? [
          <DocRow
            key="acceptance-request"
            kind="Bản in"
            title="Thư yêu cầu nghiệm thu"
            printHref={`${base}/print/acceptance-request`}
          />,
        ]
      : []),
    <DocRow
      key="worker-list"
      kind="Bản in"
      title="Danh sách nhân sự"
      printHref={`${base}/print/worker-list`}
    />,
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Giấy tờ</CardTitle>
        <p className="text-sm text-muted-foreground">
          Mọi giấy tờ của công trình.
        </p>
      </CardHeader>
      <CardContent>
        {/* Never empty: the worker-list sheet always exists. */}
        <ul className="divide-y rounded-lg border">{rows}</ul>
      </CardContent>
    </Card>
  );
}

function DocRow({
  kind,
  title,
  badge,
  detail = [],
  openHref,
  printHref,
}: {
  kind: string;
  title: string;
  badge?: ReactNode;
  detail?: (string | null)[];
  openHref?: string;
  printHref?: string;
}) {
  const facts = [kind, ...detail.filter(Boolean)].join(" · ");
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 text-sm">
      <div className="min-w-0 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2 font-medium">
          {title}
          {badge}
        </div>
        <div className="text-muted-foreground">{facts}</div>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        {openHref ? (
          <Button
            size="sm"
            variant="outline"
            render={<Link href={openHref}>Mở</Link>}
          />
        ) : null}
        {printHref ? (
          <Button
            size="sm"
            variant="outline"
            render={
              <Link href={printHref} target="_blank">
                <Printer className="size-4" />
                In
              </Link>
            }
          />
        ) : null}
      </div>
    </li>
  );
}
