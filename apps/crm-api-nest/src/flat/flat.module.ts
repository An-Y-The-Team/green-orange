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
} from "@nestjs/common";
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";

import { toBig } from "../common/coerce";
import { PrismaService } from "../prisma/prisma.service";

const TASK_STATUS = ["todo", "in_progress", "done"];
const TASK_PRIORITY = ["low", "medium", "high"];
const LEAD_STATUS = ["new", "contacted", "qualified", "lost"];
const DEAL_STAGE = ["prospect", "proposal", "negotiation", "won", "lost"];

// ── Tasks (công việc) ───────────────────────────────────────────────────────
class CreateTaskDto {
  @IsString() @MinLength(1) title: string;
  @IsDateString() due_date: string;
  @IsIn(TASK_STATUS) status: string;
  @IsIn(TASK_PRIORITY) priority: string;
  @IsString() assignee: string;
}
class UpdateTaskDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsDateString() due_date?: string;
  @IsOptional() @IsIn(TASK_STATUS) status?: string;
  @IsOptional() @IsIn(TASK_PRIORITY) priority?: string;
  @IsOptional() @IsString() assignee?: string;
}

@Controller("tasks")
class TasksController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.task.findMany();
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateTaskDto) {
    return this.prisma.task.create({
      data: { ...dto, due_date: new Date(dto.due_date) },
    });
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto
  ) {
    if (!(await this.prisma.task.findUnique({ where: { id } })))
      throw new NotFoundException("Task not found");
    const data: Record<string, unknown> = { ...dto };
    if (dto.due_date !== undefined) data.due_date = new Date(dto.due_date);
    return this.prisma.task.update({ where: { id }, data });
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id", ParseIntPipe) id: number) {
    if (!(await this.prisma.task.findUnique({ where: { id } })))
      throw new NotFoundException("Task not found");
    await this.prisma.task.delete({ where: { id } });
  }
}

// ── Leads ───────────────────────────────────────────────────────────────────
class CreateLeadDto {
  @IsString() @MinLength(1) name: string;
  @IsString() company: string;
  @IsString() source: string;
  @IsIn(LEAD_STATUS) status: string;
  @IsNumber() @Min(0) value: number;
  @IsString() owner: string;
}
class UpdateLeadDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsIn(LEAD_STATUS) status?: string;
  @IsOptional() @IsNumber() value?: number;
  @IsOptional() @IsString() owner?: string;
}

@Controller("leads")
class LeadsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.lead.findMany();
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateLeadDto) {
    return this.prisma.lead.create({
      data: { ...dto, value: toBig(dto.value)! },
    });
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateLeadDto
  ) {
    if (!(await this.prisma.lead.findUnique({ where: { id } })))
      throw new NotFoundException("Lead not found");
    const data: Record<string, unknown> = { ...dto };
    if (dto.value !== undefined) data.value = toBig(dto.value);
    return this.prisma.lead.update({ where: { id }, data });
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id", ParseIntPipe) id: number) {
    if (!(await this.prisma.lead.findUnique({ where: { id } })))
      throw new NotFoundException("Lead not found");
    await this.prisma.lead.delete({ where: { id } });
  }
}

// ── Deals ───────────────────────────────────────────────────────────────────
class CreateDealDto {
  @IsString() @MinLength(1) title: string;
  @IsString() company: string;
  @IsIn(DEAL_STAGE) stage: string;
  @IsNumber() @Min(0) amount: number;
  @IsDateString() close_date: string;
}
class UpdateDealDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsIn(DEAL_STAGE) stage?: string;
  @IsOptional() @IsNumber() amount?: number;
  @IsOptional() @IsDateString() close_date?: string;
}

@Controller("deals")
class DealsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.deal.findMany();
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateDealDto) {
    return this.prisma.deal.create({
      data: {
        title: dto.title,
        company: dto.company,
        stage: dto.stage,
        amount: toBig(dto.amount)!,
        close_date: new Date(dto.close_date),
      },
    });
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateDealDto
  ) {
    if (!(await this.prisma.deal.findUnique({ where: { id } })))
      throw new NotFoundException("Deal not found");
    const data: Record<string, unknown> = { ...dto };
    if (dto.amount !== undefined) data.amount = toBig(dto.amount);
    if (dto.close_date !== undefined)
      data.close_date = new Date(dto.close_date);
    return this.prisma.deal.update({ where: { id }, data });
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id", ParseIntPipe) id: number) {
    if (!(await this.prisma.deal.findUnique({ where: { id } })))
      throw new NotFoundException("Deal not found");
    await this.prisma.deal.delete({ where: { id } });
  }
}

@Module({ controllers: [TasksController, LeadsController, DealsController] })
export class FlatModule {}
