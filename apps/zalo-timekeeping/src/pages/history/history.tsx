import dayjs from "dayjs";
import { use } from "react";

import { QueryKey } from "../../constants/query-keys";
import {
  FLAG_OVER_CAP,
  MAX_SHIFT_HOURS,
} from "../../constants/timekeeping-flags";
import {
  TIMEKEEPING_STATUS_LABELS,
  TimekeepingStatus,
} from "../../constants/timekeeping-status";
import type { TimekeepingLog } from "../../types";
import { apiFetch } from "../../utils/api/api";
import { cachedFetch } from "../../utils/query-cache/query-cache";

// Own submissions, newest first (the API's default window is the last month).
export function HistoryPage({ onBack }: { onBack: () => void }) {
  const logs = use(
    cachedFetch(QueryKey.HISTORY, () =>
      apiFetch<TimekeepingLog[]>({ path: "/worker/timekeeping" })
    )
  );

  return (
    <div className="page">
      <button type="button" className="btn ghost" onClick={onBack}>
        ← Chấm công
      </button>

      {logs.length === 0 ? (
        <p className="hint">Chưa có chấm công nào trong tháng qua.</p>
      ) : (
        <ul className="log-list">
          {logs.map((log) => (
            <li key={log.id} className="log-item">
              <div>
                <p className="log-title">
                  {dayjs(log.work_date).format("DD/MM/YYYY")} ·{" "}
                  {log.project?.code}
                </p>
                <p className="log-detail">
                  {log.start_time && log.end_time
                    ? `${log.start_time}–${log.end_time} · `
                    : null}
                  {/* An open shift has no end and no hours yet — printing
                      "0 giờ" would read as a day that earned nothing. */}
                  {log.status === TimekeepingStatus.OPEN
                    ? `từ ${log.start_time} · chưa chấm ra`
                    : `${log.hours} giờ`}
                  {log.note ? ` · ${log.note}` : null}
                </p>
                {log.remedy_reason ? (
                  <p className="log-detail">
                    Đơn bù công · {log.remedy_reason}
                  </p>
                ) : null}
                {log.status === TimekeepingStatus.REJECTED ? (
                  <p className="log-detail">
                    Bị từ chối — gửi lại ngày này để duyệt lại.
                  </p>
                ) : null}
                {log.flag === FLAG_OVER_CAP ? (
                  <p className="log-detail">
                    Ca dài quá {MAX_SHIFT_HOURS} giờ nên đã tính tối đa{" "}
                    {MAX_SHIFT_HOURS} giờ — văn phòng sẽ xem lại.
                  </p>
                ) : null}
              </div>
              <span className={`chip ${log.status}`}>
                {TIMEKEEPING_STATUS_LABELS[log.status] ?? log.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
