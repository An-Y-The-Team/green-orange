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
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

import { nextCode } from "../common/code";
import { toDate } from "../common/coerce";
import { assertProjectOpen } from "../common/project-lock";
import { PrismaService } from "../prisma/prisma.service";

const CONTRACT_STATUS = ["draft", "signed"];
const HEADER_STYLE = ["letterhead", "national"];

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
  @IsInt() project_id: number;
  @IsOptional() @IsInt() template_id?: number;
  @IsOptional() @IsString() body?: string; // Lexical editorState JSON, opaque
  @IsOptional() @IsString() note?: string;
}

class UpdateContractDto {
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsInt() template_id?: number;
  @IsOptional() @IsIn(CONTRACT_STATUS) status?: string;
  @IsOptional() @IsDateString() signed_date?: string;
}

@Controller("contracts")
class ContractsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(
    @Query("project_id") projectId?: string,
    @Query("status") status?: string
  ) {
    return this.prisma.contract.findMany({
      where: {
        project_id: projectId ? Number(projectId) : undefined,
        status: status || undefined,
      },
      include: PROJECT_INCLUDE,
    });
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
    return this.prisma.contract.create({
      data: {
        code,
        project_id: dto.project_id,
        template_id: dto.template_id ?? null,
        body: dto.body ?? null,
        note: dto.note ?? null,
      },
      include: PROJECT_INCLUDE,
    });
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateContractDto
  ) {
    const row = await this.get(id);
    await assertProjectOpen(this.prisma, row.project_id);
    const data: Record<string, unknown> = { ...dto };
    if (dto.signed_date !== undefined) data.signed_date = toDate(dto.signed_date);
    // Signing without an explicit date stamps today.
    if (dto.status === "signed" && dto.signed_date === undefined && !row.signed_date)
      data.signed_date = new Date();
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
  @IsOptional() @IsIn(HEADER_STYLE) header_style?: string;
  @IsBoolean() is_active: boolean;
}

class UpdateTemplateDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() doc_title?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsIn(HEADER_STYLE) header_style?: string;
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
        header_style: dto.header_style ?? "letterhead",
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
