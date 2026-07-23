import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";

import { listClients } from "../../clients/queries";
import { listProjectTypes } from "../queries";
import { IntakeForm } from "./intake-form";

export default async function NewProjectPage() {
  const [clients, projectTypes] = await Promise.all([
    listClients(),
    listProjectTypes(),
  ]);

  return (
    <>
      <Link
        href="/projects"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Quay lại danh sách công trình
      </Link>
      <PageHeader
        title="Tiếp nhận yêu cầu"
        description="Ghi nhận yêu cầu mới từ khách hàng để mở công trình."
      />
      <IntakeForm clients={clients} projectTypes={projectTypes} />
    </>
  );
}
