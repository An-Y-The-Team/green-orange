import { expect, test, vi } from "vitest";

// group-changes reaches the gate module for the group name; that module loads
// Auth.js, which is irrelevant here.
vi.mock("@/auth", () => ({ auth: vi.fn() }));

const { GroupChangeRefused, planGroupChanges } =
  await import("./group-changes");

const admins = { pk: "g-crm", name: "crm-admins", is_superuser: false };
const readonly = {
  pk: "g-ro",
  name: "authentik Read-only",
  is_superuser: false,
};
const superusers = { pk: "g-su", name: "authentik Admins", is_superuser: true };
const all = [admins, readonly, superusers];

test("diffs ticked boxes against current membership", () => {
  expect(
    planGroupChanges({ current: ["g-ro"], wanted: ["g-crm"], all, self: false })
  ).toEqual({ add: ["g-crm"], remove: ["g-ro"] });
});

test("no change is a no-op", () => {
  expect(
    planGroupChanges({ current: ["g-crm"], wanted: ["g-crm"], all, self: true })
  ).toEqual({ add: [], remove: [] });
});

test("a superuser group can neither be granted nor is it touched when already held", () => {
  expect(() =>
    planGroupChanges({ current: [], wanted: ["g-su"], all, self: false })
  ).toThrow(GroupChangeRefused);
  // akadmin-style user: in the superuser group, picker only knows the others.
  expect(
    planGroupChanges({
      current: ["g-su", "g-crm"],
      wanted: ["g-crm"],
      all,
      self: true,
    })
  ).toEqual({ add: [], remove: [] });
});

test("an unknown group pk is refused", () => {
  expect(() =>
    planGroupChanges({ current: [], wanted: ["g-nope"], all, self: false })
  ).toThrow(GroupChangeRefused);
});

test("leaving crm-admins is refused for yourself, allowed for others", () => {
  expect(() =>
    planGroupChanges({ current: ["g-crm"], wanted: [], all, self: true })
  ).toThrow(/crm-admins/);
  expect(
    planGroupChanges({ current: ["g-crm"], wanted: [], all, self: false })
  ).toEqual({ add: [], remove: ["g-crm"] });
});
