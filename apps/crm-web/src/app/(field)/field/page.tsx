import Link from "next/link";

import { Button } from "@yan/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";

import { ProjectStage } from "@/app/(dashboard)/projects/enums";
import { listProjects } from "@/app/(dashboard)/projects/queries";
import { QuoteStatus } from "@/app/(dashboard)/quotes/enums";
import { listQuotes } from "@/app/(dashboard)/quotes/queries";
import { EmptyState } from "@/components/empty-state/empty-state";
import { MAX_PAGE_SIZE } from "@/constants/pagination";
import { storedTotals } from "@/utils/quote-totals/quote-totals";
import { todayISO } from "@/utils/today-iso/today-iso";

import { FieldAppointmentCard } from "../components/field-appointment-card/field-appointment-card";
import { FieldQuoteCard } from "../components/field-quote-card/field-quote-card";
import { FieldSubStatusCard } from "../components/field-sub-status-card/field-sub-status-card";

export default async function FieldPage() {
  const today = todayISO();

  // Server-side `where` for both panels — the `appointment_date` / `visited`
  // filters plan 06 added. This used to be one `listProjects({ limit:
  // MAX_PAGE_SIZE })` filtered in JS, so a project past that window dropped off
  // the boss's phone silently. The list endpoint carries working_contact (F19)
  // and decision_maker (F41 — the card's [Gọi] fallback), so no per-row refetch.
  const [todayAppointments, onSite, quotes] = await Promise.all([
    listProjects({
      stage: ProjectStage.REQUEST,
      appointmentDate: today,
      visited: false,
    }),
    listProjects({
      stage: `${ProjectStage.EXECUTION},${ProjectStage.ACCEPTANCE}`,
      limit: MAX_PAGE_SIZE,
    }),
    listQuotes(),
  ]);

  // Chờ quyết định — waiting quotes. GET /quotes carries its own slim `project`
  // relation (F23), so this no longer joins against the project page above: a
  // quote whose project sits outside that window keeps its card. flatMap rather
  // than filter+map so `project` narrows to non-null without an assertion.
  const waitingQuotes = quotes.flatMap((q) =>
    q?.status === QuoteStatus.WAITING && q?.project
      ? [{ quote: q, project: q.project }]
      : []
  );

  return (
    <div className="space-y-4">
      {/* The screen's name, for a screen reader and for the document outline —
          on a 390px phone UI there is no room to print it, and the four cards
          below are its sections. */}
      <h1 className="sr-only">Chế độ hiện trường</h1>
      <Card>
        <CardHeader>
          <CardTitle as="h2">Hôm nay</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {todayAppointments.length === 0 ? (
            <EmptyState message="Không có lịch hẹn hôm nay." />
          ) : (
            todayAppointments.map((p) => (
              <FieldAppointmentCard key={p.id} project={p} />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Tiếp nhận yêu cầu</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            size="lg"
            render={<Link href="/projects/new">+ Tiếp nhận yêu cầu mới</Link>}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Chờ quyết định</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {waitingQuotes.length === 0 ? (
            <EmptyState message="Không có báo giá chờ quyết định." />
          ) : (
            waitingQuotes.map(({ quote, project }) => (
              <FieldQuoteCard
                key={quote?.id}
                quoteId={quote?.id}
                projectId={project?.id}
                code={project?.code}
                version={quote?.version}
                total={storedTotals(quote).total}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Đang thi công / nghiệm thu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {onSite.length === 0 ? (
            <EmptyState message="Không có công trình đang thi công." />
          ) : (
            onSite.map((p) => <FieldSubStatusCard key={p.id} project={p} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
