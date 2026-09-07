import { BackLink } from "@/components/back-link/back-link";
import { PageHeader } from "@/components/page-header/page-header";
import { BACK_TO } from "@/constants/labels";

import { CrewForm } from "../crew-form/crew-form";
import { listCrewRoles } from "../queries";

export default async function NewCrewMemberPage() {
  const roles = await listCrewRoles();

  return (
    <>
      <BackLink href="/crew">{BACK_TO.list}</BackLink>
      <PageHeader title="Thêm nhân sự" />
      <CrewForm roles={roles} />
    </>
  );
}
