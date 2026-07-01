import {
  ArrowUpCircle,
  Facebook,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  Sparkles,
  Wrench,
} from "lucide-react";
import Link from "next/link";

import { SectionId } from "@/constants/section";
import { editAttr } from "@/lib/visual-editor/edit-attr";

import { SiteSettings } from "../../data";

export default function Footer({ settings }: { settings: SiteSettings }) {
  const { company, social, branding, footer } = settings;
  const sid = settings.cmsId;
  const socials: Array<{
    href: string;
    label: string;
    Icon: typeof Facebook;
  }> = [
    social.facebook
      ? { href: social.facebook, label: "Facebook", Icon: Facebook }
      : null,
    social.zalo
      ? { href: social.zalo, label: "Zalo", Icon: MessageCircle }
      : null,
    social.messenger
      ? { href: social.messenger, label: "Messenger", Icon: MessageSquare }
      : null,
  ].filter((s): s is { href: string; label: string; Icon: typeof Facebook } =>
    Boolean(s)
  );
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 border-t border-slate-800 relative">
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-brand-primary-500/50 via-white/10 to-brand-secondary-500/50" />

      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 mb-12">
          {/* Brand Presentation Footer Area */}
          <div className="lg:col-span-4 space-y-6">
            <Link
              href={`#${SectionId.HERO}`}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div className="flex items-center justify-center size-9 rounded-lg bg-linear-to-br from-brand-primary-500 via-white to-brand-secondary-400 p-[1.5px] shadow-sm">
                <div className="flex items-center justify-center w-full h-full bg-slate-900 rounded-[7px] gap-[1px]">
                  <Sparkles className="size-4 text-brand-primary-400 animate-pulse" />
                  <Wrench className="size-4 text-brand-secondary-400" />
                </div>
              </div>
              <div>
                <span className="text-lg font-black tracking-tight text-white flex items-center gap-1 leading-none">
                  <span className="text-brand-primary-400">
                    {branding.logoTextPrimary}
                  </span>
                  <span className="text-brand-secondary-400">
                    {branding.logoTextSecondary}
                  </span>
                </span>
                <span className="block text-[8px] font-bold uppercase tracking-widest text-slate-450 leading-none mt-1">
                  {branding.footerTagline}
                </span>
              </div>
            </Link>

            <p
              className="text-slate-400 text-xs md:text-sm leading-relaxed font-semibold"
              data-directus={editAttr({
                collection: "site_settings",
                item: sid,
                fields: "footer_brand_description",
              })}
            >
              {footer.brandDescription}
            </p>

            {socials.length > 0 && (
              <div className="flex items-center gap-3">
                {socials.map(({ href, label, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex items-center justify-center size-9 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                  >
                    <Icon className="size-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links Anchors */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-white text-xs font-black uppercase tracking-widest">
              {footer.quickLinksHeading}
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold text-slate-400">
              {footer.quickLinks.map((link) => (
                <li key={link.sectionId}>
                  <Link
                    href={`#${link.sectionId}`}
                    data-directus={editAttr({
                      collection: "site_footer_links",
                      item: link.id,
                      fields: ["label", "section_id"],
                    })}
                    className="hover:text-brand-primary-400 hover:underline cursor-pointer transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Branch & Coordinate Addresses */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-white text-xs font-black uppercase tracking-widest">
              {footer.officesHeading}
            </h4>
            <div className="space-y-3.5 text-xs font-semibold text-slate-400 leading-relaxed">
              <div className="flex gap-2.5 items-start">
                <MapPin className="size-4 text-brand-secondary-400 shrink-0 mt-0.5" />
                <p>
                  <span className="text-white font-bold block mb-0.5 text-[11px]">
                    {footer.headquartersLabel}
                  </span>
                  {company.address}
                </p>
              </div>
              <div className="flex gap-2.5 items-start">
                <MapPin className="size-4 text-brand-primary-400 shrink-0 mt-0.5" />
                <p>
                  <span className="text-white font-bold block mb-0.5 text-[11px]">
                    {footer.branchLabel}
                  </span>
                  {company.branch}
                </p>
              </div>
            </div>
          </div>

          {/* Support Channels */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-white text-xs font-black uppercase tracking-widest">
              {footer.supportHeading}
            </h4>
            <div className="pt-2 space-y-3.5 text-xs font-semibold">
              {company.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="size-4 text-brand-secondary-400" />
                  <a
                    href={`tel:${company.phone.replace(/\s+/g, "")}`}
                    className="hover:text-brand-secondary-400 transition-colors text-slate-300"
                  >
                    {footer.hotlinePrefix} {company.phone}
                  </a>
                </div>
              )}
              {company.email && (
                <div className="flex items-center gap-2.5">
                  <Mail className="size-4 text-brand-primary-400" />
                  <a
                    href={`mailto:${company.email}`}
                    className="hover:text-brand-primary-400 transition-colors text-slate-300"
                  >
                    {footer.emailPrefix} {company.email}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Closing details and copy */}
        <div className="border-t border-slate-800/80 pt-8 mt-8 flex flex-col md:flex-row items-center justify-between text-slate-500 text-[11px] font-bold">
          <p>
            © {new Date().getFullYear()} {company.name}.{" "}
            {footer.copyrightSuffix}
          </p>

          <Link
            href={`#${SectionId.HERO}`}
            className="flex items-center gap-1 hover:text-white cursor-pointer mt-4 md:mt-0"
          >
            <ArrowUpCircle className="size-4 text-brand-primary-400" />
            {footer.backToTopLabel}
          </Link>
        </div>
      </div>
    </footer>
  );
}
