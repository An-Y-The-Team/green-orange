import { expect, test } from "vitest";

import { CrewTab } from "@/app/(dashboard)/crew/enums";

import { NAV_ITEMS, activeNav } from "./nav";

// What the matcher has to get right, and got wrong in the flat version: a
// deeper sub-item must beat the section that prefixes it, a `?tab=` sub-item
// must match ONE tab rather than the whole page, and a deep detail route must
// still land on its section rather than nowhere.
test.each([
  ["/dashboard", null, "Tổng quan", "Tổng quan"],
  ["/projects/12/quotes/new", null, "Công trình", "Công trình"],
  ["/contracts", null, "Hợp đồng", "Tất cả hợp đồng"],
  ["/contracts/new", null, "Hợp đồng", "Tất cả hợp đồng"],
  ["/contracts/templates", null, "Hợp đồng", "Mẫu hợp đồng"],
  ["/contracts/templates/9/edit", null, "Hợp đồng", "Mẫu hợp đồng"],
  ["/crew", null, "Nhân sự", "Danh sách"],
  ["/crew", CrewTab.ROLES, "Nhân sự", "Vị trí"],
  ["/crew", CrewTab.TIMEKEEPING, "Nhân sự", "Chấm công"],
  // A detail page carries no tab, and the roster is not "the tab you were on".
  ["/crew/12", CrewTab.ROLES, "Nhân sự", "Danh sách"],
  ["/settings", null, "Cài đặt", "Danh mục"],
  ["/settings/company", null, "Cài đặt", "Thông tin công ty"],
  ["/settings/users/new", null, "Cài đặt", "Người dùng"],
])("%s (tab=%s) → %s / %s", (pathname, tab, section, leaf) => {
  const match = activeNav(pathname, tab);
  expect(match?.section.label).toBe(section);
  expect(match?.leaf.label).toBe(leaf);
});

// An unrelated query param must not unmatch a page.
test("a non-tab query param is ignored", () => {
  expect(activeNav("/clients", null)?.leaf.label).toBe("Khách hàng/Công ty");
});

// Field mode has its own layout and is not in the nav.
test("an unknown path matches nothing", () => {
  expect(activeNav("/field", null)).toBeUndefined();
});

// The reason CrewTab exists: a renamed tab value would otherwise leave these
// links quietly landing on the roster.
test("every ?tab= link points at a real crew tab", () => {
  const tabs: string[] = Object.values(CrewTab);
  const queries = NAV_ITEMS.flatMap((item) => item.children ?? [])
    .map((child) => child.href.split("?")[1])
    .filter((query): query is string => Boolean(query));

  expect(queries.length).toBeGreaterThan(0);
  for (const query of queries) {
    expect(tabs, query).toContain(new URLSearchParams(query).get("tab"));
  }
});

// A section repeats its own href as its first child, so clicking the parent
// navigates AND highlights something. Without this, a section would look
// permanently unvisited.
test("every section's own href is one of its children", () => {
  for (const item of NAV_ITEMS) {
    if (!item.children) continue;
    expect(
      item.children.map((child) => child.href),
      item.label
    ).toContain(item.href);
  }
});
