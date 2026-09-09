import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Module,
  NotFoundException,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from "class-validator";
import type { Response } from "express";

import { CurrentCrew, Worker } from "../auth/crew.decorator";
import {
  businessDateString,
  businessTimeString,
  businessToday,
} from "../common/business-date";
import { toDate } from "../common/coerce";
import { type PageQuery, pageArgs, withTotalCount } from "../common/pagination";
import { assertProjectOpen } from "../common/project-lock";
import {
  TIMEKEEPING_SOURCE_ZALO,
  TIMEKEEPING_STATUS_APPROVED,
  TIMEKEEPING_STATUS_OPEN,
  TIMEKEEPING_STATUS_PENDING,
  defaultWindowStart,
} from "../crew/crew.module";
import { PrismaService } from "../prisma/prisma.service";

// The mini-app surface. Class-level @Worker() is the auth boundary itself:
// JwtGuard accepts ONLY crew tokens here and rejects them everywhere else, so
// a leaked crew JWT can never read the CRM. Every handler scopes its queries
// by the token's crew_member_id — a worker sees exactly their own rows.
// Error messages are Vietnamese: the mini app shows them to workers verbatim.

// Full hours 00–23 at the DTO edge so computeShiftHours only ever sees valid
// clock times.
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

// Odd hours are the norm on site, but a shift longer than this is a typo
// (swapped AM/PM), not a workday — approval is the control for everything else.
export const MAX_SHIFT_HOURS = 16;

// Set on a clock-out whose real span exceeded MAX_SHIFT_HOURS: the hours are
// clamped to the cap and the row is flagged so the operator looks at it.
export const FLAG_OVER_CAP = "over_cap";

/**
 * A STAMPED shift's hours, from the two server stamps. Exported for the unit test.
 *
 * Not computeShiftHours: that one only has an "HH:mm" pair and so must guess
 * `end <= start` means "+24h", which cannot tell an 8-hour overnight from a
 * 32-hour abandoned one. Here both dates are known, so the span is the real
 * elapsed time — which is what makes the cap enforceable rather than assumed.
 *
 * Over the cap we clamp and flag instead of rejecting: refusing the clock-out
 * would leave the shift open forever with no way for the worker to close it.
 */
export const stampedShiftHours = ({
  startDate,
  startTime,
  endDate,
  endTime,
}: {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}): { hours: number; flag: string | null } => {
  // Both instants in one fixed frame — Vietnam has no DST, so a UTC subtraction
  // of two local wall-clock readings is the true elapsed time.
  const at = (date: string, time: string) =>
    new Date(`${date}T${time}:00.000Z`).getTime();
  const minutes = (at(endDate, endTime) - at(startDate, startTime)) / 60_000;
  // Clock skew or a same-minute in/out reads as 0, never negative hours.
  const hours = Math.max(0, Math.round((minutes / 60) * 100) / 100);
  return hours > MAX_SHIFT_HOURS
    ? { hours: MAX_SHIFT_HOURS, flag: FLAG_OVER_CAP }
    : { hours, flag: null };
};

// "HH:mm" pair → decimal hours, end at-or-before start crosses midnight (+24h).
// Only the remedy path uses this: a worker claiming times by hand gives us no
// dates to subtract, so the +24h guess is the best available and an impossible
// span is a typo worth rejecting. Exported for the unit test — not a route.
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

// A lý do short enough to be meaningless ("ok", ".") tells the operator nothing,
// and they have to decide on it. Extracted so the DTO and its test agree.
export const MIN_REMEDY_REASON_LENGTH = 5;

class ClockInDto {
  @IsInt() project_id: number;
}

/**
 * Đơn bù công — the worker CLAIMS a start/end pair for a day they did not clock,
 * so unlike a clock-in/out these times are not stamped and a lý do is required.
 */
class RemedyDto {
  @IsInt() project_id: number;
  @IsDateString() work_date: string;
  @Matches(HH_MM) start_time: string;
  @Matches(HH_MM) end_time: string;
  @IsString() @MinLength(MIN_REMEDY_REASON_LENGTH) reason: string;
  @IsOptional() @IsString() note?: string;
}

/**
 * The whole remedy path, exported for the unit test (fake-prisma pattern):
 * 1. an Assignment must cover work_date — being on the roster is not enough,
 *    the worker must be phân công on that project that day (403 otherwise);
 * 2. the project must be open (409 via assertProjectOpen);
 * 3. hours come from the start/end pair, never from the client;
 * 4. an OPEN row's start_time was stamped by the server, so a remedy closing it
 *    may only claim the end — the stamp is not the worker's to rewrite;
 * 5. upsert on the same 4-col key as POST /timekeeping: pending and rejected
 *    rows are overwritten back to pending (resubmission after rejection), an
 *    approved day is locked (409) — chỉ văn phòng sửa được công đã duyệt.
 */
