import dayjs from "dayjs";
import { use, useState } from "react";

import type { ProjectRef, TimekeepingLog } from "../../types";
import { ApiError, apiFetch } from "../../utils/api/api";
import { computeShiftPreview } from "../../utils/compute-shift-preview/compute-shift-preview";
import { cachedFetch, invalidate } from "../../utils/query-cache/query-cache";

// Submit form: công trình được phân công + ngày + giờ vào/ra (giờ lẻ — the API
// computes hours from the pair; end at-or-before start = ca qua đêm).
export function HomePage({
  onOpenHistory,
  onAuthLost,
}: {
  onOpenHistory: () => void;
  onAuthLost: () => void;
}) {
  const projects = use(
    cachedFetch("projects", () =>
      apiFetch<ProjectRef[]>({ path: "/worker/projects" })
    )
  );

  const [projectId, setProjectId] = useState<number | null>(
    projects[0]?.id ?? null
  );
  const [workDate, setWorkDate] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [startTime, setStartTime] = useState("07:30");
  const [endTime, setEndTime] = useState("17:00");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const preview = computeShiftPreview({ start: startTime, end: endTime });
  const overnight = preview !== null && endTime <= startTime;

  const handleSubmit = async () => {
    if (projectId === null) return;
    setBusy(true);
    setMessage(null);
    try {
      await apiFetch<TimekeepingLog>({
        path: "/worker/timekeeping",
        method: "POST",
        body: {
          project_id: projectId,
          work_date: workDate,
          start_time: startTime,
          end_time: endTime,
          ...(note.trim() ? { note: note.trim() } : {}),
        },
      });
      invalidate("history");
      setMessage({ ok: true, text: "Đã gửi chấm công — chờ duyệt." });
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        onAuthLost();
        return;
      }
      setMessage({
        ok: false,
        text:
          caught instanceof Error
            ? caught.message
            : "Có lỗi xảy ra, vui lòng thử lại",
      });
    } finally {
      setBusy(false);
    }
  };

  if (projects.length === 0) {
    return (
      <div className="screen-message">
        <p>
          Bạn chưa được phân công vào công trình nào — liên hệ văn phòng để được
          phân công.
        </p>
        <button type="button" className="btn ghost" onClick={onOpenHistory}>
          Lịch sử chấm công
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <label className="field">
        Công trình
        <select
          value={projectId ?? ""}
          onChange={(event) => setProjectId(Number(event.target.value))}
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.code} · {project.name}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        Ngày làm
        <input
          type="date"
          value={workDate}
          onChange={(event) => setWorkDate(event.target.value)}
        />
      </label>

      <div className="field-row">
        <label className="field">
          Giờ vào
          <input
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
          />
        </label>
        <label className="field">
          Giờ ra
          <input
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
          />
        </label>
      </div>

      <p className="hint">
        {preview === null
          ? "Giờ vào / giờ ra chưa hợp lệ."
          : `≈ ${preview} giờ${overnight ? " (ca qua đêm)" : ""}`}
      </p>

      <label className="field">
        Ghi chú (không bắt buộc)
        <textarea
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>

      <button
        type="button"
        className="btn"
        disabled={busy || preview === null || projectId === null}
        onClick={handleSubmit}
      >
        {busy ? "Đang gửi…" : "Gửi chấm công"}
      </button>

      {message ? (
        <p className={message.ok ? "success" : "error"}>{message.text}</p>
      ) : null}

      <button type="button" className="btn ghost" onClick={onOpenHistory}>
        Lịch sử chấm công
      </button>
    </div>
  );
}
