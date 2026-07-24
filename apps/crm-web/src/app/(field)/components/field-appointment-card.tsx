"use client";

import { MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { useActionState, useTransition } from "react";

import {
  type ServerActionState,
  useServerAction,
} from "@yan/shared/hooks/use-server-actions";
import { Button } from "@yan/ui/components/button";

import { updateProject } from "@/app/(dashboard)/projects/actions/update-project";
import { ProjectStage } from "@/app/(dashboard)/projects/enums";
import type { Project } from "@/app/(dashboard)/projects/types";

const initialState: ServerActionState = { success: false };
const toastOpts = { successToastTitle: "Thành công", errorToastTitle: "Lỗi" };

// Local-date today (matches the request panel's visit_date default).
function today() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function FieldAppointmentCard({ project }: { project: Project }) {
  const [state, formAction] = useActionState(
    updateProject.bind(null, project.id),
    initialState
  );
  const [isPending, startTransition] = useTransition();
  useServerAction(state, isPending, toastOpts);

  const phone = project.working_contact?.phone ?? project.decision_maker?.phone;
  const contact = project.working_contact ?? project.decision_maker;

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <Link href={`/projects/${project.id}`} className="block space-y-1">
        <div className="flex items-center gap-2 font-medium">
          <MapPin className="size-4 shrink-0 text-muted-foreground" />
          {project.location?.name ?? project.name}
        </div>
        <p className="text-sm text-muted-foreground">
          {project.code}
          {project.client ? ` · ${project.client.name}` : ""}
        </p>
        {contact ? (
          <p className="text-sm text-muted-foreground">
            {contact.name}
            {phone ? ` · ${phone}` : ""}
          </p>
        ) : null}
      </Link>

      <div className="flex gap-2">
        {phone ? (
          <Button
            variant="outline"
            className="flex-1"
            render={
              <a href={`tel:${phone}`}>
                <Phone className="size-4" />
                Gọi
              </a>
            }
          />
        ) : null}
        <Button
          className="flex-1"
          disabled={isPending}
          onClick={() =>
            startTransition(() =>
              formAction({ visit_date: today(), stage: ProjectStage.SURVEY })
            )
          }
        >
          Bắt đầu khảo sát
        </Button>
      </div>
    </div>
  );
}
