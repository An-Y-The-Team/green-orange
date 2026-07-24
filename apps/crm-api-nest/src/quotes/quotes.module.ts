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
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

import { toBig } from "../common/coerce";
import { assertProjectOpen } from "../common/project-lock";
import { advanceStage } from "../common/stage";
import { PrismaService } from "../prisma/prisma.service";

const CHANNEL = ["zalo", "email", "print"];
const DECISION = ["deal", "on_hold", "rejected"];

const INCLUDE = {
  items: { orderBy: { sort_order: "asc" as const } },
  send_logs: true,
};

// ── DTOs ────────────────────────────────────────────────────────────────────
class QuoteItemDto {
  @IsString() @MinLength(1) description: string;
  @IsOptional() @IsString() unit?: string;
  @IsNumber() @Min(0) quantity: number;
  @IsNumber() @Min(0) unit_price: number;
}

class CreateQuoteDto {
  // Optional (crm-ui-redesign.md, 2026-07-24): standalone quotes have no
  // project; attaching one auto-advances the project to Báo giá.
  @IsOptional() @IsInt() project_id?: number;
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items: QuoteItemDto[];
  @IsOptional() @IsNumber() @Min(0) @Max(1) vat_rate?: number;
  @IsOptional() @IsString() note?: string;
}

class UpdateQuoteDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items?: QuoteItemDto[];
  @IsOptional() @IsNumber() @Min(0) @Max(1) vat_rate?: number;
  @IsOptional() @IsString() note?: string;
}

class SendQuoteDto {
  @IsIn(CHANNEL) channel: string;
  @IsString() @MinLength(1) sent_by: string;
  @IsOptional() @IsString() follow_up_ref?: string;
}

class DecideQuoteDto {
  @IsIn(DECISION) status: string;
}

// amount = round(quantity × unit_price) per item; total = Σ amounts.
const computeItems = (items: QuoteItemDto[]) => {
  const rows = items.map((it, i) => ({
    description: it.description,
    unit: it.unit ?? null,
    quantity: it.quantity,
    unit_price: toBig(it.unit_price)!,
    amount: toBig(Math.round(it.quantity * it.unit_price))!,
    sort_order: i,
  }));
  const total = rows.reduce((sum, r) => sum + r.amount, 0n);
  return { rows, total };
};

@Controller("quotes")
class QuotesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Query("project_id") projectId?: string) {
    return this.prisma.quote.findMany({
      where: projectId ? { project_id: Number(projectId) } : undefined,
      include: INCLUDE,
      orderBy: { version: "desc" },
    });
  }

  @Get(":id")
  async get(@Param("id", ParseIntPipe) id: number) {
    const row = await this.prisma.quote.findUnique({
      where: { id },
      include: INCLUDE,
    });
    if (!row) throw new NotFoundException("Quote not found");
    return row;
  }

  // Standalone quotes (no project) share version 1 — @@unique[project_id,
  // version] treats null project_id as distinct in Postgres, so no collision.
  private async nextVersion(projectId: number | null | undefined) {
    if (projectId == null) return 1;
    const max = await this.prisma.quote.aggregate({
      where: { project_id: projectId },
      _max: { version: true },
    });
    return (max._max.version ?? 0) + 1;
  }

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateQuoteDto) {
    await assertProjectOpen(this.prisma, dto.project_id);
    const { rows, total } = computeItems(dto.items);
    const quote = await this.prisma.quote.create({
      data: {
        project_id: dto.project_id ?? null,
        version: await this.nextVersion(dto.project_id),
        total_amount: total,
        ...(dto.vat_rate !== undefined && { vat_rate: dto.vat_rate }),
        note: dto.note,
        items: { create: rows },
        // status defaults to "draft" in the schema
      },
      include: INCLUDE,
    });
    await advanceStage(this.prisma, dto.project_id, "quote");
    return quote;
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateQuoteDto
  ) {
    const quote = await this.get(id);
    await assertProjectOpen(this.prisma, quote.project_id);
    if (quote.status !== "draft")
      throw new ConflictException("sent versions are never edited");
    const data: Record<string, unknown> = {};
    if (dto.vat_rate !== undefined) data.vat_rate = dto.vat_rate;
    if (dto.note !== undefined) data.note = dto.note;
    if (dto.items) {
      const { rows, total } = computeItems(dto.items);
      data.total_amount = total;
      const [, updated] = await this.prisma.$transaction([
        this.prisma.quoteItem.deleteMany({ where: { quote_id: id } }),
        this.prisma.quote.update({
          where: { id },
          data: { ...data, items: { create: rows } },
          include: INCLUDE,
        }),
      ]);
      return updated;
    }
    return this.prisma.quote.update({ where: { id }, data, include: INCLUDE });
  }

  @Post(":id/send")
  @HttpCode(201)
  async send(@Param("id", ParseIntPipe) id: number, @Body() dto: SendQuoteDto) {
    const quote = await this.get(id);
    await assertProjectOpen(this.prisma, quote.project_id);
    if (quote.status !== "draft" && quote.status !== "waiting")
      throw new ConflictException("only draft or waiting quotes can be sent");
    await this.prisma.quoteSendLog.create({
      data: {
        quote_id: id,
        channel: dto.channel,
        sent_by: dto.sent_by,
        follow_up_ref: dto.follow_up_ref,
      },
    });
    if (quote.status === "draft")
      await this.prisma.quote.update({
        where: { id },
        data: { status: "waiting" },
      });
    return this.get(id);
  }

  @Post(":id/decide")
  async decide(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: DecideQuoteDto
  ) {
    const quote = await this.get(id);
    await assertProjectOpen(this.prisma, quote.project_id);
    if (quote.status !== "waiting")
      throw new ConflictException("only waiting quotes can be decided");
    return this.prisma.quote.update({
      where: { id },
      data: { status: dto.status, decided_date: new Date() },
      include: INCLUDE,
    });
  }

  // Bargaining loop: sent versions are frozen; a revision is a new draft row.
  @Post(":id/revise")
  @HttpCode(201)
  async revise(@Param("id", ParseIntPipe) id: number) {
    const quote = await this.get(id);
    await assertProjectOpen(this.prisma, quote.project_id);
    const revised = await this.prisma.quote.create({
      data: {
        project_id: quote.project_id,
        version: await this.nextVersion(quote.project_id),
        total_amount: quote.total_amount,
        vat_rate: quote.vat_rate,
        note: quote.note,
        items: {
          create: quote.items.map((it) => ({
            description: it.description,
            unit: it.unit,
            quantity: it.quantity,
            unit_price: it.unit_price,
            amount: it.amount,
            sort_order: it.sort_order,
          })),
        },
      },
      include: INCLUDE,
    });
    await advanceStage(this.prisma, quote.project_id, "quote");
    return revised;
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id", ParseIntPipe) id: number) {
    const quote = await this.get(id);
    await assertProjectOpen(this.prisma, quote.project_id);
    if (quote.status !== "draft")
      throw new ConflictException("only draft quotes can be deleted");
    await this.prisma.$transaction([
      this.prisma.quoteSendLog.deleteMany({ where: { quote_id: id } }),
      this.prisma.quoteItem.deleteMany({ where: { quote_id: id } }),
      this.prisma.quote.delete({ where: { id } }),
    ]);
  }
}

@Module({ controllers: [QuotesController] })
export class QuotesModule {}
