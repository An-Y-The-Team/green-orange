import { use } from "react";

import { QueryKey } from "../../constants/query-keys";
import {
  FLAG_OVER_CAP,
  MAX_SHIFT_HOURS,
} from "../../constants/timekeeping-flags";
import {
  TIMEKEEPING_STATUS_GLYPHS,
  TIMEKEEPING_STATUS_LABELS,
  TimekeepingStatus,
} from "../../constants/timekeeping-status";
import type { RemedyPrefill, TimekeepingLog } from "../../types";
import { apiFetch } from "../../utils/api/api";
import { formatDay } from "../../utils/format-day/format-day";
import { formatHours } from "../../utils/format-hours/format-hours";
import { cachedFetch } from "../../utils/query-cache/query-cache";

// Own submissions, newest first (the API's default window is the last month).
// The worker's real question is "how much this month?", so the answer sits on
// top, summed from the same rows — no extra endpoint.
export function HistoryPage({
  onBack,
  onResubmit,
}: {
  onBack: () => void;
  onResubmit: (args: { prefill: RemedyPrefill }) => void;
}) {
  const logs = use(
    cachedFetch(QueryKey.HISTORY, () =>
      apiFetch<TimekeepingLog[]>({ path: "/worker/timekeeping" })
    )
  );

  const approved = logs.filter(
    (log) => log.status === TimekeepingStatus.APPROVED
  );
  const approvedHours = approved.reduce((sum, log) => sum + log.hours, 0);
  const pendingCount = logs.filter(
    (log) => log.status === TimekeepingStatus.PENDING
  ).length;

  // Reopens đơn bù công with this row's day and công trình already filled in.
  const handleResubmit = (log: TimekeepingLog) =>
    onResubmit({
      prefill: { projectId: log.project_id, workDate: log.work_date },
    });

  return (
    <div className="page">
      <button type="button" className="btn link back" onClick={onBack}>
        ← Quay lại
      </button>

      <h1 className="page-title">Lịch sử chấm công</h1>

      {logs.length === 0 ? (
        <p className="hint">Chưa có chấm công nào trong tháng qua.</p>
      ) : (
        <>
          <div className="summary">
            <p className="hint">Tháng qua, đã duyệt</p>
            <p className="summary-main">
              {approved.length} công · {formatHours({ hours: approvedHours })}
            </p>
            {pendingCount > 0 ? (
              <p className="shift-detail">{pendingCount} công đang chờ duyệt</p>
            ) : null}
          </div>

          <ul className="log-list">
            {logs.map((log) => (
              <li key={log.id} className="log-item">
                <div className="log-body">
                  <p className="log-title">
                    {formatDay({ date: log.work_date })}
                  </p>
                  <p className="log-detail">{log.project?.name}</p>
                  <p className="log-detail">
                    {/* An open shift has no end and no hours yet — printing
                        "0 giờ" would read as a day that earned nothing. */}
                    {log.status === TimekeepingStatus.OPEN
                      ? `Vào ${log.start_time} · chưa chấm ra`
                      : `${log.start_time && log.end_time ? `${log.start_time}–${log.end_time} · ` : ""}${formatHours({ hours: log.hours })}`}
                    {log.note ? ` · ${log.note}` : null}
                  </p>
                  {log.remedy_reason ? (
                    <p className="log-detail">
                      Đơn bù công · {log.remedy_reason}
                    </p>
                  ) : null}
                  {log.flag === FLAG_OVER_CAP ? (
                    <p className="log-detail">
                      Ca dài quá {MAX_SHIFT_HOURS} giờ nên tính tối đa{" "}
                      {MAX_SHIFT_HOURS} giờ. Văn phòng sẽ xem lại.
                    </p>
                  ) : null}
                  {log.status === TimekeepingStatus.REJECTED ? (
                    <button
                      type="button"
                      className="btn link inline"
                      onClick={() => handleResubmit(log)}
                    >
                      Gửi lại ngày này
                    </button>
                  ) : null}
                </div>
                <span className={`chip ${log.status}`}>
                  {TIMEKEEPING_STATUS_GLYPHS[log.status] ?? ""}{" "}
                  {TIMEKEEPING_STATUS_LABELS[log.status] ?? log.status}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
