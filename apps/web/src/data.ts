import { ContentStatus } from "@/constants/cms";
import { assetUrl } from "@/lib/asset-url/asset-url";
import { COLOR_THEME_SLUGS, type ColorThemeSlug } from "@/lib/color-themes";
import {
  type DirectusBrandValue,
  type DirectusHeroSegment,
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
    headerTagline: "Thi Công & Vệ Sinh",
    footerTagline: "Xây dựng & Dọn sạch",
  },
  typography: {
    headingFont: "playfair-display",
    heroDisplayFont: "lora",
    bodyFont: "lora",
  },
  colorTheme: {
    theme: "green-orange",
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
      color: "text-brand-primary-600",
    },
    {
      value: "120+",
      label: "Dự án Thi Công Cải Tạo Trọn Gói",
      color: "text-brand-secondary-600",
    },
    {
      value: "99.4%",
      label: "Khách Hàng Đánh Giá Hài Lòng 5★",
      color: "text-brand-primary-600",
    },
    {
      value: "35+",
      label: "Trang thiết bị & Hóa chất Đạt Chuẩn",
      color: "text-brand-secondary-600",
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
  contactSection: {
    eyebrow: "Liên Hệ Đăng Ký",
    heading: "Đăng Ký Khảo Sát & Tư Vấn Miễn Phí",
    description:
      "Chỉ với 1 phút điền thông tin, chúng tôi sẽ cử kỹ sư chuyên môn đến khảo sát đo đạc thực tế hoàn toàn miễn phí. Cam kết bảo mật thông tin tối đa.",
    successHeading: "Gửi yêu cầu thành công!",
    successBody:
      "Đơn của bạn đã được chuyển đến phòng dự án GreenOrange. Chuyên viên kỹ sư sẽ liên hệ với bạn qua điện thoại trong vòng 15 phút tới.",
    ctaLabel: "Gửi Đăng Ký Khảo Sát Ngay (Miễn Phí)",
    labelFullName: "Họ và Tên Khách Hàng",
    labelPhone: "Số Điện Thoại Liên Hệ",
    labelEmail: "Địa Chỉ Email",
    labelCompany: "Tên Doanh Nghiệp / Thương Hiệu",
    labelAddress: "Địa Chỉ Mặt Bằng / Công Trình Cần Khảo Sát",
    labelServiceGroup: "Nhóm Dịch Vụ Cần Đăng Ký",
    labelServiceSelect: "Chọn Gói Dịch Vụ Cụ Thể (Bắt buộc)",
    labelMessage:
      "Mô Tả Yêu Cầu Chi Tiết (Kích thước mặt bằng, tình trạng hiện tại, thời gian bàn giao mong muốn)",
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

// `SectionId` is a closed enum; drop links whose id isn't a known section so we
// never render dead anchors. The other whitelists keep the union types honest
// and Tailwind classes referenced statically.
const SECTION_IDS = new Set<string>(Object.values(SectionId));
const HEADLINE_COLORS = new Set<string>(["white", "emerald", "orange"]);
const BRAND_ICONS = new Set<string>(["Wrench", "ShieldCheck", "Trees"]);
const BRAND_ACCENTS = new Set<string>(["orange", "slate", "emerald"]);

const FONT_SLUGS = new Set<string>([
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
