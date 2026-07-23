import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";

import { CrewForm } from "../../crew-form";
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
      <Link
        href={`/crew/${member.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Quay lại hồ sơ
      </Link>
      <PageHeader title={`Sửa: ${member.name}`} />
      <CrewForm roles={roles} member={member} />
    </>
  );
}
