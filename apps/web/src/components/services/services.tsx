"use client";

import { CheckCircle } from "lucide-react";
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
import { renderLines } from "@/lib/text-lines";
import { editAttr } from "@/lib/visual-editor/edit-attr";

import type { SiteSettings } from "../../data";
import { Service } from "../../types";
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
    <section id="services" className="py-16 md:py-24 bg-slate-50 relative">
      <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-white to-transparent" />

      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span
            className="text-sm font-black text-orange-500 uppercase tracking-widest bg-orange-50 px-3.5 py-1 rounded-full"
            data-directus={editAttr({
              collection: "site_settings",
              item: settings.cmsId,
              fields: "services_section_eyebrow",
            })}
          >
            {settings.servicesSection.eyebrow}
          </span>
          <h2
            className="text-4xl md:text-5xl lg:text-6xl font-black font-heading text-slate-900 tracking-tight mt-3 mb-4"
            data-directus={editAttr({
              collection: "site_settings",
              item: settings.cmsId,
              fields: "services_section_heading",
            })}
          >
            {renderLines(settings.servicesSection.heading)}
          </h2>
          <div className="h-1.5 w-24 bg-gradient-to-r from-emerald-500 to-orange-500 mx-auto rounded-full" />
          <p
            className="text-slate-500 font-medium mt-6 text-base md:text-lg lg:text-xl leading-relaxed"
            data-directus={editAttr({
              collection: "site_settings",
              item: settings.cmsId,
              fields: "services_section_description",
            })}
          >
            {renderLines(settings.servicesSection.description)}
          </p>
        </div>

        {/* Filter buttons */}
        <div
          id="service-filters"
          className="flex justify-center items-center gap-4 mb-12 flex-wrap"
        >
          {SERVICE_FILTER_TABS.map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilter(btn.id)}
              className={`px-7 py-3.5 rounded-2xl font-black text-base transition-all duration-300 shadow-md active:scale-95 cursor-pointer transform hover:scale-108 hover:shadow-lg ${
                filter === btn.id
                  ? "bg-emerald-600 text-white shadow-emerald-600/20"
                  : "bg-white text-slate-700 hover:text-slate-900 border border-gray-200"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredServices.map((service) => {
            const IconComponent =
              ICON_MAP[service.iconName] || FALLBACK_SERVICE_ICON;
            const isCleaning = service.category === Category.CLEANING;

            return (
              <div
                key={service.id}
                id={`card-${service.id}`}
                className="group relative bg-white rounded-3xl border border-gray-100 p-8 flex flex-col items-start text-left shadow-xs transition-all duration-500 hover:shadow-2xl hover:translate-y-[-10px] hover:border-emerald-400"
              >
                {/* Popular Badge */}
                {service.popular && (
                  <span className="absolute -top-3 right-6 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-extrabold text-xs uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md scale-110 md:scale-115">
                    Phổ Biến Nhất
                  </span>
                )}

                {/* Service Icon with responsive colored backdrop */}
                <div
                  className={`p-3 rounded-2xl mb-6 transition-colors duration-300 ${
                    isCleaning
                      ? "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100"
                      : "bg-orange-50 text-orange-500 group-hover:bg-orange-100"
                  }`}
                >
                  <IconComponent className="size-8 shrink-0" />
                </div>

                {/* Service Title */}
                <h3
                  className="text-2xl font-black font-heading text-slate-800 mb-3 group-hover:text-emerald-700 transition-colors leading-tight"
                  data-directus={editAttr({
                    collection: "services",
                    item: service.cmsId,
                    fields: "title",
                  })}
                >
                  {service.title}
                </h3>

                {/* Short Desc */}
                <p
                  className="text-slate-500 text-base leading-relaxed mb-6 flex-grow"
                  data-directus={editAttr({
                    collection: "services",
                    item: service.cmsId,
                    fields: "description",
                    mode: "modal",
                  })}
                >
                  {service.description}
                </p>

                {/* Highlight list */}
                <div className="w-full space-y-2.5 mb-6 border-t pt-4">
                  <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider font-heading">
                    Điểm mấu chốt:
                  </div>
                  {service.features.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 text-sm"
                    >
                      <div
                        className={`p-0.5 rounded-full ${isCleaning ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-600"}`}
                      >
                        <CheckCircle className="size-3.5" />
                      </div>
                      <span className="text-slate-600 font-semibold">
                        {feat}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between w-full mt-auto pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedService(service)}
                    className="text-slate-600 hover:text-emerald-700 font-black text-base flex items-center gap-1.5 cursor-pointer transition-all duration-300 transform hover:scale-110"
                  >
                    Xem chi tiết →
                  </button>
                  <Link
                    href={`/?serviceId=${service.id}&category=${service.category}#contact`}
                    className={
                      buttonVariants({ variant: "default" }) +
                      ` font-black text-sm h-11 px-6 rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-110 hover:shadow-lg active:scale-95 ${
                        isCleaning
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10"
                          : "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/10"
                      }`
                    }
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
            <DialogContent className="max-w-xl bg-white border border-gray-100">
              <DialogHeader className="text-left">
                <span
                  className={`text-[10px] uppercase tracking-widest font-black px-2.5 py-1 rounded-full w-fit ${
                    selectedService.category === Category.CLEANING
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-orange-50 text-orange-600"
                  }`}
                >
                  Dịch vụ{" "}
                  {selectedService.category === Category.CLEANING
                    ? "vệ sinh"
                    : "thi công"}
                </span>
                <DialogTitle className="text-2xl font-black text-slate-900 mt-2">
                  {selectedService.title}
                </DialogTitle>
                <DialogDescription className="text-slate-500 font-medium text-sm mt-2">
                  {selectedService.description}
                </DialogDescription>
              </DialogHeader>

              {/* Benefits breakdown */}
              <div className="space-y-4 my-4">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Chất lượng & Lợi ích độc quyền:
                </h4>
                <div className="space-y-2.5">
                  {selectedService.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start">
                      <div className="p-0.5 bg-emerald-100 text-emerald-700 rounded-full mt-0.5">
                        <CheckCircle className="size-4 shrink-0" />
                      </div>
                      <p className="text-slate-600 text-xs md:text-sm leading-relaxed font-semibold">
                        {benefit}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border flex justify-between text-xs items-center">
                  <span className="text-slate-500 font-bold">
                    Thời gian hoàn thành ước tính:
                  </span>
                  <span className="font-extrabold text-slate-800 bg-white border px-2.5 py-1 rounded-md">
                    {selectedService.duration}
                  </span>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setSelectedService(null)}
                  className="w-full sm:w-auto h-9 font-bold text-xs"
                >
                  Đóng lại
                </Button>
                <Link
                  href={`/?serviceId=${selectedService.id}&category=${selectedService.category}#contact`}
                  className={
                    buttonVariants({ variant: "default" }) +
                    " w-full sm:w-auto h-9 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center justify-center rounded-md"
                  }
                  onClick={() => setSelectedService(null)}
                >
                  Chọn phục vụ này
                </Link>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </section>
  );
}
