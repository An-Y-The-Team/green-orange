"use client";

import { Building2, Quote, Star, TicketCheck } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { Button } from "@yan/ui/components/button";

import { Category, CategoryFilter } from "@/constants/category";

import type { SiteSettings } from "../../data";
import { Testimonial } from "../../types";
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
    <section id="testimonials" className="py-16 md:py-24 bg-slate-50 relative">
      <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-white to-transparent" />

      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-sm font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3.5 py-1 rounded-full">
            {settings.testimonialsSection.eyebrow}
          </span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black font-heading text-slate-900 tracking-tight mt-3 mb-4">
            {settings.testimonialsSection.heading}
          </h2>
          <div className="h-1.5 w-24 bg-gradient-to-r from-emerald-500 to-orange-500 mx-auto rounded-full" />
          <p className="text-slate-500 font-medium mt-6 text-base md:text-lg lg:text-xl leading-relaxed">
            {settings.testimonialsSection.description}
          </p>
        </div>

        {/* Filter categories tabs inside testimonials */}
        <div className="flex justify-center items-center gap-2 mb-12 flex-wrap">
          {TESTIMONIAL_FILTER_TABS.map((tab) => (
            <Button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-4.5 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer transform hover:scale-[1.03] duration-250 ${
                activeFilter === tab.id
                  ? "bg-slate-900 text-white shadow-md"
                  : "bg-white text-slate-600 hover:text-slate-800 border border-gray-100"
              }`}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Testimonial Cards Layout Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {filteredReviews.map((testi) => (
            <div
              key={testi.id}
              className="bg-white rounded-3xl border border-gray-100 p-8 flex flex-col items-start text-left shadow-xs transition-all duration-500 hover:shadow-2xl hover:translate-y-[-10px] hover:border-emerald-300 relative group"
            >
              {/* Decorative Quotes Icon */}
              <Quote className="absolute right-6 bottom-6 size-12 text-slate-100/70 group-hover:text-emerald-50 pointer-events-none transition-colors" />

              {/* Stars Row */}
              <div className="flex gap-0.5 mb-5">
                {[...Array(testi.rating)].map((_, i) => (
                  <Star
                    key={i}
                    className="size-4.5 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>

              {/* Feedback Content */}
              <p className="text-slate-600 text-base italic leading-relaxed mb-6 flex-grow font-semibold relative z-10">
                &ldquo;{testi.content}&rdquo;
              </p>

              {/* Reviewer Meta info */}
              <div className="flex items-center gap-3.5 border-t w-full pt-5 z-10">
                {/* Avatar frame */}
                <div className="size-11 rounded-full overflow-hidden bg-slate-100 border border-emerald-100">
                  <Image
                    src={testi.avatarUrl}
                    alt={testi.author}
                    width={120}
                    height={120}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="text-left">
                  <span className="block text-base font-black font-heading text-slate-800 leading-none mb-1.5 flex items-center gap-1">
                    {testi.author}
                    <TicketCheck className="size-4 text-emerald-600 fill-emerald-100" />
                  </span>
                  <span className="block text-xs text-slate-400 font-bold mb-0.5">
                    {testi.role}
                  </span>
                  <span
                    id="company-affiliation"
                    className="inline-flex items-center gap-1 text-xs font-black text-emerald-800"
                  >
                    <Building2 className="size-3 text-emerald-600" />
                    {testi.company}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Brand guarantee banner */}
        <div className="mt-16 bg-white border border-gray-100 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-left">
            <span className="flex items-center justify-center p-3.5 bg-emerald-50 text-emerald-700 font-bold rounded-2xl">
              100%
            </span>
            <div>
              <h4 className="font-black font-heading text-slate-800 text-base">
                Chính Sách Bảo Hành & Cam kết Chất Lượng
              </h4>
              <p className="text-sm text-slate-500">
                Mọi công trình đều được nghiệm thu tỉ mỉ. Nếu phát hiện vết ố
                hay mốc gỗ trong 3 ngày đầu, chúng tôi cử đội xử lý miễn phí
                ngay lập tức.
              </p>
            </div>
          </div>
          <span className="text-sm font-bold bg-orange-50 text-orange-600 border border-orange-100 py-2 px-4 rounded-lg whitespace-nowrap">
            Áp dụng toàn quốc
          </span>
        </div>
      </div>
    </section>
  );
}
