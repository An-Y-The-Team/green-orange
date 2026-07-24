import Link from "next/link";

import { Button } from "@yan/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";

import { ProjectStage } from "@/app/(dashboard)/projects/enums";
import { getProject, listProjects } from "@/app/(dashboard)/projects/queries";
import type { Project } from "@/app/(dashboard)/projects/types";
import { QuoteStatus } from "@/app/(dashboard)/quotes/enums";
import { listQuotes } from "@/app/(dashboard)/quotes/queries";

import { FieldAppointmentCard } from "../components/field-appointment-card";
import { FieldQuoteCard } from "../components/field-quote-card";
import { FieldSubStatusCard } from "../components/field-sub-status-card";

export default async function FieldPage() {
  const [projects, quotes] = await Promise.all([listProjects(), listQuotes()]);

  const today = new Date().toISOString().slice(0, 10);
  const projectById = new Map(projects.map((p) => [p.id, p]));

  // Hôm nay — new requests with a survey appointment today (dashboard filter).
  // Refetch each as detail: the list endpoint omits working_contact, which the
  // [Gọi] tel: link needs; GET /projects/:id includes it.
  const todayRefs = projects.filter(
    (p) =>
      p.stage === ProjectStage.REQUEST && p.appointment_at?.startsWith(today)
  );
  const todayAppointments = (
    await Promise.all(todayRefs.map((p) => getProject(p.id)))
  ).filter((p): p is Project => Boolean(p));

  // Chờ quyết định — waiting quotes joined to their project.
  const waitingQuotes = quotes
    .filter((q) => q.status === QuoteStatus.WAITING)
    .map((q) => ({ quote: q, project: projectById.get(q.project_id) }))
    .filter((x) => x.project);

  // Đang thi công / nghiệm thu.
  const onSite = projects.filter(
    (p) =>
      p.stage === ProjectStage.EXECUTION || p.stage === ProjectStage.ACCEPTANCE
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
                key={quote.id}
                quoteId={quote.id}
                projectId={project!.id}
                code={project!.code}
                version={quote.version}
                total={quote.total_amount}
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
