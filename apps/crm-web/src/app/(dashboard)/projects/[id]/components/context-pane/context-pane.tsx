import { MapPin, Phone } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import { cn } from "@yan/ui/lib/utils";

import type {
  Bill,
  PaymentMilestone,
} from "@/app/(dashboard)/receivables/types";
import { formatDate } from "@/utils/format-date/format-date";
import { formatVND } from "@/utils/format-vnd/format-vnd";
import { todayISO } from "@/utils/today-iso/today-iso";

import type { PaperworkItem, Project, ProjectContact } from "../../../types";
import { Notes } from "./components/notes/notes";
import { moneySummary } from "./utils/money-summary/money-summary";
import { upcoming } from "./utils/upcoming/upcoming";

/**
 * The record's right pane (option C): who to call, where the money stands,
 * what's coming up, and the notes. It never changes with the viewed stage, so
 * the operator doesn't hunt for a phone number or the balance while working.
 */
export function ContextPane({
  project,
  milestones,
  bills,
  paperworkItems,
}: {
  project: Project;
  milestones: PaymentMilestone[];
  bills: Bill[];
  paperworkItems: PaperworkItem[];
}) {
  const today = todayISO();
  const money = moneySummary({
    quotes: project.quotes ?? [],
    bills,
    milestones,
    today,
  });
  const soon = upcoming({ project, paperworkItems, milestones, today });

  const contact = project.working_contact;
  const approver =
    project.decision_maker && project.decision_maker.id !== contact?.id
      ? project.decision_maker
      : undefined;

  return (
    <aside aria-label="Thông tin công trình" className="min-w-0 space-y-6">
      <Section title="Liên hệ">
        {contact ? (
          <Person contact={contact} relation="Liên hệ hằng ngày" />
        ) : (
          <p className="text-sm text-muted-foreground">
            Chưa có người liên hệ.
          </p>
        )}
        {approver ? (
          <Person contact={approver} relation="Người duyệt / ký" />
        ) : null}
        {project.location ? (
          <p className="flex gap-1.5 text-sm text-muted-foreground">
            <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>
              {project.location.name}
              {project.location.address ? ` — ${project.location.address}` : ""}
            </span>
          </p>
        ) : null}
      </Section>

      <Section title="Tiền">
        {money ? (
          <div className="space-y-2 text-sm tabular-nums">
            <Row label="Giá trị" value={formatVND(money.value)} strong />
            <Row label="Đã thu" value={formatVND(money.collected)} />
            <Row label="Còn lại" value={formatVND(money.remaining)} />
            {/* The numbers above carry the meaning; the bar only reinforces it. */}
            <div
              aria-hidden
              className="h-1.5 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-done"
                style={{
                  width: `${Math.min(100, Math.round((money.collected / (money.value || 1)) * 100))}%`,
                }}
              />
            </div>
            {money.overdue ? (
              <Badge variant="destructive">
                Quá hạn {money.overdue.days} ngày ·{" "}
                {formatVND(money.overdue.amount)}
              </Badge>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Chưa có báo giá.</p>
        )}
      </Section>

      {soon.length ? (
        <Section title="Sắp tới">
          <ul className="space-y-1.5 text-sm">
            {soon.map((item) => (
              <li
                key={`${item.date}-${item.label}`}
                className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2"
              >
                <span
                  className={cn(
                    "tabular-nums",
                    item.overdue
                      ? "font-medium text-problem"
                      : "text-muted-foreground"
                  )}
                >
                  {formatDate(item.date)}
                </span>
                <span>
                  {item.label}
                  {item.overdue ? (
                    <span className="text-problem"> · quá hạn</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Ghi chú & hoạt động">
        <Notes project={project} />
      </Section>
    </aside>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Person({
  contact,
  relation,
}: {
  contact: ProjectContact;
  relation: string;
}) {
  return (
    <div className="space-y-1 text-sm">
      <div className="font-medium">{contact.name}</div>
      <div className="text-xs text-muted-foreground">
        {relation}
        {contact.title ? ` · ${contact.title}` : ""}
      </div>
      {contact.phone ? (
        <div className="flex flex-wrap items-center gap-2">
          {/* Selectable text first: a tel: link may do nothing on a desktop. */}
          <span className="select-all tabular-nums">{contact.phone}</span>
          <Button
            variant="outline"
            size="sm"
            render={
              <a
                href={`tel:${contact.phone}`}
                aria-label={`Gọi ${contact.name}`}
              >
                <Phone aria-hidden className="size-3.5" />
                Gọi
              </a>
            }
          />
        </div>
      ) : null}
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold" : undefined}>{value}</span>
    </div>
  );
}
