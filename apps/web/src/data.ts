import { ContentStatus } from "@/constants/cms";
import { assetUrl } from "@/lib/asset-url/asset-url";
import { COLOR_THEME_SLUGS, type ColorThemeSlug } from "@/lib/color-themes";
import {
  type DirectusBrandValue,
  type DirectusHeroSegment,
  type DirectusLegalSection,
  type DirectusLegalTerms,
  type DirectusProcessStep,
  type DirectusProject,
  type DirectusSectionLink,
  type DirectusService,
  type DirectusSiteSettings,
  type DirectusStat,
  type DirectusTestimonial,
  directusClient,
  readItems,
  readSingleton,
} from "@/lib/directus";

import { SectionId } from "./constants/section";
import { Project, Service, Testimonial } from "./types";

// Public origins live in their own SDK-free module so client components can
// import them without pulling the Directus SDK into the client bundle.
export { CMS_URL, SITE_URL } from "@/lib/cms-url";

// Live (non-preview) reads filter to published; the Directus free tier can't
// enforce this at the permission layer, so we do it at query time. Preview/draft
// mode drops the filter so editors see drafts in the iframe.
const publishedFilter = (draft: boolean) =>
  draft ? {} : { status: { _eq: ContentStatus.PUBLISHED } };

function mapService(d: DirectusService): Service {
  return {
    id: d.slug,
    cmsId: d.id,
    title: d.title,
    description: d.description,
    category: d.category as Service["category"],
    duration: d.duration,
    benefits: d.benefits ?? [],
    features: d.features ?? [],
    iconName: d.icon_name,
    popular: d.popular ?? undefined,
  };
}

function mapProject(d: DirectusProject): Project {
  return {
    id: d.slug,
    cmsId: d.id,
    title: d.title,
    client: d.client,
    category: d.category as Project["category"],
    location: d.location,
    area: d.area,
    completionTime: d.completion_time,
    description: d.description,
    achievement: d.achievement,
    imageUrl: assetUrl({ fileId: d.image }) ?? "",
    tags: d.tags ?? [],
    // Treat the flattened testimonial as real only when an author is present.
    testimonial: d.testimonial_author
      ? {
          author: d.testimonial_author,
          role: d.testimonial_role ?? "",
          content: d.testimonial_content ?? "",
          avatarUrl: assetUrl({ fileId: d.testimonial_avatar }) ?? undefined,
          rating: d.testimonial_rating ?? 0,
        }
      : undefined,
  };
}

function mapTestimonial(d: DirectusTestimonial): Testimonial {
  return {
    id: d.slug,
    cmsId: d.id,
    author: d.author,
    role: d.role,
    company: d.company,
    content: d.content,
    rating: d.rating,
    avatarUrl: assetUrl({ fileId: d.avatar }) ?? "",
    category: d.category as Testimonial["category"],
  };
}

// Server-side data getters consumed by the page (Server Component) and passed
// down to the interactive client sections as props. Each degrades to [] on any
// failure so a CMS hiccup never crashes the render.
export async function getServices(draft = false): Promise<Service[]> {
  try {
    const docs = await directusClient(draft).request(
      readItems("services", {
        filter: publishedFilter(draft),
        sort: ["sort"],
        limit: -1,
        fields: ["*"],
      })
    );
    return docs.map(mapService);
  } catch (err) {
    console.error("CMS fetch error for services:", err);
    return [];
  }
}

export async function getProjects(draft = false): Promise<Project[]> {
  try {
    const docs = await directusClient(draft).request(
      readItems("projects", {
        filter: publishedFilter(draft),
        sort: ["sort"],
        limit: -1,
        fields: ["*"],
      })
    );
    return docs.map(mapProject);
  } catch (err) {
    console.error("CMS fetch error for projects:", err);
    return [];
  }
}

