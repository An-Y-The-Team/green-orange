import { notFound } from "next/navigation";

import { getCompany } from "@/app/(dashboard)/settings/company/queries";
import { BackLink } from "@/components/back-link/back-link";
import {
  DocumentShell,
  SignatureBlocks,
} from "@/components/document-shell/document-shell";
import { BACK_TO, DOCUMENT_TEXT } from "@/constants/labels";
import { formatDate } from "@/utils/format-date/format-date";

import { getProject } from "../../../queries";
import type { Project } from "../../../types";
import { LetterBody } from "./letter-body/letter-body";

// Formal "Thư yêu cầu nghiệm thu". Two addressees off one page: the client
// (default) and, with ?to=building, the Ban Quản lý tòa nhà the work was done
// in. The body is per-project editable text (LetterBody); everything around it
// — date, Kính gửi, signatures — is fixed. Follows quotes/[id]/page.tsx.
const LETTERS = {
  client: {
    field: "acceptance_letter_body",
    recipient: (p: Project) => p.client?.name ?? "Quý khách hàng",
    signatory: DOCUMENT_TEXT.clientSignatory,
    body: (p: Project, company: string) =>
      `${company} xin trân trọng thông báo các hạng mục thi công tại công trình ${p.name} đã hoàn tất. Để tiến hành nghiệm thu và bàn giao, kính đề nghị Quý khách phối hợp cung cấp các nội dung sau:

1. Sắp xếp lịch nghiệm thu tại công trình.
2. Ký xác nhận biên bản nghiệm thu sau khi kiểm tra các hạng mục.
3. Cung cấp hình ảnh hoàn công để lưu hồ sơ.

Rất mong nhận được phản hồi của Quý khách trong thời gian sớm nhất. Xin chân thành cảm ơn sự hợp tác của Quý khách.`,
  },
  building: {
    field: "building_letter_body",
    recipient: (p: Project) => `Ban Quản lý ${p.location?.name ?? "tòa nhà"}`,
    signatory: "ĐẠI DIỆN BAN QUẢN LÝ",
    body: (p: Project, company: string) =>
      `${company} xin trân trọng thông báo các hạng mục thi công tại ${p.location?.name ?? "tòa nhà"} (công trình ${p.name}) đã hoàn tất. Kính đề nghị Ban Quản lý phối hợp:

1. Kiểm tra hiện trạng các khu vực đã thi công và khu vực chung lân cận.
2. Xác nhận mặt bằng đã được hoàn trả, không phát sinh hư hỏng.
3. Ký xác nhận biên bản nghiệm thu để chúng tôi hoàn tất hồ sơ với chủ đầu tư.

Rất mong nhận được sự hỗ trợ của Ban Quản lý. Xin chân thành cảm ơn.`,
  },
} as const;

export default async function AcceptanceRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ to?: string }>;
}) {
  const [{ id }, { to }] = await Promise.all([params, searchParams]);
  const letter = to === "building" ? LETTERS.building : LETTERS.client;
  const company = await getCompany();
  const project = await getProject(Number(id));
  if (!project) notFound();

  const today = formatDate(new Date().toISOString());

  return (
    <>
      <BackLink href={`/projects/${project.id}`} className="print:hidden">
        {BACK_TO.project}
      </BackLink>

      <DocumentShell
        title="THƯ YÊU CẦU NGHIỆM THU"
        subtitle={`${project.code} · ${project.name}`}
      >
        <div className="space-y-4 text-sm leading-relaxed text-zinc-800">
          <p className="text-right text-xs text-zinc-600">
            TP. Hồ Chí Minh, ngày {today}
          </p>

          <div className="space-y-1">
            <p>
              <span className="text-zinc-500">Kính gửi: </span>
              <span className="font-medium">{letter.recipient(project)}</span>
            </p>
            {project.location?.address ? (
              <p>
                <span className="text-zinc-500">Công trình: </span>
                {project.location.address}
              </p>
            ) : null}
          </div>

          <LetterBody
            projectId={project.id}
            field={letter.field}
            stored={project[letter.field]}
            fallback={letter.body(project, company.name)}
          />

          <SignatureBlocks leftLabel={letter.signatory} />
        </div>
      </DocumentShell>
    </>
  );
}
