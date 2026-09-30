import {
  ArrowUpCircle,
  Facebook,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
} from "lucide-react";
import Link from "next/link";

import { SectionId } from "@/constants/section";
import { editAttr } from "@/lib/visual-editor/edit-attr";

import { SiteSettings } from "../../data";
import LogoMark from "../logo-mark/logo-mark";

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
    <footer className="bg-sign-ink text-stone-300 pb-8">
      <div className="tape" aria-hidden />

      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 mb-12">
          {/* Brand Presentation Footer Area */}
          <div className="lg:col-span-4 space-y-6">
            <Link
              href={`#${SectionId.HERO}`}
              className="flex items-center gap-2.5"
            >
              <LogoMark className="w-9 h-auto shrink-0" />
              <div>
                <span className="text-lg font-extrabold tracking-tight flex items-center gap-1 leading-none">
                  <span className="text-brand-primary-400">
                    {branding.logoTextPrimary}
                  </span>
                  <span className="text-brand-secondary-500">
                    {branding.logoTextSecondary}
                  </span>
                </span>
                <span className="block text-[10px] font-semibold uppercase tracking-widest text-stone-400 leading-none mt-1">
                  {branding.footerTagline}
                </span>
              </div>
            </Link>

            <p
              className="text-stone-400 text-sm leading-relaxed"
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
                    className="flex items-center justify-center size-10 rounded-md ring-1 ring-inset ring-white/20 text-stone-300 hover:text-white hover:ring-white/50 transition-colors"
                  >
                    <Icon className="size-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links Anchors */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="font-heading font-bold uppercase text-lg text-tape">
              {footer.quickLinksHeading}
            </h4>
            <ul className="space-y-2.5 text-sm text-stone-400">
              {footer.quickLinks.map((link) => (
                <li key={link.sectionId}>
                  <Link
                    href={`#${link.sectionId}`}
                    data-directus={editAttr({
                      collection: "site_footer_links",
                      item: link.id,
                      fields: ["label", "section_id"],
                    })}
                    className="hover:text-white hover:underline underline-offset-4 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Branch & Coordinate Addresses */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="font-heading font-bold uppercase text-lg text-tape">
              {footer.officesHeading}
            </h4>
            <div className="space-y-3.5 text-sm text-stone-400 leading-relaxed">
              <div className="flex gap-2.5 items-start">
                <MapPin className="size-4 text-brand-secondary-500 shrink-0 mt-0.5" />
                <p>
                  <span className="text-white font-semibold block mb-0.5">
                    {footer.headquartersLabel}
                  </span>
                  {company.address}
                </p>
              </div>
              <div className="flex gap-2.5 items-start">
                <MapPin className="size-4 text-brand-primary-400 shrink-0 mt-0.5" />
                <p>
                  <span className="text-white font-semibold block mb-0.5">
                    {footer.branchLabel}
                  </span>
                  {company.branch}
                </p>
              </div>
            </div>
          </div>

          {/* Support Channels */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="font-heading font-bold uppercase text-lg text-tape">
              {footer.supportHeading}
            </h4>
            <div className="space-y-3.5 text-sm">
              {company.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="size-4 text-brand-secondary-500" />
                  <a
                    href={`tel:${company.phone.replace(/\s+/g, "")}`}
                    className="hover:text-white transition-colors text-stone-300"
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
                    className="hover:text-white transition-colors text-stone-300"
                  >
                    {footer.emailPrefix} {company.email}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Closing details and copy */}
        <div className="border-t border-white/10 pt-8 mt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-stone-500 text-xs">
          <p>
            © {new Date().getFullYear()} {company.name}.{" "}
            {footer.copyrightSuffix}
          </p>

          <Link
            href={`#${SectionId.HERO}`}
            className="flex items-center gap-1 hover:text-white"
          >
            <ArrowUpCircle className="size-4 text-brand-primary-400" />
            {footer.backToTopLabel}
          </Link>
        </div>
      </div>
    </footer>
  );
}
