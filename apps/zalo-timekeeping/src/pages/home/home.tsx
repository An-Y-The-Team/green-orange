import { type ChangeEvent, use, useState } from "react";

import { QueryKey } from "../../constants/query-keys";
import { useNow } from "../../hooks/use-now/use-now";
import type {
  OpenShift,
  ProjectRef,
  ShiftResponse,
  TimekeepingLog,
} from "../../types";
import { ApiError, apiFetch } from "../../utils/api/api";
import { formatDay } from "../../utils/format-day/format-day";
import { formatHours } from "../../utils/format-hours/format-hours";
import { cachedFetch, invalidate } from "../../utils/query-cache/query-cache";

/**
 * The clock screen. Which of the three states shows is decided entirely by the
 * server's open shift, never by anything this device remembers:
 *   no shift    → pick a công trình and chấm công vào
 *   open        → chấm công ra (two taps — a stamp cannot be undone from here)
 *   open, stale → they forgot to chấm công ra; only đơn bù công can close it
 */
export function HomePage({
  flash,
  onFlash,
  onOpenHistory,
  onOpenRemedy,
  onAuthLost,
}: {
  flash: string | null;
  onFlash: (args: { message: string }) => void;
  onOpenHistory: () => void;
  onOpenRemedy: (args: { shift: OpenShift | null }) => void;
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
  // Device clock, display only — the API stamps the real time. Shown so the
  // worker knows roughly what they are about to record.
  const now = useNow();

  // One công trình needs no choice. Two or more need a deliberate tap: a silent
  // default is how a shift lands on the wrong site.
  const [projectId, setProjectId] = useState<number | null>(
    projects.length === 1 ? (projects[0]?.id ?? null) : null
  );
  const [busy, setBusy] = useState(false);
  const [confirmingOut, setConfirmingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A 401 means the crew token is gone; every other failure already carries a
  // Vietnamese sentence (api.ts), which the worker can act on.
  const report = (caught: unknown) => {
    if (caught instanceof ApiError && caught.status === 401) {
      onAuthLost();
      return;
    }
    setError(caught instanceof Error ? caught.message : "Có lỗi xảy ra");
  };

  // Clock in. No time in the body — the server stamps it, so a wrong or
  // tampered phone clock cannot change what is recorded.
  const handleClockIn = async () => {
    if (projectId === null) return;
    setBusy(true);
    setError(null);
    try {
      const record = await apiFetch<TimekeepingLog>({
        path: "/worker/clock-in",
        method: "POST",
        body: { project_id: projectId },
      });
      onFlash({ message: `Đã chấm công vào lúc ${record.start_time ?? ""}` });
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

  // First tap only arms the button; a stamped clock-out is not undoable from
  // the app (the office fixes those), so a mis-tap must cost nothing.
  const handleArmClockOut = () => setConfirmingOut(true);
  const handleCancelClockOut = () => setConfirmingOut(false);

  // Clock out. Also bodiless: the open shift is found by the token.
  const handleClockOut = async () => {
    setBusy(true);
    setError(null);
    try {
      const record = await apiFetch<TimekeepingLog>({
        path: "/worker/clock-out",
        method: "POST",
      });
      onFlash({
        message: `Đã chấm công ra lúc ${record.end_time ?? ""} · ${formatHours({ hours: record.hours })}`,
      });
      invalidate(QueryKey.SHIFT);
      invalidate(QueryKey.HISTORY);
    } catch (caught) {
      report(caught);
    } finally {
      // Load-bearing, not just cosmetic: this is the re-render that makes the
      // invalidated shift read run again (and suspend) — without it the screen
      // would keep showing the pre-tap state.
      setConfirmingOut(false);
      setBusy(false);
    }
  };

  const handleSelectProject = (event: ChangeEvent<HTMLInputElement>) =>
    setProjectId(Number(event.target.value));

  const openRemedyForShift = () => onOpenRemedy({ shift });
  const openBlankRemedy = () => onOpenRemedy({ shift: null });

  const flashLine = flash ? (
    <p className="flash" role="status">
      ✓ {flash}
    </p>
  ) : null;

  const errorLine = error ? (
    <p className="error" role="alert">
      {error}
    </p>
  ) : null;

  const historyLink = (
    <button type="button" className="btn link" onClick={onOpenHistory}>
      Lịch sử chấm công
    </button>
  );

  if (shift) {
    return (
      <div className="page">
        {flashLine}

        <div className="shift-card">
          <p className="hint">Đã chấm công vào lúc</p>
          <p className="stamp">{shift.start_time}</p>
          <p className="shift-detail">{formatDay({ date: shift.work_date })}</p>
          <p className="shift-project">{shift.project?.name}</p>
        </div>

        {shift.stale ? (
          <>
            <p className="warning" role="alert">
              Bạn quên chấm công ra cho ca này. Hãy báo quên chấm công để văn
              phòng duyệt giờ ra.
            </p>
            <button
              type="button"
              className="btn primary"
              onClick={openRemedyForShift}
            >
              Báo quên chấm công ra
            </button>
          </>
        ) : confirmingOut ? (
          <>
            <button
              type="button"
              className="btn primary"
              disabled={busy}
              onClick={handleClockOut}
            >
              {busy ? "Đang gửi…" : `Xác nhận ra lúc ${now}`}
            </button>
            <button
              type="button"
              className="btn link"
              disabled={busy}
              onClick={handleCancelClockOut}
            >
              Chưa, quay lại
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn primary"
            onClick={handleArmClockOut}
          >
            Chấm công ra
          </button>
        )}

        {errorLine}

        <nav className="link-row">{historyLink}</nav>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="screen-message">
        <p>
          Bạn chưa được phân công vào công trình nào. Báo văn phòng để được phân
          công.
        </p>
        <nav className="link-row">{historyLink}</nav>
      </div>
    );
  }

  return (
    <div className="page">
      {flashLine}

      <div className="today">
        <p className="today-date">{formatDay({ date: new Date() })}</p>
        <p className="clock">{now}</p>
      </div>

      {projects.length === 1 ? (
        <div className="shift-card">
          <p className="hint">Công trình</p>
          <p className="shift-project">{projects[0]?.name}</p>
        </div>
      ) : (
        <fieldset className="project-list">
          <legend className="field-label">Chọn công trình</legend>
          {projects.map((project) => (
            <label key={project.id} className="project-card">
              <input
                type="radio"
                name="project"
                value={project.id}
                checked={projectId === project.id}
                onChange={handleSelectProject}
              />
              <span>{project.name}</span>
            </label>
          ))}
        </fieldset>
      )}

      <button
        type="button"
        className="btn primary"
        disabled={busy || projectId === null}
        onClick={handleClockIn}
      >
        {busy ? "Đang gửi…" : "Chấm công vào"}
      </button>
      {projectId === null ? (
        <p className="hint">Chọn công trình trước, rồi bấm Chấm công vào.</p>
      ) : null}

      {errorLine}

      <nav className="link-row">
        <button type="button" className="btn link" onClick={openBlankRemedy}>
          Báo quên chấm công
        </button>
        {historyLink}
      </nav>
    </div>
  );
}
