"use client";

import { useState } from "react";

import { Button } from "@yan/ui/components/button";
import { DateInput } from "@yan/ui/components/date-input/date-input";
import { Input } from "@yan/ui/components/input";
import { Label } from "@yan/ui/components/label";
import { Select } from "@yan/ui/components/select";

import { FIELDS } from "@/constants/labels";
import { useRun } from "@/hooks/use-run/use-run";
import { todayISO } from "@/utils/today-iso/today-iso";

import { upsertTimekeeping } from "../../../../actions/timekeeping";
import type { CrewMember, TimekeepingRecord } from "../../../../types";

// Same defaults as the worker's "Báo quên chấm công" form in the Zalo app.
const DEFAULT_START = "07:30";
const DEFAULT_END = "17:00";

/**
 * The office's chấm công by giờ vào / giờ ra — the grid cells only take a bare
 * number of hours. Hours are computed by the server from the pair, so there is
 * no hours field here to get wrong.
 *
 * Ngày and the two times survive a save on purpose: the usual job is the same
 * day for the next person on the list.
 */
export function ManualEntryForm({
  projectId,
  members,
  onSaved,
}: {
  projectId: number;
  members: CrewMember[];
  onSaved: (record: TimekeepingRecord) => void;
}) {
  const [memberId, setMemberId] = useState("");
  const [workDate, setWorkDate] = useState(() => todayISO());
  const [startTime, setStartTime] = useState(DEFAULT_START);
  const [endTime, setEndTime] = useState(DEFAULT_END);
  const [note, setNote] = useState("");

  // Hand the saved row to the grid and clear only the per-person fields.
  const handleSaved = (record?: TimekeepingRecord) => {
    if (!record) return;
    onSaved(record);
    setMemberId("");
    setNote("");
  };

  const [isPending, save] = useRun<
    {
      crew_member_id: number;
      work_date: string;
      start_time: string;
      end_time: string;
      note?: string;
    },
    TimekeepingRecord
  >(upsertTimekeeping.bind(null, projectId), handleSaved);

  const handleSubmit = () =>
    save({
      crew_member_id: Number(memberId),
      work_date: workDate,
      start_time: startTime,
      end_time: endTime,
      note: note.trim() || undefined,
    });

  const canSave = Boolean(memberId && workDate && startTime && endTime);

  return (
    <div className="grid grid-cols-2 items-end gap-2 rounded-lg border p-3 sm:grid-cols-[minmax(10rem,1fr)_auto_auto_auto_minmax(8rem,1fr)_auto]">
      <div className="col-span-2 space-y-1.5 sm:col-span-1">
        <Label htmlFor="tk-member">{FIELDS.crew}</Label>
        <Select
          id="tk-member"
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
        >
          <option value="">— Chọn người —</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="col-span-2 space-y-1.5 sm:col-span-1">
        <Label htmlFor="tk-date">Ngày</Label>
        <DateInput id="tk-date" value={workDate} onChange={setWorkDate} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tk-start">Giờ vào</Label>
        <Input
          id="tk-start"
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tk-end">Giờ ra</Label>
        <Input
          id="tk-end"
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />
      </div>
      <div className="col-span-2 space-y-1.5 sm:col-span-1">
        <Label htmlFor="tk-note">{FIELDS.note}</Label>
        <Input
          id="tk-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <Button
        className="col-span-2 sm:col-span-1"
        disabled={isPending || !canSave}
        onClick={handleSubmit}
      >
        Lưu giờ công
      </Button>
    </div>
  );
}
