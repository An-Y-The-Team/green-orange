import { AttachmentList } from "@/components/attachments/attachment-list/attachment-list";
import { AttachmentKind } from "@/components/attachments/enums";
import type { Attachment } from "@/components/attachments/types";
import { formatDate } from "@/utils/format-date/format-date";

import type { Project } from "../../../../../../types";
import { StageDrawer } from "../../../../stage-drawer/stage-drawer";
import { acceptanceHistory } from "../../utils/acceptance-history/acceptance-history";
import { PrintLinks } from "../print-links/print-links";

const FILE_LISTS = [
  {
    kind: AttachmentKind.ACCEPTANCE_REPORT,
    title: "Biên bản nghiệm thu đã ký",
    emptyMessage: "Chưa có biên bản.",
  },
  {
    kind: AttachmentKind.DEFECT_IMAGE,
    title: "Ảnh lỗi cần sửa",
    emptyMessage: "Chưa có ảnh lỗi.",
  },
  {
    kind: AttachmentKind.FINISH_IMAGE,
    title: "Ảnh hoàn công",
    emptyMessage: "Chưa có ảnh hoàn công.",
  },
];

/** "In thư · Giấy tờ · Lịch sử": reprint, every file, and the event log. */
export function AcceptanceDrawer({
  project,
  attachments,
}: {
  project: Project;
  attachments: Attachment[];
}) {
  const history = acceptanceHistory({ notes: project.notes });

  return (
    <StageDrawer
      label="In thư · Giấy tờ · Lịch sử"
      sections={[
        {
          title: "In lại",
          content: <PrintLinks projectId={project.id} />,
        },
        {
          title: "Giấy tờ",
          content: (
            <div className="space-y-3">
              {FILE_LISTS.map((list) => (
                <AttachmentList
                  key={list.kind}
                  owner={{ project_id: project.id }}
                  kind={list.kind}
                  initial={attachments.filter((a) => a.kind === list.kind)}
                  title={list.title}
                  emptyMessage={list.emptyMessage}
                  withNote={list.kind !== AttachmentKind.ACCEPTANCE_REPORT}
                />
              ))}
            </div>
          ),
        },
        {
          title: "Lịch sử",
          content:
            history.length > 0 ? (
              <ul className="space-y-1.5 text-sm">
                {history.map((n) => (
                  <li key={n.id}>
                    <span className="text-muted-foreground">
                      {formatDate(n.created_at).slice(0, 5)} ·{" "}
                    </span>
                    {n.body}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có lịch sử.</p>
            ),
        },
      ]}
    />
  );
}
