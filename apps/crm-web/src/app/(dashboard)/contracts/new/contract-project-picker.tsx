"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@yan/ui/components/button";
import { Card, CardContent } from "@yan/ui/components/card";
import { Label } from "@yan/ui/components/label";

import { selectClass } from "@/components/form-bits";

// The contract editor's live preview merges project + client + chốt-quote data,
// so authoring starts from a project. This picker routes to that project's
// editor. ponytail: project-less standalone authoring is deferred until there's
// a real need — the backend already accepts a null project_id.
export function ContractProjectPicker({
  projects,
}: {
  projects: { id: number; label: string }[];
}) {
  const router = useRouter();
  const [id, setId] = useState<number | undefined>();

  return (
    <Card className="max-w-xl">
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="project">Công trình</Label>
          <select
            id="project"
            className={selectClass}
            value={id ?? ""}
            onChange={(e) =>
              setId(e.target.value ? Number(e.target.value) : undefined)
            }
          >
            <option value="">— Chọn công trình —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end">
          <Button
            disabled={!id}
            onClick={() => router.push(`/projects/${id}/contracts/new`)}
          >
            Tiếp tục
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
