import { Skeleton } from "@yan/ui/components/skeleton";

import { PageHeader } from "@/components/page-header/page-header";

// TemplateEditor is a two-column authoring surface — form + rich text on the
// left, a live A4 preview sticky on the right. The inherited fallback is
// contracts/loading.tsx (a list table), which is nothing like it.
export default function EditContractTemplateLoading() {
  return (
    <>
      <Skeleton className="mb-4 h-5 w-44" />
      <PageHeader title="Chỉnh sửa mẫu hợp đồng" />

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Editor column: Tên mẫu, Tiêu đề tài liệu, Nội dung, Kiểu đầu trang. */}
        <div className="space-y-4">
          {Array.from({ length: 2 }, (_, field) => (
            <div key={field} className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}

          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-64 w-full" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-9 w-full" />
          </div>

          <Skeleton className="h-4 w-72" />

          <div className="flex justify-end gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>

        {/* Preview column. */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="mb-2 flex items-center justify-between">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-8 w-28" />
          </div>
          <Skeleton className="h-[32rem] w-full" />
        </div>
      </div>
    </>
  );
}