export const submitRemedy = async (
  prisma: PrismaService,
  crewMemberId: number,
  dto: RemedyDto
) => {
  const workDate = toDate(dto.work_date)!;

  const assignment = await prisma.assignment.findFirst({
    where: {
      crew_member_id: crewMemberId,
      project_id: dto.project_id,
      from_date: { lte: workDate },
      OR: [{ to_date: null }, { to_date: { gte: workDate } }],
    },
  });
  if (!assignment) {
    throw new ForbiddenException(
      "Bạn không được phân công vào công trình này ngày đó"
    );
  }

  await assertProjectOpen(prisma, dto.project_id);

  const key = {
    crew_member_id: crewMemberId,
    project_id: dto.project_id,
    work_date: workDate,
    source: TIMEKEEPING_SOURCE_ZALO,
  };
  const existing = await prisma.timekeepingRecord.findUnique({
    where: { crew_member_id_project_id_work_date_source: key },
  });
  if (existing?.status === TIMEKEEPING_STATUS_APPROVED) {
    throw new ConflictException("Công đã được duyệt, liên hệ văn phòng để sửa");
  }

  // Closing an open shift keeps the server's stamp; only a day with no clock-in
  // at all takes the claimed start.
  const startTime =
    existing?.status === TIMEKEEPING_STATUS_OPEN && existing.start_time
      ? existing.start_time
      : dto.start_time;
  const hours = computeShiftHours(startTime, dto.end_time);

  const fields = {
    hours,
    start_time: startTime,
    end_time: dto.end_time,
    note: dto.note ?? null,
    remedy_reason: dto.reason,
    status: TIMEKEEPING_STATUS_PENDING,
    // The times are now claimed and explained, so a previous over-cap clock-out
    // has been superseded — leaving the flag would tell the operator to doubt
    // numbers the worker has already accounted for.
    flag: null,
  };
  const record = await prisma.timekeepingRecord.upsert({
    where: { crew_member_id_project_id_work_date_source: key },
    create: { ...key, ...fields },
    update: fields,
  });
  return record;
};

/**
 * Clock in — the server stamps the time, the client never sends one. Exported
 * for the unit test.
 *
 * The open-shift check is a findFirst over the worker's rows, NOT a lookup on
 * the composite key: the shift they forgot to close may be on another công
 * trình, and one worker may only have one shift running at a time.
 */
export const clockIn = async (
  prisma: PrismaService,
  crewMemberId: number,
  projectId: number
) => {
  const today = businessToday();

  const assignment = await prisma.assignment.findFirst({
    where: {
      crew_member_id: crewMemberId,
      project_id: projectId,
      from_date: { lte: today },
      OR: [{ to_date: null }, { to_date: { gte: today } }],
    },
  });
  if (!assignment) {
    throw new ForbiddenException(
      "Bạn không được phân công vào công trình này ngày đó"
    );
  }

  await assertProjectOpen(prisma, projectId);

  const open = await prisma.timekeepingRecord.findFirst({
    where: { crew_member_id: crewMemberId, status: TIMEKEEPING_STATUS_OPEN },
  });
  if (open) {
    throw new ConflictException(
      "Bạn còn một ca chưa chấm công ra — chấm ra hoặc gửi đơn bù công trước"
    );
  }

  const key = {
    crew_member_id: crewMemberId,
    project_id: projectId,
    work_date: today,
    source: TIMEKEEPING_SOURCE_ZALO,
  };
  const existing = await prisma.timekeepingRecord.findUnique({
    where: { crew_member_id_project_id_work_date_source: key },
  });
  // One continuous shift per worker per công trình per day: lunch is inside it.
  if (existing) {
    throw new ConflictException(
      "Đã chấm công hôm nay — dùng đơn bù công nếu cần sửa"
    );
  }

  const record = await prisma.timekeepingRecord.create({
    data: {
      ...key,
      hours: 0,
      start_time: businessTimeString(),
      status: TIMEKEEPING_STATUS_OPEN,
    },
  });
  return record;
};

/**
 * Clock out — closes the worker's open shift with the server's stamp. Exported
 * for the unit test.
 *
 * work_date is never recomputed: a 01:00 clock-out has a different
 * businessToday() than its 22:00 clock-in, and re-deriving it would move the row
 * off the day it belongs to (and off its composite key).
 */
