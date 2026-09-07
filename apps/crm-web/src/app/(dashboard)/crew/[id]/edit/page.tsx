import { notFound } from "next/navigation";

import { BackLink } from "@/components/back-link/back-link";
import { PageHeader } from "@/components/page-header/page-header";
import { BACK_TO } from "@/constants/labels";

import { CrewForm } from "../../crew-form/crew-form";
import { getCrewMember, listCrewRoles } from "../../queries";

export default async function EditCrewMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [member, roles] = await Promise.all([
    getCrewMember(Number(id)),
    listCrewRoles(),
  ]);
  if (!member) notFound();

  return (
    <>
      <BackLink href={`/crew/${member.id}`}>{BACK_TO.paperwork}</BackLink>
      <PageHeader title={`Sửa: ${member.name}`} />
      <CrewForm roles={roles} member={member} />
    </>
  );
}
