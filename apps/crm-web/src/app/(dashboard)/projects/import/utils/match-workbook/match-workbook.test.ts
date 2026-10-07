import { expect, test } from "vitest";

import { ClientType } from "@/app/(dashboard)/clients/enums";
import type {
  Client,
  Contact,
  Location,
} from "@/app/(dashboard)/clients/types";

import {
  duplicateCodes,
  pickClient,
  pickContact,
  pickLocation,
  pickTypes,
  sameKey,
} from "./match-workbook";

const client = (id: number, name: string, tax_code: string | null): Client => ({
  id,
  name,
  type: ClientType.COMPANY,
  tax_code,
  address: null,
  email: null,
  note: null,
  created_at: "",
  updated_at: "",
});

const BINH_MINH = {
  name: "CÔNG TY CỔ PHẦN BÌNH MINH TOÀN CẦU",
  type: ClientType.COMPANY,
  tax_code: "0309554620",
};

test("sameKey ignores accents, case and punctuation", () => {
  expect(sameKey("72 Lê Thánh Tôn, Q.1")).toBe(sameKey("72 le thanh ton  q 1"));
  expect(sameKey("Đường 10")).toBe("duong 10");
});

test("MST wins over the name", () => {
  const byTax = client(1, "Bình Minh (cũ)", "0309554620");
  const byName = client(2, "Công ty Cổ phần Bình Minh Toàn Cầu", null);
  expect(pickClient({ candidates: [byName, byTax], client: BINH_MINH })).toBe(
    byTax
  );
});

test("a same-name client with ANOTHER MST is a different company", () => {
  const other = client(3, "Công ty Cổ phần Bình Minh Toàn Cầu", "0100000000");
  expect(pickClient({ candidates: [other], client: BINH_MINH })).toBeNull();
  // …but one with no MST on file is the same company.
  const noTax = client(4, "Công ty Cổ phần Bình Minh Toàn Cầu", null);
  expect(pickClient({ candidates: [noTax], client: BINH_MINH })).toBe(noTax);
});

test("two equally good name matches is no match", () => {
  const a = client(5, "Nguyễn Văn An", null);
  const b = client(6, "Nguyen Van An", null);
  expect(
    pickClient({
      candidates: [a, b],
      client: { name: "Nguyễn Văn An" },
    })
  ).toBeNull();
});

test("site by address, contact by phone then name", () => {
  const site: Location = {
    id: 9,
    client_id: 1,
    name: "Bread Talk",
    address: "B3-15A, TTTM Vincom Center, 72 Lê Thánh Tôn",
    manager_contact_id: null,
  };
  expect(
    pickLocation({
      locations: [site],
      address: "b3 15a TTTM Vincom Center 72 Le Thanh Ton",
    })
  ).toBe(site);

  const van: Contact = {
    id: 3,
    client_id: 1,
    name: "Chị Vân",
    phone: "+84 912 345 678",
    email: null,
    title: null,
    note: null,
  };
  expect(
    pickContact({
      contacts: [van],
      contact: { name: "Trần Khánh Vân", phone: "0912345678" },
    })
  ).toBe(van);
  expect(pickContact({ contacts: [van], contact: { name: "chị vân" } })).toBe(
    van
  );
  expect(
    pickContact({ contacts: [van], contact: { name: "Người khác" } })
  ).toBeNull();
});

test("types by name; misses are reported, repeats collapse", () => {
  const types = [
    { id: 1, name: "Tháo dỡ" },
    { id: 2, name: "Vệ sinh" },
  ];
  expect(
    pickTypes({ types, names: ["tháo dỡ", "Vệ Sinh", "Tháo dỡ", "Sơn"] })
  ).toEqual({ ids: [1, 2], unmatched: ["Sơn"] });
});

test("a project with the same name for the client is flagged", () => {
  expect(
    duplicateCodes({
      projects: [
        { code: "CT-2026-004", name: "Bread Talk" },
        { code: "CT-2026-005", name: "Bread Talk 2" },
      ],
      name: "bread talk",
    })
  ).toEqual(["CT-2026-004"]);
});
