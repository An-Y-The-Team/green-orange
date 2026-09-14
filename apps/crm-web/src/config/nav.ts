import {
  FileSignature,
  FileText,
  HardHat,
  LayoutDashboard,
  type LucideIcon,
  Settings,
  Users,
  UsersRound,
  Wallet,
} from "lucide-react";

import { CrewTab } from "@/app/(dashboard)/crew/enums";
import { CREW_TABS, FIELDS } from "@/constants/labels";

export interface NavItem {
  label: string;
  href: string;
  /** Top-level items only — sub-items are told apart by indentation. */
  icon?: LucideIcon;
  children?: NavItem[];
}

/**
 * Hidden unless the Authentik admin API is configured. The page's own
 * `isUserAdmin()` redirect is the real gate; this only keeps a dead link out of
 * environments that cannot serve it.
 */
export const USERS_HREF = "/settings/users";

/**
 * v2 nav (docs/features/crm-ui-redesign.md IA). Công trình is the hub;
 * Báo giá / Hợp đồng / Thu & công nợ are cross-project views.
 *
 * A section keeps its own `href` and repeats it as its first child, so clicking
 * the parent still navigates and every section renders through one code path.
 * `?tab=` children deep-link the tab bars that `useTabParam` already puts in the
 * URL — `/crew` with no param IS the roster tab, because `cleanUrlParams` strips
 * a param equal to its default.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
  { label: FIELDS.project, href: "/projects", icon: HardHat },
  { label: FIELDS.client, href: "/clients", icon: Users },
  { label: "Báo giá", href: "/quotes", icon: FileText },
  {
    label: "Hợp đồng",
    href: "/contracts",
    icon: FileSignature,
    children: [
      { label: "Tất cả hợp đồng", href: "/contracts" },
      { label: FIELDS.contractTemplate, href: "/contracts/templates" },
    ],
  },
  { label: "Thu & công nợ", href: "/receivables", icon: Wallet },
  {
    label: FIELDS.crew,
    href: "/crew",
    icon: UsersRound,
    children: [
      { label: CREW_TABS[CrewTab.ROSTER], href: "/crew" },
      { label: CREW_TABS[CrewTab.ROLES], href: `/crew?tab=${CrewTab.ROLES}` },
      {
        label: CREW_TABS[CrewTab.TIMEKEEPING],
        href: `/crew?tab=${CrewTab.TIMEKEEPING}`,
      },
    ],
  },
  {
    label: "Cài đặt",
    href: "/settings",
    icon: Settings,
    children: [
      // Company profile first: nobody looks for the letterhead under "Danh mục".
      { label: "Thông tin công ty", href: "/settings/company" },
      { label: "Danh mục", href: "/settings" },
      { label: "Người dùng", href: USERS_HREF },
    ],
  },
];

/** Every leaf, paired with the section it sits under (itself, when flat). */
const LEAVES: { section: NavItem; leaf: NavItem }[] = NAV_ITEMS.flatMap(
  (section) =>
    (section.children ?? [section]).map((leaf) => ({ section, leaf }))
);

/**
 * A `?tab=` href matches one exact tab; every other href owns its subtree, so
 * `/projects/12/quotes/new` still belongs to Công trình. Compared against the
 * pathname alone — an unrelated `?q=` must not unmatch a page.
 */
function matches(href: string, pathname: string, tab?: string | null): boolean {
  const [base, query] = href.split("?");
  if (query) return pathname === base && query === `tab=${tab}`;
  return pathname === base || pathname.startsWith(`${base}/`);
}

/**
 * Where the reader is: the exact sub-item to highlight, plus the section that
 * holds it (and so must be expanded). Longest matching href wins, so
 * `/contracts/templates` beats `/contracts` and `/settings/users` beats
 * `/settings`.
 *
 * One source for two consumers: the sidebar highlight and the topbar's page
 * title, which reads `section`. A per-page title prop would drift from the
 * highlight the first time someone added a route.
 */
export const activeNav = (
  pathname: string,
  tab?: string | null
): { section: NavItem; leaf: NavItem } | undefined =>
  LEAVES.filter(({ leaf }) => matches(leaf.href, pathname, tab)).sort(
    (a, b) => b.leaf.href.length - a.leaf.href.length
  )[0];
