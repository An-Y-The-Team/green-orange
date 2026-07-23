import { PageHeader } from "@/components/page-header";

import { listProjects } from "../projects/queries";
import { CrewTabs } from "./components/crew-tabs";
import { CrewMemberStatus } from "./enums";
import { listCrew, listCrewRoles } from "./queries";

// Tabbed Nhân sự shell: Danh sách · Vai trò · Chấm công. Data fetched here
// (server) and handed to the client tab switcher.
export default async function CrewPage() {
  const [members, roles, projects] = await Promise.all([
    listCrew(),
    listCrewRoles(),
    listProjects(),
  ]);
  const workingCount = members.filter(
    (m) => m.status === CrewMemberStatus.WORKING
  ).length;

  return (
    <>
      <PageHeader
        title="Nhân sự"
        description={`${members.length} nhân sự · ${workingCount} đang làm`}
      />
      <CrewTabs crew={members} roles={roles} projects={projects} />
    </>
  );
}
