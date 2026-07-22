import {
  Body,
  Controller,
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
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";

import { toBig } from "../common/coerce";
import { PrismaService } from "../prisma/prisma.service";

const ROLE = ["tho_chinh", "tho_phu", "ve_sinh", "giam_sat", "lai_xe"];
const CREW_STATUS = ["dang_lam", "tam_nghi", "nghi_viec"];

// ── Crew (nhân sự) ──────────────────────────────────────────────────────────
class CreateCrewDto {
  @IsString() @MinLength(2) name: string;
  @IsString() @MinLength(6) phone: string;
  @IsIn(ROLE) role: string;
  @IsInt() @Min(0) day_rate: number;
  @IsIn(CREW_STATUS) status: string;
  @IsOptional() @IsString() note?: string;
}

class UpdateCrewDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsIn(ROLE) role?: string;
  @IsOptional() @IsInt() @Min(0) day_rate?: number;
  @IsOptional() @IsIn(CREW_STATUS) status?: string;
  @IsOptional() @IsString() note?: string;
}

@Controller("crew")
class CrewController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.crewMember.findMany();
  }

  @Get(":id")
  async get(@Param("id", ParseIntPipe) id: number) {
    const row = await this.prisma.crewMember.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Crew member not found");
    return row;
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateCrewDto) {
    return this.prisma.crewMember.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        role: dto.role,
        day_rate: toBig(dto.day_rate)!,
        status: dto.status,
        note: dto.note ?? null,
      },
    });
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateCrewDto
  ) {
    await this.get(id);
    const data: Record<string, unknown> = { ...dto };
    if (dto.day_rate !== undefined) data.day_rate = toBig(dto.day_rate);
    return this.prisma.crewMember.update({ where: { id }, data });
  }
}

// ── Assignments (phân công) ─────────────────────────────────────────────────
class ReconcileAssignmentDto {
  @IsString() @MinLength(1) project_code: string;
  @IsOptional() @IsArray() @IsInt({ each: true }) crew_ids?: number[];
}

@Controller("assignments")
class AssignmentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Query("project_code") projectCode?: string) {
    return this.prisma.assignment.findMany({
      where: projectCode ? { project_code: projectCode } : undefined,
    });
  }

  // Replace the crew staffed onto a project with the given set (add/remove
  // reconcile), matching the UI's assign-crew action.
  @Post()
  @HttpCode(201)
  async reconcile(@Body() dto: ReconcileAssignmentDto) {
    const crewIds = dto.crew_ids ?? [];
    return this.prisma.$transaction(async (tx) => {
      await tx.assignment.deleteMany({
        where: { project_code: dto.project_code },
      });
      if (crewIds.length) {
        await tx.assignment.createMany({
          data: crewIds.map((crew_id) => ({
            crew_id,
            project_code: dto.project_code,
          })),
        });
      }
      return tx.assignment.findMany({
        where: { project_code: dto.project_code },
      });
    });
  }
}

@Module({ controllers: [CrewController, AssignmentsController] })
export class CrewModule {}
