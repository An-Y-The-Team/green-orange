import { PageHeader } from "@/components/page-header/page-header";
import { FIELDS } from "@/constants/labels";
import { MAX_PAGE_SIZE } from "@/constants/pagination";

import { listProjects } from "../projects/queries";
import { CrewTabs } from "./components/crew-tabs/crew-tabs";
import { CrewMemberStatus } from "./enums";
import {
  countCrew,
  getPendingTimekeeping,
  listCrew,
  listCrewRoles,
} from "./queries";

// Tabbed Nhân sự shell: Danh sách · Vị trí · Chấm công. The roster tab now
// fetches itself client-side (search/filter/sort via /api/crm/crew); the
// server still fetches what the OTHER tabs consume.
export default async function CrewPage() {
  const [workingCount, roles, projects, crew, pending] = await Promise.all([
    // Counted server-side — filtering one page's rows only describes the page.
    countCrew(CrewMemberStatus.WORKING),
    listCrewRoles(),
    // Lookup table for the approvals card's công trình labels — a window, not
    // the whole table (a miss falls back to the id).
    listProjects({ limit: MAX_PAGE_SIZE }),
    // Chấm công's member rows — same window caveat as the projects picker.
    listCrew({ limit: MAX_PAGE_SIZE }),
    // Mini-app submissions awaiting duyệt — the Chấm công tab's approval card.
    getPendingTimekeeping(),
  ]);

  return (
    <>
      <PageHeader
        title={FIELDS.crew}
        description={`${workingCount} đang làm`}
      />
      <CrewTabs
        crew={crew}
        roles={roles}
        projects={projects}
        pendingTimekeeping={pending}
      />
    </>
  );
}