export const clockOut = async (prisma: PrismaService, crewMemberId: number) => {
  const open = await prisma.timekeepingRecord.findFirst({
    where: { crew_member_id: crewMemberId, status: TIMEKEEPING_STATUS_OPEN },
    // Oldest first: if several ever exist, close the one they forgot.
    orderBy: [{ work_date: "asc" }, { id: "asc" }],
  });
  if (!open) {
    // A lost response on a site connection makes the worker tap again. If today's
    // shift is already closed, that retry succeeded the first time — reporting an
    // error would send them to the office over a network blip.
    const closed = await prisma.timekeepingRecord.findFirst({
      where: {
        crew_member_id: crewMemberId,
        source: TIMEKEEPING_SOURCE_ZALO,
        work_date: businessToday(),
        status: TIMEKEEPING_STATUS_PENDING,
        remedy_reason: null,
      },
    });
    if (closed) return closed;
    throw new NotFoundException("Bạn chưa chấm công vào");
  }

  await assertProjectOpen(prisma, open.project_id);

  const now = new Date();
  const { hours, flag } = stampedShiftHours({
    // How the interceptor renders a @db.Date back to the client — the same slice
    // keeps this comparison in the column's own calendar.
    startDate: open.work_date.toISOString().slice(0, 10),
    startTime: open.start_time ?? "00:00",
    endDate: businessDateString(now),
    endTime: businessTimeString(now),
  });

  const record = await prisma.timekeepingRecord.update({
    where: { id: open.id },
    data: {
      hours,
      flag,
      end_time: businessTimeString(now),
      status: TIMEKEEPING_STATUS_PENDING,
    },
  });
  return record;
};

@Worker()
@Controller("worker")
class WorkerController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("me")
  async me(@CurrentCrew() crewMemberId: number) {
    const member = await this.prisma.crewMember.findUnique({
      where: { id: crewMemberId },
      select: { id: true, name: true, phone: true, status: true },
    });
    // A member deleted after their token was minted — treat as unknown login.
    if (!member) throw new NotFoundException("Crew member not found");
    return member;
  }

  // Projects the worker may log time on TODAY: an assignment window covering
  // businessToday() on a project that is not closed. The submit path re-checks
  // per work_date, so this list is purely the picker.
  @Get("projects")
  async projects(@CurrentCrew() crewMemberId: number) {
    const today = businessToday();
    const assignments = await this.prisma.assignment.findMany({
      where: {
        crew_member_id: crewMemberId,
        from_date: { lte: today },
        OR: [{ to_date: null }, { to_date: { gte: today } }],
        project: { stage: { not: "closed" } },
      },
      select: {
        project: { select: { id: true, code: true, name: true } },
      },
      orderBy: { from_date: "desc" },
    });
    // Overlapping assignments are allowed — dedupe to one entry per project.
    const byId = new Map(
      assignments.map(({ project }) => [project.id, project])
    );
    return [...byId.values()];
  }

  /**
   * The open shift, or none. Always an envelope: a bare `null` body would make
   * the mini app's `response.json()` throw on an empty 200.
   *
   * `stale` means they forgot to clock out on an earlier day — the app hides
   * "Chấm công ra" for it (a tap-out now would be capped-and-flagged nonsense)
   * and offers đơn bù công instead.
   */
  @Get("shift")
  async shift(@CurrentCrew() crewMemberId: number) {
    const open = await this.prisma.timekeepingRecord.findFirst({
      where: { crew_member_id: crewMemberId, status: TIMEKEEPING_STATUS_OPEN },
      include: { project: { select: { id: true, code: true, name: true } } },
      orderBy: [{ work_date: "asc" }, { id: "asc" }],
    });
    if (!open) return { shift: null };
    return {
      shift: {
        id: open.id,
        project: open.project,
        work_date: open.work_date,
        start_time: open.start_time,
        stale: open.work_date < businessToday(),
      },
    };
  }

  @Post("clock-in")
  @HttpCode(201)
  clockIn(@CurrentCrew() crewMemberId: number, @Body() dto: ClockInDto) {
    return clockIn(this.prisma, crewMemberId, dto.project_id);
  }

  // No body: the only thing this needs is which worker, and the token says that.
  @Post("clock-out")
  @HttpCode(200)
  clockOut(@CurrentCrew() crewMemberId: number) {
    return clockOut(this.prisma, crewMemberId);
  }

  @Post("remedy")
  @HttpCode(201)
  remedy(@CurrentCrew() crewMemberId: number, @Body() dto: RemedyDto) {
    return submitRemedy(this.prisma, crewMemberId, dto);
  }

  // Own zalo_app rows only, newest first, same default window as the operator
  // list (GET /timekeeping) — send from/to for older history.
  @Get("timekeeping")
  history(
    @Res({ passthrough: true }) res: Response,
    @CurrentCrew() crewMemberId: number,
    @Query() page: PageQuery,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    const where = {
      crew_member_id: crewMemberId,
      source: TIMEKEEPING_SOURCE_ZALO,
      ...(from || to
        ? {
            work_date: {
              ...(from ? { gte: toDate(from)! } : {}),
              ...(to ? { lte: toDate(to)! } : {}),
            },
          }
        : { work_date: { gte: defaultWindowStart() } }),
    };
    return withTotalCount(
      res,
      this.prisma.timekeepingRecord.findMany({
        where,
        include: { project: { select: { id: true, code: true, name: true } } },
        orderBy: [{ work_date: "desc" }, { id: "desc" }],
        ...pageArgs(page),
      }),
      this.prisma.timekeepingRecord.count({ where })
    );
  }
}

@Module({
  controllers: [WorkerController],
})
export class WorkerModule {}
