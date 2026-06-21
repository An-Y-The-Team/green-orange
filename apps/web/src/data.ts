import { api } from "@yan/shared/api";

import { SectionId } from "./constants/section";
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

export interface SectionLink {
  label: string;
  sectionId: SectionId;
}

export type HeadlineColor = "white" | "emerald" | "orange";

export interface HeadlineSegment {
  text: string;
  color: HeadlineColor;
  italic: boolean;
  newLineBefore: boolean;
}

export interface CtaButton {
  label: string;
  href: string;
}

export type BrandValueIcon = "Wrench" | "ShieldCheck" | "Trees";
export type BrandValueAccent = "orange" | "slate" | "emerald";

export interface BrandValue {
  title: string;
  description: string;
  icon: BrandValueIcon;
  accent: BrandValueAccent;
}

export interface ProcessStep {
  num: string;
  title: string;
  description: string;
}

export interface SectionHeading {
  eyebrow: string;
  heading: string;
  description: string;
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
  branding: {
    logoTextPrimary: string;
    logoTextSecondary: string;
    headerTagline: string;
    footerTagline: string;
  };
  navigation: {
    items: SectionLink[];
    headerCtaLabel: string;
    mobileCtaLabel: string;
  };
  hero: {
    backgroundImageUrl: string;
    trustBadge: string;
    headlineSegments: HeadlineSegment[];
    subheadline: string;
    benefits: string[];
    primaryCta: CtaButton;
    secondaryCta: CtaButton;
    trustStrap: string;
  };
  stats: Stat[];
  introduction: {
    eyebrow: string;
    heading: string;
    narrative: string;
    imageUrl: string;
    mottoEyebrow: string;
    brandStoryHeading: string;
    brandStoryIntro: string;
    brandValues: BrandValue[];
    processEyebrow: string;
    processHeading: string;
    processIntro: string;
    processSteps: ProcessStep[];
  };
  servicesSection: SectionHeading;
  projectsSection: SectionHeading;
  testimonialsSection: SectionHeading;
  footer: {
    brandDescription: string;
    quickLinksHeading: string;
    quickLinks: SectionLink[];
    officesHeading: string;
    headquartersLabel: string;
    branchLabel: string;
    supportHeading: string;
    hotlinePrefix: string;
    emailPrefix: string;
    copyrightSuffix: string;
    backToTopLabel: string;
  };
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
  branding: {
    logoTextPrimary: "Green",
    logoTextSecondary: "Orange",
    headerTagline: "Thi Công & Vệ Sinh",
    footerTagline: "Xây dựng & Dọn sạch",
  },
  navigation: {
    items: [
      { label: "Giới Thiệu", sectionId: SectionId.INTRODUCTION },
      { label: "Dịch Vụ", sectionId: SectionId.SERVICES },
      { label: "Dự Án Đã Làm", sectionId: SectionId.PROJECTS },
      { label: "Đánh Giá", sectionId: SectionId.TESTIMONIALS },
      { label: "Liên Hệ", sectionId: SectionId.CONTACT },
    ],
    headerCtaLabel: "Đặt lịch khảo sát",
    mobileCtaLabel: "Yêu cầu khảo sát miễn phí",
  },
  hero: {
    backgroundImageUrl:
      "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?auto=format&fit=crop&w=1920&q=80",
    trustBadge: "Tiêu chuẩn quốc tế ISO 9001:2015 & chuẩn Eco-Safe",
    headlineSegments: [
      { text: "Thi Công", color: "white", italic: false, newLineBefore: false },
      { text: "Kiến Tạo", color: "orange", italic: true, newLineBefore: false },
      { text: "Cửa Hiệu", color: "white", italic: false, newLineBefore: false },
      {
        text: "Chuyên Nghiệp & Sạch Sẽ",
        color: "emerald",
        italic: false,
        newLineBefore: true,
      },
    ],
    subheadline:
      "Hợp tác toàn diện 2-trong-1 thiết kế, cải tạo trần vách, ánh sáng rọi, mặt dựng Alu cho chuỗi showroom toàn quốc. Kết hợp gói dọn dẹp vệ sinh sâu bóc bụi mịn sơn bả trước giờ cắt băng bàn giao, giúp bạn sở hữu cửa hiệu sang trọng, sạch bóng tươm tất nhanh chóng nhất.",
    benefits: [
      "Thi công chuẩn kỹ thuật, bảo hành 12 tháng",
      "Công nghệ màng lọc bụi mịn HEPA 3 lớp",
      "Khảo sát đo đạc hiện trạng trong ngày miễn phí",
      "Cam kết chất tẩy rửa hữu cơ sinh học Eco-Safe",
    ],
    primaryCta: { label: "Đặt lịch khảo sát ngay", href: "#contact" },
    secondaryCta: { label: "Tìm hiểu dịch vụ", href: "#services" },
    trustStrap:
      "✓ Cam kết đồng hành tin cậy • Khảo sát lập phương án & báo giá trong ngày miễn phí",
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
  introduction: {
    eyebrow: "Giới Thiệu Doanh Nghiệp",
    heading: "Về GreenOrange Services",
    narrative:
      "Được thành lập từ năm {founded}, **GreenOrange Services** tự hào là đơn vị tiên phong kết hợp hai dịch vụ cốt lõi: **Thi Công Cửa Hàng** sắc bén và **Vệ Sinh Công Nghiệp** chuẩn mực. Chúng tôi kiến tạo không gian kinh doanh đầy ấn tượng và bảo dưỡng sự khang trang đó vẹn nguyên theo thời gian.",
    imageUrl:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
    mottoEyebrow: "Phương châm làm nghề",
    brandStoryHeading: "Ý Nghĩa Sứ Mệnh Qua Sắc Màu Nhận Diện",
    brandStoryIntro:
      "Chúng tôi không chọn màu ngẫu nhiên. Bộ nhận diện **Màu Cam - Trắng - Xanh lá** đại diện cho lời cam kết toàn diện của chúng tôi về năng lực kỹ thuật và chất lượng vệ sinh bảo dưỡng:",
    brandValues: [
      {
        title: "Màu Cam: Thi Công Nhiệt Huyết",
        description:
          "Sáng tạo, tinh xảo trong từng đường điện, kệ tủ trưng bày và biển hiệu quảng cáo Alu nổi bật.",
        icon: "Wrench",
        accent: "orange",
      },
      {
        title: "Màu Trắng: Sạch Sẽ & Minh Bạch",
        description:
          "Cam kết không gian sạch bóng chuyên sâu, bàn giao đúng tiến độ và minh bạch trong báo giá.",
        icon: "ShieldCheck",
        accent: "slate",
      },
      {
        title: "Màu Xanh: Thân Thiện & An Toàn",
        description:
          "Dọn dẹp bằng hóa chất sinh học sinh thái Organic tuyệt đối an toàn cho nhân viên và quý khách.",
        icon: "Trees",
        accent: "emerald",
      },
    ],
    processEyebrow: "Khép kín & Hoàn hảo",
    processHeading: "Quy Trình 5 Bước Phục Vụ Chuyên Nghiệp",
    processIntro:
      "Tối ưu hóa thời gian mở showroom cho chủ đầu tư. Phối hợp nhịp nhàng giữa thi công hoàn thiện và dọn sạch tinh tươm.",
    processSteps: [
      {
        num: "01",
        title: "Khảo Sát & Đo Đạc Hiện Trạng",
        description:
          "Chuyên viên của chúng tôi sẽ đến trực tiếp mặt bằng thô hoặc shop cũ của bạn trong 2 giờ kể từ khi tiếp nhận để khảo sát diện tích, đặc thù kết cấu và đo đạt chính xác.",
      },
      {
        num: "02",
        title: "Lên Dự Toán & Bản Vẽ Khớp Thật",
        description:
          "Bóc tách chi tiết từng hạng mục: số lượng thạch cao, sàn nhựa, thiết bị điện, số lượng nhân công dọn dẹp và hóa chất cần dùng. Ký kết hợp đồng cam kết không phát sinh.",
      },
      {
        num: "03",
        title: "Thi Công Lắp Đặt Gấp Rút",
        description:
          "Tiến hành ốp Alu, dựng vách, sơn bả tường và đi dây nguồn điện rọi, điện trang trí. Hoạt động liên tục cả ca đêm nếu ban quản lý tòa nhà yêu cầu để kịp tiến độ.",
      },
      {
        num: "04",
        title: "Mài Sàn & Vệ Sinh Sâu Chi Tiết",
        description:
          "Triển khai máy đánh sàn công nghiệp, hút bụi mịn, bóc tẩy mọi silicone còn dính trên kính, lau chùi biển hiệu, tẩy mốc khử mùi sơn mới bám trần vách.",
      },
      {
        num: "05",
        title: "Nghiệm Thu Khắt Khe & Bàn Giao",
        description:
          "Tiến hành nghiệm thu từng chi tiết cùng chủ đầu tư theo checklist kỹ thuật chuẩn mực. Bàn giao chìa khóa để chủ shop yên tâm khai trương và hưởng bảo hành 12 tháng.",
      },
    ],
  },
  servicesSection: {
    eyebrow: "Danh Mục Giải Pháp",
    heading: "Dịch Vụ Thi Công & Vệ Sinh Chuyên Sâu",
    description:
      "Hợp tác toàn diện giúp tối ưu chi phí, rút ngắn thời gian vàng trước khai trương. Chọn một hoặc kết hợp trọn gói để tận hưởng chiết khấu ưu đãi dành riêng cho doanh nghiệp hội viên.",
  },
  projectsSection: {
    eyebrow: "Hồ Sơ Năng Lực Real",
    heading: "Dự Án Đã Bàn Giao Thành Công",
    description:
      "Chúng tôi tự hào đồng hành cùng các thương hiệu lớn tại Hà Nội và TP. Hồ Chí Minh trong sứ mệnh làm đẹp cửa hiệu kinh doanh và cam kết độ an toàn sạch bóng 100% trước khai trương.",
  },
  testimonialsSection: {
    eyebrow: "Ý Kiến Đối Tác",
    heading: "Đánh Giá Từ Khách Hàng Đã Trải Nghiệm",
    description:
      "Họ nói gì về năng lực thi công và cam kết sạch của chúng tôi? Sự hài lòng của các chủ thương hiệu là phần thưởng danh giá nhất.",
  },
  footer: {
    brandDescription:
      "Đơn vị trọn gói uy tín hàng đầu cung cấp dịch vụ cải tạo, lắp đặt ánh sáng nội thất và vệ sinh bàn giao cho chuỗi retail, văn phòng và các thương hiệu cao cấp tại Việt Nam.",
    quickLinksHeading: "Đường Dẫn Nhanh",
    quickLinks: [
      { label: "Về chúng tôi", sectionId: SectionId.INTRODUCTION },
      { label: "Giải pháp dịch vụ", sectionId: SectionId.SERVICES },
      { label: "Dự án tiêu biểu", sectionId: SectionId.PROJECTS },
      { label: "Phản hồi khách hàng", sectionId: SectionId.TESTIMONIALS },
      { label: "Yêu cầu khảo sát", sectionId: SectionId.CONTACT },
    ],
    officesHeading: "Hệ Thống Văn Phòng",
    headquartersLabel: "Trụ sở chính:",
    branchLabel: "Chi Nhánh TP. HCM:",
    supportHeading: "Hỗ Trợ Trực Tuyến",
    hotlinePrefix: "Hotline:",
    emailPrefix: "Email:",
    copyrightSuffix: "Tất cả các quyền được bảo lưu.",
    backToTopLabel: "Về đầu trang",
  },
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
interface PayloadSectionLink {
  label?: string | null;
  sectionId?: string | null;
}

// Uploaded media comes back as `{ url, ... }` at depth=1 or as an id number at
// depth=0. We always fetch at depth=1, so a string `url` is what we expect.
type PayloadMedia = { url?: string | null } | number | null | undefined;

interface PayloadHeadlineSegment {
  text?: string | null;
  color?: string | null;
  italic?: boolean | null;
  newLineBefore?: boolean | null;
}

interface PayloadBrandValue {
  title?: string | null;
  description?: string | null;
  icon?: string | null;
  accent?: string | null;
}

interface PayloadProcessStep {
  num?: string | null;
  title?: string | null;
  description?: string | null;
}

interface PayloadCta {
  label?: string | null;
  href?: string | null;
}

interface PayloadSiteSettings {
  company?: Partial<SiteSettings["company"]> | null;
  social?: Partial<SiteSettings["social"]> | null;
  branding?: Partial<SiteSettings["branding"]> | null;
  navigation?: {
    items?: PayloadSectionLink[] | null;
    headerCtaLabel?: string | null;
    mobileCtaLabel?: string | null;
  } | null;
  hero?: {
    backgroundImage?: PayloadMedia;
    trustBadge?: string | null;
    headlineSegments?: PayloadHeadlineSegment[] | null;
    subheadline?: string | null;
    benefits?: Array<{ item?: string | null }> | null;
    primaryCta?: PayloadCta | null;
    secondaryCta?: PayloadCta | null;
    trustStrap?: string | null;
  } | null;
  stats?: Array<Partial<Stat>> | null;
  introduction?: {
    eyebrow?: string | null;
    heading?: string | null;
    narrative?: string | null;
    image?: PayloadMedia;
    mottoEyebrow?: string | null;
    brandStoryHeading?: string | null;
    brandStoryIntro?: string | null;
    brandValues?: PayloadBrandValue[] | null;
    processEyebrow?: string | null;
    processHeading?: string | null;
    processIntro?: string | null;
    processSteps?: PayloadProcessStep[] | null;
  } | null;
  servicesSection?: {
    eyebrow?: string | null;
    heading?: string | null;
    description?: string | null;
  } | null;
  projectsSection?: {
    eyebrow?: string | null;
    heading?: string | null;
    description?: string | null;
  } | null;
  testimonialsSection?: {
    eyebrow?: string | null;
    heading?: string | null;
    description?: string | null;
  } | null;
  footer?: {
    brandDescription?: string | null;
    quickLinksHeading?: string | null;
    quickLinks?: PayloadSectionLink[] | null;
    officesHeading?: string | null;
    headquartersLabel?: string | null;
    branchLabel?: string | null;
    supportHeading?: string | null;
    hotlinePrefix?: string | null;
    emailPrefix?: string | null;
    copyrightSuffix?: string | null;
    backToTopLabel?: string | null;
  } | null;
  seo?: {
    metaTitle?: string | null;
    metaDescription?: string | null;
    ogImage?: { url?: string | null } | number | null;
  } | null;
}

// `SectionId` is a closed enum; the CMS select uses the same string values, so
// any value the CMS returns is either a valid SectionId or unknown. Drop links
// with an unknown id so we never render dead anchors.
const SECTION_IDS = new Set<string>(Object.values(SectionId));

// Whitelists for CMS enum strings → web TS unions. Anything outside the
// whitelist is treated as "missing" so the default applies, which keeps
// Tailwind classes referenced statically and the union types honest.
const HEADLINE_COLORS = new Set<string>(["white", "emerald", "orange"]);
const BRAND_ICONS = new Set<string>(["Wrench", "ShieldCheck", "Trees"]);
const BRAND_ACCENTS = new Set<string>(["orange", "slate", "emerald"]);

const resolveMediaUrl = (media: PayloadMedia, fallback: string): string => {
  if (media && typeof media === "object" && media.url) return media.url;
  return fallback;
};

const mapHeadlineSegments = (
  raw: PayloadHeadlineSegment[] | null | undefined,
  fallback: HeadlineSegment[]
): HeadlineSegment[] => {
  const mapped = (raw ?? [])
    .filter((s): s is { text: string; color: string } =>
      Boolean(s.text && s.color && HEADLINE_COLORS.has(s.color))
    )
    .map((s) => ({
      text: s.text,
      color: s.color as HeadlineColor,
      italic: Boolean((s as PayloadHeadlineSegment).italic),
      newLineBefore: Boolean((s as PayloadHeadlineSegment).newLineBefore),
    }));
  return mapped.length ? mapped : fallback;
};

const mapBenefits = (
  raw: Array<{ item?: string | null }> | null | undefined,
  fallback: string[]
): string[] => {
  const items = (raw ?? [])
    .map((b) => b.item?.trim() ?? "")
    .filter((s) => s.length > 0);
  return items.length ? items : fallback;
};

const mapBrandValues = (
  raw: PayloadBrandValue[] | null | undefined,
  fallback: BrandValue[]
): BrandValue[] => {
  const mapped = (raw ?? [])
    .filter(
      (
        v
      ): v is {
        title: string;
        description: string;
        icon: string;
        accent: string;
      } =>
        Boolean(
          v.title &&
          v.description &&
          v.icon &&
          BRAND_ICONS.has(v.icon) &&
          v.accent &&
          BRAND_ACCENTS.has(v.accent)
        )
    )
    .map((v) => ({
      title: v.title,
      description: v.description,
      icon: v.icon as BrandValueIcon,
      accent: v.accent as BrandValueAccent,
    }));
  return mapped.length ? mapped : fallback;
};

const mapProcessSteps = (
  raw: PayloadProcessStep[] | null | undefined,
  fallback: ProcessStep[]
): ProcessStep[] => {
  const mapped = (raw ?? [])
    .filter((s): s is { num: string; title: string; description: string } =>
      Boolean(s.num && s.title && s.description)
    )
    .map((s) => ({ num: s.num, title: s.title, description: s.description }));
  return mapped.length ? mapped : fallback;
};

const mapCta = (
  raw: PayloadCta | null | undefined,
  fallback: CtaButton
): CtaButton => ({
  label: orDefault(raw?.label, fallback.label),
  href: orDefault(raw?.href, fallback.href),
});
const mapSectionLinks = (
  raw: PayloadSectionLink[] | null | undefined,
  fallback: SectionLink[]
): SectionLink[] => {
  const mapped = (raw ?? [])
    .filter((l): l is { label: string; sectionId: string } =>
      Boolean(l.label && l.sectionId && SECTION_IDS.has(l.sectionId))
    )
    .map((l) => ({ label: l.label, sectionId: l.sectionId as SectionId }));
  return mapped.length ? mapped : fallback;
};

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

  const ogImage = resolveMediaUrl(s.seo?.ogImage, "");
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
    branding: {
      logoTextPrimary: orDefault(
        s.branding?.logoTextPrimary,
        d.branding.logoTextPrimary
      ),
      logoTextSecondary: orDefault(
        s.branding?.logoTextSecondary,
        d.branding.logoTextSecondary
      ),
      headerTagline: orDefault(
        s.branding?.headerTagline,
        d.branding.headerTagline
      ),
      footerTagline: orDefault(
        s.branding?.footerTagline,
        d.branding.footerTagline
      ),
    },
    navigation: {
      items: mapSectionLinks(s.navigation?.items, d.navigation.items),
      headerCtaLabel: orDefault(
        s.navigation?.headerCtaLabel,
        d.navigation.headerCtaLabel
      ),
      mobileCtaLabel: orDefault(
        s.navigation?.mobileCtaLabel,
        d.navigation.mobileCtaLabel
      ),
    },
    hero: {
      backgroundImageUrl: resolveMediaUrl(
        s.hero?.backgroundImage,
        d.hero.backgroundImageUrl
      ),
      trustBadge: orDefault(s.hero?.trustBadge, d.hero.trustBadge),
      headlineSegments: mapHeadlineSegments(
        s.hero?.headlineSegments,
        d.hero.headlineSegments
      ),
      subheadline: orDefault(s.hero?.subheadline, d.hero.subheadline),
      benefits: mapBenefits(s.hero?.benefits, d.hero.benefits),
      primaryCta: mapCta(s.hero?.primaryCta, d.hero.primaryCta),
      secondaryCta: mapCta(s.hero?.secondaryCta, d.hero.secondaryCta),
      trustStrap: orDefault(s.hero?.trustStrap, d.hero.trustStrap),
    },
    stats: stats.length ? stats : d.stats,
    introduction: {
      eyebrow: orDefault(s.introduction?.eyebrow, d.introduction.eyebrow),
      heading: orDefault(s.introduction?.heading, d.introduction.heading),
      narrative: orDefault(s.introduction?.narrative, d.introduction.narrative),
      imageUrl: resolveMediaUrl(s.introduction?.image, d.introduction.imageUrl),
      mottoEyebrow: orDefault(
        s.introduction?.mottoEyebrow,
        d.introduction.mottoEyebrow
      ),
      brandStoryHeading: orDefault(
        s.introduction?.brandStoryHeading,
        d.introduction.brandStoryHeading
      ),
      brandStoryIntro: orDefault(
        s.introduction?.brandStoryIntro,
        d.introduction.brandStoryIntro
      ),
      brandValues: mapBrandValues(
        s.introduction?.brandValues,
        d.introduction.brandValues
      ),
      processEyebrow: orDefault(
        s.introduction?.processEyebrow,
        d.introduction.processEyebrow
      ),
      processHeading: orDefault(
        s.introduction?.processHeading,
        d.introduction.processHeading
      ),
      processIntro: orDefault(
        s.introduction?.processIntro,
        d.introduction.processIntro
      ),
      processSteps: mapProcessSteps(
        s.introduction?.processSteps,
        d.introduction.processSteps
      ),
    },
    servicesSection: {
      eyebrow: orDefault(s.servicesSection?.eyebrow, d.servicesSection.eyebrow),
      heading: orDefault(s.servicesSection?.heading, d.servicesSection.heading),
      description: orDefault(
        s.servicesSection?.description,
        d.servicesSection.description
      ),
    },
    projectsSection: {
      eyebrow: orDefault(s.projectsSection?.eyebrow, d.projectsSection.eyebrow),
      heading: orDefault(s.projectsSection?.heading, d.projectsSection.heading),
      description: orDefault(
        s.projectsSection?.description,
        d.projectsSection.description
      ),
    },
    testimonialsSection: {
      eyebrow: orDefault(
        s.testimonialsSection?.eyebrow,
        d.testimonialsSection.eyebrow
      ),
      heading: orDefault(
        s.testimonialsSection?.heading,
        d.testimonialsSection.heading
      ),
      description: orDefault(
        s.testimonialsSection?.description,
        d.testimonialsSection.description
      ),
    },
    footer: {
      brandDescription: orDefault(
        s.footer?.brandDescription,
        d.footer.brandDescription
      ),
      quickLinksHeading: orDefault(
        s.footer?.quickLinksHeading,
        d.footer.quickLinksHeading
      ),
      quickLinks: mapSectionLinks(s.footer?.quickLinks, d.footer.quickLinks),
      officesHeading: orDefault(
        s.footer?.officesHeading,
        d.footer.officesHeading
      ),
      headquartersLabel: orDefault(
        s.footer?.headquartersLabel,
        d.footer.headquartersLabel
      ),
      branchLabel: orDefault(s.footer?.branchLabel, d.footer.branchLabel),
      supportHeading: orDefault(
        s.footer?.supportHeading,
        d.footer.supportHeading
      ),
      hotlinePrefix: orDefault(s.footer?.hotlinePrefix, d.footer.hotlinePrefix),
      emailPrefix: orDefault(s.footer?.emailPrefix, d.footer.emailPrefix),
      copyrightSuffix: orDefault(
        s.footer?.copyrightSuffix,
        d.footer.copyrightSuffix
      ),
      backToTopLabel: orDefault(
        s.footer?.backToTopLabel,
        d.footer.backToTopLabel
      ),
    },
    seo: {
      metaTitle: orDefault(s.seo?.metaTitle, d.seo.metaTitle),
      metaDescription: orDefault(s.seo?.metaDescription, d.seo.metaDescription),
      ogImageUrl: ogImage || d.seo.ogImageUrl,
    },
  };
}
