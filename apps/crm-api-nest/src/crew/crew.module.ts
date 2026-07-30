import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";
import type { Response } from "express";

import { businessToday } from "../common/business-date";
import { toDate } from "../common/coerce";
import { type PageQuery, pageArgs, withTotalCount } from "../common/pagination";
import { assertProjectOpen } from "../common/project-lock";
import { PrismaService } from "../prisma/prisma.service";

const EMPLOYMENT_TYPE = ["permanent", "day_hire"];
// Only a working member can take a NEW assignment — see assertAssignmentRefs.
const CREW_STATUS_WORKING = "working";
const CREW_STATUS = [CREW_STATUS_WORKING, "on_leave", "left"];
// Manual is the source of truth for a member+day — see timekeepingSummary.
const TIMEKEEPING_SOURCE_MANUAL = "manual";
const TIMEKEEPING_SOURCE = [TIMEKEEPING_SOURCE_MANUAL, "zalo_app"];

// GET /timekeeping has all-optional filters over the fastest-growing table (one
// row per member per work day per source), so a dateless call used to sort the
// whole table. Callers that care about older records must send `from`/`to`.
const DEFAULT_TIMEKEEPING_WINDOW_DAYS = 31;

// businessToday() (not `new Date()`) so the window lines up with the business
// calendar day the @db.Date work_date column stores.
const defaultWindowStart = (): Date => {
  const start = businessToday();
  start.setUTCDate(start.getUTCDate() - DEFAULT_TIMEKEEPING_WINDOW_DAYS);
  return start;
};

// ── Crew roles (vai trò) — user-managed name list ───────────────────────────
class CreateCrewRoleDto {
  @IsString() @MinLength(1) name: string;
}

class UpdateCrewRoleDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
}

@Controller("crew-roles")
class CrewRolesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.crewRole.findMany({ orderBy: { name: "asc" } });
  }

  @Get(":id")
  async get(@Param("id", ParseIntPipe) id: number) {
    const row = await this.prisma.crewRole.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Crew role not found");
    return row;
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateCrewRoleDto) {
    return this.prisma.crewRole.create({ data: { name: dto.name } });
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateCrewRoleDto
  ) {
    await this.get(id);
    return this.prisma.crewRole.update({ where: { id }, data: { ...dto } });
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id", ParseIntPipe) id: number) {
    await this.get(id);
    const [members, assignments] = await Promise.all([
      this.prisma.crewMember.count({ where: { default_role_id: id } }),
      this.prisma.assignment.count({ where: { role_id: id } }),
    ]);
    if (members || assignments)
      throw new ConflictException(
        "Crew role is in use by members or assignments"
      );
    await this.prisma.crewRole.delete({ where: { id } });
  }
}

// ── Crew members (nhân sự) ──────────────────────────────────────────────────
class CreateCrewDto {
  @IsString() @MinLength(1) name: string;
  @IsOptional() @IsString() phone?: string;
  @IsIn(EMPLOYMENT_TYPE) employment_type: string;
  @IsOptional() @IsInt() default_role_id?: number;
  @IsOptional() @IsIn(CREW_STATUS) status?: string;
  @IsOptional() @IsString() note?: string;
}

class UpdateCrewDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsIn(EMPLOYMENT_TYPE) employment_type?: string;
  @IsOptional() @IsInt() default_role_id?: number;
  @IsOptional() @IsIn(CREW_STATUS) status?: string;
  @IsOptional() @IsString() note?: string;
}

