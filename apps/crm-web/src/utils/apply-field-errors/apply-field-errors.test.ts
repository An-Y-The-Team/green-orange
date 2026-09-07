import { expect, test, vi } from "vitest";

import { applyFieldErrors } from "./apply-field-errors";

const formWith = (values: Record<string, unknown>) => {
  const setError = vi.fn();
  return {
    form: { getValues: () => values, setError } as never,
    setError,
  };
};

test("puts the first message for each field on that field", () => {
  const { form, setError } = formWith({ name: "", client_id: 0 });
  applyFieldErrors(form, {
    name: ["Nhập tên công trình", "quá dài"],
    client_id: ["Chọn khách hàng"],
  });
  expect(setError).toHaveBeenCalledWith(
    "name",
    { type: "server", message: "Nhập tên công trình" },
    { shouldFocus: true }
  );
  expect(setError).toHaveBeenCalledWith(
    "client_id",
    { type: "server", message: "Chọn khách hàng" },
    { shouldFocus: false }
  );
});

// Focus is what turns a 26-control builder from a hunt into a fix, and only the
// FIRST field may take it.
test("focuses only the first field", () => {
  const { form, setError } = formWith({ a: "", b: "", c: "" });
  applyFieldErrors(form, { a: ["x"], b: ["y"], c: ["z"] });
  const focusFlags = setError.mock.calls.map((call) => call[2].shouldFocus);
  expect(focusFlags).toEqual([true, false, false]);
});

// A key the form does not own (`_form`, or a nested payload field) must not be
// set: RHF would register a phantom field whose error nothing can clear.
test("skips keys the form does not own", () => {
  const { form, setError } = formWith({ name: "" });
  applyFieldErrors(form, { _form: ["Unauthorized"], nope: ["x"] });
  expect(setError).not.toHaveBeenCalled();
});

test("an empty message list is not an error", () => {
  const { form, setError } = formWith({ name: "" });
  applyFieldErrors(form, { name: [] });
  expect(setError).not.toHaveBeenCalled();
});
