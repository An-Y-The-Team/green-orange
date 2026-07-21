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
} from "@nestjs/common";
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from "class-validator";

import { nextCode } from "../common/code";
import { toBig, toDate } from "../common/coerce";
import { PrismaService } from "../prisma/prisma.service";

const TYPE = ["ve_sinh", "thi_cong"];
const STAGE = [
  "yeu_cau",
  "khao_sat",
  "bao_gia",
  "hop_dong",
  "chuan_bi",
  "thi_cong",
  "nghiem_thu",
  "quyet_toan",
  "thanh_toan",
  "dong",
];
const OUTCOME = ["on_time", "delayed", "early"];
const COST_CATEGORY = ["vat_tu", "nhan_cong", "thiet_bi", "su_co", "khac"];
const ACCEPTANCE_STATUS = ["cho_nghiem_thu", "da_nghiem_thu", "co_van_de"];

// ── Projects ──────────────────────────────────────────────────────────────
class CreateProjectDto {
  @IsString() @MinLength(3) name: string;
  @IsString() @MinLength(1) client: string;
  @IsIn(TYPE) type: string;
  @IsString() @MinLength(1) address: string;
  @IsString() @MinLength(1) manager: string;
  @IsOptional() @IsNumber() @Min(0) contract_value?: number;
  @IsOptional() @IsNumber() @Min(0) estimated_cost?: number;
  @IsOptional() @IsDateString() start_date?: string;
  @IsOptional() @IsDateString() end_date?: string;
}

class UpdateProjectDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() client?: string;
  @IsOptional() @IsIn(TYPE) type?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() manager?: string;
  @IsOptional() @IsIn(STAGE) stage?: string;
  @IsOptional() @IsIn(OUTCOME) schedule_outcome?: string;
  @IsOptional() @IsNumber() contract_value?: number;
  @IsOptional() @IsNumber() estimated_cost?: number;
  @IsOptional() @IsDateString() start_date?: string;
  @IsOptional() @IsDateString() end_date?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) progress?: number;
}

@Controller("projects")
class ProjectsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.project.findMany();
  }

  @Get(":id")
  async get(@Param("id", ParseIntPipe) id: number) {
    const row = await this.prisma.project.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Project not found");
    return row;
  }

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateProjectDto) {
    // Server assigns the code; stage=yeu_cau and progress=0 come from schema
    // defaults. Same behavior as the Python backend.
    const code = await nextCode(this.prisma.project, "CT");
    return this.prisma.project.create({
      data: {
        name: dto.name,
        client: dto.client,
        type: dto.type,
        address: dto.address,
        manager: dto.manager,
        code,
        contract_value: toBig(dto.contract_value),
        estimated_cost: toBig(dto.estimated_cost),
        start_date: toDate(dto.start_date),
        end_date: toDate(dto.end_date),
      },
    });
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateProjectDto
  ) {
    await this.get(id);
    const data: Record<string, unknown> = { ...dto };
    if (dto.contract_value !== undefined)
      data.contract_value = toBig(dto.contract_value);
    if (dto.estimated_cost !== undefined)
      data.estimated_cost = toBig(dto.estimated_cost);
    if (dto.start_date !== undefined) data.start_date = toDate(dto.start_date);
    if (dto.end_date !== undefined) data.end_date = toDate(dto.end_date);
    return this.prisma.project.update({ where: { id }, data });
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id", ParseIntPipe) id: number) {
    await this.get(id);
    await this.prisma.project.delete({ where: { id } });
  }
}

// ── Costs (chi phí) ─────────────────────────────────────────────────────────
class CreateCostDto {
  @IsString() @MinLength(1) project_code: string;
  @IsDateString() date: string;
  @IsIn(COST_CATEGORY) category: string;
  @IsString() @MinLength(1) description: string;
  @IsNumber() @Min(0) amount: number;
  @IsBoolean() is_incident: boolean;
}

@Controller("costs")
class CostsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Query("project_code") projectCode?: string) {
    return this.prisma.cost.findMany({
      where: projectCode ? { project_code: projectCode } : undefined,
    });
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateCostDto) {
    return this.prisma.cost.create({
      data: {
        project_code: dto.project_code,
        date: toDate(dto.date)!,
        category: dto.category,
        description: dto.description,
        amount: toBig(dto.amount)!,
        is_incident: dto.is_incident,
      },
    });
  }
}

// ── Acceptances (nghiệm thu) ────────────────────────────────────────────────
class CreateAcceptanceDto {
  @IsString() @MinLength(1) project_code: string;
  @IsDateString() date: string;
  @IsIn(ACCEPTANCE_STATUS) status: string;
  @IsString() @MinLength(1) inspector: string;
  @IsString() @MinLength(1) client_rep: string;
  @IsOptional() @IsString() notes?: string;
}

@Controller("acceptances")
class AcceptancesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Query("project_code") projectCode?: string) {
    return this.prisma.acceptance.findMany({
      where: projectCode ? { project_code: projectCode } : undefined,
    });
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateAcceptanceDto) {
    return this.prisma.acceptance.create({
      data: {
        project_code: dto.project_code,
        date: toDate(dto.date)!,
        status: dto.status,
        inspector: dto.inspector,
        client_rep: dto.client_rep,
        notes: dto.notes ?? "",
      },
    });
  }
}

@Module({
  controllers: [ProjectsController, CostsController, AcceptancesController],
})
export class ProjectsModule {}
