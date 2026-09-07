import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header/page-header";

import { loadClient } from "../../clients/actions/load-client";
import { listClients } from "../../clients/queries";
import { getProject, listProjectTypes } from "../queries";
import { IntakeForm } from "./intake-form/intake-form";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; shell?: string }>;
}) {
  const { from, shell } = await searchParams;
  // Reached from field mode, whose bottom bar does not survive the group swap —
  // so point the way back at Hôm nay instead of the desktop list.
  const fromField = shell === "field";
  const [clients, projectTypes] = await Promise.all([
    listClients(),
    listProjectTypes(),
  ]);

  // Repeat-business: prefill client/location/contacts from a source project,
  // leaving the actual job fields (type, name, request, appointment) blank.
  let prefill;
  let initialClientDetail;
  const source = from ? await getProject(Number(from)) : undefined;
  if (source) {
    initialClientDetail = (await loadClient(source.client_id)) ?? undefined;
    prefill = {
      client_id: source.client_id,
      location_id: source.location_id,
      working_contact_id: source.working_contact_id,
      decision_maker_contact_id: source.decision_maker_contact_id,
    };
  }

  return (
    <>
      <Link
        href={fromField ? "/field" : "/projects"}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {fromField ? "Quay lại Hôm nay" : "Quay lại danh sách công trình"}
      </Link>
      <PageHeader
        title="Tiếp nhận yêu cầu"
        description="Ghi nhận yêu cầu mới từ khách hàng để mở công trình."
      />
      <IntakeForm
        clients={clients}
        projectTypes={projectTypes}
        prefill={prefill}
        initialClientDetail={initialClientDetail}
      />
    </>
  );
}
