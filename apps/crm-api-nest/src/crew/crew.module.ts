import {
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

import { toDate } from "../common/coerce";
import { assertProjectOpen } from "../common/project-lock";
import { PrismaService } from "../prisma/prisma.service";

const EMPLOYMENT_TYPE = ["permanent", "day_hire"];
const CREW_STATUS = ["working", "on_leave", "left"];
const TIMEKEEPING_SOURCE = ["manual", "zalo_app"];

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
class CrewController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(
    @Query("status") status?: string,
    @Query("employment_type") employmentType?: string
  ) {
    return this.prisma.crewMember.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(employmentType ? { employment_type: employmentType } : {}),
      },
      include: { default_role: true },
      orderBy: { name: "asc" },
    });
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

class UpdateAssignmentDto {
  @IsOptional() @IsInt() project_id?: number;
  @IsOptional() @IsInt() crew_member_id?: number;
  @IsOptional() @IsInt() role_id?: number;
  @IsOptional() @IsDateString() from_date?: string;
  @IsOptional() @IsDateString() to_date?: string;
}

@Controller("assignments")
class AssignmentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(
    @Query("project_id") projectId?: string,
    @Query("crew_member_id") crewMemberId?: string
  ) {
    return this.prisma.assignment.findMany({
      where: {
        ...(projectId ? { project_id: Number(projectId) } : {}),
        ...(crewMemberId ? { crew_member_id: Number(crewMemberId) } : {}),
      },
      include: { crew_member: true, role: true },
      orderBy: { from_date: "desc" },
    });
  }

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateAssignmentDto) {
    await assertProjectOpen(this.prisma, dto.project_id);
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

@Controller("timekeeping")
class TimekeepingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(
    @Query("project_id") projectId?: string,
    @Query("crew_member_id") crewMemberId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.prisma.timekeepingRecord.findMany({
      where: {
        ...(projectId ? { project_id: Number(projectId) } : {}),
        ...(crewMemberId ? { crew_member_id: Number(crewMemberId) } : {}),
        ...(from || to
          ? {
              work_date: {
                ...(from ? { gte: toDate(from)! } : {}),
                ...(to ? { lte: toDate(to)! } : {}),
              },
            }
          : {}),
      },
      orderBy: { work_date: "desc" },
    });
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
