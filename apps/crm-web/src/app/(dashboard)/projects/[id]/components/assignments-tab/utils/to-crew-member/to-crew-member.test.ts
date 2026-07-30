import { expect, test } from "vitest";

import { CrewMemberStatus, EmploymentType } from "@/app/(dashboard)/crew/enums";

import { toCrewMember } from "./to-crew-member";

test("builds the picker row from the created member payload", () => {
  expect(
    toCrewMember(
      { id: 7, name: "Nguyễn Văn A", phone: "0901234567" },
      "0900000000"
    )
  ).toEqual({
    id: 7,
    name: "Nguyễn Văn A",
    phone: "0901234567",
    employment_type: EmploymentType.PERMANENT,
    status: CrewMemberStatus.WORKING,
    created_at: "",
  });
});

// The API omits phone when it was not sent; the form's own value stands in so
// the row is not silently missing what the user just typed.
test("falls back to the submitted phone, and to null when there was none", () => {
  expect(toCrewMember({ id: 7, name: "A" }, "0901234567")?.phone).toBe(
    "0901234567"
  );
  expect(toCrewMember({ id: 7, name: "A" }, "")?.phone).toBeNull();
});

// The bug this guards: a payload without a usable id/name would put a blank,
// unselectable option in the nhân viên select.
test("rejects a payload without a numeric id and a name", () => {
  expect(toCrewMember({ name: "A" }, "")).toBeNull();
  expect(toCrewMember({ id: "7", name: "A" }, "")).toBeNull();
  expect(toCrewMember({ id: 7 }, "")).toBeNull();
  expect(toCrewMember(undefined, "")).toBeNull();
  expect(toCrewMember([{ id: 7, name: "A" }], "")).toBeNull();
});
