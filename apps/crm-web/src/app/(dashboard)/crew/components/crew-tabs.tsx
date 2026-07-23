"use client";

import { useState } from "react";

import type { Project } from "../../projects/types";
import type { CrewMember, CrewRole } from "../types";
import { RolesTab } from "./roles-tab";
import { RosterTab } from "./roster-tab";
import { TimekeepingTab } from "./timekeeping-tab";

const TABS = ["roster", "roles", "timekeeping"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  roster: "Danh sách",
  roles: "Vai trò",
  timekeeping: "Chấm công",
};

export function CrewTabs({
  crew,
  roles,
  projects,
}: {
  crew: CrewMember[];
  roles: CrewRole[];
  projects: Project[];
}) {
  const [tab, setTab] = useState<Tab>("roster");

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={[
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === "roster" ? <RosterTab members={crew} /> : null}
      {tab === "roles" ? <RolesTab roles={roles} /> : null}
      {tab === "timekeeping" ? (
        <TimekeepingTab crew={crew} projects={projects} />
      ) : null}
    </div>
  );
}
