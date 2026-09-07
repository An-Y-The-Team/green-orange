import { expect, test } from "vitest";

import { apiErrorMessage, unmappedApiMessage } from "./api-error-message";

// The bug this guards: `API PATCH /projects/12 failed: 409 Conflict — {…}` was
// the sentence a Vietnamese-only operator read when a stage gate refused.
// Nothing this function returns may contain an HTTP verb, a path or a status.
const LEAKS = /API |PATCH|POST|DELETE|\/projects|failed:|Conflict|[45]\d\d/;

test("never returns anything that looks like a raw HTTP line", () => {
  const samples = [
    { status: 409, backendMessage: "only waiting quotes can be decided" },
    { status: 400, backendMessage: "Invalid status transition: sent → draft" },
    { status: 404, backendMessage: "Quote not found" },
    { status: 500, backendMessage: "Internal server error" },
    { status: 409, backendMessage: "something nobody mapped yet" },
    { status: undefined, backendMessage: undefined },
  ];
  for (const s of samples) expect(apiErrorMessage(s)).not.toMatch(LEAKS);
});

test("translates the messages the backend actually throws", () => {
  expect(
    apiErrorMessage({
      status: 409,
      backendMessage: "only waiting quotes can be decided",
    })
  ).toBe("Chỉ chốt / hoãn / hủy được báo giá đang chờ quyết định.");

  expect(
    apiErrorMessage({
      status: 400,
      backendMessage:
        "cannot un-sign: payments have already been collected on this bill",
    })
  ).toBe("Không thể bỏ ký: hóa đơn này đã thu tiền. Sửa đợt thanh toán trước.");

  expect(
    apiErrorMessage({
      status: 409,
      backendMessage:
        "project is closed — reopen it (stage: settlement) before editing",
    })
  ).toContain("Công trình đã đóng");
});

// Templated messages must keep the backend's numbers — they are the useful part.
test("keeps interpolated values from a templated message", () => {
  expect(
    apiErrorMessage({
      status: 409,
      backendMessage:
        "project already has a settlement (QT #7) — a project settles once",
    })
  ).toContain("QT #7");

  expect(
    apiErrorMessage({
      status: 409,
      backendMessage: "Project type is used by 3 project(s)",
    })
  ).toBe("Loại công trình đang dùng ở 3 công trình — không xóa được.");

  expect(
    apiErrorMessage({
      status: 400,
      backendMessage: "giảm giá (900) exceeds the quyết toán subtotal (500)",
    })
  ).toContain("(900)");
});

// A specific entry must win over the broader ones declared after it.
test("first match wins, so specific beats generic", () => {
  // "Only draft settlements can be deleted" must not fall to /not found$/.
  expect(
    apiErrorMessage({
      status: 400,
      backendMessage: "Only draft settlements can be deleted",
    })
  ).toBe("Chỉ xóa được quyết toán còn nháp.");
  // Every "... not found" collapses to one sentence.
  for (const noun of ["Quote", "Bill", "Crew member", "Project"]) {
    expect(
      apiErrorMessage({ status: 404, backendMessage: `${noun} not found` })
    ).toBe("Không tìm thấy dữ liệu — có thể đã bị xóa.");
  }
});

test("falls back by status when no message matched", () => {
  expect(
    apiErrorMessage({ status: 409, backendMessage: "brand new rule" })
  ).toBe("Thao tác này xung đột với dữ liệu hiện tại.");
  expect(apiErrorMessage({ status: 403 })).toBe(
    "Bạn không có quyền thực hiện thao tác này."
  );
  // A 5xx is an outage, not a data problem — the caller's "Không thể cập nhật
  // công trình" would blame the wrong thing.
  expect(
    apiErrorMessage({ status: 503, fallback: "Không thể cập nhật công trình." })
  ).toBe("Máy chủ đang lỗi — thử lại sau ít phút.");
  // No status at all = the request never landed.
  expect(apiErrorMessage({})).toBe(
    "Không kết nối được máy chủ — kiểm tra mạng và thử lại."
  );
});

test("an unmapped status uses the caller's own fallback", () => {
  expect(
    apiErrorMessage({ status: 418, fallback: "Không thể lưu giờ công." })
  ).toBe("Không thể lưu giờ công.");
});

test("unmappedApiMessage flags only what the map misses", () => {
  expect(
    unmappedApiMessage(409, "only waiting quotes can be decided")
  ).toBeUndefined();
  expect(unmappedApiMessage(409, undefined)).toBeUndefined();
  expect(unmappedApiMessage(409, "a rule added next month")).toContain(
    "unmapped API error (409)"
  );
});