@Controller("crew")
// (exported for the X-Total-Count unit test in crew.test.ts)
export class CrewController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(
    @Res({ passthrough: true }) res: Response,
    @Query() page: PageQuery,
    @Query("status") status?: string,
    @Query("employment_type") employmentType?: string
  ) {
    // One `where`, both queries — a filtered list reports its filtered total,
    // never the whole roster.
    const where = {
      ...(status ? { status } : {}),
      ...(employmentType ? { employment_type: employmentType } : {}),
    };
    return withTotalCount(
      res,
      this.prisma.crewMember.findMany({
        where,
        include: { default_role: true },
        // Namesakes are common on a roster — id breaks the tie so pages are
        // stable.
        orderBy: [{ name: "asc" }, { id: "asc" }],
        ...pageArgs(page),
      }),
      this.prisma.crewMember.count({ where })
    );
  }

  @Get(":id")
  async get(@Param("id", ParseIntPipe) id: number) {
    const row = await this.prisma.crewMember.findUnique({
      where: { id },
      include: {
        default_role: true,
        assignments: {
          include: {
            project: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });
    if (!row) throw new NotFoundException("Crew member not found");
    return row;
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateCrewDto) {
    return this.prisma.crewMember.create({
      data: {
        name: dto.name,
        phone: dto.phone ?? null,
        employment_type: dto.employment_type,
        default_role_id: dto.default_role_id ?? null,
        ...(dto.status ? { status: dto.status } : {}),
        note: dto.note ?? null,
      },
      include: { default_role: true },
    });
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateCrewDto
  ) {
    const exists = await this.prisma.crewMember.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException("Crew member not found");
    return this.prisma.crewMember.update({
      where: { id },
      data: { ...dto },
      include: { default_role: true },
    });
  }

  // Roster keeps day-hire history for re-hire — deleting worked people is
  // wrong, so refuse when the member has any work trail.
  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id", ParseIntPipe) id: number) {
    const exists = await this.prisma.crewMember.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException("Crew member not found");
    const [assignments, timekeeping] = await Promise.all([
      this.prisma.assignment.count({ where: { crew_member_id: id } }),
      this.prisma.timekeepingRecord.count({ where: { crew_member_id: id } }),
    ]);
    if (assignments || timekeeping)
      throw new ConflictException(
        "Crew member has assignments or timekeeping records; set status to 'left' instead"
      );
    await this.prisma.crewMember.delete({ where: { id } });
  }
}

// ── Assignments (phân công) ─────────────────────────────────────────────────
class CreateAssignmentDto {
  @IsInt() project_id: number;
  @IsInt() crew_member_id: number;
  @IsOptional() @IsInt() role_id?: number;
  @IsDateString() from_date: string;
  @IsOptional() @IsDateString() to_date?: string;
}

// No project_id: moving an assignment between projects is delete-and-recreate,
// not an edit. Allowing it here would write into the *destination* project
// while update() only holds the closed-project lock on the source, so a PATCH
// could drop crew into a settled job and change its printed worker list.
class UpdateAssignmentDto {
  @IsOptional() @IsInt() crew_member_id?: number;
  @IsOptional() @IsInt() role_id?: number;
  @IsOptional() @IsDateString() from_date?: string;
  @IsOptional() @IsDateString() to_date?: string;
}

// Both FKs, one place, so create and update can never drift. Without this an
// unknown id reaches Prisma and P2003 surfaces as 409 "record is still
// referenced by related records" — the opposite of what happened. The status
// rule is the server half of the picker filter: a member who has left must not
// land on a new phân công (and from there on the printed worker list).
// Exported for the unit test — not a route, no decorator.
export const assertAssignmentRefs = async (
  prisma: PrismaService,
  refs: { crew_member_id?: number; role_id?: number | null }
) => {
  if (refs.crew_member_id !== undefined) {
    const member = await prisma.crewMember.findUnique({
      where: { id: refs.crew_member_id },
    });
    if (!member) throw new BadRequestException("crew_member_id does not exist");
    if (member.status !== CREW_STATUS_WORKING)
      throw new BadRequestException(
        `crew_member_id must be a crew member with status "${CREW_STATUS_WORKING}"`
      );
  }
  // null clears the role override — only a given id needs to exist.
  if (refs.role_id != null) {
    const role = await prisma.crewRole.findUnique({
      where: { id: refs.role_id },
    });
    if (!role) throw new BadRequestException("role_id does not exist");
  }
};

@Controller("assignments")
class AssignmentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(
    @Res({ passthrough: true }) res: Response,
    @Query() page: PageQuery,
    @Query("project_id") projectId?: string,
    @Query("crew_member_id") crewMemberId?: string
  ) {
    const where = {
      ...(projectId ? { project_id: Number(projectId) } : {}),
      ...(crewMemberId ? { crew_member_id: Number(crewMemberId) } : {}),
    };
    return withTotalCount(
      res,
      this.prisma.assignment.findMany({
        where,
        include: { crew_member: true, role: true },
        // A crew intake shares one from_date across rows — id breaks the tie.
        orderBy: [{ from_date: "desc" }, { id: "desc" }],
        ...pageArgs(page),
      }),
      this.prisma.assignment.count({ where })
    );
  }

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateAssignmentDto) {
    await assertProjectOpen(this.prisma, dto.project_id);
    await assertAssignmentRefs(this.prisma, dto);
    const row = await this.prisma.assignment.create({
      data: {
        project_id: dto.project_id,
        crew_member_id: dto.crew_member_id,
        role_id: dto.role_id ?? null,
        from_date: toDate(dto.from_date)!,
        to_date: toDate(dto.to_date),
      },
      include: { crew_member: true, role: true },
    });
    return this.withOverlaps(row);
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateAssignmentDto
  ) {
    const exists = await this.prisma.assignment.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException("Assignment not found");
    await assertProjectOpen(this.prisma, exists.project_id);
    // Same assertions as create. Only the fields actually sent are checked, so
    // fixing the dates of an old assignment whose member has since left still
    // works — the status rule applies to who you assign, not to editing history.
    await assertAssignmentRefs(this.prisma, dto);
    const data: Record<string, unknown> = { ...dto };
    if (dto.from_date !== undefined) data.from_date = toDate(dto.from_date);
    if ("to_date" in dto) data.to_date = toDate(dto.to_date);
    const row = await this.prisma.assignment.update({
      where: { id },
      data,
      include: { crew_member: true, role: true },
    });
    return this.withOverlaps(row);
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id", ParseIntPipe) id: number) {
    const exists = await this.prisma.assignment.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException("Assignment not found");
    await assertProjectOpen(this.prisma, exists.project_id);
    await this.prisma.assignment.delete({ where: { id } });
  }

  // Double-booking is allowed and common — `overlaps` only feeds the UI's
  // non-blocking warning, never a rejection.
  private async withOverlaps(row: {
    id: number;
    crew_member_id: number;
    from_date: Date;
    to_date: Date | null;
  }) {
    const overlaps = await this.prisma.assignment.findMany({
      where: {
        crew_member_id: row.crew_member_id,
        id: { not: row.id },
        // other.to_date ≥ this.from_date (or open-ended) …
        OR: [{ to_date: null }, { to_date: { gte: row.from_date } }],
        // … and other.from_date ≤ this.to_date (unless this is open-ended)
        ...(row.to_date ? { from_date: { lte: row.to_date } } : {}),
      },
      include: { project: { select: { id: true, code: true, name: true } } },
    });
    return { ...row, overlaps };
  }
}

