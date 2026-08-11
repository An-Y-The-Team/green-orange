import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getQuote, quoteFormSeed } from "@/app/(dashboard)/quotes/queries";
import { PageHeader } from "@/components/page-header/page-header";
import { BACK_TO } from "@/constants/labels";

import { getProject } from "../../../queries";
import {
  QuoteBuilderForm,
  type QuoteBuilderInitial,
} from "./quote-builder-form/quote-builder-form";

// Quote builder — a NEW stage-3 báo giá for this project. `?from=survey` seeds
// the rows from the project's survey_items (unit_price 0); `?copy=` seeds the
// whole form from an existing quote (the revise flow — nothing persists until
// saved); otherwise one blank row. Editing an existing draft is /quotes/[id].
export default async function QuoteBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; copy?: string }>;
}) {
  const { id } = await params;
  const { from, copy } = await searchParams;
  const project = await getProject(Number(id));

  if (!project) {
    notFound();
  }

  const latestVersion = Math.max(
    0,
    ...(project.quotes ?? []).map((q) => q.version)
  );

  const copied = copy ? await getQuote(Number(copy)) : undefined;
  const initial: QuoteBuilderInitial = {
    projectId: project.id,
    version: latestVersion + 1,
    ...(copied
      ? quoteFormSeed(copied)
      : {
          items:
            from === "survey"
              ? (project.survey_items ?? []).map((s) => ({
                  description: s.name,
                  unit: s.unit,
                  quantity: s.quantity ?? 0,
                  unit_price: 0,
                }))
              : [],
          vatPercent: 8,
          note: "",
          repName: "",
          repTitle: "",
        }),
  };

  return (
    <>
      <Link
        href={`/projects/${project.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {BACK_TO.project}
      </Link>

      <PageHeader
        title="Lập báo giá"
        description={`${project.code} · v${initial.version}`}
      />

      <QuoteBuilderForm initial={initial} />
    </>
  );
}
