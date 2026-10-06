import type { Metadata } from "next";
import { draftMode } from "next/headers";
import Link from "next/link";
import React from "react";

import LogoMark from "@/components/logo-mark/logo-mark";
import { LegalBody } from "@/lib/legal-body/legal-body";
import { editAttr } from "@/lib/visual-editor/edit-attr";

import { type LegalTerms, getLegalTerms } from "../../data";

// Same reason as the landing page: the CMS isn't reachable from the CI build,
// so prerendering would bake the fallback copy into the image for good.
export const dynamic = "force-dynamic";

// Metadata is generated rather than static so the title follows the CMS copy.
export async function generateMetadata(): Promise<Metadata> {
  const terms = await getLegalTerms();
  const title = `${terms.pageTitle} — ${terms.pageSubtitle}`;
  const description = `${terms.pageTitle} và chính sách dữ liệu cá nhân của ${terms.pageSubtitle}, do ${terms.operator.name} vận hành.`;
  return {
    title,
    description,
    alternates: { canonical: "/dieu-khoan-su-dung" },
    openGraph: {
      title,
      description,
      url: "/dieu-khoan-su-dung",
      locale: "vi_VN",
      type: "article",
    },
  };
}

// One line of the operator block. Kept local — it is layout for this page only.
function OperatorRow({
  label,
  children,
  edit,
}: {
  label: string;
  children: React.ReactNode;
  edit?: string;
}) {
  return (
    <div className="flex flex-wrap gap-x-2">
      <dt className="font-semibold text-sign-ink">{label}</dt>
      <dd data-directus={edit}>{children}</dd>
    </div>
  );
}

export default async function Page() {
  const { isEnabled: isPreviewMode } = await draftMode();
  const terms: LegalTerms = await getLegalTerms(isPreviewMode);
  const { operator, cmsId } = terms;

  // `legal_terms` is a singleton, so every scalar edit targets the same item.
  const edit = (fields: string | string[]) =>
    editAttr({ collection: "legal_terms", item: cmsId, fields });

  return (
    <div className="min-h-screen flex flex-col bg-white antialiased font-sans">
      <header className="bg-sign-ink">
        <div className="max-w-3xl mx-auto px-4 lg:px-8 py-5">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <LogoMark className="w-9 h-auto shrink-0" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-stone-300 group-hover:text-white transition-colors">
              Quay lại trang chủ
            </span>
          </Link>
        </div>
      </header>
      <div className="tape" aria-hidden />

      <main className="flex-grow max-w-3xl mx-auto px-4 lg:px-8 py-12 md:py-16">
        <h1
          className="font-heading font-extrabold uppercase text-4xl md:text-5xl leading-none text-sign-ink"
          data-directus={edit("page_title")}
        >
          {terms.pageTitle}
        </h1>
        <p
          className="mt-3 text-lg text-stone-600"
          data-directus={edit("page_subtitle")}
        >
          {terms.pageSubtitle}
        </p>

        <dl className="mt-8 border-l-4 border-brand-secondary-600 pl-5 space-y-1.5 text-sm text-stone-700">
          <OperatorRow label="Đơn vị vận hành:" edit={edit("operator_name")}>
            {operator.name}
          </OperatorRow>
          <OperatorRow label="Mã số thuế:" edit={edit("operator_tax_code")}>
            {operator.taxCode}
          </OperatorRow>
          <OperatorRow label="Địa chỉ:" edit={edit("operator_address")}>
            {operator.address}
          </OperatorRow>
          <OperatorRow label="Email:" edit={edit("operator_email")}>
            <a
              href={`mailto:${operator.email}`}
              className="text-brand-primary-700 hover:underline underline-offset-4"
            >
              {operator.email}
            </a>
          </OperatorRow>
          <OperatorRow label="Điện thoại:" edit={edit("operator_phone")}>
            <a
              href={`tel:${operator.phone.replace(/\s+/g, "")}`}
              className="text-brand-primary-700 hover:underline underline-offset-4"
            >
              {operator.phone}
            </a>
          </OperatorRow>
          <OperatorRow label="Cập nhật lần cuối:" edit={edit("updated_at")}>
            {operator.updatedAt}
          </OperatorRow>
        </dl>

        {terms.sections.map((section, i) => (
          <section
            key={section.id ?? i}
            className="mt-10"
            data-directus={editAttr({
              collection: "legal_term_sections",
              item: section.id,
              fields: ["heading", "body"],
              mode: "drawer",
            })}
          >
            {/* Numbered from render order, so reordering in the Studio
                renumbers the document and no heading carries a stale "3.". */}
            <h2 className="font-heading font-extrabold uppercase text-2xl md:text-3xl leading-none text-sign-ink">
              <span className="text-brand-secondary-600">{i + 1}.</span>{" "}
              {section.heading}
            </h2>
            <div className="flex mt-3 h-1 w-14" aria-hidden>
              <span className="flex-[3] bg-brand-secondary-600" />
              <span className="flex-1 bg-brand-primary-600" />
            </div>
            <div className="mt-4 space-y-4 text-base leading-relaxed text-stone-700">
              <LegalBody body={section.body} />
            </div>
          </section>
        ))}
      </main>

      <div className="tape" aria-hidden />
      <footer className="bg-sign-ink text-stone-500 text-xs">
        <div className="max-w-3xl mx-auto px-4 lg:px-8 py-6">
          © {new Date().getFullYear()} {operator.name}
        </div>
      </footer>
    </div>
  );
}
