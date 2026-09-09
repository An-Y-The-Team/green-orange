"use client";

import {
  Tabs,
  TabsList,
  TabsPanel,
  TabsTrigger,
} from "@yan/ui/components/tabs";

import { FIELDS } from "@/constants/labels";
import { useTabParam } from "@/hooks/use-tab-param/use-tab-param";

import type { Project } from "../../../projects/types";
import type { CrewMember, CrewRole, TimekeepingRecord } from "../../types";
import { OpenShifts } from "../open-shifts/open-shifts";
import { PendingApprovals } from "../pending-approvals/pending-approvals";
import { RolesTab } from "../roles-tab/roles-tab";
import { RosterTab } from "../roster-tab/roster-tab";
import { TimekeepingTab } from "../timekeeping-tab/timekeeping-tab";

const TABS = ["roster", "roles", "timekeeping"] as const;

const TAB_LABELS: Record<(typeof TABS)[number], string> = {
  roster: "Danh sách",
  roles: FIELDS.role,
  timekeeping: "Chấm công",
};

export function CrewTabs({
  crew,
  roles,
  projects,
  pendingTimekeeping,
  openShifts,
}: {
  crew: CrewMember[];
  roles: CrewRole[];
  projects: Project[];
  pendingTimekeeping: TimekeepingRecord[];
  openShifts: TimekeepingRecord[];
}) {
  const [tab, setTab] = useTabParam(TABS, "roster");

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
      <TabsList>
        {TABS.map((t) => (
          <TabsTrigger key={t} value={t}>
            {TAB_LABELS[t]}
            {t === "roles" ? ` (${roles.length})` : null}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Panels stay mounted-on-demand: the roster and chấm công tabs each own a
          query, and rendering all three would fire every one on arrival. */}
      <TabsPanel value="roster">
        {tab === "roster" ? <RosterTab roles={roles} /> : null}
      </TabsPanel>
      <TabsPanel value="roles">
        {tab === "roles" ? <RolesTab roles={roles} /> : null}
      </TabsPanel>
      <TabsPanel value="timekeeping">
        {tab === "timekeeping" ? (
          <div className="space-y-4">
            <OpenShifts shifts={openShifts} />
            <PendingApprovals
              pending={pendingTimekeeping}
              crew={crew}
              projects={projects}
            />
            <TimekeepingTab crew={crew} />
          </div>
        ) : null}
      </TabsPanel>
    </Tabs>
  );
}
