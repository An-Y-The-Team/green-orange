/**
 * Backend rejection → the sentence the operator reads.
 *
 * `apiSend` used to throw `API PATCH /projects/12 failed: 409 Conflict — {…}`
 * and every action passed `error.message` straight to a toast, so a Vietnamese-
 * only secretary who hit a stage gate got an HTTP verb and a URL path. This is
 * the one place that translates instead — `settlement-card.tsx` used to
 * string-match a single English message on its own, which was the tell.
 *
 * The backend has no error CODES: Nest sends `{statusCode, message, error}` and
 * FastAPI `{detail}`, where the message is the English sentence a `throw new
 * ConflictException("…")` was written with. So matching on that sentence is the
 * only signal available. It is therefore matched deliberately loosely (a
 * distinctive fragment, or a regex when the backend interpolates), and every
 * miss still lands on a per-status Vietnamese fallback rather than leaking
 * English — `unmappedApiMessage` exists so a miss can be spotted in dev instead
 * of discovered by a user.
 *
 * Rules for editing: keep entries in sync with the messages the modules
 * actually throw (`grep -rn "Exception(" apps/crm-api-nest/src`), and never
 * match on a fragment so generic it swallows a different error.
 */

/** Per-status wording when no specific message matched. */
const STATUS_FALLBACK: Record<number, string> = {
  400: "Thông tin không hợp lệ — vui lòng kiểm tra lại.",
  401: "Phiên đăng nhập đã hết hạn — tải lại trang để đăng nhập lại.",
  403: "Bạn không có quyền thực hiện thao tác này.",
  404: "Không tìm thấy dữ liệu — có thể đã bị xóa.",
  409: "Thao tác này xung đột với dữ liệu hiện tại.",
  422: "Thông tin không hợp lệ — vui lòng kiểm tra lại.",
};

const SERVER_ERROR = "Máy chủ đang lỗi — thử lại sau ít phút.";
const NETWORK_ERROR = "Không kết nối được máy chủ — kiểm tra mạng và thử lại.";

/**
 * Ordered: the first match wins, so a specific entry must precede a broader
 * one. `vi` may read the regex captures to keep the backend's numbers.
 */