export async function getTestimonials(draft = false): Promise<Testimonial[]> {
  try {
    const docs = await directusClient(draft).request(
      readItems("testimonials", {
        filter: publishedFilter(draft),
        sort: ["sort"],
        limit: -1,
        fields: ["*"],
      })
    );
    return docs.map(mapTestimonial);
  } catch (err) {
    console.error("CMS fetch error for testimonials:", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Site-wide settings: company info, headline stats, hero copy, SEO defaults.
// Editable from the Directus `site_settings` singleton; the hardcoded values
// below are the fallback used if it is empty or the CMS is unreachable, so
// the page never renders blank (same "degrade, don't crash" approach as above).
// ---------------------------------------------------------------------------

export interface Stat {
  id?: number;
  value: string;
  label: string;
  color: string;
}

export interface SectionLink {
  id?: number;
  label: string;
  sectionId: SectionId;
}

export type FontSlug =
  | "barlow-condensed"
  | "be-vietnam-pro"
  | "inter"
  | "lexend"
  | "nunito-sans"
  | "manrope"
  | "playfair-display"
  | "lora"
  | "dm-serif-display";

export interface TypographySettings {
  headingFont: FontSlug;
  heroDisplayFont: FontSlug;
  bodyFont: FontSlug;
}

export interface ColorThemeSettings {
  theme: ColorThemeSlug;
}

export type HeadlineColor = "white" | "emerald" | "orange";

export interface HeadlineSegment {
  id?: number;
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
  id?: number;
  title: string;
  description: string;
  icon: BrandValueIcon;
  accent: BrandValueAccent;
}

export interface ProcessStep {
  id?: number;
  num: string;
  title: string;
  description: string;
}

export interface SectionHeading {
  eyebrow: string;
  heading: string;
  description: string;
}

export interface ContactSectionContent extends SectionHeading {
  successHeading: string;
  successBody: string;
  ctaLabel: string;
  labelFullName: string;
  labelPhone: string;
  labelEmail: string;
  labelCompany: string;
  labelAddress: string;
  labelServiceGroup: string;
  labelServiceSelect: string;
  labelMessage: string;
}

export interface SiteSettings {
  /** Directus singleton id — used by the Visual Editor (setAttr `item`). */
  cmsId?: number;
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
  typography: TypographySettings;
  colorTheme: ColorThemeSettings;
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
  contactSection: ContactSectionContent;
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
    headerTagline: "Thi công & vệ sinh",
    footerTagline: "Xây dựng & dọn sạch",
  },
  typography: {
    headingFont: "barlow-condensed",
    heroDisplayFont: "barlow-condensed",
    bodyFont: "be-vietnam-pro",
  },
  colorTheme: {
    theme: "green-orange",
  },
  navigation: {
    items: [
      { label: "Giới thiệu", sectionId: SectionId.INTRODUCTION },
      { label: "Dịch vụ", sectionId: SectionId.SERVICES },
      { label: "Dự án đã làm", sectionId: SectionId.PROJECTS },
      { label: "Đánh giá", sectionId: SectionId.TESTIMONIALS },
      { label: "Liên hệ", sectionId: SectionId.CONTACT },
    ],
    headerCtaLabel: "Đặt lịch khảo sát",
    mobileCtaLabel: "Yêu cầu khảo sát miễn phí",
  },
  hero: {
    // Empty on purpose: without a real job-site photo from the CMS, the hero
    // panel shows only the checklist (no stock photo).
    backgroundImageUrl: "",
    trustBadge: "Quản lý chất lượng theo chuẩn ISO 9001:2015",
    headlineSegments: [
      {
        text: "Dựng xong là sạch,",
        color: "white",
        italic: false,
        newLineBefore: false,
      },
      {
        text: "sạch xong là mở cửa.",
        color: "orange",
        italic: false,
        newLineBefore: true,
      },
    ],
    subheadline:
      "Anh/chị chỉ cần gọi, GreenOrange lo trọn từ thi công, lắp biển hiệu đến dọn dẹp sạch sẽ trước ngày khai trương.",
    benefits: [
      "Khảo sát và báo giá trong ngày, không mất phí",
      "Báo giá rõ từng hạng mục, đã ký là không phát sinh",
      "Thi công chuẩn kỹ thuật, bảo hành 12 tháng",
      "Hoá chất an toàn cho nhân viên và khách",
    ],
    primaryCta: { label: "Đặt lịch khảo sát miễn phí", href: "#contact" },
    secondaryCta: { label: "Xem dịch vụ", href: "#services" },
    trustStrap: "Hà Nội · TP. Hồ Chí Minh · Nhận công trình toàn quốc",
  },
  stats: [
    {
      value: "500+",
      label: "Cửa hàng & văn phòng đã bàn giao",
      color: "text-brand-primary-600",
    },
    {
      value: "120+",
      label: "Công trình cải tạo trọn gói",
      color: "text-brand-secondary-600",
    },
    {
      value: "99.4%",
      label: "Khách hàng đánh giá 5★",
      color: "text-brand-primary-600",
    },
    {
      value: "35+",
      label: "Trang thiết bị & hoá chất đạt chuẩn",
      color: "text-brand-secondary-600",
    },
  ],
  introduction: {
    eyebrow: "Về chúng mình",
    heading: "Một đội lo cả dựng lẫn dọn",
    narrative:
      "Từ năm {founded}, GreenOrange làm hai việc cho các cửa hàng: thi công cải tạo và vệ sinh công nghiệp. Cùng một đội lo từ lúc dựng vách đến lúc lau sạch kính, nên anh/chị không phải tìm thêm bên dọn dẹp và cửa hàng luôn kịp ngày khai trương.",
    imageUrl:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
    mottoEyebrow: "Phương châm làm nghề",
    brandStoryHeading: "Ba màu, ba lời hứa",
    brandStoryIntro:
      "Cam, trắng và xanh lá không chỉ là màu logo. Mỗi màu là một điều chúng mình hứa với anh/chị:",
    brandValues: [
      {
        title: "Cam · Làm kỹ, làm nhiệt tình",
        description:
          "Chăm chút từng đường điện, kệ tủ trưng bày và biển hiệu Alu.",
        icon: "Wrench",
        accent: "orange",
      },
      {
        title: "Trắng · Sạch và minh bạch",
        description: "Bàn giao sạch bóng, đúng hẹn, báo giá rõ ràng từ đầu.",
        icon: "ShieldCheck",
        accent: "slate",
      },
      {
        title: "Xanh lá · An toàn",
        description:
          "Dùng hoá chất sinh học, an toàn cho nhân viên và khách của anh/chị.",
        icon: "Trees",
        accent: "emerald",
      },
    ],
    processEyebrow: "Quy trình",
    processHeading: "5 bước, anh/chị không phải lo",
    processIntro:
      "Thi công và dọn dẹp nối tiếp nhau, mặt bằng không phải chờ, cửa hàng mở đúng ngày.",
    processSteps: [
      {
        num: "01",
        title: "Khảo sát miễn phí",
        description:
          "Có mặt trong 2 giờ sau khi anh/chị gọi, đo đạc tận nơi và xem kỹ hiện trạng mặt bằng.",
      },
      {
        num: "02",
        title: "Báo giá rõ ràng",
        description:
          "Bóc tách từng hạng mục: vật tư, thiết bị điện, nhân công, hoá chất. Đã ký hợp đồng là không phát sinh.",
      },
      {
        num: "03",
        title: "Thi công đúng hẹn",
        description:
          "Ốp Alu, dựng vách, sơn bả, đi điện chiếu sáng. Làm cả ca đêm nếu tòa nhà yêu cầu.",
      },
      {
        num: "04",
        title: "Vệ sinh thật kỹ",
        description:
          "Mài sàn, hút bụi mịn, tẩy silicone trên kính, lau biển hiệu và khử mùi sơn mới.",
      },
      {
        num: "05",
        title: "Nghiệm thu, bàn giao",
        description:
          "Kiểm tra từng chi tiết cùng anh/chị theo checklist, giao chìa khoá và bảo hành 12 tháng.",
      },
    ],
  },
  servicesSection: {
    eyebrow: "Dịch vụ",
    heading: "Chúng mình làm gì cho anh/chị",
    description:
      "Chọn riêng thi công, riêng vệ sinh, hoặc gộp trọn gói để tiết kiệm hơn và chỉ làm việc với một đầu mối.",
  },
  projectsSection: {
    eyebrow: "Công trình đã làm",
    heading: "Cửa hàng đã bàn giao",
    description:
      "Một số showroom, quán cà phê và cửa hàng chúng mình đã thi công và dọn sạch ở Hà Nội và TP. Hồ Chí Minh.",
  },
  testimonialsSection: {
    eyebrow: "Khách hàng nói gì",
    heading: "Chủ cửa hàng kể lại",
    description: "Ý kiến từ các chủ cửa hàng đã làm việc cùng GreenOrange.",
  },
  contactSection: {
    eyebrow: "Liên hệ",
    heading: "Đặt lịch khảo sát miễn phí",
    description:
      "Để lại tên và số điện thoại, chúng mình gọi lại và báo giá trong ngày. Thông tin của anh/chị chỉ dùng để liên hệ.",
    successHeading: "Đã nhận yêu cầu của anh/chị",
    successBody:
      "Chúng mình sẽ gọi lại cho anh/chị trong vòng 15 phút để hẹn lịch khảo sát.",
    ctaLabel: "Gửi yêu cầu khảo sát",
    labelFullName: "Họ và tên",
    labelPhone: "Số điện thoại",
    labelEmail: "Email",
    labelCompany: "Tên cửa hàng / thương hiệu",
    labelAddress: "Địa chỉ mặt bằng cần khảo sát",
    labelServiceGroup: "Anh/chị cần làm gì?",
    labelServiceSelect: "Gói dịch vụ",
    labelMessage: "Mô tả thêm (diện tích, hiện trạng, ngày muốn bàn giao)",
  },
  footer: {
    brandDescription:
      "Thi công, cải tạo và vệ sinh cửa hàng trọn gói cho chuỗi bán lẻ, showroom và văn phòng trên toàn quốc.",
    quickLinksHeading: "Xem nhanh",
    quickLinks: [
      { label: "Về chúng tôi", sectionId: SectionId.INTRODUCTION },
      { label: "Giải pháp dịch vụ", sectionId: SectionId.SERVICES },
      { label: "Dự án tiêu biểu", sectionId: SectionId.PROJECTS },
      { label: "Phản hồi khách hàng", sectionId: SectionId.TESTIMONIALS },
      { label: "Yêu cầu khảo sát", sectionId: SectionId.CONTACT },
    ],
    officesHeading: "Văn phòng",
    headquartersLabel: "Trụ sở chính:",
    branchLabel: "Chi nhánh TP. HCM:",
    supportHeading: "Liên hệ",
    hotlinePrefix: "Hotline:",
    emailPrefix: "Email:",
    copyrightSuffix: "Tất cả các quyền được bảo lưu.",
    backToTopLabel: "Về đầu trang",
  },
  seo: {
    metaTitle: "GreenOrange – Thi công, cải tạo & vệ sinh cửa hàng",
    metaDescription:
      "Thi công, cải tạo và vệ sinh cửa hàng trọn gói. Khảo sát và báo giá trong ngày, miễn phí. Hà Nội, TP. Hồ Chí Minh và toàn quốc.",
    ogImageUrl: "",
  },
};

// Back-compat aliases for existing imports. New code should prefer the
// `SiteSettings` fetched via getSiteSettings(); these remain the static defaults.
export const STATS = DEFAULT_SETTINGS.stats;
export const COMPANY_INFO = DEFAULT_SETTINGS.company;

// `SectionId` is a closed enum; drop links whose id isn't a known section so we
// never render dead anchors. The other whitelists keep the union types honest
// and Tailwind classes referenced statically.
const SECTION_IDS = new Set<string>(Object.values(SectionId));
const HEADLINE_COLORS = new Set<string>(["white", "emerald", "orange"]);
const BRAND_ICONS = new Set<string>(["Wrench", "ShieldCheck", "Trees"]);
const BRAND_ACCENTS = new Set<string>(["orange", "slate", "emerald"]);

const FONT_SLUGS = new Set<string>([
  "barlow-condensed",
  "be-vietnam-pro",
  "inter",
  "lexend",
  "nunito-sans",
  "manrope",
  "playfair-display",
  "lora",
  "dm-serif-display",
]);

const pickFont = (
  raw: string | null | undefined,
  fallback: FontSlug
): FontSlug => (raw && FONT_SLUGS.has(raw) ? (raw as FontSlug) : fallback);

const pickColorTheme = (
  raw: string | null | undefined,
  fallback: ColorThemeSlug
): ColorThemeSlug =>
  raw && COLOR_THEME_SLUGS.has(raw) ? (raw as ColorThemeSlug) : fallback;

// Replace empty/missing values with the default, so a partially-filled
// singleton still renders a complete page.
const orDefault = (
  value: string | null | undefined,
  fallback: string
): string => (value && value.trim() ? value : fallback);

const mapSectionLinks = (
  raw: DirectusSectionLink[] | null | undefined,
  fallback: SectionLink[]
): SectionLink[] => {
  const mapped = (raw ?? [])
    .filter(
      (l): l is DirectusSectionLink & { label: string; section_id: string } =>
        Boolean(l.label && l.section_id && SECTION_IDS.has(l.section_id))
    )
    .map((l) => ({
      id: l.id,
      label: l.label,
      sectionId: l.section_id as SectionId,
    }));
  return mapped.length ? mapped : fallback;
};

const mapHeadlineSegments = (
  raw: DirectusHeroSegment[] | null | undefined,
  fallback: HeadlineSegment[]
): HeadlineSegment[] => {
  const mapped = (raw ?? [])
    .filter((s): s is DirectusHeroSegment & { text: string; color: string } =>
      Boolean(s.text && s.color && HEADLINE_COLORS.has(s.color))
    )
    .map((s) => ({
      id: s.id,
      text: s.text,
      color: s.color as HeadlineColor,
      italic: Boolean(s.italic),
      newLineBefore: Boolean(s.new_line_before),
    }));
  return mapped.length ? mapped : fallback;
};

const mapStats = (
  raw: DirectusStat[] | null | undefined,
  fallback: Stat[]
): Stat[] => {
  const mapped = (raw ?? [])
    .filter((x): x is DirectusStat & { value: string; label: string } =>
      Boolean(x.value && x.label)
    )
    .map((x) => ({
      id: x.id,
      value: x.value,
      label: x.label,
      color: x.color || "text-brand-primary-600",
    }));
  return mapped.length ? mapped : fallback;
};

const mapBrandValues = (
  raw: DirectusBrandValue[] | null | undefined,
  fallback: BrandValue[]
): BrandValue[] => {
  const mapped = (raw ?? [])
    .filter(
      (
        v
      ): v is DirectusBrandValue & {
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
      id: v.id,
      title: v.title,
      description: v.description,
      icon: v.icon as BrandValueIcon,
      accent: v.accent as BrandValueAccent,
    }));
  return mapped.length ? mapped : fallback;
};

const mapProcessSteps = (
  raw: DirectusProcessStep[] | null | undefined,
  fallback: ProcessStep[]
): ProcessStep[] => {
  const mapped = (raw ?? [])
    .filter(
      (
        s
      ): s is DirectusProcessStep & {
        num: string;
        title: string;
        description: string;
      } => Boolean(s.num && s.title && s.description)
    )
    .map((s) => ({
      id: s.id,
      num: s.num,
      title: s.title,
      description: s.description,
    }));
  return mapped.length ? mapped : fallback;
};

export async function getSiteSettings(draft = false): Promise<SiteSettings> {
  const d = DEFAULT_SETTINGS;
  let s: DirectusSiteSettings | null = null;
  try {
    s = await directusClient(draft).request(
      readSingleton("site_settings", {
        fields: [
          "*",
          { nav_items: ["*"] },
          { footer_quick_links: ["*"] },
          { hero_headline_segments: ["*"] },
          { stats: ["*"] },
          { brand_values: ["*"] },
          { process_steps: ["*"] },
        ],
      })
    );
  } catch (err) {
    console.error("CMS fetch error for site-settings:", err);
    return d;
  }
  if (!s) return d;

  const heroBenefits = s.hero_benefits ?? [];

  return {
    cmsId: s.id,
    company: {
      name: orDefault(s.company_name, d.company.name),
      shortName: orDefault(s.company_short_name, d.company.shortName),
      founded: orDefault(s.company_founded, d.company.founded),
      phone: orDefault(s.company_phone, d.company.phone),
      email: orDefault(s.company_email, d.company.email),
      address: orDefault(s.company_address, d.company.address),
      branch: orDefault(s.company_branch, d.company.branch),
      motto: orDefault(s.company_motto, d.company.motto),
      certification: orDefault(
        s.company_certification,
        d.company.certification
      ),
    },
    social: {
      facebook: orDefault(s.social_facebook, d.social.facebook),
      zalo: orDefault(s.social_zalo, d.social.zalo),
      messenger: orDefault(s.social_messenger, d.social.messenger),
    },
    branding: {
      logoTextPrimary: orDefault(
        s.branding_logo_text_primary,
        d.branding.logoTextPrimary
      ),
      logoTextSecondary: orDefault(
        s.branding_logo_text_secondary,
        d.branding.logoTextSecondary
      ),
      headerTagline: orDefault(
        s.branding_header_tagline,
        d.branding.headerTagline
      ),
      footerTagline: orDefault(
        s.branding_footer_tagline,
        d.branding.footerTagline
      ),
    },
    typography: {
      headingFont: pickFont(
        s.typography_heading_font,
        d.typography.headingFont
      ),
      heroDisplayFont: pickFont(
        s.typography_hero_display_font,
        d.typography.heroDisplayFont
      ),
      bodyFont: pickFont(s.typography_body_font, d.typography.bodyFont),
    },
    colorTheme: {
      theme: pickColorTheme(s.color_theme, d.colorTheme.theme),
    },
    navigation: {
      items: mapSectionLinks(s.nav_items, d.navigation.items),
      headerCtaLabel: orDefault(
        s.navigation_header_cta_label,
        d.navigation.headerCtaLabel
      ),
      mobileCtaLabel: orDefault(
        s.navigation_mobile_cta_label,
        d.navigation.mobileCtaLabel
      ),
    },
    hero: {
      backgroundImageUrl:
        assetUrl({ fileId: s.hero_background_image }) ??
        d.hero.backgroundImageUrl,
      trustBadge: orDefault(s.hero_trust_badge, d.hero.trustBadge),
      headlineSegments: mapHeadlineSegments(
        s.hero_headline_segments,
        d.hero.headlineSegments
      ),
      subheadline: orDefault(s.hero_subheadline, d.hero.subheadline),
      benefits: heroBenefits.length ? heroBenefits : d.hero.benefits,
      primaryCta: {
        label: orDefault(s.hero_primary_cta_label, d.hero.primaryCta.label),
        href: orDefault(s.hero_primary_cta_href, d.hero.primaryCta.href),
      },
      secondaryCta: {
        label: orDefault(s.hero_secondary_cta_label, d.hero.secondaryCta.label),
        href: orDefault(s.hero_secondary_cta_href, d.hero.secondaryCta.href),
      },
      trustStrap: orDefault(s.hero_trust_strap, d.hero.trustStrap),
    },
    stats: mapStats(s.stats, d.stats),
    introduction: {
      eyebrow: orDefault(s.introduction_eyebrow, d.introduction.eyebrow),
      heading: orDefault(s.introduction_heading, d.introduction.heading),
      narrative: orDefault(s.introduction_narrative, d.introduction.narrative),
      imageUrl:
        assetUrl({ fileId: s.introduction_image }) ?? d.introduction.imageUrl,
      mottoEyebrow: orDefault(
        s.introduction_motto_eyebrow,
        d.introduction.mottoEyebrow
      ),
      brandStoryHeading: orDefault(
        s.introduction_brand_story_heading,
        d.introduction.brandStoryHeading
      ),
      brandStoryIntro: orDefault(
        s.introduction_brand_story_intro,
        d.introduction.brandStoryIntro
      ),
      brandValues: mapBrandValues(s.brand_values, d.introduction.brandValues),
      processEyebrow: orDefault(
        s.introduction_process_eyebrow,
        d.introduction.processEyebrow
      ),
      processHeading: orDefault(
        s.introduction_process_heading,
        d.introduction.processHeading
      ),
      processIntro: orDefault(
        s.introduction_process_intro,
        d.introduction.processIntro
      ),
      processSteps: mapProcessSteps(
        s.process_steps,
        d.introduction.processSteps
      ),
    },
    servicesSection: {
      eyebrow: orDefault(s.services_section_eyebrow, d.servicesSection.eyebrow),
      heading: orDefault(s.services_section_heading, d.servicesSection.heading),
      description: orDefault(
        s.services_section_description,
        d.servicesSection.description
      ),
    },
    projectsSection: {
      eyebrow: orDefault(s.projects_section_eyebrow, d.projectsSection.eyebrow),
      heading: orDefault(s.projects_section_heading, d.projectsSection.heading),
      description: orDefault(
        s.projects_section_description,
        d.projectsSection.description
      ),
    },
    testimonialsSection: {
      eyebrow: orDefault(
        s.testimonials_section_eyebrow,
        d.testimonialsSection.eyebrow
      ),
      heading: orDefault(
        s.testimonials_section_heading,
        d.testimonialsSection.heading
      ),
      description: orDefault(
        s.testimonials_section_description,
        d.testimonialsSection.description
      ),
    },
    contactSection: {
      eyebrow: orDefault(s.contact_section_eyebrow, d.contactSection.eyebrow),
      heading: orDefault(s.contact_section_heading, d.contactSection.heading),
      description: orDefault(
        s.contact_section_description,
        d.contactSection.description
      ),
      successHeading: orDefault(
        s.contact_section_success_heading,
        d.contactSection.successHeading
      ),
      successBody: orDefault(
        s.contact_section_success_body,
        d.contactSection.successBody
      ),
      ctaLabel: orDefault(
        s.contact_section_cta_label,
        d.contactSection.ctaLabel
      ),
      labelFullName: orDefault(
        s.contact_form_label_full_name,
        d.contactSection.labelFullName
      ),
      labelPhone: orDefault(
        s.contact_form_label_phone,
        d.contactSection.labelPhone
      ),
      labelEmail: orDefault(
        s.contact_form_label_email,
        d.contactSection.labelEmail
      ),
      labelCompany: orDefault(
        s.contact_form_label_company,
        d.contactSection.labelCompany
      ),
      labelAddress: orDefault(
        s.contact_form_label_address,
        d.contactSection.labelAddress
      ),
      labelServiceGroup: orDefault(
        s.contact_form_label_service_group,
        d.contactSection.labelServiceGroup
      ),
      labelServiceSelect: orDefault(
        s.contact_form_label_service_select,
        d.contactSection.labelServiceSelect
      ),
      labelMessage: orDefault(
        s.contact_form_label_message,
        d.contactSection.labelMessage
      ),
    },
    footer: {
      brandDescription: orDefault(
        s.footer_brand_description,
        d.footer.brandDescription
      ),
      quickLinksHeading: orDefault(
        s.footer_quick_links_heading,
        d.footer.quickLinksHeading
      ),
      quickLinks: mapSectionLinks(s.footer_quick_links, d.footer.quickLinks),
      officesHeading: orDefault(
        s.footer_offices_heading,
        d.footer.officesHeading
      ),
      headquartersLabel: orDefault(
        s.footer_headquarters_label,
        d.footer.headquartersLabel
      ),
      branchLabel: orDefault(s.footer_branch_label, d.footer.branchLabel),
      supportHeading: orDefault(
        s.footer_support_heading,
        d.footer.supportHeading
      ),
      hotlinePrefix: orDefault(s.footer_hotline_prefix, d.footer.hotlinePrefix),
      emailPrefix: orDefault(s.footer_email_prefix, d.footer.emailPrefix),
      copyrightSuffix: orDefault(
        s.footer_copyright_suffix,
        d.footer.copyrightSuffix
      ),
      backToTopLabel: orDefault(
        s.footer_back_to_top_label,
        d.footer.backToTopLabel
      ),
    },
    seo: {
      metaTitle: orDefault(s.seo_meta_title, d.seo.metaTitle),
      metaDescription: orDefault(s.seo_meta_description, d.seo.metaDescription),
      ogImageUrl: assetUrl({ fileId: s.seo_og_image }) ?? d.seo.ogImageUrl,
    },
  };
}

// ---------------------------------------------------------------------------
// Legal terms: the Zalo mini app's terms-of-use page (/dieu-khoan-su-dung).
// Its own singleton rather than part of site_settings — those are marketing
// copy for the landing page, while this names the registered legal entity that
// Zalo's app review checks. Same "degrade, don't crash" fallback as above, and
// here it matters more than anywhere else on the site: the reviewer must be
// able to open this page even if the CMS is down, or the submission fails.
// ---------------------------------------------------------------------------
export interface LegalSection {
  id?: number;
  heading: string;
  body: string;
}

export interface LegalTerms {
  /** Directus singleton id — used by the Visual Editor (setAttr `item`). */
  cmsId?: number;
  pageTitle: string;
  pageSubtitle: string;
  operator: {
    name: string;
    taxCode: string;
    address: string;
    email: string;
    phone: string;
    updatedAt: string;
  };
  sections: LegalSection[];
}

export const DEFAULT_LEGAL_TERMS: LegalTerms = {
  pageTitle: "Điều khoản sử dụng",
  pageSubtitle: "Mini App “Chấm công Ý Ân”",
  operator: {
    name: "CÔNG TY TNHH THƯƠNG MẠI DỊCH VỤ Ý ÂN",
    taxCode: "0319016318",
    address:
      "256/41 Nguyễn Tiểu La, Phường Diên Hồng, TP Hồ Chí Minh, Việt Nam",
    email: "ctydv.yan@gmail.com",
    phone: "0975460430",
    updatedAt: "06/10/2026",
  },
  sections: [
    {
      heading: "Mini App này dùng để làm gì",
      body: `“Chấm công Ý Ân” là ứng dụng **nội bộ** của công ty. Nhân sự đã được công ty đăng ký dùng ứng dụng để chấm công vào/ra tại công trình mình được phân công. Giờ công sau đó được văn phòng duyệt trên hệ thống quản lý của công ty.

Ứng dụng **không dành cho người dùng Zalo nói chung**. Người không có trong danh sách nhân sự của công ty sẽ không đăng nhập được.`,
    },
    {
      heading: "Quyền mà Mini App xin phép",
      body: `Mini App xin **một quyền duy nhất**:

- **Truy cập số điện thoại (getPhoneNumber)** — đối chiếu với danh sách nhân sự đã đăng ký của công ty, để biết người đang chấm công là ai.

Quyền này chỉ được xin **khi bạn bấm nút “Đăng nhập bằng Zalo”**, và chỉ lấy được thông tin nếu bạn bấm “Cho phép”. Nếu bạn từ chối, ứng dụng không nhận được số điện thoại và bạn không đăng nhập được — ngoài ra không có ảnh hưởng nào khác.

Mini App **không** xin và **không** sử dụng: vị trí, camera, micro, hình ảnh, tệp tin, danh bạ, hay bất kỳ quyền nào khác.`,
    },
    {
      heading: "Dữ liệu cá nhân mà Mini App sử dụng",
      body: `**Lấy từ Zalo:**

- **Số điện thoại** — dùng để nhận diện bạn là nhân sự nào của công ty.

Số điện thoại được gửi thẳng từ Zalo về máy chủ của công ty và được đối chiếu với danh sách nhân sự. Ứng dụng trên điện thoại **không lưu** số điện thoại của bạn.

**Do công ty tạo ra khi bạn sử dụng:**

- Ngày làm việc, giờ vào, giờ ra, số giờ công
- Công trình bạn được phân công
- Ghi chú và lý do bạn tự nhập (ví dụ khi gửi đơn bù công)

Giờ vào/giờ ra do **máy chủ của công ty ghi nhận** tại thời điểm bạn bấm nút, không lấy từ đồng hồ điện thoại.`,
    },
    {
      heading: "Dùng dữ liệu để làm gì",
      body: `Chỉ để chấm công và tính công cho bạn: ghi nhận giờ làm, để văn phòng duyệt, và lưu làm hồ sơ lao động của công ty.

Công ty **không** bán, **không** trao đổi và **không** chia sẻ dữ liệu này cho bên thứ ba, **không** dùng để quảng cáo, và **không** dùng vào mục đích nào khác ngoài những điều nêu trên.`,
    },
    {
      heading: "Lưu trữ và bảo mật",
      body: `Dữ liệu được lưu trên hệ thống của công ty, truyền qua kết nối mã hoá (HTTPS). Chỉ nhân sự văn phòng được cấp quyền mới xem được.

Hồ sơ giờ công được lưu theo quy định về hồ sơ lao động của công ty.`,
    },
    {
      heading: "Rút lại sự đồng ý và xoá dữ liệu",
      body: `Bạn có thể rút lại quyền truy cập số điện thoại bất cứ lúc nào trong phần cài đặt Mini App của Zalo, hoặc liên hệ văn phòng.

Khi nhận được yêu cầu, công ty sẽ **gỡ liên kết giữa tài khoản Zalo của bạn và hồ sơ nhân sự** — sau đó bạn không đăng nhập được ứng dụng nữa.

Riêng **hồ sơ giờ công đã ghi nhận** (ngày công, giờ làm) được giữ lại, vì đây là hồ sơ lao động của công ty về công việc đã thực hiện và liên quan đến việc tính lương, không phải dữ liệu do Zalo cung cấp. Nếu bạn muốn xoá cả phần này, vui lòng liên hệ văn phòng theo thông tin ở đầu trang.`,
    },
    {
      heading: "Điều kiện sử dụng",
      body: `- Chỉ chấm công cho **chính mình**; không chấm công hộ người khác.
- Chấm công đúng giờ làm việc thực tế. Giờ công do văn phòng duyệt; trường hợp sai sót, liên hệ văn phòng để điều chỉnh.
- Không sử dụng ứng dụng vào mục đích ngoài công việc của công ty.`,
    },
    {
      heading: "Liên hệ",
      body: `Mọi thắc mắc về ứng dụng hoặc dữ liệu cá nhân, vui lòng liên hệ công ty theo địa chỉ, email và số điện thoại ghi ở đầu trang.`,
    },
  ],
};

// Sections with no heading or no body are dropped rather than rendered as an
// empty numbered clause — a blank row in a legal document reads as a mistake,
// and the numbering is derived from what actually renders.
const mapLegalSections = (
  raw: DirectusLegalSection[] | null | undefined,
  fallback: LegalSection[]
): LegalSection[] => {
  const mapped = (raw ?? [])
    .filter(
      (s): s is DirectusLegalSection & { heading: string; body: string } =>
        Boolean(s?.heading && s?.body)
    )
    .map((s) => ({ id: s.id, heading: s.heading, body: s.body }));
  return mapped.length ? mapped : fallback;
};

export async function getLegalTerms(draft = false): Promise<LegalTerms> {
  const d = DEFAULT_LEGAL_TERMS;
  let t: DirectusLegalTerms | null = null;
  try {
    t = await directusClient(draft).request(
      readSingleton("legal_terms", {
        fields: ["*", { sections: ["*"] }],
      })
    );
  } catch (err) {
    console.error("CMS fetch error for legal-terms:", err);
    return d;
  }
  if (!t) return d;

  return {
    cmsId: t.id,
    pageTitle: orDefault(t.page_title, d.pageTitle),
    pageSubtitle: orDefault(t.page_subtitle, d.pageSubtitle),
    operator: {
      name: orDefault(t.operator_name, d.operator.name),
      taxCode: orDefault(t.operator_tax_code, d.operator.taxCode),
      address: orDefault(t.operator_address, d.operator.address),
      email: orDefault(t.operator_email, d.operator.email),
      phone: orDefault(t.operator_phone, d.operator.phone),
      updatedAt: orDefault(t.updated_at, d.operator.updatedAt),
    },
    sections: mapLegalSections(t.sections, d.sections),
  };
}
