"use client";

import {
  Tabs,
  TabsList,
  TabsPanel,
  TabsTrigger,
} from "@yan/ui/components/tabs";

import { CREW_TABS } from "@/constants/labels";
import { useTabParam } from "@/hooks/use-tab-param/use-tab-param";

import type { Project } from "../../../projects/types";
import { CrewTab } from "../../enums";
import type { CrewMember, CrewRole, TimekeepingRecord } from "../../types";
import { OpenShifts } from "../open-shifts/open-shifts";
import { PendingApprovals } from "../pending-approvals/pending-approvals";
import { RolesTab } from "../roles-tab/roles-tab";
import { RosterTab } from "../roster-tab/roster-tab";
import { TimekeepingTab } from "../timekeeping-tab/timekeeping-tab";

const TABS = [CrewTab.ROSTER, CrewTab.ROLES, CrewTab.TIMEKEEPING] as const;

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
  const [tab, setTab] = useTabParam(TABS, CrewTab.ROSTER);

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
      <TabsList>
        {TABS.map((t) => (
          <TabsTrigger key={t} value={t}>
            {CREW_TABS[t]}
            {t === CrewTab.ROLES ? ` (${roles.length})` : null}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Panels stay mounted-on-demand: the roster and chấm công tabs each own a
          query, and rendering all three would fire every one on arrival. */}
      <TabsPanel value={CrewTab.ROSTER}>
        {tab === CrewTab.ROSTER ? <RosterTab roles={roles} /> : null}
      </TabsPanel>
      <TabsPanel value={CrewTab.ROLES}>
        {tab === CrewTab.ROLES ? <RolesTab roles={roles} /> : null}
      </TabsPanel>
      <TabsPanel value={CrewTab.TIMEKEEPING}>
        {tab === CrewTab.TIMEKEEPING ? (
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
