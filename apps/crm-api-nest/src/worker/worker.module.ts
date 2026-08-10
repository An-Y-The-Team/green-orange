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
} from "class-validator";
import type { Response } from "express";

import { CurrentCrew, Worker } from "../auth/crew.decorator";
import { businessToday } from "../common/business-date";
import { toDate } from "../common/coerce";
import { type PageQuery, pageArgs, withTotalCount } from "../common/pagination";
import { assertProjectOpen } from "../common/project-lock";
import {
  TIMEKEEPING_SOURCE_ZALO,
  TIMEKEEPING_STATUS_APPROVED,
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

// "HH:mm" pair → decimal hours, end at-or-before start crosses midnight (+24h).
// Exported for the unit test — not a route.
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

class SubmitTimekeepingDto {
  @IsInt() project_id: number;
  @IsDateString() work_date: string;
  @Matches(HH_MM) start_time: string;
  @Matches(HH_MM) end_time: string;
  @IsOptional() @IsString() note?: string;
}

/**
 * The whole submit path, exported for the unit test (fake-prisma pattern):
 * 1. an Assignment must cover work_date — being on the roster is not enough,
 *    the worker must be phân công on that project that day (403 otherwise);
 * 2. the project must be open (409 via assertProjectOpen);
 * 3. hours come from the start/end pair, never from the client;
 * 4. upsert on the same 4-col key as POST /timekeeping: pending and rejected
 *    rows are overwritten back to pending (resubmission after rejection), an
 *    approved day is locked (409) — chỉ văn phòng sửa được công đã duyệt.
 */
export const submitWorkerTimekeeping = async (
  prisma: PrismaService,
  crewMemberId: number,
  dto: SubmitTimekeepingDto
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
  const hours = computeShiftHours(dto.start_time, dto.end_time);

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

  const fields = {
    hours,
    start_time: dto.start_time,
    end_time: dto.end_time,
    note: dto.note ?? null,
    status: TIMEKEEPING_STATUS_PENDING,
  };
  return prisma.timekeepingRecord.upsert({
    where: { crew_member_id_project_id_work_date_source: key },
    create: { ...key, ...fields },
    update: fields,
  });
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

  @Post("timekeeping")
  @HttpCode(201)
  submit(
    @CurrentCrew() crewMemberId: number,
    @Body() dto: SubmitTimekeepingDto
  ) {
    return submitWorkerTimekeeping(this.prisma, crewMemberId, dto);
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
