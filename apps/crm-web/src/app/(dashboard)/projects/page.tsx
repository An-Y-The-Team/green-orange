import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@yan/ui/components/button";

import { PageHeader } from "@/components/page-header/page-header";
import { TableSkeleton } from "@/components/table-skeleton/table-skeleton";
import { FIELDS } from "@/constants/labels";

import { ProjectList } from "./components/project-list/project-list";

export default function ProjectsPage() {
  return (
    <>
      <PageHeader
        title={FIELDS.project}
        action={
          <Button render={<Link href="/projects/new" />}>
            + Thêm công trình
          </Button>
        }
      />
      {/* The list owns its filters/sort/page in the URL (usePageParams →
          useSearchParams), which requires a Suspense boundary to prerender.
          Cancelled jobs are hidden by the default status filter — in the URL,
          not a post-fetch filter, so the old count-cancelled hack is gone. */}
      <Suspense fallback={<TableSkeleton columns={8} />}>
        <ProjectList />
      </Suspense>
    </>
  );
}
