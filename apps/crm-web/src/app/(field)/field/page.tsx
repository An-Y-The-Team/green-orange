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
import { MAX_PAGE_SIZE } from "@/constants/pagination";
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
      <Card>
        <CardHeader>
          <CardTitle>Hôm nay</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {todayAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Không có lịch hẹn hôm nay.
            </p>
          ) : (
            todayAppointments.map((p) => (
              <FieldAppointmentCard key={p.id} project={p} />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tiếp nhận yêu cầu</CardTitle>
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
          <CardTitle>Chờ quyết định</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {waitingQuotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Không có báo giá chờ quyết định.
            </p>
          ) : (
            waitingQuotes.map(({ quote, project }) => (
              <FieldQuoteCard
                key={quote?.id}
                quoteId={quote?.id}
                projectId={project?.id}
                code={project?.code}
                version={quote?.version}
                total={quote?.total_amount}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Đang thi công / nghiệm thu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {onSite.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Không có công trình đang thi công.
            </p>
          ) : (
            onSite.map((p) => <FieldSubStatusCard key={p.id} project={p} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
