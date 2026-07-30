import { Skeleton } from "@yan/ui/components/skeleton";

// Body paragraph widths, so the sheet reads as prose rather than a grey block.
const BODY_LINES = ["w-full", "w-11/12", "w-full", "w-4/5", "w-full", "w-2/3"];

// The printable hợp đồng awaits the contract, its chốt báo giá and its template
// before the A4 sheet can render. The nearest boundary otherwise is
// contracts/loading.tsx — a list table, nothing like a document. Geometry
// mirrors DocumentShell (max-w-3xl white sheet, action row, signature blocks).
export default function ContractDocumentLoading() {
  return (
    <>
      <Skeleton className="mb-4 h-5 w-40" />

      <div className="mx-auto max-w-3xl">
        <div className="mb-4 flex justify-end gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-32" />
        </div>

        <div className="mx-auto bg-white p-10 shadow-sm ring-1 ring-border">
          {/* Quốc hiệu / letterhead */}
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-4 w-48" />
          </div>

          {/* Document title + số hợp đồng */}
          <div className="flex flex-col items-center gap-2 py-6">
            <Skeleton className="h-6 w-80" />
            <Skeleton className="h-3 w-32" />
          </div>

          <div className="space-y-3">
            {BODY_LINES.map((width, line) => (
              <Skeleton key={line} className={`h-3 ${width}`} />
            ))}
          </div>

          {/* Bên A / Bên B signature blocks */}
          <div className="mt-10 grid grid-cols-2 gap-8">
            {Array.from({ length: 2 }, (_, block) => (
              <div key={block} className="flex flex-col items-center gap-2">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-24" />
                <div className="h-20" />
                <Skeleton className="h-3 w-28" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
