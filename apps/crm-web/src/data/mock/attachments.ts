import type { Attachment } from "@/app/(dashboard)/projects/types";

// Metadata-only rows (no real upload) — s3_key doubles as the display filename.
// Survey photos for CT-2026-001 to demo the stage-2 "Hình ảnh" list.
export const attachments: Attachment[] = [
  {
    id: 1,
    project_id: 1,
    kind: "survey",
    s3_key: "mat-ngoai-1.jpg",
    note: "vết ố tầng 15",
    created_at: "2026-07-10T09:30:00.000Z",
  },
  {
    id: 2,
    project_id: 1,
    kind: "survey",
    s3_key: "mat-ngoai-2.jpg",
    note: "khu vực cần xe nâng",
    created_at: "2026-07-10T09:32:00.000Z",
  },
  {
    id: 3,
    project_id: 1,
    kind: "survey",
    s3_key: "sanh-chinh.jpg",
    created_at: "2026-07-10T09:35:00.000Z",
  },
];
