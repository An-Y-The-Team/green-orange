"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button, buttonVariants } from "@yan/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@yan/ui/components/dialog";

import { Category, CategoryFilter } from "@/constants/category";
import { editAttr } from "@/lib/visual-editor/edit-attr";

import type { SiteSettings } from "../../data";
import { Service } from "../../types";
import FilterChips from "../filter-chips/filter-chips";
import SectionHeading from "../section-heading/section-heading";
import {
  FALLBACK_SERVICE_ICON,
  ICON_MAP,
  SERVICE_FILTER_TABS,
} from "./constants";

export default function Services({
  services,
  settings,
}: {
  services: Service[];
  settings: SiteSettings;
}) {
  const [filter, setFilter] = useState<CategoryFilter>(CategoryFilter.ALL);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const filteredServices = services.filter(
    (s) => filter === CategoryFilter.ALL || (s.category as string) === filter
  );

  return (
    <section id="services" className="py-16 md:py-24 bg-stone-100">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <SectionHeading
          cmsId={settings.cmsId}
          fields={[
            "services_section_eyebrow",
            "services_section_heading",
            "services_section_description",
          ]}
          eyebrow={settings.servicesSection.eyebrow}
          heading={settings.servicesSection.heading}
          description={settings.servicesSection.description}
        />

        <FilterChips
          label="Lọc dịch vụ"
          tabs={SERVICE_FILTER_TABS}
          value={filter}
          onChange={setFilter}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => {
            const IconComponent =
              ICON_MAP[service.iconName] || FALLBACK_SERVICE_ICON;
            const isCleaning = service.category === Category.CLEANING;

            return (
              <div
                key={service.id}
                id={`card-${service.id}`}
                className="relative bg-white rounded-[4px] ring-2 ring-sign-ink p-6 flex flex-col items-start text-left transition-shadow hover:shadow-[6px_6px_0_0_var(--color-sign-ink)]"
              >
                {service.popular && (
                  <span className="absolute -top-3 right-5 bg-tape text-sign-ink font-bold text-xs uppercase tracking-wider px-2.5 py-1 rounded-[3px] ring-2 ring-sign-ink">
                    Được chọn nhiều
                  </span>
                )}

                <span
                  className={`grid place-items-center size-12 rounded-[4px] text-white mb-5 ${
                    isCleaning
                      ? "bg-brand-primary-600"
                      : "bg-brand-secondary-600"
                  }`}
                >
                  <IconComponent className="size-6" />
                </span>

                <h3
                  className="font-heading font-bold uppercase text-2xl leading-tight text-sign-ink mb-2"
                  data-directus={editAttr({
                    collection: "services",
                    item: service.cmsId,
                    fields: "title",
                  })}
                >
                  {service.title}
                </h3>

                <p
                  className="text-stone-600 text-sm md:text-base leading-relaxed mb-5 flex-grow"
                  data-directus={editAttr({
                    collection: "services",
                    item: service.cmsId,
                    fields: "description",
                    mode: "modal",
                  })}
                >
                  {service.description}
                </p>

                <ul className="w-full space-y-2 mb-6 border-t border-stone-200 pt-4">
                  {service.features.map((feat, idx) => (
                    <li key={idx} className="flex gap-2 text-sm text-sign-ink">
                      <Check
                        className={`size-4 shrink-0 mt-0.5 ${isCleaning ? "text-brand-primary-600" : "text-brand-secondary-600"}`}
                      />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between gap-3 w-full mt-auto">
                  <button
                    onClick={() => setSelectedService(service)}
                    className="text-sm font-semibold text-sign-ink underline underline-offset-4 decoration-stone-300 hover:decoration-sign-ink cursor-pointer"
                  >
                    Xem chi tiết
                  </button>
                  <Link
                    href={`/?serviceId=${service.id}&category=${service.category}#contact`}
                    className={`inline-flex items-center h-10 px-4 rounded-md text-white text-sm font-bold transition-colors ${
                      isCleaning
                        ? "bg-brand-primary-600 hover:bg-brand-primary-700"
                        : "bg-brand-secondary-600 hover:bg-brand-secondary-700"
                    }`}
                    onClick={() => setSelectedService(null)}
                  >
                    Báo giá ngay
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dynamic Detail Modal using shadcn dialog */}
        {selectedService && (
          <Dialog
            open={!!selectedService}
            onOpenChange={(open) => !open && setSelectedService(null)}
          >
            <DialogContent className="max-w-xl bg-white rounded-[4px] ring-2 ring-sign-ink">
              <DialogHeader className="text-left">
                <span
                  className={`text-xs uppercase tracking-widest font-bold px-2 py-1 rounded-[3px] w-fit text-white ${
                    selectedService.category === Category.CLEANING
                      ? "bg-brand-primary-600"
                      : "bg-brand-secondary-600"
                  }`}
                >
                  Dịch vụ{" "}
                  {selectedService.category === Category.CLEANING
                    ? "vệ sinh"
                    : "thi công"}
                </span>
                <DialogTitle className="font-heading font-extrabold uppercase text-3xl leading-none text-sign-ink mt-2">
                  {selectedService.title}
                </DialogTitle>
                <DialogDescription className="text-stone-600 text-sm mt-2">
                  {selectedService.description}
                </DialogDescription>
              </DialogHeader>

              {/* Benefits breakdown */}
              <div className="space-y-4 my-4">
                <h4 className="text-sm font-bold text-sign-ink uppercase tracking-wider">
                  Anh/chị nhận được gì
                </h4>
                <div className="space-y-2.5">
                  {selectedService.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start">
                      <Check className="size-4 shrink-0 mt-0.5 text-brand-primary-600" />
                      <p className="text-stone-700 text-sm leading-relaxed">
                        {benefit}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-stone-100 rounded-[4px] flex justify-between gap-3 text-sm items-center">
                  <span className="text-stone-600">Thời gian làm dự kiến</span>
                  <span className="font-bold text-sign-ink bg-tape px-2 py-0.5 rounded-[3px]">
                    {selectedService.duration}
                  </span>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setSelectedService(null)}
                  className="w-full sm:w-auto h-10 rounded-md font-semibold"
                >
                  Đóng
                </Button>
                <Link
                  href={`/?serviceId=${selectedService.id}&category=${selectedService.category}#contact`}
                  className={
                    buttonVariants({ variant: "default" }) +
                    " w-full sm:w-auto h-10 bg-brand-secondary-600 hover:bg-brand-secondary-700 text-white font-bold flex items-center justify-center rounded-md"
                  }
                  onClick={() => setSelectedService(null)}
                >
                  Chọn gói này
                </Link>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </section>
  );
}
