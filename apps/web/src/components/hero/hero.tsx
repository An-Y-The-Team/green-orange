import { ArrowRight, Check, Phone, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { renderLines } from "@/lib/text-lines";
import { editAttr } from "@/lib/visual-editor/edit-attr";

import { HeadlineColor, SiteSettings } from "../../data";

// Static map keeps Tailwind classes greppable for the JIT compiler. Never
// build a className from a raw CMS string. "white" is the CMS name for the
// default ink color (it dates from the old dark hero).
const HEADLINE_COLOR_CLASS: Record<HeadlineColor, string> = {
  white: "text-sign-ink",
  emerald: "text-brand-primary-600",
  orange: "text-brand-secondary-600",
};

export default function Hero({ settings }: { settings: SiteSettings }) {
  const { stats, hero, company, branding, footer } = settings;
  const sid = settings.cmsId;
  const tel = company.phone.replace(/\s+/g, "");
  return (
    <section id="hero" className="pt-16 bg-white">
      {/* Shop signboard (biển hiệu): name, trade, phone, address */}
      <div className="bg-brand-secondary-600 text-white border-b-[6px] border-brand-primary-600">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 md:py-8 flex flex-col items-center text-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] opacity-90">
            Từ năm {company.founded}
          </span>
          <span
            className="font-heading font-extrabold uppercase text-5xl md:text-7xl leading-[0.9]"
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
            {branding.logoTextPrimary}
            {branding.logoTextSecondary}
          </span>
          <span className="font-heading font-bold uppercase text-lg md:text-2xl bg-white text-brand-secondary-700 px-3 rounded-[3px]">
            {branding.headerTagline}
          </span>
          {tel && (
            <a
              href={`tel:${tel}`}
              className="font-heading font-extrabold text-3xl md:text-4xl tracking-wide mt-1 hover:underline"
            >
              <span className="text-lg md:text-xl font-semibold opacity-90">
                {footer.hotlinePrefix}
              </span>{" "}
              {company.phone}
            </a>
          )}
          <span className="text-xs md:text-sm opacity-90">
            {company.address}
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12 md:py-16 grid gap-10 lg:grid-cols-12 items-center">
        <div className="lg:col-span-7">
          <span
            className="inline-flex items-center gap-2 text-sm font-semibold text-brand-primary-700"
            data-directus={editAttr({
              collection: "site_settings",
              item: sid,
              fields: "hero_trust_badge",
            })}
          >
            <ShieldCheck className="size-4.5 shrink-0" />
            {hero.trustBadge}
          </span>

          <h1 className="mt-4 font-serif font-extrabold uppercase text-5xl sm:text-6xl lg:text-7xl leading-[0.95] text-sign-ink">
            {hero.headlineSegments.map((seg, idx) => (
              <span key={seg.id ?? idx}>
                {seg.newLineBefore && idx > 0 ? <br /> : idx > 0 ? " " : null}
                <span
                  className={`${HEADLINE_COLOR_CLASS[seg.color]} ${seg.italic ? "italic" : ""}`}
                  data-directus={editAttr({
                    collection: "site_hero_segments",
                    item: seg.id,
                    fields: ["text", "color", "italic", "new_line_before"],
                  })}
                >
                  {seg.text}
                </span>
              </span>
            ))}
          </h1>

          <p
            className="mt-6 text-stone-600 text-base md:text-lg leading-relaxed max-w-2xl"
            data-directus={editAttr({
              collection: "site_settings",
              item: sid,
              fields: "hero_subheadline",
            })}
          >
            {renderLines(hero.subheadline)}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              id="hero-primary-cta"
              href={hero.primaryCta.href}
              className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-md bg-brand-secondary-600 hover:bg-brand-secondary-700 text-white font-bold transition-colors"
            >
              <span
                data-directus={editAttr({
                  collection: "site_settings",
                  item: sid,
                  fields: ["hero_primary_cta_label", "hero_primary_cta_href"],
                })}
              >
                {hero.primaryCta.label}
              </span>
              <ArrowRight className="size-5" />
            </Link>
            <Link
              id="hero-secondary-cta"
              href={hero.secondaryCta.href}
              className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-md bg-white text-sign-ink ring-2 ring-inset ring-sign-ink hover:bg-stone-100 font-bold transition-colors"
            >
              <span
                data-directus={editAttr({
                  collection: "site_settings",
                  item: sid,
                  fields: [
                    "hero_secondary_cta_label",
                    "hero_secondary_cta_href",
                  ],
                })}
              >
                {hero.secondaryCta.label}
              </span>
            </Link>
          </div>

          <p
            className="mt-6 text-xs font-semibold uppercase tracking-widest text-stone-500"
            data-directus={editAttr({
              collection: "site_settings",
              item: sid,
              fields: "hero_trust_strap",
            })}
          >
            {hero.trustStrap}
          </p>
        </div>

        {/* Commitments panel: job-site photo + benefit checklist */}
        <div className="lg:col-span-5 bg-sign-ink text-white rounded-[4px] overflow-hidden">
          {hero.backgroundImageUrl && (
            <div className="relative aspect-[16/9]">
              <Image
                src={hero.backgroundImageUrl}
                alt="Đội thợ GreenOrange tại công trình"
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          )}
          <div className="p-6 md:p-7">
            <h2 className="font-heading font-bold uppercase text-2xl text-tape">
              Cam kết với anh/chị
            </h2>
            <ul
              className="mt-4 space-y-3"
              data-directus={editAttr({
                collection: "site_settings",
                item: sid,
                fields: "hero_benefits",
                mode: "drawer",
              })}
            >
              {hero.benefits.map((value, idx) => (
                <li key={idx} className="flex gap-3 text-sm md:text-base">
                  <Check className="size-5 shrink-0 text-brand-primary-400 mt-0.5" />
                  <span>{value}</span>
                </li>
              ))}
            </ul>
            {tel && (
              <a
                href={`tel:${tel}`}
                className="mt-6 flex items-center gap-2 text-sm font-semibold text-stone-300 hover:text-white"
              >
                <Phone className="size-4" />
                {footer.hotlinePrefix} {company.phone}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 pb-12 md:pb-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 border-y-2 border-sign-ink">
          {stats.map((stat, idx) => (
            <div
              key={stat.id ?? idx}
              className={`py-5 px-3 text-center ${idx % 2 === 1 ? "border-l border-stone-300" : ""} ${idx > 1 ? "border-t border-stone-300 lg:border-t-0 lg:border-l" : ""}`}
              data-directus={editAttr({
                collection: "site_stats",
                item: stat.id,
                fields: ["value", "label", "color"],
                mode: "drawer",
              })}
            >
              <span className="block font-heading font-extrabold text-4xl md:text-5xl text-brand-secondary-600 tabular-nums">
                {stat.value}
              </span>
              <span className="block mt-1 text-xs md:text-sm font-medium text-stone-600">
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
