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
  Res,
} from "@nestjs/common";
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";
import type { Response } from "express";

import { businessToday } from "../common/business-date";
import { nextCode } from "../common/code";
import { toDate } from "../common/coerce";
import { type PageQuery, pageArgs, withTotalCount } from "../common/pagination";
import { assertProjectOpen } from "../common/project-lock";
import { advanceStage } from "../common/stage";
import { PrismaService } from "../prisma/prisma.service";

const CONTRACT_STATUS = ["draft", "signed"];

/** Printable content — frozen once a contract is signed (see update()). */
const CONTRACT_CONTENT_FIELDS = [
  "body",
  "note",
  "template_id",
  "rep_a_label",
  "rep_a_name",
  "rep_a_title",
  "rep_b_label",
  "rep_b_name",
  "rep_b_title",
  "print_snapshot",
] as const satisfies readonly (keyof UpdateContractDto)[];

const PROJECT_INCLUDE = {
  project: {
    select: {
      id: true,
      code: true,
      name: true,
      client: { select: { id: true, name: true } },
    },
  },
} as const;

// ── Contracts (hợp đồng) ────────────────────────────────────────────────────
class CreateContractDto {
  // Optional (crm-ui-redesign.md, 2026-07-24): standalone contracts have no
  // project; attaching one auto-advances the project to Hợp đồng.
  @IsOptional() @IsInt() project_id?: number;
  @IsOptional() @IsInt() template_id?: number;
  @IsOptional() @IsString() body?: string; // Lexical editorState JSON, opaque
  @IsOptional() @IsString() note?: string;
  // Signature footer; null clears a line (labels fall back to ĐẠI DIỆN BÊN
  // A/B, the B-side signer to the company rep)
  @IsOptional() @IsString() rep_a_label?: string | null;
  @IsOptional() @IsString() rep_a_name?: string | null;
  @IsOptional() @IsString() rep_a_title?: string | null;
  @IsOptional() @IsString() rep_b_label?: string | null;
  @IsOptional() @IsString() rep_b_name?: string | null;
  @IsOptional() @IsString() rep_b_title?: string | null;
  // Frozen print snapshot (JSON), written when the contract is signed
  @IsOptional() @IsString() print_snapshot?: string | null;
}

class UpdateContractDto {
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsInt() template_id?: number;
  @IsOptional() @IsIn(CONTRACT_STATUS) status?: string;
  @IsOptional() @IsDateString() signed_date?: string;
  @IsOptional() @IsString() rep_a_label?: string | null;
  @IsOptional() @IsString() rep_a_name?: string | null;
  @IsOptional() @IsString() rep_a_title?: string | null;
  @IsOptional() @IsString() rep_b_label?: string | null;
  @IsOptional() @IsString() rep_b_name?: string | null;
  @IsOptional() @IsString() rep_b_title?: string | null;
  @IsOptional() @IsString() print_snapshot?: string | null;
}

