import { PageHeader } from "@/components/page-header/page-header";
import { FIELDS } from "@/constants/labels";
import { MAX_PAGE_SIZE } from "@/constants/pagination";

import { listProjects } from "../projects/queries";
import { CrewTabs } from "./components/crew-tabs/crew-tabs";
import { CrewMemberStatus } from "./enums";
import { countCrew, listCrew, listCrewRoles } from "./queries";

// Tabbed Nhân sự shell: Danh sách · Vị trí · Chấm công. The roster tab now
// fetches itself client-side (search/filter/sort via /api/crm/crew); the
// server still fetches what the OTHER tabs consume.
export default async function CrewPage() {
  const [workingCount, roles, projects, crew] = await Promise.all([
    // Counted server-side — filtering one page's rows only describes the page.
    countCrew(CrewMemberStatus.WORKING),
    listCrewRoles(),
    // Project picker for the Chấm công tab, not a list — ask for the largest
    // page the API serves, same as the other pickers.
    // ponytail: still a window; a project past it can't be selected. Goes away
    // with a server-filtered/searchable picker.
    listProjects({ limit: MAX_PAGE_SIZE }),
    // Chấm công's member rows — same window caveat as the projects picker.
    listCrew({ limit: MAX_PAGE_SIZE }),
  ]);

  return (
    <>
      <PageHeader
        title={FIELDS.crew}
        description={`${workingCount} đang làm`}
      />
      <CrewTabs crew={crew} roles={roles} projects={projects} />
    </>
  );
}
