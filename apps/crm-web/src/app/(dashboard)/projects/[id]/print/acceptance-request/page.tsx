import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DocumentShell, SignatureBlocks } from "@/components/document-shell";
import { company } from "@/config/company";
import { formatDate } from "@/lib/format";

import { getProject } from "../../../queries";

// Formal "Thư yêu cầu nghiệm thu" — asks the client for the three stage-7 items:
// lịch nghiệm thu, biên bản nghiệm thu, hình ảnh hoàn công. Business letter, no
// line-items table. Follows quotes/[id]/page.tsx (DocumentShell + SignatureBlocks).
export default async function AcceptanceRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(Number(id));
  if (!project) notFound();

  const today = formatDate(new Date().toISOString());

  return (
    <>
      <Link
        href={`/projects/${project.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground print:hidden"
      >
        <ArrowLeft className="size-4" />
        Quay lại công trình
      </Link>

      <DocumentShell
        title="THƯ YÊU CẦU NGHIỆM THU"
        subtitle={`${project.code} · ${project.name}`}
        headerVariant="letterhead"
      >
        <div className="space-y-4 text-sm leading-relaxed text-zinc-800">
          <p className="text-right text-xs text-zinc-600">
            TP. Hồ Chí Minh, ngày {today}
          </p>

          <div className="space-y-1">
            <p>
              <span className="text-zinc-500">Kính gửi: </span>
              <span className="font-medium">
                {project.client?.name ?? "Quý khách hàng"}
              </span>
            </p>
            {project.location?.address ? (
              <p>
                <span className="text-zinc-500">Công trình: </span>
                {project.location.address}
              </p>
            ) : null}
          </div>

          <p>
            {company.name} xin trân trọng thông báo các hạng mục thi công tại
            công trình <span className="font-medium">{project.name}</span> đã
            hoàn tất. Để tiến hành nghiệm thu và bàn giao, kính đề nghị Quý
            khách phối hợp cung cấp các nội dung sau:
          </p>

          <ol className="ml-5 list-decimal space-y-1.5">
            <li>Sắp xếp lịch nghiệm thu tại công trình.</li>
            <li>
              Ký xác nhận biên bản nghiệm thu sau khi kiểm tra các hạng mục.
            </li>
            <li>Cung cấp hình ảnh hoàn công để lưu hồ sơ.</li>
          </ol>

          <p>
            Rất mong nhận được phản hồi của Quý khách trong thời gian sớm nhất.
            Xin chân thành cảm ơn sự hợp tác của Quý khách.
          </p>

          <SignatureBlocks leftLabel="ĐẠI DIỆN KHÁCH HÀNG" />
        </div>
      </DocumentShell>
    </>
  );
}