@Controller("contracts")
class ContractsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(
    @Res({ passthrough: true }) res: Response,
    @Query() page: PageQuery,
    @Query("project_id") projectId?: string,
    @Query("status") status?: string
  ) {
    // One `where`, both queries — the count cannot drift from the rows.
    const where = {
      project_id: projectId ? Number(projectId) : undefined,
      status: status || undefined,
    };
    return withTotalCount(
      res,
      this.prisma.contract.findMany({
        where,
        include: PROJECT_INCLUDE,
        // Was unordered: paging an unordered query overlaps and drops rows.
        orderBy: { id: "asc" },
        ...pageArgs(page),
      }),
      this.prisma.contract.count({ where })
    );
  }

  @Get(":id")
  async get(@Param("id", ParseIntPipe) id: number) {
    const row = await this.prisma.contract.findUnique({
      where: { id },
      include: PROJECT_INCLUDE,
    });
    if (!row) throw new NotFoundException("Contract not found");
    return row;
  }

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateContractDto) {
    await assertProjectOpen(this.prisma, dto.project_id);
    const code = await nextCode(this.prisma.contract, "HD");
    const contract = await this.prisma.contract.create({
      data: {
        code,
        project_id: dto.project_id ?? null,
        template_id: dto.template_id ?? null,
        body: dto.body ?? null,
        note: dto.note ?? null,
        rep_a_label: dto.rep_a_label ?? null,
        rep_a_name: dto.rep_a_name ?? null,
        rep_a_title: dto.rep_a_title ?? null,
        rep_b_label: dto.rep_b_label ?? null,
        rep_b_name: dto.rep_b_name ?? null,
        rep_b_title: dto.rep_b_title ?? null,
        print_snapshot: dto.print_snapshot ?? null,
      },
      include: PROJECT_INCLUDE,
    });
    await advanceStage(this.prisma, dto.project_id, "contract");
    return contract;
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateContractDto
  ) {
    const row = await this.get(id);
    await assertProjectOpen(this.prisma, row.project_id);
    // A signed contract is a legal document: its printable content is frozen.
    // Only the status/date fields stay writable, so signing still works (and a
    // mis-signed one can be corrected) — mirrors the DELETE guard below.
    if (row.status !== "draft") {
      const frozen = CONTRACT_CONTENT_FIELDS.filter(
        (f) => dto[f] !== undefined
      );
      if (frozen.length > 0)
        throw new ConflictException(
          `Only draft contracts can be edited (attempted to change: ${frozen.join(", ")})`
        );
    }
    const data: Record<string, unknown> = { ...dto };
    if (dto.signed_date !== undefined)
      data.signed_date = toDate(dto.signed_date);
    // Signing without an explicit date stamps today.
    if (
      dto.status === "signed" &&
      dto.signed_date === undefined &&
      !row.signed_date
    )
      data.signed_date = businessToday();
    return this.prisma.contract.update({
      where: { id },
      data,
      include: PROJECT_INCLUDE,
    });
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id", ParseIntPipe) id: number) {
    const row = await this.get(id);
    await assertProjectOpen(this.prisma, row.project_id);
    if (row.status !== "draft")
      throw new ConflictException("Only draft contracts can be deleted");
    await this.prisma.contract.delete({ where: { id } });
  }
}

// ── Contract templates (mẫu hợp đồng) ───────────────────────────────────────
class CreateTemplateDto {
  @IsString() @MinLength(3) name: string;
  @IsString() @MinLength(3) doc_title: string;
  @IsString() @MinLength(1) body: string;
  // Independent header blocks; both default on (official paperwork carries
  // the Quốc hiệu with the letterhead above it).
  @IsOptional() @IsBoolean() show_letterhead?: boolean;
  @IsOptional() @IsBoolean() show_national?: boolean;
  @IsBoolean() is_active: boolean;
}

class UpdateTemplateDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() doc_title?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsBoolean() show_letterhead?: boolean;
  @IsOptional() @IsBoolean() show_national?: boolean;
  @IsOptional() @IsBoolean() is_active?: boolean;
}

@Controller("contract-templates")
class ContractTemplatesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.contractTemplate.findMany();
  }

  @Get(":id")
  async get(@Param("id", ParseIntPipe) id: number) {
    const row = await this.prisma.contractTemplate.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException("Contract template not found");
    return row;
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateTemplateDto) {
    return this.prisma.contractTemplate.create({
      data: {
        name: dto.name,
        doc_title: dto.doc_title,
        body: dto.body,
        show_letterhead: dto.show_letterhead ?? true,
        show_national: dto.show_national ?? true,
        is_active: dto.is_active,
      },
    });
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateTemplateDto
  ) {
    await this.get(id);
    return this.prisma.contractTemplate.update({
      where: { id },
      data: { ...dto },
    });
  }
}

@Module({ controllers: [ContractsController, ContractTemplatesController] })
export class ContractsModule {}
