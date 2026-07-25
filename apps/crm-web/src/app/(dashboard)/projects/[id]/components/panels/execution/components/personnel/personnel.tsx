"use client";

import { Users } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import { useServerAction } from "@yan/shared/hooks/use-server-actions";
import { Badge } from "@yan/ui/components/badge";
import { Button } from "@yan/ui/components/button";
import { Label } from "@yan/ui/components/label";
import { Textarea } from "@yan/ui/components/textarea";

import type { Assignment } from "@/app/(dashboard)/crew/types";
import {
  ACTION_TOAST_TITLES,
  INITIAL_ACTION_STATE,
} from "@/constants/server-action";

import { updateProject } from "../../../../../../actions/update-project";
import type { Project } from "../../../../../../types";

/**
 * Assignment summary + approaches free text. Editing crew lives in the Nhân sự
 * tab, so this is read-only apart from the approaches note.
 */
export function Personnel({
  project,
  assignments,
}: {
  project: Project;
  assignments: Assignment[];
}) {
  const [state, formAction] = useActionState(
    updateProject.bind(null, project.id),
    INITIAL_ACTION_STATE
  );
  const [isPending, startTransition] = useTransition();
  useServerAction(state, isPending, ACTION_TOAST_TITLES);

  const [approaches, setApproaches] = useState(project.approaches ?? "");

  const workerCount = new Set(assignments.map((a) => a.crew_member_id)).size;
  // ponytail: within-project double-book only (same member twice). Precise
  // cross-project overlap is a phase-5 crew-tab feature.
  const doubleBooked = assignments.length > workerCount;

  return (
    <section className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">Nhân sự ({workerCount})</span>
        {doubleBooked ? (
          <Badge variant="warning">⚠ Trùng lịch trong công trình</Badge>
        ) : null}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto text-muted-foreground"
          render={
            <Link href="/crew">
              <Users className="size-4" />
              tab Nhân sự
            </Link>
          }
        />
      </div>

      {assignments.length === 0 ? (
        <p className="text-muted-foreground">Chưa phân công nhân sự.</p>
      ) : (
        <ul className="space-y-1">
          {assignments.map((a) => (
            <li key={a.id} className="flex items-center gap-2">
              <span>{a.crew_member?.name ?? `#${a.crew_member_id}`}</span>
              {a.role?.name ? (
                <Badge variant="secondary">{a.role.name}</Badge>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="approaches">Cách thức thi công</Label>
        <div className="flex items-start gap-2">
          <Textarea
            id="approaches"
            rows={2}
            value={approaches}
            placeholder="dây đu, làm đêm…"
            className="flex-1"
            onChange={(e) => setApproaches(e.target.value)}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => startTransition(() => formAction({ approaches }))}
          >
            Lưu
          </Button>
        </div>
      </div>
    </section>
  );
}