// ── Timekeeping (chấm công) ─────────────────────────────────────────────────
class CreateTimekeepingDto {
  @IsInt() crew_member_id: number;
  @IsInt() project_id: number;
  @IsDateString() work_date: string;
  @IsNumber() @Min(0) hours: number;
  @IsIn(TIMEKEEPING_SOURCE) source: string;
  @IsOptional() @IsString() note?: string;
}

class TimekeepingSummaryQuery {
  @IsInt() @Min(1) project_id: number;
}

/**
 * One project's chấm công totals: hours summed and distinct work days counted,
 * over EVERY row the project has. The execution panel used to reduce one page of
 * GET /timekeeping, so past MAX_PAGE_SIZE rows it could only show a lower bound.
 *
 * Manual WINS over zalo_app per member+day — it does not sum. The weekly grid
 * renders `manual?.hours ?? zalo?.hours` and shows a lone zalo_app cell
 * read-only (timekeeping-tab.tsx `cellFor`/`hoursFor`), so a day whose zalo
 * hours were corrected by hand holds two rows but displays one number; summing
 * both would count it twice. `recorded_days` counts a day that has any row,
 * matching the grid showing that cell filled.
 *
 * No from/to: the panel compares the figure against `actual_duration_days`,
 * which is a whole-công-trình number. The list endpoint's default window exists
 * to bound its PAGE; this returns two numbers whatever the range, so a window
 * would only be a way to get a wrong total. Add one when a caller wants a month.
 *
 * Exported for the unit test — not a route, no decorator.
 */
