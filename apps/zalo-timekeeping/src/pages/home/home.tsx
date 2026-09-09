import dayjs from "dayjs";
import { type ChangeEvent, use, useState } from "react";

import { QueryKey } from "../../constants/query-keys";
import type { OpenShift, ProjectRef, ShiftResponse } from "../../types";
import { ApiError, apiFetch } from "../../utils/api/api";
import { cachedFetch, invalidate } from "../../utils/query-cache/query-cache";

// How the device clock is shown before a clock-in. Approximate on purpose: the
// stamp that gets recorded is the server's, and this only tells the worker
// roughly what they are about to record.
const NOW_FORMAT = "DD/MM/YYYY HH:mm";

/**
 * The clock screen. Which of the three states shows is decided entirely by the
 * server's open shift, never by anything this device remembers:
 *   no shift    → pick a công trình and chấm công vào
 *   open        → chấm công ra
 *   open, stale → they forgot to chấm công ra; only đơn bù công can close it
 */
export function HomePage({
  onOpenHistory,
  onOpenRemedy,
  onAuthLost,
}: {
  onOpenHistory: () => void;
  onOpenRemedy: (shift: OpenShift | null) => void;
  onAuthLost: () => void;
}) {
  const { shift } = use(
    cachedFetch(QueryKey.SHIFT, () =>
      apiFetch<ShiftResponse>({ path: "/worker/shift" })
    )
  );
  const projects = use(
    cachedFetch(QueryKey.PROJECTS, () =>
      apiFetch<ProjectRef[]>({ path: "/worker/projects" })
    )
  );

  const [projectId, setProjectId] = useState<number | null>(
    projects[0]?.id ?? null
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A 401 means the crew token is gone; every other failure is shown as the
  // server's own Vietnamese sentence, which the worker can act on.
  const report = (caught: unknown) => {
    if (caught instanceof ApiError && caught.status === 401) {
      onAuthLost();
      return;
    }
    setError(
      caught instanceof Error
        ? caught.message
        : "Có lỗi xảy ra, vui lòng thử lại"
    );
  };

  // Clock in. No time in the body — the server stamps it, so a wrong or
  // tampered phone clock cannot change what is recorded.
  const handleClockIn = async () => {
    if (projectId === null) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch({
        path: "/worker/clock-in",
        method: "POST",
        body: { project_id: projectId },
      });
      // Re-read the shift rather than assuming it: what renders next is the
      // server's stamp, so the worker sees exactly what was recorded.
      invalidate(QueryKey.SHIFT);
      invalidate(QueryKey.HISTORY);
    } catch (caught) {
      report(caught);
    } finally {
      // Load-bearing, not just cosmetic: this is the re-render that makes the
      // invalidated shift read run again (and suspend) — without it the screen
      // would keep showing the pre-tap state.
      setBusy(false);
    }
  };

  // Clock out. Also bodiless: the open shift is found by the token.
  const handleClockOut = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch({ path: "/worker/clock-out", method: "POST" });
      invalidate(QueryKey.SHIFT);
      invalidate(QueryKey.HISTORY);
    } catch (caught) {
      report(caught);
    } finally {
      // Load-bearing, not just cosmetic: this is the re-render that makes the
      // invalidated shift read run again (and suspend) — without it the screen
      // would keep showing the pre-tap state.
      setBusy(false);
    }
  };

  const handleSelectProject = (event: ChangeEvent<HTMLSelectElement>) =>
    setProjectId(Number(event.target.value));

  const openRemedyForShift = () => onOpenRemedy(shift);
  const openBlankRemedy = () => onOpenRemedy(null);

  const errorLine = error ? (
    <p className="error" role="alert">
      {error}
    </p>
  ) : null;

  if (shift) {
    const startedOn = dayjs(shift.work_date).format("DD/MM/YYYY");
    return (
      <div className="page">
        <div className="shift-card">
          <p className="hint">Đang làm tại</p>
          <p className="shift-project">
            {shift.project?.code} · {shift.project?.name}
          </p>
          <p className="shift-detail">
            Vào lúc {shift.start_time} · {startedOn}
          </p>
        </div>

        {shift.stale ? (
          <>
            <p className="warning" role="alert">
              Bạn quên chấm công ra cho ca ngày {startedOn}. Gửi đơn bù công để
              văn phòng duyệt giờ ra.
            </p>
            <button type="button" className="btn" onClick={openRemedyForShift}>
              Gửi đơn bù công
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={handleClockOut}
          >
            {busy ? "Đang gửi…" : "Chấm công ra"}
          </button>
        )}

        {errorLine}

        <button type="button" className="btn ghost" onClick={onOpenHistory}>
          Lịch sử chấm công
        </button>
      </div>
    );
  }

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
        <select value={projectId ?? ""} onChange={handleSelectProject}>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.code} · {project.name}
            </option>
          ))}
        </select>
      </label>

      <p className="hint">Bây giờ ~{dayjs().format(NOW_FORMAT)}</p>

      <button
        type="button"
        className="btn"
        disabled={busy || projectId === null}
        onClick={handleClockIn}
      >
        {busy ? "Đang gửi…" : "Chấm công vào"}
      </button>

      {errorLine}

      <button type="button" className="btn ghost" onClick={openBlankRemedy}>
        Tôi quên chấm công
      </button>
      <button type="button" className="btn ghost" onClick={onOpenHistory}>
        Lịch sử chấm công
      </button>
    </div>
  );
}
