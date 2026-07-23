import Link from "next/link";

import { Badge } from "@yan/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@yan/ui/components/card";

import { PageHeader } from "@/components/page-header";
import { formatDate } from "@/lib/format";
import { projectStage, projectStageOrder } from "@/lib/labels";

import { ProjectStage, ProjectStatus } from "../projects/enums";
import { listProjects } from "../projects/queries";
import type { Project } from "../projects/types";

function ProjectLinkList({ items }: { items: Project[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Không có công trình nào.</p>
    );
  }
  return (
    <ul className="space-y-2 text-sm">
      {items.map((p) => (
        <li key={p.id} className="flex items-center justify-between gap-4">
          <Link href={`/projects/${p.id}`} className="hover:underline">
            <span className="font-medium">{p.code}</span> · {p.name}
          </Link>
          <span className="whitespace-nowrap text-muted-foreground">
            {p.appointment_at
              ? formatDate(p.appointment_at)
              : p.follow_up_date
                ? formatDate(p.follow_up_date)
                : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function DashboardPage() {
  const projects = await listProjects();
  const today = new Date().toISOString().slice(0, 10);

  // Hôm nay — new requests with a survey appointment today.
  const todayAppointments = projects.filter(
    (p) =>
      p.stage === ProjectStage.REQUEST && p.appointment_at?.startsWith(today)
  );

  // Cần theo dõi — parked jobs whose follow-up date has arrived.
  const followUps = projects.filter(
    (p) =>
      p.status === ProjectStatus.ON_HOLD &&
      p.follow_up_date &&
      p.follow_up_date <= today
  );

  // Pipeline — count per lifecycle stage (cancelled jobs excluded).
  const active = projects.filter((p) => p.status !== ProjectStatus.CANCELLED);
  const byStage = projectStageOrder.map((stage) => ({
    stage,
    count: active.filter((p) => p.stage === stage).length,
  }));

  return (
    <>
      <PageHeader
        title="Tổng quan"
        description={`${active.length} công trình đang theo dõi.`}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hôm nay</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectLinkList items={todayAppointments} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cần theo dõi</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectLinkList items={followUps} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {byStage.map(({ stage, count }) => (
              <div
                key={stage}
                className="flex items-center gap-2 rounded-md border px-3 py-2"
              >
                <Badge
                  variant={count > 0 ? projectStage[stage].variant : "outline"}
                >
                  {count}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {projectStage[stage].label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
