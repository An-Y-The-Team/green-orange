import dayjs from "dayjs";
import { type ChangeEvent, type MouseEvent, use, useState } from "react";

import { QueryKey } from "../../constants/query-keys";
import { REMEDY_REASONS } from "../../constants/remedy-reasons";
import { MAX_SHIFT_HOURS } from "../../constants/timekeeping-flags";
import type { OpenShift, ProjectRef, RemedyPrefill } from "../../types";
import { ApiError, apiFetch } from "../../utils/api/api";
import { computeShiftPreview } from "../../utils/compute-shift-preview/compute-shift-preview";
import { formatDay } from "../../utils/format-day/format-day";
import { formatHours } from "../../utils/format-hours/format-hours";
import { cachedFetch, invalidate } from "../../utils/query-cache/query-cache";

// Mirrors MIN_REMEDY_REASON_LENGTH in crm-api-nest's worker.module.ts — the API
// rejects anything shorter, so the button stays disabled rather than letting the
// worker submit into a 400 they cannot read.
const MIN_REASON_LENGTH = 5;

const DEFAULT_START_TIME = "07:30";
const DEFAULT_END_TIME = "17:00";

/**
 * Đơn bù công — the exception path, named "Báo quên chấm công" on every button
 * so the worker meets one phrase. Times here are CLAIMED, not stamped, so a lý
 * do is mandatory and the row lands chờ duyệt for the operator to judge.
 *
 * With `shiftToClose` set the worker forgot to chấm công ra: the công trình,
 * ngày and giờ vào are the server's own record and are shown read-only, because
 * the stamp is not theirs to rewrite — only the giờ ra is in question.
 * With `prefill` set they are resubmitting a rejected day from history.
 */
export function RemedyPage({
  shiftToClose,
  prefill,
  onDone,
  onBack,
  onAuthLost,
}: {
  shiftToClose: OpenShift | null;
  prefill: RemedyPrefill | null;
  onDone: () => void;
  onBack: () => void;
  onAuthLost: () => void;
}) {
  // Only needed when the worker picks a day themselves; closing a known shift
  // already carries its own project.
  const projects = use(
    cachedFetch(QueryKey.PROJECTS, () =>
      apiFetch<ProjectRef[]>({ path: "/worker/projects" })
    )
  );

  const [projectId, setProjectId] = useState<number | null>(
    shiftToClose?.project?.id ?? prefill?.projectId ?? projects[0]?.id ?? null
  );
  const [workDate, setWorkDate] = useState(
    () =>
      shiftToClose?.work_date ??
      prefill?.workDate ??
      dayjs().format("YYYY-MM-DD")
  );
  const [startTime, setStartTime] = useState(
    shiftToClose?.start_time ?? DEFAULT_START_TIME
  );
  const [endTime, setEndTime] = useState(DEFAULT_END_TIME);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = computeShiftPreview({ start: startTime, end: endTime });
  const overnight = preview !== null && endTime <= startTime;
  // A cleared <input type="time"> reads as "" — that is "not chosen yet", while
  // two full times with a null preview can only mean the span is over the cap.
  const timesChosen = startTime !== "" && endTime !== "";
  const reasonTooShort = reason.trim().length < MIN_REASON_LENGTH;

  const handleSubmit = async () => {
    if (projectId === null || preview === null || reasonTooShort) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch({
        path: "/worker/remedy",
        method: "POST",
        body: {
          project_id: projectId,
          work_date: workDate,
          start_time: startTime,
          end_time: endTime,
          reason: reason.trim(),
        },
      });
      // The submission may have closed the open shift, so both reads are stale.
      invalidate(QueryKey.SHIFT);
      invalidate(QueryKey.HISTORY);
      onDone();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        onAuthLost();
        return;
      }
      setError(caught instanceof Error ? caught.message : "Có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  };

  const handleSelectProject = (event: ChangeEvent<HTMLSelectElement>) =>
    setProjectId(Number(event.target.value));
  const handleDateChange = (event: ChangeEvent<HTMLInputElement>) =>
    setWorkDate(event.target.value);
  const handleStartChange = (event: ChangeEvent<HTMLInputElement>) =>
    setStartTime(event.target.value);
  const handleEndChange = (event: ChangeEvent<HTMLInputElement>) =>
    setEndTime(event.target.value);
  const handleReasonChange = (event: ChangeEvent<HTMLTextAreaElement>) =>
    setReason(event.target.value);
  // A chip fills the textarea; the worker can still edit or add to it.
  const handlePickReason = (event: MouseEvent<HTMLButtonElement>) =>
    setReason(event.currentTarget.value);

  const closingShift = shiftToClose !== null;

  const previewLine = !timesChosen
    ? "Chọn giờ vào và giờ ra."
    : preview === null
      ? `Ca dài quá ${MAX_SHIFT_HOURS} giờ, kiểm tra lại giờ vào / giờ ra.`
      : `Khoảng ${formatHours({ hours: preview })}${overnight ? " (ca qua đêm)" : ""}`;

  return (
    <div className="page">
      <button type="button" className="btn link back" onClick={onBack}>
        ← Quay lại
      </button>

      <h1 className="page-title">Báo quên chấm công</h1>
      <p className="hint">
        {closingShift
          ? "Giờ vào đã được ghi khi bạn chấm công vào. Chỉ cần nhập giờ ra và lý do — văn phòng sẽ duyệt."
          : "Đơn bù công: dùng khi bạn quên chấm công. Văn phòng sẽ duyệt dựa trên lý do bạn ghi."}
      </p>

      {closingShift ? (
        <div className="shift-card">
          <p className="hint">Công trình</p>
          <p className="shift-project">{shiftToClose.project?.name}</p>
          <p className="shift-detail">
            {formatDay({ date: workDate })} · vào lúc {startTime}
          </p>
        </div>
      ) : (
        <>
          <label className="field">
            Công trình
            <select value={projectId ?? ""} onChange={handleSelectProject}>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            Ngày làm
            <input type="date" value={workDate} onChange={handleDateChange} />
          </label>

          <div className="field-row">
            <label className="field">
              Giờ vào
              <input
                type="time"
                value={startTime}
                onChange={handleStartChange}
              />
            </label>
            <label className="field">
              Giờ ra
              <input type="time" value={endTime} onChange={handleEndChange} />
            </label>
          </div>
        </>
      )}

      {closingShift ? (
        <label className="field">
          Giờ ra
          <input type="time" value={endTime} onChange={handleEndChange} />
        </label>
      ) : null}

      <p className={timesChosen && preview === null ? "error" : "hint"}>
        {previewLine}
      </p>

      <div className="field" role="group" aria-label="Lý do thường gặp">
        <span>Lý do (bắt buộc)</span>
        <div className="chip-row">
          {REMEDY_REASONS.map((text) => (
            <button
              key={text}
              type="button"
              className="chip-btn"
              value={text}
              aria-pressed={reason === text}
              onClick={handlePickReason}
            >
              {text}
            </button>
          ))}
        </div>
        <textarea
          rows={2}
          required
          aria-required="true"
          aria-label="Lý do"
          value={reason}
          onChange={handleReasonChange}
          placeholder="Chọn ở trên hoặc tự ghi lý do…"
        />
        {reasonTooShort ? (
          <p className="hint">Chọn hoặc ghi lý do để gửi được đơn.</p>
        ) : null}
      </div>

      <button
        type="button"
        className="btn primary"
        disabled={
          busy || preview === null || reasonTooShort || projectId === null
        }
        onClick={handleSubmit}
      >
        {busy ? "Đang gửi…" : "Gửi báo quên chấm công"}
      </button>

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
