"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@yan/ui/components/button";
import { Card, CardContent } from "@yan/ui/components/card";
import { Label } from "@yan/ui/components/label";

import { EntityCombobox } from "@/components/entity-combobox/entity-combobox";
import { ACTIONS, FIELDS } from "@/constants/labels";

// The contract editor's live preview merges project + client + chốt-quote data,
// so authoring starts from a project. This picker routes to that project's
// editor. ponytail: project-less standalone authoring is deferred until there's
// a real need — the backend already accepts a null project_id.
export function ContractProjectPicker() {
  const router = useRouter();
  const [id, setId] = useState<number | null>(null);

  return (
    <Card className="max-w-xl">
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="project">{FIELDS.project}</Label>
          <EntityCombobox
            resource="projects"
            id="project"
            value={id}
            onChange={setId}
            placeholder="Tìm công trình theo mã, tên…"
          />
        </div>
        <div className="flex justify-end">
          <Button
            disabled={!id}
            onClick={() => router.push(`/projects/${id}/contracts/new`)}
          >
            {ACTIONS.continue}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
