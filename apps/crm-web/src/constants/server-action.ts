import type { ServerActionState } from "@yan/shared/hooks/use-server-actions";

/**
 * Neutral starting state for every `useActionState` in the app.
 *
 * Typed **without** `data` on purpose. `ServerActionState` (i.e.
 * `ServerActionState<unknown>`) would pin `data?: unknown`, which is not
 * assignable to `ServerActionState<Project>` — so an action declaring a typed
 * payload could no longer start from this constant. Omitting the key makes it
 * assignable to every `ServerActionState<TData>` while `state.message` /
 * `state.errors` stay readable at the call site.
 */
export const INITIAL_ACTION_STATE: Omit<ServerActionState, "data"> = {
  success: false,
};

/** The standard Vietnamese toast pair, spread into `useServerAction` options. */
export const ACTION_TOAST_TITLES = {
  successToastTitle: "Thành công",
  errorToastTitle: "Lỗi",
};

/** Payload failed its zod parse — one wording app-wide. */
export const INVALID_INPUT_MESSAGE = "Vui lòng kiểm tra lại thông tin đã nhập.";

/** Fallback when a thrown value isn't an `Error`. */
export const UNKNOWN_ERROR_MESSAGE = "Lỗi không xác định.";

/**
 * The `Đã {verb} {noun}.` / `Không thể {verb} {noun}.` sentence pairs every
 * action returns. Ten templates cover ~60 hand-written sentences, so changing
 * a verb is one edit. Messages that don't fit a template (e.g. "đang được sử
 * dụng, không thể xóa") stay inline at their action.
 */
export const ACTION_MESSAGES = {
  added: (noun: string) => `Đã thêm ${noun}.`,
  created: (noun: string) => `Đã tạo ${noun}.`,
  updated: (noun: string) => `Đã cập nhật ${noun}.`,
  deleted: (noun: string) => `Đã xóa ${noun}.`,
  saved: (noun: string) => `Đã lưu ${noun}.`,
  addFailed: (noun: string) => `Không thể thêm ${noun}.`,
  createFailed: (noun: string) => `Không thể tạo ${noun}.`,
  updateFailed: (noun: string) => `Không thể cập nhật ${noun}.`,
  deleteFailed: (noun: string) => `Không thể xóa ${noun}.`,
  saveFailed: (noun: string) => `Không thể lưu ${noun}.`,
  sendFailed: (noun: string) => `Không thể gửi ${noun}.`,
} as const;

/**
 * Lowercase entity nouns for the `ACTION_MESSAGES` templates above. Qualify
 * inline where an action is specific about which one — e.g.
 * ``ACTION_MESSAGES.deleted(`${NOUNS.quote} nháp`)``.
 */
export const NOUNS = {
  attachment: "tệp",
  assignment: "phân công",
  bill: "hóa đơn",
  client: "khách hàng",
  company: "thông tin công ty",
  contact: "liên hệ",
  contract: "hợp đồng",
  crewMember: "nhân sự",
  location: "địa điểm",
  milestone: "đợt thanh toán",
  note: "ghi chú",
  paperworkItem: "mục",
  project: "công trình",
  projectType: "loại công trình",
  quote: "báo giá",
  role: "vị trí",
  settlement: "quyết toán",
  template: "mẫu",
  timesheet: "giờ công",
} as const;
