import { api } from "@yan/shared/api";

import { Project, Service, Testimonial } from "./types";

// Base URL of the decoupled Payload CMS. Public so the client-side contact form
// can POST to it as well; falls back to the local dev CMS port.
// `||` (not `??`) so an empty-string build arg also falls back instead of
// producing an invalid base URL.
export const CMS_URL =
  process.env.NEXT_PUBLIC_CMS_URL || "http://localhost:3001";

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

// Fetch a published collection from Payload, ordered by the `order` field.
// Returns [] on failure so a CMS hiccup degrades the page rather than crashing.
async function fetchCollection<T>(slug: string): Promise<T[]> {
  try {
    const res = await api.fetch(
      `${SERVER_CMS_URL}/api/${slug}?limit=100&depth=0&sort=order`,
      {
        next: { revalidate: REVALIDATE_SECONDS },
        // Never let an unreachable CMS hang a build/render; fail fast to [].
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) {
      console.error(`CMS fetch failed for "${slug}": ${res.status}`);
      return [];
    }
    const json = (await res.json()) as PayloadList<T>;
    return json.docs ?? [];
  } catch (err) {
    console.error(`CMS fetch error for "${slug}":`, err);
    return [];
  }
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
// Static marketing content not modeled in the CMS (no collection for these).
// ---------------------------------------------------------------------------

export const STATS = [
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
];

export const COMPANY_INFO = {
  name: "CÔNG TY TNHH GREENORANGE - GIẢI PHÁP THI CÔNG & VỆ SINH DOANH NGHIỆP",
  shortName: "GreenOrange Services",
  founded: "2019",
  email: "contact@greenorange.vn",
  address: "Tầng 5, Tòa Nhà Sông Đà, Phạm Hùng, Mỹ Đình, Nam Từ Liêm, Hà Nội",
  branch:
    "Chi nhánh Nam Bộ: 145 Điện Biên Phủ, Phường Đa Kao, Quận 1, TP. Hồ Chí Minh",
  motto:
    "Sạch sẽ từ gốc - Đẹp đẽ từ khâu dựng xây - Đồng hành tin cậy cùng doanh nghiệp Việt",
  certification:
    "Chứng nhận Hệ thống Quản lý Chất lượng ISO 9001:2015 & Đạt tiêu chuẩn Vệ sinh Môi trường Xanh Eco-Safe.",
};
