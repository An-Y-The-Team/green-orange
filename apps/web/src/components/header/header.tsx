"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { SectionId } from "@/constants/section";
import { useScrollSpy } from "@/hooks/use-scroll-spy/use-scroll-spy";
import { editAttr } from "@/lib/visual-editor/edit-attr";

import { SiteSettings } from "../../data";

// Two overlapping brand circles (orange + green) — the logo mark.
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 26 18" className={className} aria-hidden>
      <circle cx="9" cy="9" r="8" className="fill-brand-secondary-600" />
      <circle
        cx="17"
        cy="9"
        r="8"
        className="fill-brand-primary-600"
        fillOpacity=".9"
      />
    </svg>
  );
}

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
      className={`fixed top-0 left-0 right-0 z-50 bg-white border-b border-stone-200 transition-shadow ${
        isScrolled ? "shadow-md" : ""
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-8 h-16 flex justify-between items-center gap-4">
        <Link
          id="logo-container"
          href={`#${SectionId.HERO}`}
          onClick={handleNavClick}
          className="flex items-center gap-2.5"
        >
          <LogoMark className="w-9 h-auto shrink-0" />
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
            <span className="flex gap-1 text-xl font-extrabold tracking-tight leading-none">
              <span className="text-brand-primary-700">
                {branding.logoTextPrimary}
              </span>
              <span className="text-brand-secondary-600">
                {branding.logoTextSecondary}
              </span>
            </span>
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-stone-500 leading-none mt-1">
              {branding.headerTagline}
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1" id="desktop-navbar">
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
              className={`px-3 py-2 text-sm font-semibold border-b-2 transition-colors ${
                activeSection === item.sectionId
                  ? "border-brand-secondary-600 text-sign-ink"
                  : "border-transparent text-stone-600 hover:text-sign-ink"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          id="header-cta-btn"
          href={`#${SectionId.CONTACT}`}
          onClick={handleNavClick}
          className="hidden md:inline-flex items-center h-10 px-4 rounded-md bg-brand-secondary-600 hover:bg-brand-secondary-700 text-white text-sm font-bold transition-colors"
          data-directus={editAttr({
            collection: "site_settings",
            item: sid,
            fields: "navigation_header_cta_label",
          })}
        >
          {navigation.headerCtaLabel}
        </Link>

        <button
          id="mobile-menu-toggle"
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden p-2 rounded-md text-sign-ink ring-1 ring-stone-300"
          aria-label={isOpen ? "Đóng menu" : "Mở menu"}
          aria-expanded={isOpen}
        >
          {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {isOpen && (
        <div
          id="mobile-drawer"
          className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-stone-200 shadow-xl p-4 flex flex-col gap-1 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {navigation.items.map((item) => (
            <Link
              key={item.sectionId}
              href={`#${item.sectionId}`}
              onClick={handleNavClick}
              className={`py-3 px-3 rounded-md text-base font-semibold ${
                activeSection === item.sectionId
                  ? "bg-sign-ink text-white"
                  : "text-sign-ink hover:bg-stone-100"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={`#${SectionId.CONTACT}`}
            onClick={handleNavClick}
            className="mt-3 h-12 rounded-md bg-brand-secondary-600 hover:bg-brand-secondary-700 text-white font-bold flex items-center justify-center"
            data-directus={editAttr({
              collection: "site_settings",
              item: sid,
              fields: "navigation_mobile_cta_label",
            })}
          >
            {navigation.mobileCtaLabel}
          </Link>
        </div>
      )}
    </header>
  );
}
