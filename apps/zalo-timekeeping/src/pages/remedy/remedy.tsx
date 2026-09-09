import dayjs from "dayjs";
import { type ChangeEvent, use, useState } from "react";

import { QueryKey } from "../../constants/query-keys";
import type { OpenShift, ProjectRef } from "../../types";
import { ApiError, apiFetch } from "../../utils/api/api";
import { computeShiftPreview } from "../../utils/compute-shift-preview/compute-shift-preview";
import { cachedFetch, invalidate } from "../../utils/query-cache/query-cache";

// Mirrors MIN_REMEDY_REASON_LENGTH in crm-api-nest's worker.module.ts — the API
// rejects anything shorter, so the button stays disabled rather than letting the
// worker submit into a 400 they cannot read.
const MIN_REASON_LENGTH = 5;

const DEFAULT_START_TIME = "07:30";
const DEFAULT_END_TIME = "17:00";

/**
 * Đơn bù công — the exception path. Times here are CLAIMED, not stamped, so a lý
 * do is mandatory and the row lands chờ duyệt for the operator to judge.
 *
 * With `shiftToClose` set the worker forgot to chấm công ra: the công trình,
 * ngày and giờ vào are the server's own record and are shown read-only, because
 * the stamp is not theirs to rewrite — only the giờ ra is in question.
 */
export function RemedyPage({
  shiftToClose,
  onDone,
  onBack,
  onAuthLost,
}: {
  shiftToClose: OpenShift | null;
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
    shiftToClose?.project?.id ?? projects[0]?.id ?? null
  );
  const [workDate, setWorkDate] = useState(
    () => shiftToClose?.work_date ?? dayjs().format("YYYY-MM-DD")
  );
  const [startTime, setStartTime] = useState(
    shiftToClose?.start_time ?? DEFAULT_START_TIME
  );
  const [endTime, setEndTime] = useState(DEFAULT_END_TIME);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = computeShiftPreview({ start: startTime, end: endTime });
  const overnight = preview !== null && endTime <= startTime;
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
          ...(note.trim() ? { note: note.trim() } : {}),
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
      setError(
        caught instanceof Error
          ? caught.message
          : "Có lỗi xảy ra, vui lòng thử lại"
      );
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
  const handleNoteChange = (event: ChangeEvent<HTMLTextAreaElement>) =>
    setNote(event.target.value);

  const closingShift = shiftToClose !== null;

  return (
    <div className="page">
      <button type="button" className="btn ghost" onClick={onBack}>
        ← Chấm công
      </button>

      <h1 className="page-title">Đơn bù công</h1>
      <p className="hint">
        {closingShift
          ? "Giờ vào đã được ghi nhận khi bạn chấm công vào. Nhập giờ ra và lý do để văn phòng duyệt."
          : "Dùng khi bạn quên chấm công. Văn phòng sẽ duyệt dựa trên lý do bạn ghi."}
      </p>

      {closingShift ? (
        <div className="shift-card">
          <p className="hint">Công trình</p>
          <p className="shift-project">
            {shiftToClose.project?.code} · {shiftToClose.project?.name}
          </p>
          <p className="shift-detail">
            Ngày {dayjs(workDate).format("DD/MM/YYYY")} · vào lúc {startTime}
          </p>
        </div>
      ) : (
        <>
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

      <p className="hint">
        {preview === null
          ? "Giờ vào / giờ ra chưa hợp lệ."
          : `≈ ${preview} giờ${overnight ? " (ca qua đêm)" : ""}`}
      </p>

      <label className="field">
        Lý do <span aria-hidden="true">*</span>
        <textarea
          rows={2}
          required
          aria-required="true"
          value={reason}
          onChange={handleReasonChange}
          placeholder="Ví dụ: điện thoại hết pin nên không chấm công ra được."
        />
      </label>

      <label className="field">
        Ghi chú (không bắt buộc)
        <textarea rows={2} value={note} onChange={handleNoteChange} />
      </label>

      <button
        type="button"
        className="btn"
        disabled={
          busy || preview === null || reasonTooShort || projectId === null
        }
        onClick={handleSubmit}
      >
        {busy ? "Đang gửi…" : "Gửi đơn bù công"}
      </button>

      {reasonTooShort ? <p className="hint">Nhập lý do để gửi đơn.</p> : null}

      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
