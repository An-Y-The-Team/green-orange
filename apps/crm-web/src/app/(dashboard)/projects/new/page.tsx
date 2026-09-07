import { BackLink } from "@/components/back-link/back-link";
import { PageHeader } from "@/components/page-header/page-header";
import { BACK_TO } from "@/constants/labels";

import { loadClient } from "../../clients/actions/load-client";
import { getProject, listProjectTypes } from "../queries";
import { IntakeForm } from "./intake-form/intake-form";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; shell?: string; stage?: string }>;
}) {
  const { from, shell, stage } = await searchParams;
  // Reached from field mode, whose bottom bar does not survive the group swap —
  // so point the way back at Hôm nay instead of the desktop list.
  const fromField = shell === "field";
  // No client list fetched any more: the picker asks the server as you type, so
  // this page no longer decides which 100 clients are selectable.
  const projectTypes = await listProjectTypes();

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
      <BackLink href={fromField ? "/field" : "/projects"}>
        {fromField ? BACK_TO.field : BACK_TO.projects}
      </BackLink>
      <PageHeader
        title="Tiếp nhận yêu cầu"
        description="Ghi nhận yêu cầu mới từ khách hàng để mở công trình."
      />
      <IntakeForm
        projectTypes={projectTypes}
        prefill={prefill}
        initialClientDetail={initialClientDetail}
        showStagePicker={stage === "choose"}
      />
    </>
  );
}
