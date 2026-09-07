import {
  QuoteBuilderForm,
  type QuoteBuilderInitial,
} from "@/app/(dashboard)/projects/[id]/quotes/new/quote-builder-form/quote-builder-form";
import { listProjects } from "@/app/(dashboard)/projects/queries";
import { getQuote, quoteFormSeed } from "@/app/(dashboard)/quotes/queries";
import { BackLink } from "@/components/back-link/back-link";
import { PageHeader } from "@/components/page-header/page-header";
import { BACK_TO } from "@/constants/labels";

// Standalone quote builder (crm-ui-redesign.md, 2026-07-24). Reuses the
// project-scoped builder with no project; the optional picker lets the author
// tie it to a project (which auto-advances that project to Báo giá). `?copy=`
// seeds the form from an existing quote (revise on a standalone quote).
export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ copy?: string }>;
}) {
  const { copy } = await searchParams;
  const projects = await listProjects();
  const options = projects.map((p) => ({
    id: p.id,
    label: `${p.code} · ${p.name}`,
  }));

  const copied = copy ? await getQuote(Number(copy)) : undefined;
  const initial: QuoteBuilderInitial = {
    projectId: undefined,
    version: 1,
    ...(copied
      ? quoteFormSeed(copied)
      : { items: [], vatPercent: 8, note: "", repName: "", repTitle: "" }),
  };

  return (
    <>
      <BackLink href="/quotes">{BACK_TO.quote}</BackLink>

      <PageHeader title="Lập báo giá" description="Báo giá mới" />

      <QuoteBuilderForm initial={initial} projects={options} />
    </>
  );
}
