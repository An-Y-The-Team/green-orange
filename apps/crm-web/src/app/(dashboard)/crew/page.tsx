import { PageHeader } from "@/components/page-header/page-header";
import { TablePager } from "@/components/table-pager/table-pager";
import { MAX_PAGE_SIZE } from "@/constants/pagination";
import { pageFromParam } from "@/utils/page-param/page-param";

import { listProjects } from "../projects/queries";
import { CrewTabs } from "./components/crew-tabs/crew-tabs";
import { CrewMemberStatus } from "./enums";
import { countCrew, listCrewPage, listCrewRoles } from "./queries";

// Rows per page. Explicit rather than leaning on the API's default so the pager
// and the offsets it builds agree with what is actually rendered.
const PAGE_ROWS = 100;

// Tabbed Nhân sự shell: Danh sách · Vị trí · Chấm công. Data fetched here
// (server) and handed to the client tab switcher.
export default async function CrewPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = pageFromParam((await searchParams)?.page);
  const [{ rows: members, total }, workingCount, roles, projects] =
    await Promise.all([
      // `total` is the whole roster (X-Total-Count): the header states a real
      // total and the pager derives its page count — no +1 row probe needed.
      listCrewPage({ limit: PAGE_ROWS, offset: (page - 1) * PAGE_ROWS }),
      // Counted server-side for the same reason: filtering this page's rows only
      // ever describes this page.
      countCrew(CrewMemberStatus.WORKING),
      listCrewRoles(),
      // Project picker for the Chấm công tab, not a list — ask for the largest
      // page the API serves, same as the other pickers.
      // ponytail: still a window; a project past it can't be selected. Goes away
      // with a server-filtered/searchable picker.
      listProjects({ limit: MAX_PAGE_SIZE }),
    ]);

  return (
    <>
      <PageHeader
        title="Nhân sự"
        description={`${total} nhân sự · ${workingCount} đang làm`}
      />
      <CrewTabs crew={members} roles={roles} projects={projects} />
      {/* Pages the roster (the default tab). ponytail: shown on every tab because
          the active tab is client state, not a URL param — moving the tab into
          `?tab=` would let this hide itself on Vị trí / Chấm công. */}
      <TablePager
        page={page}
        total={total}
        pageRows={PAGE_ROWS}
        basePath="/crew"
      />
    </>
  );
}
