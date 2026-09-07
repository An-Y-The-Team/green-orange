import { beforeEach, describe, expect, test, vi } from "vitest";

import { addNote } from "./add-note";
import { updateProject } from "./update-project";
import { updateProjectWithNote } from "./update-project-with-note";

vi.mock("./add-note", () => ({ addNote: vi.fn() }));
vi.mock("./update-project", () => ({ updateProject: vi.fn() }));

const ok = (message: string) => ({ success: true, message, errors: {} });
const fail = (message: string) => ({ success: false, message, errors: {} });
const prev = { success: false, message: null, errors: {} };
const patch = { execution_sub_status: "works" } as never;
const note = { body: "Khách yêu cầu sơn lại trần" };

beforeEach(() => vi.resetAllMocks());

describe("noteFirst (acceptance rework — the note IS the reason)", () => {
  test("a failing note stops before the status changes", async () => {
    vi.mocked(addNote).mockResolvedValue(fail("Không lưu được ghi chú"));
    const r = await updateProjectWithNote(1, prev, {
      patch,
      note,
      noteFirst: true,
    });
    expect(r.success).toBe(false);
    expect(updateProject).not.toHaveBeenCalled();
  });

  // The bug this guards: the note was already committed, the toast said only
  // "couldn't update", so the operator retried and wrote the note twice.
  test("a failing status says the note was already saved", async () => {
    vi.mocked(addNote).mockResolvedValue(ok("Đã thêm ghi chú"));
    vi.mocked(updateProject).mockResolvedValue(fail("Công trình đã đóng"));
    const r = await updateProjectWithNote(1, prev, {
      patch,
      note,
      noteFirst: true,
    });
    expect(r.success).toBe(false);
    expect(r.message).toBe(
      "Đã lưu ghi chú, nhưng chưa đổi được trạng thái: Công trình đã đóng"
    );
  });
});

describe("status first (execution stepper — the note is optional)", () => {
  // The bug this guards: the note fired from the status action's onSuccess with
  // `silent: true`, so a failed note lost the text with no toast at all.
  test("a failing note is reported, not swallowed", async () => {
    vi.mocked(updateProject).mockResolvedValue(ok("Đã cập nhật"));
    vi.mocked(addNote).mockResolvedValue(fail("Ghi chú quá dài"));
    const r = await updateProjectWithNote(1, prev, { patch, note });
    expect(r.success).toBe(false);
    expect(r.message).toBe(
      "Đã đổi trạng thái, nhưng chưa lưu được ghi chú: Ghi chú quá dài"
    );
  });

  test("a failing status never attempts the note", async () => {
    vi.mocked(updateProject).mockResolvedValue(fail("409"));
    const r = await updateProjectWithNote(1, prev, { patch, note });
    expect(r.success).toBe(false);
    expect(addNote).not.toHaveBeenCalled();
  });

  test("no note: one call, the status result passes through", async () => {
    vi.mocked(updateProject).mockResolvedValue(ok("Đã cập nhật"));
    const r = await updateProjectWithNote(1, prev, { patch });
    expect(r).toEqual(ok("Đã cập nhật"));
    expect(addNote).not.toHaveBeenCalled();
  });

  test("both succeed: the status message is the one shown", async () => {
    vi.mocked(updateProject).mockResolvedValue(ok("Đã cập nhật"));
    vi.mocked(addNote).mockResolvedValue(ok("Đã thêm ghi chú"));
    const r = await updateProjectWithNote(1, prev, { patch, note });
    expect(r).toEqual(ok("Đã cập nhật"));
  });
});
