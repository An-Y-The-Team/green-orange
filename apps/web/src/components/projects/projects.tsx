"use client";

import { Calendar, MapPin, Scaling, Star, Trophy, ZoomIn } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Button, buttonVariants } from "@yan/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@yan/ui/components/dialog";

import { Category, CategoryFilter } from "@/constants/category";
import { editAttr } from "@/lib/visual-editor/edit-attr";

import type { SiteSettings } from "../../data";
import { Project } from "../../types";
import { PROJECT_FILTER_TABS } from "./constants";

export default function Projects({
  projects,
  settings,
}: {
  projects: Project[];
  settings: SiteSettings;
}) {
  const [filter, setFilter] = useState<CategoryFilter>(CategoryFilter.ALL);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Filters projects based on selected category
  const filteredProjects = projects.filter((p) => {
    return filter === CategoryFilter.ALL || (p.category as string) === filter;
  });

  return (
    <section id="projects" className="py-16 md:py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span
            className="text-sm font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3.5 py-1 rounded-full"
            data-directus={editAttr({
              collection: "site_settings",
              item: settings.cmsId,
              fields: "projects_section_eyebrow",
            })}
          >
            {settings.projectsSection.eyebrow}
          </span>
          <h2
            className="text-4xl md:text-5xl lg:text-6xl font-black font-heading text-slate-900 tracking-tight mt-3 mb-4"
            data-directus={editAttr({
              collection: "site_settings",
              item: settings.cmsId,
              fields: "projects_section_heading",
            })}
          >
            {settings.projectsSection.heading}
          </h2>
          <div className="h-1.5 w-24 bg-gradient-to-r from-emerald-500 to-orange-500 mx-auto rounded-full" />
          <p
            className="text-slate-500 font-medium mt-6 text-base md:text-lg lg:text-xl leading-relaxed"
            data-directus={editAttr({
              collection: "site_settings",
              item: settings.cmsId,
              fields: "projects_section_description",
            })}
          >
            {settings.projectsSection.description}
          </p>
        </div>

        {/* Filter controls */}
        <div className="bg-slate-50 p-4 md:p-6 rounded-3xl border border-gray-100 flex justify-center mb-12">
          {/* Categories Tab list */}
          <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 w-full md:w-auto shadow-sm">
            {PROJECT_FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`flex-1 md:flex-none px-6 py-3.5 text-sm font-black rounded-xl transition-all duration-300 cursor-pointer transform hover:scale-[1.03] active:scale-95 ${
                  filter === tab.id
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/10"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length > 0 ? (
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
            id="projects-grid"
          >
            {filteredProjects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => setSelectedProject(proj)}
                data-directus={editAttr({
                  collection: "projects",
                  item: proj.cmsId,
                  fields: [
                    "title",
                    "client",
                    "location",
                    "area",
                    "completion_time",
                    "description",
                    "achievement",
                    "tags",
                  ],
                  mode: "drawer",
                })}
                className="group relative bg-slate-50 border border-gray-100/50 rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 hover:shadow-2xl hover:translate-y-[-10px] hover:border-orange-400"
              >
                {/* Product/Construction Shot */}
                <div className="relative h-64 md:h-72 overflow-hidden bg-slate-900">
                  <Image
                    src={proj.imageUrl}
                    alt={proj.title}
                    fill
                    unoptimized
                    className="object-cover opacity-90 transition-transform duration-700 group-hover:scale-110"
                  />

                  {/* Overlay background on hover */}
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-white/95 text-slate-800 p-3 rounded-full shadow-lg flex items-center gap-1 text-xs font-black animate-in zoom-in-50 duration-200">
                      <ZoomIn className="size-4 text-emerald-600 font-bold" />
                      <span>Xem chi tiết hồ sơ</span>
                    </div>
                  </div>

                  {/* Project metadata badges on image card */}
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="bg-white/95 backdrop-blur-xs text-slate-800 font-black text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md shadow-xs">
                      {proj.category === Category.CLEANING
                        ? "Vệ Sinh"
                        : "Cải Tạo"}
                    </span>
                    <span className="bg-emerald-600 text-white font-bold text-[10px] px-2.5 py-1 rounded-md shadow-xs">
                      {proj.area}
                    </span>
                  </div>
                </div>

                {/* Content body detail */}
                <div className="p-8 text-left">
                  <p className="text-sm font-bold text-slate-400 mb-1">
                    {proj.client}
                  </p>
                  <h3 className="text-2xl font-black font-heading text-slate-800 group-hover:text-emerald-700 transition-colors mb-3 leading-snug">
                    {proj.title}
                  </h3>

                  {/* Coordinates info list */}
                  <div className="flex flex-wrap gap-x-4 gap-y-2 text-slate-500 text-sm font-semibold mb-4 border-b pb-4">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-4 text-emerald-600" />
                      {proj.location}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="size-4 text-orange-500" />
                      {proj.completionTime}
                    </span>
                  </div>

                  {/* Highlight tags list */}
                  <div className="flex flex-wrap gap-1.5">
                    {proj.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="bg-emerald-50 text-emerald-700 font-bold text-xs px-2.5 py-1 rounded-md"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-gray-300">
            <p className="text-slate-450 font-bold text-sm">
              Không tìm thấy dự án nào tương thích với bộ lọc.
            </p>
            <button
              onClick={() => {
                setFilter(CategoryFilter.ALL);
              }}
              className="mt-4 text-emerald-600 font-black text-xs hover:underline cursor-pointer"
            >
              Reset bộ lọc nâng cao
            </button>
          </div>
        )}

        {/* Project Case-study Dialog */}
        {selectedProject && (
          <Dialog
            open={!!selectedProject}
            onOpenChange={(open) => !open && setSelectedProject(null)}
          >
            <DialogContent className="max-w-2xl bg-white border border-gray-100 overflow-y-auto max-h-[90vh]">
              <DialogHeader className="text-left">
                <span className="text-[10px] uppercase font-black text-orange-500 bg-orange-50 px-2.5 py-1 rounded-md w-fit">
                  Hồ Sơ Dự Án Thực Tế
                </span>
                <DialogTitle className="text-2xl font-black text-slate-900 mt-2 leading-tight">
                  {selectedProject.title}
                </DialogTitle>
                <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1.5 text-slate-400 text-xs font-bold mt-2 pb-4 border-b">
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5 text-emerald-600" />{" "}
                    {selectedProject.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3.5 text-orange-500" />{" "}
                    {selectedProject.completionTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <Scaling className="size-3.5 text-slate-500" /> Diện tích:{" "}
                    {selectedProject.area}
                  </span>
                </div>
              </DialogHeader>

              {/* Case-study details */}
              <div className="space-y-6 my-4 text-left">
                {/* Photo showcase */}
                <div className="relative h-60 md:h-72 rounded-xl overflow-hidden bg-slate-900">
                  <Image
                    src={selectedProject.imageUrl}
                    alt={selectedProject.title}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-slate-950/50 p-3 text-white text-xs font-black">
                    Khách hàng ủy thác: {selectedProject.client}
                  </div>
                </div>

                {/* Scenario details */}
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-2">
                    Mô Tả Hạng Mục Thi Công & Vệ Sinh:
                  </h4>
                  <p className="text-slate-600 text-xs md:text-sm leading-relaxed font-semibold">
                    {selectedProject.description}
                  </p>
                </div>

                {/* Achievement Highlight */}
                <div className="bg-emerald-50 border border-emerald-100/50 rounded-2xl p-4.5">
                  <div className="flex gap-2 items-center text-emerald-800 font-extrabold text-sm mb-1.5">
                    <Trophy className="size-4 text-emerald-600" />
                    <span>Thành Tựu Bàn Giao:</span>
                  </div>
                  <p className="text-emerald-700 text-xs md:text-sm leading-relaxed font-semibold pl-6">
                    {selectedProject.achievement}
                  </p>
                </div>

                {/* Associated Real Review block */}
                {selectedProject.testimonial && (
                  <div className="bg-slate-50 border rounded-2xl p-5 relative">
                    <div className="absolute top-5 right-5 flex gap-0.5">
                      {[...Array(selectedProject.testimonial.rating)].map(
                        (_, i) => (
                          <Star
                            key={i}
                            className="size-3.5 fill-amber-400 text-amber-400"
                          />
                        )
                      )}
                    </div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Đánh giá thực tế từ chủ đầu tư:
                    </div>
                    <blockquote className="text-slate-700 italic text-xs md:text-sm font-medium leading-relaxed mb-4">
                      &ldquo;{selectedProject.testimonial.content}&rdquo;
                    </blockquote>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center font-black text-xs text-emerald-800">
                        {selectedProject.testimonial.author[0]}
                      </div>
                      <div>
                        <span className="block text-xs font-extrabold text-slate-800 leading-none">
                          {selectedProject.testimonial.author}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">
                          {selectedProject.testimonial.role}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedProject(null)}
                  className="h-9 font-bold text-xs"
                >
                  Đóng lại
                </Button>
                <Link
                  href={`/?quoteProject=${encodeURIComponent(selectedProject.title)}#contact`}
                  className={
                    buttonVariants({ variant: "default" }) +
                    " h-9 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-4 rounded-md"
                  }
                  onClick={() => setSelectedProject(null)}
                >
                  Yêu cầu báo giá
                </Link>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </section>
  );
}
