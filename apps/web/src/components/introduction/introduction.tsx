import { type LucideIcon, ShieldCheck, Trees, Wrench } from "lucide-react";
import Image from "next/image";

import { renderLines } from "@/lib/text-lines";
import { editAttr } from "@/lib/visual-editor/edit-attr";

import { BrandValueAccent, BrandValueIcon, SiteSettings } from "../../data";
import SectionHeading from "../section-heading/section-heading";

// Static maps keep Tailwind classes greppable for the JIT compiler and let the
// renderer reject any value the CMS shouldn't be able to send.
const ICON_BY_NAME: Record<BrandValueIcon, LucideIcon> = {
  Wrench,
  ShieldCheck,
  Trees,
};

// Each brand color is shown as a square sign tile; "slate" is the white of
// Cam · Trắng · Xanh, so it gets an outlined white tile.
const ACCENT_TILE_CLASS: Record<BrandValueAccent, string> = {
  orange: "bg-brand-secondary-600 text-white",
  slate: "bg-white text-sign-ink ring-2 ring-inset ring-sign-ink",
  emerald: "bg-brand-primary-600 text-white",
};

export default function Introduction({ settings }: { settings: SiteSettings }) {
  const { company, introduction } = settings;
  const sid = settings.cmsId;
  return (
    <section id="introduction" className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <SectionHeading
          cmsId={sid}
          fields={[
            "introduction_eyebrow",
            "introduction_heading",
            "introduction_narrative",
          ]}
          descriptionMode="modal"
          eyebrow={introduction.eyebrow}
          heading={introduction.heading}
          description={introduction.narrative.replace(
            "{founded}",
            company.founded
          )}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Team photo with the motto as a sign strip underneath */}
          <figure className="lg:col-span-5 rounded-[4px] overflow-hidden ring-2 ring-sign-ink">
            <div className="relative aspect-[4/3] bg-stone-200">
              <Image
                src={introduction.imageUrl}
                alt="Đội ngũ GreenOrange tại công trình"
                fill
                unoptimized
                className="object-cover"
              />
            </div>
            <figcaption className="bg-sign-ink text-white p-5">
              <span className="block text-xs font-bold uppercase tracking-widest text-tape mb-1.5">
                {introduction.mottoEyebrow}
              </span>
              <span className="text-base md:text-lg font-semibold leading-snug">
                &ldquo;{company.motto}&rdquo;
              </span>
            </figcaption>
          </figure>

          <div className="lg:col-span-7">
            <h3 className="font-heading font-extrabold uppercase text-3xl md:text-4xl leading-none text-sign-ink">
              {renderLines(introduction.brandStoryHeading)}
            </h3>
            <p className="mt-4 text-stone-600 text-base leading-relaxed">
              {renderLines(introduction.brandStoryIntro)}
            </p>

            <div className="mt-8 space-y-4">
              {introduction.brandValues.map((v, idx) => {
                const IconComp = ICON_BY_NAME[v.icon];
                return (
                  <div
                    key={v.id ?? idx}
                    className="flex gap-4 items-start p-4 rounded-[4px] bg-stone-100"
                    data-directus={editAttr({
                      collection: "site_brand_values",
                      item: v.id,
                      fields: ["title", "description", "icon", "accent"],
                      mode: "drawer",
                    })}
                  >
                    <span
                      className={`grid place-items-center size-12 shrink-0 rounded-[4px] ${ACCENT_TILE_CLASS[v.accent]}`}
                    >
                      <IconComp className="size-6" />
                    </span>
                    <div>
                      <h4 className="font-bold text-sign-ink text-base md:text-lg">
                        {v.title}
                      </h4>
                      <p className="mt-1 text-stone-600 text-sm md:text-base leading-relaxed">
                        {v.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 5-step delivery process on the charcoal band */}
        <div className="mt-16 md:mt-20 bg-sign-ink text-white rounded-[4px] p-6 md:p-10">
          <div className="max-w-3xl mb-10">
            <span className="text-sm font-bold uppercase tracking-[0.12em] text-tape">
              {introduction.processEyebrow}
            </span>
            <h3
              className="mt-2 font-heading font-extrabold uppercase text-3xl md:text-4xl leading-none"
              data-directus={editAttr({
                collection: "site_settings",
                item: sid,
                fields: "introduction_process_heading",
              })}
            >
              {renderLines(introduction.processHeading)}
            </h3>
            <p
              className="mt-4 text-stone-300 text-base md:text-lg"
              data-directus={editAttr({
                collection: "site_settings",
                item: sid,
                fields: "introduction_process_intro",
              })}
            >
              {renderLines(introduction.processIntro)}
            </p>
          </div>

          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {introduction.processSteps.map((step, idx) => (
              <li
                key={step.id ?? idx}
                className="border-t-2 border-white/20 pt-4"
                data-directus={editAttr({
                  collection: "site_process_steps",
                  item: step.id,
                  fields: ["num", "title", "description"],
                  mode: "drawer",
                })}
              >
                <span className="inline-block font-heading font-extrabold text-2xl leading-none bg-tape text-sign-ink px-2 py-1 rounded-[3px] tabular-nums">
                  {step.num}
                </span>
                <h4 className="mt-3 font-bold text-base leading-snug">
                  {step.title}
                </h4>
                <p className="mt-2 text-sm text-stone-400 leading-relaxed">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