const MESSAGES: { match: RegExp; vi: (m: RegExpMatchArray) => string }[] = [
  // ── Quyết toán / hóa đơn / đợt thanh toán ────────────────────────────────
  {
    match: /cannot un-sign: payments have already been collected/i,
    vi: () =>
      "Không thể bỏ ký: hóa đơn này đã thu tiền. Sửa đợt thanh toán trước.",
  },
  {
    match: /project already has a settlement \(QT #(\d+)\)/i,
    vi: (m) =>
      `Công trình đã có quyết toán (QT #${m[1]}) — mỗi công trình chỉ quyết toán một lần.`,
  },
  {
    match: /items are frozen once signed/i,
    vi: () => "Quyết toán đã ký — bỏ ký trước khi sửa hạng mục.",
  },
  {
    match: /(giảm giá|VAT) .*frozen once signed/i,
    vi: () => "Quyết toán đã ký — bỏ ký trước khi sửa giảm giá / VAT.",
  },
  {
    match: /giảm giá \((\d+)\) exceeds the quyết toán subtotal \((\d+)\)/i,
    vi: (m) =>
      `Giảm giá (${m[1]}) lớn hơn giá trị quyết toán (${m[2]}) — giảm bớt trước khi lưu.`,
  },
  {
    match: /cọc already scheduled \((\d+)\) exceeds the quyết toán payable/i,
    vi: (m) =>
      `Tiền cọc đã lên đợt (${m[1]}) vượt giá trị phải thu — sửa đợt thanh toán trước khi ký.`,
  },
  {
    match: /Only draft settlements can be deleted/i,
    vi: () => "Chỉ xóa được quyết toán còn nháp.",
  },
  {
    match: /Only not_due payment milestones can be deleted/i,
    vi: () => "Chỉ xóa được đợt thanh toán chưa đến hạn.",
  },
  {
    match: /total_amount is editable only while draft or official/i,
    vi: () => "Chỉ sửa được số tiền khi hóa đơn còn nháp hoặc mới chính thức.",
  },
  {
    match: /paid_date requires status/i,
    vi: () => "Chỉ ghi được ngày thu khi đợt thanh toán đã thu.",
  },
  {
    match: /bill_id does not belong to project_id/i,
    vi: () => "Hóa đơn không thuộc công trình này.",
  },

  // ── Báo giá ─────────────────────────────────────────────────────────────
  {
    match: /sent versions are never edited/i,
    vi: () => "Báo giá đã gửi không sửa được — tạo phiên bản mới.",
  },
  {
    match: /only waiting quotes can be decided/i,
    vi: () => "Chỉ chốt / hoãn / hủy được báo giá đang chờ quyết định.",
  },
  {
    match: /only draft quotes can be deleted/i,
    vi: () => "Chỉ xóa được báo giá còn nháp.",
  },
  {
    match: /only draft or waiting quotes can be sent/i,
    vi: () => "Chỉ gửi được báo giá còn nháp hoặc đang chờ quyết định.",
  },

  // ── Hợp đồng ────────────────────────────────────────────────────────────
  {
    match: /Only draft contracts can be edited/i,
    vi: () => "Hợp đồng đã ký không sửa được nội dung này.",
  },
  {
    match: /Only draft contracts can be deleted/i,
    vi: () => "Chỉ xóa được hợp đồng còn nháp.",
  },

  // ── Công trình ──────────────────────────────────────────────────────────
  {
    match: /project is closed — reopen it/i,
    vi: () =>
      "Công trình đã đóng — mở lại (giai đoạn Quyết toán & Thanh toán) trước khi sửa.",
  },
  {
    match: /cancel_reason is required/i,
    vi: () => "Nhập lý do hủy công trình.",
  },
  {
    match: /execution_sub_status can only move forward/i,
    vi: () => "Tiến độ thi công chỉ đi một chiều, không lùi lại được.",
  },
  {
    match: /cannot delete project: it still has/i,
    vi: () => "Công trình còn dữ liệu liên quan — hủy công trình thay vì xóa.",
  },
  {
    match: /Project type is used by (\d+) project/i,
    vi: (m) =>
      `Loại công trình đang dùng ở ${m[1]} công trình — không xóa được.`,
  },
  {
    match: /location_id does not belong to client_id/i,
    vi: () => "Địa điểm không thuộc khách hàng đã chọn.",
  },
  {
    match: /paperwork_item_id does not belong to project_id/i,
    vi: () => "Mục hồ sơ không thuộc công trình này.",
  },
  {
    match: /must be a contact of the same client/i,
    vi: () => "Người liên hệ phải thuộc cùng khách hàng.",
  },

  // ── Khách hàng / địa điểm / liên hệ ─────────────────────────────────────
  {
    match: /Client has projects and cannot be deleted/i,
    vi: () => "Khách hàng đang có công trình — không xóa được.",
  },
  {
    match: /Location has projects and cannot be deleted/i,
    vi: () => "Địa điểm đang có công trình — không xóa được.",
  },
  {
    match: /Contact is referenced by locations or projects/i,
    vi: () =>
      "Liên hệ đang được dùng ở địa điểm hoặc công trình — không xóa được.",
  },

  // ── Nhân sự ─────────────────────────────────────────────────────────────
  {
    match: /Crew member has assignments or timekeeping records/i,
    vi: () =>
      "Nhân sự đã có phân công hoặc chấm công — chuyển trạng thái sang Đã nghỉ thay vì xóa.",
  },
  {
    match: /Crew role is in use/i,
    vi: () => "Vị trí đang được dùng — không xóa được.",
  },
  {
    match: /crew_member_id must be a crew member with status/i,
    vi: () => "Chỉ phân công được nhân sự đang làm.",
  },
  {
    match: /crew_member_id does not exist/i,
    vi: () => "Nhân sự không tồn tại.",
  },
  { match: /role_id does not exist/i, vi: () => "Vị trí không tồn tại." },

  // ── Generic, last: one-step status guards across several modules ─────────
  {
    match: /Invalid status transition/i,
    vi: () => "Trạng thái chỉ đi một chiều — không chuyển ngược lại được.",
  },
  {
    match: /not found$/i,
    vi: () => "Không tìm thấy dữ liệu — có thể đã bị xóa.",
  },
];

/**
 * True when the backend said something specific that no entry covers, so the
 * user is about to get a per-status fallback. Logged in dev (never in prod, and
 * never shown) so the map can grow from real traffic instead of guesswork.
 */
export function unmappedApiMessage(
  status: number,
  backendMessage?: string
): string | undefined {
  if (!backendMessage) return undefined;
  if (MESSAGES.some((entry) => entry.match.test(backendMessage)))
    return undefined;
  return `[crm-web] unmapped API error (${status}): ${backendMessage}`;
}

/**
 * The Vietnamese sentence for a backend rejection.
 *
 * `fallback` is the caller's own "Không thể …" line, used when the status has no
 * wording of its own (a 5xx or a network failure gets the generic outage
 * sentence instead, because "không thể cập nhật công trình" would blame the
 * data for an outage).
 */
export function apiErrorMessage({
  status,
  backendMessage,
  fallback,
}: {
  status?: number;
  backendMessage?: string;
  fallback?: string;
}): string {
  if (backendMessage) {
    for (const entry of MESSAGES) {
      const matched = backendMessage.match(entry.match);
      if (matched) return entry.vi(matched);
    }
  }
  if (status && status >= 500) return SERVER_ERROR;
  if (!status) return NETWORK_ERROR;
  return STATUS_FALLBACK[status] ?? fallback ?? SERVER_ERROR;
}
