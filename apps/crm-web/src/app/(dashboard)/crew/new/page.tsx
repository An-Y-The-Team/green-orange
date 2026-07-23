import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";

import { CrewForm } from "../crew-form";
import { listCrewRoles } from "../queries";

export default async function NewCrewMemberPage() {
  const roles = await listCrewRoles();

  return (
    <>
      <Link
        href="/crew"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Quay lại danh sách
      </Link>
      <PageHeader title="Thêm nhân sự" />
      <CrewForm roles={roles} />
    </>
  );
}