export const timekeepingSummary = async (
  prisma: PrismaService,
  projectId: number
) => {
  // groupBy, not findMany: no page limit to get wrong, and only the three
  // columns the rule needs leave Postgres (never ids or notes).
  // ponytail: one group per member+day+source is still O(rows) into this
  // process — a few tens of thousands of tiny rows for a multi-year công
  // trình, which is fine. If it ever isn't, this becomes a $queryRaw with
  // `DISTINCT ON (crew_member_id, work_date) ORDER BY source = 'manual' DESC`
  // and the rule below moves into SQL.
  const groups = await prisma.timekeepingRecord.groupBy({
    by: ["crew_member_id", "work_date", "source"],
    where: { project_id: projectId },
    _sum: { hours: true },
  });

  // One entry per member+day. A manual group overwrites whatever a zalo_app one
  // put there and blocks the reverse, so row order out of Postgres (unordered
  // by definition) cannot change the answer.
  const hoursPerMemberDay = new Map<string, number>();
  const days = new Set<string>();
  for (const group of groups) {
    const day = group.work_date.toISOString().slice(0, 10);
    days.add(day);
    const key = `${group.crew_member_id}|${day}`;
    const isManual = group.source === TIMEKEEPING_SOURCE_MANUAL;
    if (!isManual && hoursPerMemberDay.has(key)) continue;
    hoursPerMemberDay.set(key, Number(group._sum?.hours ?? 0));
  }

  const total = [...hoursPerMemberDay.values()].reduce((sum, h) => sum + h, 0);
  return {
    project_id: projectId,
    // Hours are halves in practice, but float addition still produces
    // 15.299999999999999 — round it before it reaches the panel.
    total_hours: Math.round(total * 100) / 100,
    recorded_days: days.size,
  };
};

@Controller("timekeeping")
class TimekeepingController {
  constructor(private readonly prisma: PrismaService) {}

  // A dateless call gets the last DEFAULT_TIMEKEEPING_WINDOW_DAYS, not all time:
  // the weekly grid renders 7 days and refetches after every cell save, so the
  // window is what it actually needs. Send `from`/`to` for anything older.
  @Get()
  list(
    @Res({ passthrough: true }) res: Response,
    @Query() page: PageQuery,
    @Query("project_id") projectId?: string,
    @Query("crew_member_id") crewMemberId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    // One `where`, both queries — the total counts the same window as the rows,
    // default included, not the whole (fastest-growing) table.
    const where = {
      ...(projectId ? { project_id: Number(projectId) } : {}),
      ...(crewMemberId ? { crew_member_id: Number(crewMemberId) } : {}),
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
        // Several members share a work_date — id breaks the tie.
        orderBy: [{ work_date: "desc" }, { id: "desc" }],
        ...pageArgs(page),
      }),
      this.prisma.timekeepingRecord.count({ where })
    );
  }

  // Literal segment, so it MUST stay above any ":id" route: Nest matches in
  // declaration order and a `@Get(":id")` declared first would take "summary"
  // as an id (ParseIntPipe → 400). There is no GET /timekeeping/:id today; this
  // sits where one would go.
  @Get("summary")
  summary(@Query() query: TimekeepingSummaryQuery) {
    return timekeepingSummary(this.prisma, query.project_id);
  }

  // Upsert: re-entering a day overwrites that source's row. Manual is source
  // of truth; a zalo_app row may coexist for the same day (future ingest path
  // uses this same endpoint).
  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateTimekeepingDto) {
    await assertProjectOpen(this.prisma, dto.project_id);
    const key = {
      crew_member_id: dto.crew_member_id,
      project_id: dto.project_id,
      work_date: toDate(dto.work_date)!,
      source: dto.source,
    };
    return this.prisma.timekeepingRecord.upsert({
      where: { crew_member_id_project_id_work_date_source: key },
      create: { ...key, hours: dto.hours, note: dto.note ?? null },
      update: { hours: dto.hours, note: dto.note ?? null },
    });
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id", ParseIntPipe) id: number) {
    const exists = await this.prisma.timekeepingRecord.findUnique({
      where: { id },
    });
    if (!exists) throw new NotFoundException("Timekeeping record not found");
    await assertProjectOpen(this.prisma, exists.project_id);
    await this.prisma.timekeepingRecord.delete({ where: { id } });
  }
}

@Module({
  controllers: [
    CrewRolesController,
    CrewController,
    AssignmentsController,
    TimekeepingController,
  ],
})
export class CrewModule {}
