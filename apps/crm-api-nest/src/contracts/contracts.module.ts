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
} from "@nestjs/common";
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";

import { nextCode } from "../common/code";
import { toBig, toDate } from "../common/coerce";
import { PrismaService } from "../prisma/prisma.service";

const CONTRACT_STATUS = ["nhap", "da_ky", "dang_thuc_hien", "thanh_ly"];
const HEADER_STYLE = ["letterhead", "national"];

// ── Contracts (hợp đồng) ────────────────────────────────────────────────────
class CreateContractDto {
  @IsString() @MinLength(3) title: string;
  @IsString() @MinLength(1) client: string;
  @IsString() @MinLength(1) project_code: string;
  @IsNumber() @Min(0) value: number;
  @IsDateString() signed_date: string;
  @IsDateString() start_date: string;
  @IsDateString() end_date: string;
  @IsIn(CONTRACT_STATUS) status: string;
  @IsString() @MinLength(1) payment_terms: string;
  @IsOptional() @IsInt() template_id?: number;
  @IsOptional() @IsString() body?: string;
}

// PATCH is used by the UI to save the rich body; allow the other editable
// fields too so the detail page can update the party block later.
class UpdateContractDto {
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsIn(CONTRACT_STATUS) status?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsNumber() value?: number;
  @IsOptional() @IsDateString() signed_date?: string;
  @IsOptional() @IsDateString() start_date?: string;
  @IsOptional() @IsDateString() end_date?: string;
  @IsOptional() @IsString() payment_terms?: string;
  @IsOptional() @IsString() client_address?: string;
  @IsOptional() @IsString() client_tax_code?: string;
  @IsOptional() @IsString() client_rep?: string;
  @IsOptional() @IsString() client_position?: string;
  @IsOptional() @IsString() client_phone?: string;
  @IsOptional() @IsNumber() vat_rate?: number;
  @IsOptional() @IsInt() template_id?: number;
}

@Controller("contracts")
class ContractsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.contract.findMany();
  }

  @Get(":id")
  async get(@Param("id", ParseIntPipe) id: number) {
    const row = await this.prisma.contract.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Contract not found");
    return row;
  }

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateContractDto) {
    const code = await nextCode(this.prisma.contract, "HD");
    return this.prisma.contract.create({
      data: {
        code,
        project_code: dto.project_code,
        client: dto.client,
        title: dto.title,
        value: toBig(dto.value)!,
        signed_date: new Date(dto.signed_date),
        start_date: new Date(dto.start_date),
        end_date: new Date(dto.end_date),
        status: dto.status,
        payment_terms: dto.payment_terms,
        template_id: dto.template_id ?? null,
        body: dto.body ?? null,
      },
    });
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateContractDto
  ) {
    await this.get(id);
    const data: Record<string, unknown> = { ...dto };
    if (dto.value !== undefined) data.value = toBig(dto.value);
    if (dto.signed_date !== undefined)
      data.signed_date = toDate(dto.signed_date);
    if (dto.start_date !== undefined) data.start_date = toDate(dto.start_date);
    if (dto.end_date !== undefined) data.end_date = toDate(dto.end_date);
    return this.prisma.contract.update({ where: { id }, data });
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
