import { PageHeader } from "@/components/page-header/page-header";
import { FIELDS } from "@/constants/labels";
import { MAX_PAGE_SIZE } from "@/constants/pagination";

import { CrewTabs } from "./components/crew-tabs/crew-tabs";
import { CrewMemberStatus } from "./enums";
import { countCrew, listCrew, listCrewRoles } from "./queries";

// Tabbed Nhân sự shell: Danh sách · Vị trí · Chấm công. The roster tab now
// fetches itself client-side (search/filter/sort via /api/crm/crew); the
// server still fetches what the OTHER tabs consume.
export default async function CrewPage() {
  const [workingCount, roles, crew] = await Promise.all([
    // Counted server-side — filtering one page's rows only describes the page.
    countCrew(CrewMemberStatus.WORKING),
    listCrewRoles(),
    // Chấm công's member rows — same window caveat as the projects picker.
    listCrew({ limit: MAX_PAGE_SIZE }),
  ]);

  return (
    <>
      <PageHeader
        title={FIELDS.crew}
        description={`${workingCount} đang làm`}
      />
      <CrewTabs crew={crew} roles={roles} />
    </>
  );
}
