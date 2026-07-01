"use client";

import { Menu, Sparkles, Wrench, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { buttonVariants } from "@yan/ui/components/button";

import { SectionId } from "@/constants/section";
import { useScrollSpy } from "@/hooks/use-scroll-spy/use-scroll-spy";
import { editAttr } from "@/lib/visual-editor/edit-attr";

import { SiteSettings } from "../../data";

export default function Header({ settings }: { settings: SiteSettings }) {
  const [isOpen, setIsOpen] = useState(false);
  const { branding, navigation } = settings;
  const sid = settings.cmsId;
  // Track only the sections that actually appear in the nav, so the active
  // highlight stays consistent with the rendered links.
  const sectionIds = navigation.items.map((item) => item.sectionId);
  const { activeSection, isScrolled } = useScrollSpy(sectionIds);

  // Close the mobile drawer after the user taps a navigation link.
  const handleNavClick = () => {
    setIsOpen(false);
  };

  return (
    <header
      id="main-header"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-md border-b border-gray-100 py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo with Green & Orange identity */}
          <Link
            id="logo-container"
            href={`#${SectionId.HERO}`}
            onClick={handleNavClick}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="relative flex items-center justify-center size-10 rounded-xl bg-linear-to-br from-brand-primary-500 via-white to-brand-secondary-400 p-[2px] shadow-sm transition-transform duration-300 group-hover:scale-105">
              <div className="flex items-center justify-center w-full h-full bg-white rounded-[10px] gap-[1px]">
                <Sparkles className="size-4.5 text-brand-primary-600 animate-pulse" />
                <Wrench className="size-4.5 text-brand-secondary-500" />
              </div>
            </div>
            <div
              data-directus={editAttr({
                collection: "site_settings",
                item: sid,
                fields: [
                  "branding_logo_text_primary",
                  "branding_logo_text_secondary",
                  "branding_header_tagline",
                ],
                mode: "popover",
              })}
            >
              <span className="text-xl font-black tracking-tight text-slate-800 flex items-center gap-1 leading-none">
                <span className="text-brand-primary-700">
                  {branding.logoTextPrimary}
                </span>
                <span className="text-brand-secondary-500">
                  {branding.logoTextSecondary}
                </span>
              </span>
              <span className="block text-[9px] font-bold uppercase tracking-widest text-slate-500 leading-none mt-1">
                {branding.headerTagline}
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav
            className="hidden md:flex items-center gap-1"
            id="desktop-navbar"
          >
            {navigation.items.map((item) => (
              <Link
                key={item.sectionId}
                id={`nav-${item.sectionId}`}
                href={`#${item.sectionId}`}
                onClick={handleNavClick}
                data-directus={editAttr({
                  collection: "site_nav_items",
                  item: item.id,
                  fields: ["label", "section_id"],
                })}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-transform duration-200 active:scale-95 ${
                  activeSection === item.sectionId
                    ? "bg-slate-900 text-white"
                    : isScrolled
                      ? "text-slate-600 hover:text-brand-primary-700 hover:bg-brand-primary-50/50"
                      : "text-slate-800 hover:text-brand-primary-800 hover:bg-white/80"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Call to Action */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              id="header-cta-btn"
              href={`#${SectionId.CONTACT}`}
              onClick={handleNavClick}
              className={
                buttonVariants({ variant: "default" }) +
                " bg-brand-secondary-500 hover:bg-brand-secondary-600 text-white font-bold px-4 py-2 rounded-lg shadow-sm hover:shadow-md hover:translate-y-[-1px] transition-all"
              }
              data-directus={editAttr({
                collection: "site_settings",
                item: sid,
                fields: "navigation_header_cta_label",
              })}
            >
              {navigation.headerCtaLabel}
            </Link>
          </div>

          {/* Mobile hamburger icon */}
          <div className="md:hidden flex items-center">
            <button
              id="mobile-menu-toggle"
              onClick={() => setIsOpen(!isOpen)}
              className="p-1.5 rounded-lg text-slate-800 bg-gray-100 hover:bg-gray-100/80 transition-colors"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div
          id="mobile-drawer"
          className="md:hidden fixed top-[60px] left-0 right-0 bg-white border-t border-gray-100 shadow-2xl py-4 px-6 flex flex-col gap-3 animate-in fade-in slide-in-from-top duration-200"
        >
          {navigation.items.map((item) => (
            <Link
              key={item.sectionId}
              href={`#${item.sectionId}`}
              onClick={handleNavClick}
              className={`w-full text-left py-3 px-4 rounded-xl text-base font-bold transition-all ${
                activeSection === item.sectionId
                  ? "bg-brand-primary-600 text-white"
                  : "text-slate-700 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <div className="border-t pt-4 mt-2">
            <Link
              href={`#${SectionId.CONTACT}`}
              onClick={handleNavClick}
              className={
                buttonVariants({ variant: "default" }) +
                " w-full py-3.5 bg-brand-secondary-500 hover:bg-brand-secondary-600 font-bold rounded-xl shadow-md cursor-pointer text-center text-white flex items-center justify-center gap-2 text-sm transform hover:scale-105 active:scale-95 transition-all duration-300"
              }
              data-directus={editAttr({
                collection: "site_settings",
                item: sid,
                fields: "navigation_mobile_cta_label",
              })}
            >
              {navigation.mobileCtaLabel}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
