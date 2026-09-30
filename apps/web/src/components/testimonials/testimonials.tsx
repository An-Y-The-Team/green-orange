"use client";

import { Building2, Star, TicketCheck } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { Category, CategoryFilter } from "@/constants/category";
import { editAttr } from "@/lib/visual-editor/edit-attr";

import type { SiteSettings } from "../../data";
import { Testimonial } from "../../types";
import FilterChips from "../filter-chips/filter-chips";
import SectionHeading from "../section-heading/section-heading";
import { TESTIMONIAL_FILTER_TABS } from "./constants";

export default function Testimonials({
  testimonials,
  settings,
}: {
  testimonials: Testimonial[];
  settings: SiteSettings;
}) {
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>(
    CategoryFilter.ALL
  );

  const filteredReviews = testimonials.filter(
    (t) =>
      activeFilter === CategoryFilter.ALL ||
      (t.category as string) === activeFilter ||
      t.category === Category.BOTH
  );

  return (
    <section id="testimonials" className="py-16 md:py-24 bg-stone-100">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <SectionHeading
          cmsId={settings.cmsId}
          fields={[
            "testimonials_section_eyebrow",
            "testimonials_section_heading",
            "testimonials_section_description",
          ]}
          eyebrow={settings.testimonialsSection.eyebrow}
          heading={settings.testimonialsSection.heading}
          description={settings.testimonialsSection.description}
        />

        <FilterChips
          tabs={TESTIMONIAL_FILTER_TABS}
          value={activeFilter}
          onChange={setActiveFilter}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredReviews.map((testi) => (
            <figure
              key={testi.id}
              data-directus={editAttr({
                collection: "testimonials",
                item: testi.cmsId,
                fields: ["content", "author", "role", "company", "rating"],
                mode: "drawer",
              })}
              className="bg-white rounded-[4px] ring-2 ring-sign-ink p-6 flex flex-col"
            >
              <div
                className="flex gap-0.5 mb-4"
                aria-label={`${testi.rating}/5 sao`}
              >
                {[...Array(testi.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="size-5 fill-tape text-sign-ink"
                    strokeWidth={1.5}
                  />
                ))}
              </div>

              <blockquote className="text-stone-800 text-base leading-relaxed mb-6 flex-grow">
                &ldquo;{testi.content}&rdquo;
              </blockquote>

              <figcaption className="flex items-center gap-3 border-t border-stone-200 pt-4">
                <div className="size-11 shrink-0 rounded-full overflow-hidden bg-stone-200">
                  <Image
                    src={testi.avatarUrl}
                    alt={testi.author}
                    width={120}
                    height={120}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <span className="flex items-center gap-1 text-base font-bold text-sign-ink leading-none mb-1">
                    {testi.author}
                    <TicketCheck className="size-4 text-brand-primary-600" />
                  </span>
                  <span className="block text-xs text-stone-500">
                    {testi.role}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary-800">
                    <Building2 className="size-3" />
                    {testi.company}
                  </span>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>

        {/* Warranty promise band */}
        <div className="mt-12 bg-sign-ink text-white rounded-[4px] p-6 flex flex-col md:flex-row md:items-center gap-5">
          <span className="font-heading font-extrabold text-3xl leading-none bg-tape text-sign-ink px-3 py-2 rounded-[3px] self-start md:self-auto">
            100%
          </span>
          <div className="flex-1">
            <h4 className="font-heading font-bold uppercase text-2xl leading-tight">
              Bảo hành & cam kết chất lượng
            </h4>
            <p className="mt-1 text-sm text-stone-300">
              Công trình nào cũng được nghiệm thu kỹ. Nếu anh/chị thấy vết ố hay
              mốc trong 3 ngày đầu, chúng mình cử đội xử lý miễn phí ngay.
            </p>
          </div>
          <span className="text-sm font-semibold text-tape whitespace-nowrap">
            Áp dụng toàn quốc
          </span>
        </div>
      </div>
    </section>
  );
}
