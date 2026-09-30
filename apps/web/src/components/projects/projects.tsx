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
import FilterChips from "../filter-chips/filter-chips";
import SectionHeading from "../section-heading/section-heading";
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
    <section id="projects" className="py-16 md:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <SectionHeading
          cmsId={settings.cmsId}
          fields={[
            "projects_section_eyebrow",
            "projects_section_heading",
            "projects_section_description",
          ]}
          eyebrow={settings.projectsSection.eyebrow}
          heading={settings.projectsSection.heading}
          description={settings.projectsSection.description}
        />

        <FilterChips
          label="Lọc công trình"
          tabs={PROJECT_FILTER_TABS}
          value={filter}
          onChange={setFilter}
        />

        {filteredProjects.length > 0 ? (
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
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
                className="group text-left bg-white rounded-[4px] ring-2 ring-sign-ink overflow-hidden cursor-pointer transition-shadow hover:shadow-[6px_6px_0_0_var(--color-sign-ink)]"
              >
                <div className="relative h-60 md:h-72 bg-stone-200">
                  <Image
                    src={proj.imageUrl}
                    alt={proj.title}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="bg-sign-ink text-white font-bold text-xs uppercase tracking-wider px-2 py-1 rounded-[3px]">
                      {proj.category === Category.CLEANING
                        ? "Vệ sinh"
                        : "Cải tạo"}
                    </span>
                    <span className="bg-tape text-sign-ink font-bold text-xs px-2 py-1 rounded-[3px] tabular-nums">
                      {proj.area}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-sm font-semibold text-stone-500">
                    {proj.client}
                  </p>
                  <h3 className="mt-1 font-heading font-bold uppercase text-2xl leading-tight text-sign-ink group-hover:text-brand-secondary-700 transition-colors">
                    {proj.title}
                  </h3>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-stone-600 text-sm">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-4 text-brand-secondary-600" />
                      {proj.location}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="size-4 text-brand-primary-600" />
                      {proj.completionTime}
                    </span>
                  </div>

                  {proj.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {proj.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="bg-stone-100 text-stone-700 font-medium text-xs px-2 py-1 rounded-[3px]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-sign-ink underline underline-offset-4 decoration-stone-300 group-hover:decoration-sign-ink cursor-pointer"
                  >
                    <ZoomIn className="size-4" />
                    Xem hồ sơ công trình
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-14 rounded-[4px] border-2 border-dashed border-stone-300">
            <p className="text-stone-600 font-semibold">
              Chưa có công trình nào trong mục này.
            </p>
            {filter !== CategoryFilter.ALL && (
              <button
                onClick={() => setFilter(CategoryFilter.ALL)}
                className="mt-3 text-sm font-semibold text-brand-secondary-700 underline underline-offset-4 cursor-pointer"
              >
                Xem tất cả công trình
              </button>
            )}
          </div>
        )}

        {/* Project Case-study Dialog */}
        {selectedProject && (
          <Dialog
            open={!!selectedProject}
            onOpenChange={(open) => !open && setSelectedProject(null)}
          >
            <DialogContent className="max-w-2xl bg-white rounded-[4px] ring-2 ring-sign-ink overflow-y-auto max-h-[90vh]">
              <DialogHeader className="text-left">
                <span className="text-xs uppercase font-bold tracking-wider text-sign-ink bg-tape px-2 py-1 rounded-[3px] w-fit">
                  Hồ sơ công trình
                </span>
                <DialogTitle className="font-heading font-extrabold uppercase text-3xl leading-none text-sign-ink mt-2">
                  {selectedProject.title}
                </DialogTitle>
                <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1.5 text-stone-600 text-sm mt-2 pb-4 border-b border-stone-200">
                  <span className="flex items-center gap-1">
                    <MapPin className="size-4 text-brand-secondary-600" />{" "}
                    {selectedProject.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="size-4 text-brand-primary-600" />{" "}
                    {selectedProject.completionTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <Scaling className="size-4 text-stone-500" /> Diện tích:{" "}
                    {selectedProject.area}
                  </span>
                </div>
              </DialogHeader>

              {/* Case-study details */}
              <div className="space-y-6 my-4 text-left">
                {/* Photo showcase */}
                <div className="relative h-60 md:h-72 rounded-[4px] overflow-hidden bg-stone-200">
                  <Image
                    src={selectedProject.imageUrl}
                    alt={selectedProject.title}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-sign-ink/85 p-3 text-white text-sm font-semibold">
                    Khách hàng: {selectedProject.client}
                  </div>
                </div>

                {/* Scenario details */}
                <div>
                  <h4 className="text-sm font-bold text-sign-ink uppercase tracking-wider mb-2">
                    Hạng mục đã làm
                  </h4>
                  <p className="text-stone-700 text-sm leading-relaxed">
                    {selectedProject.description}
                  </p>
                </div>

                {/* Achievement Highlight */}
                <div className="bg-brand-primary-50 rounded-[4px] p-4 border-l-4 border-brand-primary-600">
                  <div className="flex gap-2 items-center text-brand-primary-800 font-bold text-sm mb-1.5">
                    <Trophy className="size-4 text-brand-primary-600" />
                    <span>Kết quả bàn giao</span>
                  </div>
                  <p className="text-brand-primary-900 text-sm leading-relaxed pl-6">
                    {selectedProject.achievement}
                  </p>
                </div>

                {/* Associated Real Review block */}
                {selectedProject.testimonial && (
                  <div className="bg-stone-100 rounded-[4px] p-5 relative">
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
                    <div className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">
                      Chủ đầu tư nói gì
                    </div>
                    <blockquote className="text-stone-800 text-sm leading-relaxed mb-4">
                      &ldquo;{selectedProject.testimonial.content}&rdquo;
                    </blockquote>
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-full bg-brand-secondary-600 flex items-center justify-center font-bold text-sm text-white">
                        {selectedProject.testimonial.author[0]}
                      </div>
                      <div>
                        <span className="block text-sm font-bold text-sign-ink leading-none">
                          {selectedProject.testimonial.author}
                        </span>
                        <span className="text-xs text-stone-500">
                          {selectedProject.testimonial.role}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 border-t border-stone-200 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedProject(null)}
                  className="h-10 rounded-md font-semibold"
                >
                  Đóng
                </Button>
                <Link
                  href={`/?quoteProject=${encodeURIComponent(selectedProject.title)}#contact`}
                  className={
                    buttonVariants({ variant: "default" }) +
                    " h-10 bg-brand-secondary-600 hover:bg-brand-secondary-700 text-white font-bold px-4 rounded-md"
                  }
                  onClick={() => setSelectedProject(null)}
                >
                  Báo giá công trình tương tự
                </Link>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </section>
  );
}
