import { api } from "@yan/shared/api";

import { Project, Service, Testimonial } from "./types";

// Base URL of the decoupled Payload CMS. Public so the client-side contact form
// can POST to it as well; falls back to the local dev CMS port.
// `||` (not `??`) so an empty-string build arg also falls back instead of
// producing an invalid base URL.
export const CMS_URL =
  process.env.NEXT_PUBLIC_CMS_URL || "http://localhost:3001";

// Public origin of this web app. Used for canonical URLs, Open Graph, the
// sitemap, robots, and JSON-LD. Defaults to the local dev server.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Server-only base URL for SSR reads. In production set this to the CMS's
// internal container address (e.g. http://cms:3001) so server fetches go direct
// over the docker network instead of hairpinning out through the public domain
// + TLS. Falls back to the public URL when unset (local dev).
const SERVER_CMS_URL = process.env.CMS_INTERNAL_URL || CMS_URL;

// How long (seconds) fetched CMS content stays cached before revalidation.
const REVALIDATE_SECONDS = 300;

// ---------------------------------------------------------------------------
// Payload REST response shapes (only the fields we consume). Array fields come
// back as `{ id, item }[]`; we flatten them to `string[]` to match the web
// types. `slug` is the stable id the UI relies on (formerly the static `id`).
// ---------------------------------------------------------------------------

interface PayloadList<T> {
  docs: T[];
}

interface ArrayItem {
  item: string;
}

interface PayloadService {
  slug: string;
  title: string;
  description: string;
  category: "cleaning" | "construction";
  duration: string;
  benefits: ArrayItem[];
  features: ArrayItem[];
  iconName: string;
  popular?: boolean | null;
}

interface PayloadProject {
  slug: string;
  title: string;
  client: string;
  category: "cleaning" | "construction";
  location: string;
  area: string;
  completionTime: string;
  description: string;
  achievement: string;
  imageUrl: string;
  tags: ArrayItem[];
  testimonial?: {
    author?: string | null;
    role?: string | null;
    content?: string | null;
    avatarUrl?: string | null;
    rating?: number | null;
  } | null;
}

interface PayloadTestimonial {
  slug: string;
  author: string;
  role: string;
  company: string;
  content: string;
  rating: number;
  avatarUrl: string;
  category: "cleaning" | "construction" | "both";
}

// Fetch JSON from the CMS, returning null on any failure (bad status, timeout,
// network) so a CMS hiccup degrades the page rather than crashing it.
async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await api.fetch(url, {
      next: { revalidate: REVALIDATE_SECONDS },
      // Never let an unreachable CMS hang a build/render; fail fast.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`CMS fetch failed for "${url}": ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`CMS fetch error for "${url}":`, err);
    return null;
  }
}

// Fetch a published collection from Payload, ordered by the `order` field.
// Returns [] on failure so a CMS hiccup degrades the page rather than crashing.
async function fetchCollection<T>(slug: string): Promise<T[]> {
  const json = await fetchJson<PayloadList<T>>(
    `${SERVER_CMS_URL}/api/${slug}?limit=100&depth=0&sort=order`
  );
  return json?.docs ?? [];
}

const flatten = (items: ArrayItem[] | undefined): string[] =>
  (items ?? []).map((i) => i.item);

function mapService(d: PayloadService): Service {
  return {
    id: d.slug,
    title: d.title,
    description: d.description,
    category: d.category as Service["category"],
    duration: d.duration,
    benefits: flatten(d.benefits),
    features: flatten(d.features),
    iconName: d.iconName,
    popular: d.popular ?? undefined,
  };
}

function mapProject(d: PayloadProject): Project {
  const t = d.testimonial;
  return {
    id: d.slug,
    title: d.title,
    client: d.client,
    category: d.category as Project["category"],
    location: d.location,
    area: d.area,
    completionTime: d.completionTime,
    description: d.description,
    achievement: d.achievement,
    imageUrl: d.imageUrl,
    tags: flatten(d.tags),
    // The CMS group always returns an object; treat it as a real testimonial
    // only when an author is present.
    testimonial:
      t && t.author
        ? {
            author: t.author,
            role: t.role ?? "",
            content: t.content ?? "",
            avatarUrl: t.avatarUrl ?? undefined,
            rating: t.rating ?? 0,
          }
        : undefined,
  };
}

function mapTestimonial(d: PayloadTestimonial): Testimonial {
  return {
    id: d.slug,
    author: d.author,
    role: d.role,
    company: d.company,
    content: d.content,
    rating: d.rating,
    avatarUrl: d.avatarUrl,
    category: d.category as Testimonial["category"],
  };
}

// Server-side data getters consumed by the page (Server Component) and passed
// down to the interactive client sections as props.
export async function getServices(): Promise<Service[]> {
  const docs = await fetchCollection<PayloadService>("services");
  return docs.map(mapService);
}

export async function getProjects(): Promise<Project[]> {
  const docs = await fetchCollection<PayloadProject>("projects");
  return docs.map(mapProject);
}

export async function getTestimonials(): Promise<Testimonial[]> {
  const docs = await fetchCollection<PayloadTestimonial>("testimonials");
  return docs.map(mapTestimonial);
}

// ---------------------------------------------------------------------------
// Site-wide settings: company info, headline stats, hero copy, SEO defaults.
// Editable from the Payload `site-settings` global; the hardcoded values below
// are the fallback used if the global is empty or the CMS is unreachable, so
// the page never renders blank (same "degrade, don't crash" approach as above).
// ---------------------------------------------------------------------------

export interface Stat {
  value: string;
  label: string;
  color: string;
}

