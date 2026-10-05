import {
  Body,
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
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
import type { Response } from "express";

import { businessToday } from "../common/business-date";
import { toDate } from "../common/coerce";
import { type PageQuery, pageArgs, withTotalCount } from "../common/pagination";
import { assertProjectOpen } from "../common/project-lock";
import { advanceIfPaperworkReady } from "../common/stage";
import { PrismaService } from "../prisma/prisma.service";

const PAPERWORK_STATUS = ["preparing", "submitted", "approved"];
// The stage that needs the item approved. Only "execution" items gate the
// auto-advance to Thi công (common/stage.ts paperworkReady).
const NEEDED_FOR = ["execution", "acceptance", "settlement"];

// F41: the dashboard's "Hồ sơ quá hạn" panel prints a công trình code, and the
// only way to get one was fetching /projects and joining in JS — a paginated
// window, so an older project's row rendered `#id`. Same idea as
// receivables.module.ts PROJECT_INCLUDE. List path only: a per-project read
// (?project_id=) already knows its project.
const PROJECT_INCLUDE = {
  project: { select: { id: true, code: true } },
};

// Stage-4 checklist defaults — user-facing names stay Vietnamese (data, not enum).
// Exported: POST /projects auto-seeds these on project creation. The last three
// are later-stage documents seeded up front so the checklist holds the whole
// paper trail; their `needed_for` keeps them from blocking Thi công.
export const DEFAULT_PAPERWORK = [
  { name: "Giấy phép thi công", needed_for: "execution" },
  { name: "PCCC", needed_for: "execution" },
  { name: "Danh sách nhân sự", needed_for: "execution" },
  { name: "Danh sách thiết bị", needed_for: "execution" },
  { name: "Hợp đồng", needed_for: "execution" },
  { name: "Đề nghị thanh toán", needed_for: "settlement" },
  { name: "Biên bản nghiệm thu khối lượng", needed_for: "acceptance" },
  { name: "Biên bản quyết toán", needed_for: "settlement" },
];
const DEFAULT_NAMES = DEFAULT_PAPERWORK.map((d) => d.name);

// ── Paperwork items (hồ sơ) ─────────────────────────────────────────────────
class CreatePaperworkItemDto {
  @IsInt() project_id: number;
  @IsString() @MinLength(1) name: string;
  @IsOptional() @IsIn(PAPERWORK_STATUS) status?: string;
  @IsOptional() @IsDateString() due_date?: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsIn(NEEDED_FOR) needed_for?: string;
}

class UpdatePaperworkItemDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsIn(PAPERWORK_STATUS) status?: string;
  @IsOptional() @IsDateString() due_date?: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsIn(NEEDED_FOR) needed_for?: string;
}

class SeedDefaultsDto {
  @IsInt() project_id: number;
}

@Controller("paperwork-items")
class PaperworkItemsController {
  constructor(private readonly prisma: PrismaService) {}

  // The due_date filter is `overdue=true` rather than a raw date bound: overdue
  // is DERIVED (due_date < today && status != approved) and belongs on the
  // server, or every consumer rebuilds the rule — which is exactly what the
  // dashboard did while fetching every project's checklist (F20). It already
  // implies a status, so it replaces `status=` instead of contradicting it.
  @Get()
  list(
    @Res({ passthrough: true }) res: Response,
    @Query() page: PageQuery,
    @Query("project_id") projectId?: string,
    @Query("status") status?: string,
    @Query("overdue") overdue?: string
  ) {
    // One `where`, both queries — so the count applies the same derived overdue
    // rule as the rows instead of counting the whole checklist table.
    const where = {
      project_id: projectId ? Number(projectId) : undefined,
      ...(overdue === "true"
        ? { due_date: { lt: businessToday() }, status: { not: "approved" } }
        : { status: status || undefined }),
    };
    return withTotalCount(
      res,
      this.prisma.paperworkItem.findMany({
        where,
        include: PROJECT_INCLUDE,
        orderBy: { id: "asc" },
        ...pageArgs(page),
      }),
      this.prisma.paperworkItem.count({ where })
    );
  }

  @Get(":id")
  async get(@Param("id", ParseIntPipe) id: number) {
    const row = await this.prisma.paperworkItem.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Paperwork item not found");
    return row;
  }

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreatePaperworkItemDto) {
    await assertProjectOpen(this.prisma, dto.project_id);
    return this.prisma.paperworkItem.create({
      data: {
        project_id: dto.project_id,
        name: dto.name,
        status: dto.status ?? "preparing",
        due_date: toDate(dto.due_date),
        note: dto.note ?? null,
        needed_for: dto.needed_for ?? "execution",
      },
    });
  }

  // Seed the default checklist items, skipping names the project already
  // has. Returns the project's full item list.
  @Post("defaults")
  @HttpCode(201)
  async seedDefaults(@Body() dto: SeedDefaultsDto) {
    await assertProjectOpen(this.prisma, dto.project_id);
    const existing = await this.prisma.paperworkItem.findMany({
      where: { project_id: dto.project_id, name: { in: DEFAULT_NAMES } },
      select: { name: true },
    });
    const have = new Set(existing.map((r) => r.name));
    await this.prisma.paperworkItem.createMany({
      data: DEFAULT_PAPERWORK.filter((d) => !have.has(d.name)).map((d) => ({
        project_id: dto.project_id,
        ...d,
      })),
    });
    return this.prisma.paperworkItem.findMany({
      where: { project_id: dto.project_id },
      orderBy: { id: "asc" },
    });
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdatePaperworkItemDto
  ) {
    const row = await this.get(id);
    await assertProjectOpen(this.prisma, row.project_id);
    const { due_date, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest };
    if (due_date !== undefined) data.due_date = toDate(due_date);
    const updated = await this.prisma.paperworkItem.update({
      where: { id },
      data,
    });
    await advanceIfPaperworkReady(this.prisma, row.project_id);
    return updated;
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id", ParseIntPipe) id: number) {
    const row = await this.get(id);
    await assertProjectOpen(this.prisma, row.project_id);
    await this.prisma.paperworkItem.delete({ where: { id } });
    // Removing the last unapproved item can complete the checklist.
    await advanceIfPaperworkReady(this.prisma, row.project_id);
  }
}

@Module({ controllers: [PaperworkItemsController] })
export class PaperworkModule {}
