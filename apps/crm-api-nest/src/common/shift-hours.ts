import { BadRequestException } from "@nestjs/common";

// Full hours 00–23 at the DTO edge so computeShiftHours only ever sees valid
// clock times.
export const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

// Odd hours are the norm on site, but a shift longer than this is a typo
// (swapped AM/PM), not a workday — approval is the control for everything else.
export const MAX_SHIFT_HOURS = 16;

// "HH:mm" pair → decimal hours, end at-or-before start crosses midnight (+24h).
// Used wherever a pair is CLAIMED by hand — the worker's remedy and the office's
// manual entry. Neither gives us dates to subtract, so the +24h guess is the
// best available and an impossible span is a typo worth rejecting.
export const computeShiftHours = (start: string, end: string): number => {
  const minutes = (t: string): number => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  let diff = minutes(end) - minutes(start);
  if (diff <= 0) diff += 24 * 60;
  const hours = Math.round((diff / 60) * 100) / 100;
  if (hours > MAX_SHIFT_HOURS) {
    throw new BadRequestException(
      `Ca làm vượt quá ${MAX_SHIFT_HOURS} giờ — kiểm tra lại giờ vào / giờ ra`
    );
  }
  return hours;
};