export interface SiteSettings {
  company: {
    name: string;
    shortName: string;
    founded: string;
    phone: string;
    email: string;
    address: string;
    branch: string;
    motto: string;
    certification: string;
  };
  social: {
    facebook: string;
    zalo: string;
    messenger: string;
  };
  hero: {
    subheadline: string;
  };
  stats: Stat[];
  seo: {
    metaTitle: string;
    metaDescription: string;
    ogImageUrl: string;
  };
}

export const DEFAULT_SETTINGS: SiteSettings = {
  company: {
    name: "CÔNG TY TNHH GREENORANGE - GIẢI PHÁP THI CÔNG & VỆ SINH DOANH NGHIỆP",
    shortName: "GreenOrange Services",
    founded: "2019",
    phone: "",
    email: "contact@greenorange.vn",
    address: "Tầng 5, Tòa Nhà Sông Đà, Phạm Hùng, Mỹ Đình, Nam Từ Liêm, Hà Nội",
    branch:
      "Chi nhánh Nam Bộ: 145 Điện Biên Phủ, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh",
    motto:
      "Sạch sẽ từ gốc - Đẹp đẽ từ khâu dựng xây - Đồng hành tin cậy cùng doanh nghiệp Việt",
    certification:
      "Chứng nhận Hệ thống Quản lý Chất lượng ISO 9001:2015 & Đạt tiêu chuẩn Vệ sinh Môi trường Xanh Eco-Safe.",
  },
  social: { facebook: "", zalo: "", messenger: "" },
  hero: {
    subheadline:
      "Hợp tác toàn diện 2-trong-1 thiết kế, cải tạo trần vách, ánh sáng rọi, mặt dựng Alu cho chuỗi showroom toàn quốc. Kết hợp gói dọn dẹp vệ sinh sâu bóc bụi mịn sơn bả trước giờ cắt băng bàn giao, giúp bạn sở hữu cửa hiệu sang trọng, sạch bóng tươm tất nhanh chóng nhất.",
  },
  stats: [
    {
      value: "500+",
      label: "Cửa hàng & Văn phòng Đã Bàn Giao",
      color: "text-green-600",
    },
    {
      value: "120+",
      label: "Dự án Thi Công Cải Tạo Trọn Gói",
      color: "text-orange-600",
    },
    {
      value: "99.4%",
      label: "Khách Hàng Đánh Giá Hài Lòng 5★",
      color: "text-green-600",
    },
    {
      value: "35+",
      label: "Trang thiết bị & Hóa chất Đạt Chuẩn",
      color: "text-orange-600",
    },
  ],
  seo: {
    metaTitle:
      "GreenOrange - Dịch vụ Thi công, Cải tạo & Vệ sinh Cửa hàng Chuyên nghiệp",
    metaDescription:
      "Dịch vụ Thi công, Cải tạo & Vệ sinh Cửa hàng Chuyên nghiệp",
    ogImageUrl: "",
  },
};

// Back-compat aliases for existing imports. New code should prefer the
// `SiteSettings` fetched via getSiteSettings(); these remain the static defaults.
export const STATS = DEFAULT_SETTINGS.stats;
export const COMPANY_INFO = DEFAULT_SETTINGS.company;

// Shape of the Payload `site-settings` global (only the fields we consume).
interface PayloadSiteSettings {
  company?: Partial<SiteSettings["company"]> | null;
  social?: Partial<SiteSettings["social"]> | null;
  hero?: Partial<SiteSettings["hero"]> | null;
  stats?: Array<Partial<Stat>> | null;
  seo?: {
    metaTitle?: string | null;
    metaDescription?: string | null;
    ogImage?: { url?: string | null } | number | null;
  } | null;
}

// Replace empty/missing values with the default, so partially-filled globals
// still render a complete page.
const orDefault = (
  value: string | null | undefined,
  fallback: string
): string => (value && value.trim() ? value : fallback);

export async function getSiteSettings(): Promise<SiteSettings> {
  const d = DEFAULT_SETTINGS;
  const s = await fetchJson<PayloadSiteSettings>(
    `${SERVER_CMS_URL}/api/globals/site-settings?depth=1`
  );
  if (!s) return d;

  const ogImage =
    s.seo?.ogImage && typeof s.seo.ogImage === "object"
      ? (s.seo.ogImage.url ?? "")
      : "";
  const stats = (s.stats ?? [])
    .filter((x): x is Stat => Boolean(x.value && x.label))
    .map((x) => ({
      value: x.value!,
      label: x.label!,
      color: x.color || "text-green-600",
    }));

  return {
    company: {
      name: orDefault(s.company?.name, d.company.name),
      shortName: orDefault(s.company?.shortName, d.company.shortName),
      founded: orDefault(s.company?.founded, d.company.founded),
      phone: orDefault(s.company?.phone, d.company.phone),
      email: orDefault(s.company?.email, d.company.email),
      address: orDefault(s.company?.address, d.company.address),
      branch: orDefault(s.company?.branch, d.company.branch),
      motto: orDefault(s.company?.motto, d.company.motto),
      certification: orDefault(
        s.company?.certification,
        d.company.certification
      ),
    },
    social: {
      facebook: orDefault(s.social?.facebook, d.social.facebook),
      zalo: orDefault(s.social?.zalo, d.social.zalo),
      messenger: orDefault(s.social?.messenger, d.social.messenger),
    },
    hero: {
      subheadline: orDefault(s.hero?.subheadline, d.hero.subheadline),
    },
    stats: stats.length ? stats : d.stats,
    seo: {
      metaTitle: orDefault(s.seo?.metaTitle, d.seo.metaTitle),
      metaDescription: orDefault(s.seo?.metaDescription, d.seo.metaDescription),
      ogImageUrl: ogImage || d.seo.ogImageUrl,
    },
  };
}
