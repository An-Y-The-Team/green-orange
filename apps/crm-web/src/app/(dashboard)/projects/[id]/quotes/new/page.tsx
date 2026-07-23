import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getQuote } from "@/app/(dashboard)/quotes/queries";
import { PageHeader } from "@/components/page-header";

import { getProject } from "../../../queries";
import {
  QuoteBuilderForm,
  type QuoteBuilderInitial,
} from "./quote-builder-form";

// Quote builder — stage-3 báo giá. Three prefill modes via searchParams:
//   ?from=survey  → seed rows from the project's survey_items (unit_price 0)
//   ?edit=<id>    → load that draft for editing (PATCH via updateQuote)
//   (none)        → one blank row
export default async function QuoteBuilderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; edit?: string }>;
}) {
  const { id } = await params;
  const { from, edit } = await searchParams;
  const project = await getProject(Number(id));

  if (!project) {
    notFound();
  }

  const latestVersion = Math.max(
    0,
    ...(project.quotes ?? []).map((q) => q.version)
  );

  let initial: QuoteBuilderInitial;

  if (edit) {
    const quote = await getQuote(Number(edit));
    if (!quote || quote.project_id !== project.id) {
      notFound();
    }
    initial = {
      projectId: project.id,
      projectCode: project.code,
      version: quote.version,
      editId: quote.id,
      items: quote.items.map((it) => ({
        description: it.description,
        unit: it.unit ?? undefined,
        quantity: it.quantity,
        unit_price: it.unit_price,
      })),
      vatPercent: Math.round(quote.vat_rate * 100),
      note: quote.note ?? "",
    };
  } else {
    const surveyRows =
      from === "survey"
        ? (project.survey_items ?? []).map((s) => ({
            description: s.name,
            unit: s.unit,
            quantity: s.quantity ?? 0,
            unit_price: 0,
          }))
        : [];
    initial = {
      projectId: project.id,
      projectCode: project.code,
      version: latestVersion + 1,
      items: surveyRows,
      vatPercent: 8,
      note: "",
    };
  }

  return (
    <>
      <Link
        href={`/projects/${project.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Quay lại công trình
      </Link>

      <PageHeader
        title="Lập báo giá"
        description={`${project.code} · v${initial.version}`}
      />

      <QuoteBuilderForm initial={initial} />
    </>
  );
}
