import { ProjectStage } from "../../../enums";
import type { ImportProjectBody } from "../../schema";
import type { ParsedWorkbook, WorkbookMatch } from "../../types";

/**
 * One workbook + what matching found + the operator's picks → the POST
 * /projects/import body. Matched rows go by id; everything else is created
 * from the workbook's own fields.
 */
export function buildImportPayload({
  fileName,
  workbook,
  match,
  stage,
  typeIds,
}: {
  fileName: string;
  workbook: ParsedWorkbook;
  match: WorkbookMatch;
  stage: ProjectStage;
  typeIds: number[];
}): ImportProjectBody {
  const { project, client, contact, quote, settlement } = workbook;

  // The sheet's own reference fields have no column of their own — they ride
  // along on the intake note, where the operator will look for them.
  const request_note = [
    `Nhập từ báo giá: ${fileName}`,
    project?.code_ref && `Mã số CT: ${project.code_ref}`,
    project?.date && `Ngày báo giá: ${project.date}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    client: match?.client
      ? { id: match.client.id }
      : {
          name: client.name,
          type: client.type,
          tax_code: client?.tax_code,
          address: client?.address,
        },
    // A contact found under ANOTHER client must not be reused: matching only
    // ever looks inside the matched client, and a new client has none.
    contact: match?.contact
      ? { id: match.contact.id }
      : contact
        ? { name: contact.name, title: contact?.title, phone: contact?.phone }
        : undefined,
    location: match?.location
      ? { id: match.location.id }
      : { name: project.name, address: project.site_address },
    name: project.name,
    type_ids: typeIds,
    stage,
    request_note,
    quote,
    // The quyết toán only travels with a job imported AT that stage — the
    // operator may have moved it back, and the server refuses it elsewhere.
    settlement:
      stage === ProjectStage.SETTLEMENT && settlement ? settlement : undefined,
  };
}
