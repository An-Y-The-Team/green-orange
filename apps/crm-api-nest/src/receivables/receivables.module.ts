// Receivables: Settlement (Quyết toán) → Bill (Hóa đơn) → PaymentMilestone
// (Đợt thanh toán). Doc: docs/features/crm-database-schema.md.
// Rules enforced here:
//   • A settlement is born with its draft bill (same transaction).
//   • Signing a settlement officializes its bill (same transaction).
//   • Bills have no POST/DELETE — they live and die with their settlement.
//   • "overdue" is DERIVED (due_date < today && status != paid), never stored.
import {
  BadRequestException,
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
import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

import { toBig, toDate } from "../common/coerce";
import { assertProjectOpen } from "../common/project-lock";
import { PrismaService } from "../prisma/prisma.service";

const SETTLEMENT_STATUS = ["draft", "sent", "signed"];
const BILL_STATUS = ["draft", "official", "sent", "paid"];
const MILESTONE_TYPE = ["deposit", "progress", "acceptance"];
const MILESTONE_STATUS = ["not_due", "awaiting_payment", "paid"];

// One step forward along the chain, nothing else.
const assertStep = (order: string[], from: string, to: string) => {
  if (order.indexOf(to) !== order.indexOf(from) + 1)
    throw new BadRequestException(`Invalid status transition: ${from} → ${to}`);
};

// ── Settlements (Quyết toán) ────────────────────────────────────────────────
const SETTLEMENT_INCLUDE = {
  bill: true,
  items: { orderBy: { sort_order: "asc" as const } },
};

class SettlementItemDto {
  @IsString() @MinLength(1) description: string;
  @IsOptional() @IsString() unit?: string;
  @IsNumber() @Min(0) quantity: number;
  @IsNumber() @Min(0) unit_price: number;
  @IsOptional() @IsInt() @Min(0) sort_order?: number;
}

class CreateSettlementDto {
  @IsInt() project_id: number;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettlementItemDto)
  items?: SettlementItemDto[];
  @IsOptional() @IsString() note?: string;
}

class UpdateSettlementDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettlementItemDto)
  items?: SettlementItemDto[];
  @IsOptional() @IsIn(SETTLEMENT_STATUS) status?: string;
  @IsOptional() @IsDateString() signed_date?: string;
  @IsOptional() @IsString() note?: string;
}

// amount = round(quantity × unit_price) per item; total = Σ amounts.
const computeItems = (items: SettlementItemDto[]) => {
  const rows = items.map((it, i) => ({
    description: it.description,
    unit: it.unit ?? null,
    quantity: it.quantity,
    unit_price: toBig(it.unit_price)!,
    amount: toBig(Math.round(it.quantity * it.unit_price))!,
    sort_order: it.sort_order ?? i,
  }));
  const total = rows.reduce((sum, r) => sum + r.amount, 0n);
  return { rows, total };
};

@Controller("settlements")
class SettlementsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(
    @Query("project_id", new ParseIntPipe({ optional: true }))
    projectId?: number
  ) {
    return this.prisma.settlement.findMany({
      where: { project_id: projectId },
      include: SETTLEMENT_INCLUDE,
    });
  }

  @Get(":id")
  async get(@Param("id", ParseIntPipe) id: number) {
    const row = await this.prisma.settlement.findUnique({
      where: { id },
      include: SETTLEMENT_INCLUDE,
    });
    if (!row) throw new NotFoundException("Settlement not found");
    return row;
  }

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateSettlementDto) {
    await assertProjectOpen(this.prisma, dto.project_id);
    const { rows, total } = computeItems(dto.items ?? []);
    // Doc rule: the draft bill is prepared alongside the settlement.
    return this.prisma.$transaction(async (tx) => {
      const settlement = await tx.settlement.create({
        data: {
          project_id: dto.project_id,
          note: dto.note,
          total_amount: total,
          items: { create: rows },
        },
      });
      await tx.bill.create({
        data: {
          project_id: dto.project_id,
          settlement_id: settlement.id,
          total_amount: 0, // the bill gets the real total on sign
        },
      });
      return tx.settlement.findUnique({
        where: { id: settlement.id },
        include: SETTLEMENT_INCLUDE,
      });
    });
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateSettlementDto
  ) {
    const row = await this.get(id);
    await assertProjectOpen(this.prisma, row.project_id);
    const data: Record<string, unknown> = {};
    if (dto.note !== undefined) data.note = dto.note;
    if (dto.signed_date !== undefined)
      data.signed_date = toDate(dto.signed_date);
    if (dto.items) {
      if (row.status !== "draft")
        throw new BadRequestException("items are editable only while draft");
      const { rows, total } = computeItems(dto.items);
      data.total_amount = total;
      data.items = { deleteMany: {}, create: rows };
    }
    if (dto.status !== undefined && dto.status !== row.status) {
      assertStep(SETTLEMENT_STATUS, row.status, dto.status);
      data.status = dto.status;
      if (dto.status === "signed") {
        // Doc rule (stage 8): signing officializes the bill with the
        // settlement total, attaches the unallocated cọc milestone, and
        // auto-creates one milestone for the remaining balance.
        data.signed_date = toDate(dto.signed_date) ?? new Date();
        await this.prisma.$transaction(async (tx) => {
          await tx.settlement.update({ where: { id }, data });
          const bill = await tx.bill.findFirst({
            where: { settlement_id: id },
          });
          if (!bill) return;
          await tx.bill.update({
            where: { id: bill.id },
            data: { status: "official", total_amount: row.total_amount },
          });
          const deposit = await tx.paymentMilestone.findFirst({
            where: {
              project_id: row.project_id,
              type: "deposit",
              bill_id: null,
            },
          });
          if (deposit)
            await tx.paymentMilestone.update({
              where: { id: deposit.id },
              data: { bill_id: bill.id },
            });
          const remainder = row.total_amount - (deposit?.amount ?? 0n);
          if (remainder > 0n)
            await tx.paymentMilestone.create({
              data: {
                project_id: row.project_id,
                bill_id: bill.id,
                type: "progress",
                amount: remainder,
              },
            });
        });
        return this.get(id);
      }
    }
    return this.prisma.settlement.update({
      where: { id },
      data,
      include: SETTLEMENT_INCLUDE,
    });
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id", ParseIntPipe) id: number) {
    const row = await this.get(id);
    await assertProjectOpen(this.prisma, row.project_id);
    if (row.status !== "draft")
      throw new BadRequestException("Only draft settlements can be deleted");
    // Items cascade via the FK.
    await this.prisma.$transaction([
      this.prisma.bill.deleteMany({ where: { settlement_id: id } }),
      this.prisma.settlement.delete({ where: { id } }),
    ]);
  }
}

// ── Bills (Hóa đơn) ─────────────────────────────────────────────────────────
// No POST (bills are born with their settlement) and no DELETE (they die with
// their draft settlement).
class UpdateBillDto {
  @IsOptional() @IsIn(BILL_STATUS) status?: string;
  @IsOptional() @IsNumber() @Min(0) total_amount?: number;
  @IsOptional() @IsDateString() sent_date?: string;
  @IsOptional() @IsDateString() paid_date?: string;
}

@Controller("bills")
class BillsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(
    @Query("project_id", new ParseIntPipe({ optional: true }))
    projectId?: number,
    @Query("status") status?: string
  ) {
    return this.prisma.bill.findMany({
      where: { project_id: projectId, status },
      include: { milestones: true },
    });
  }

  @Get(":id")
  async get(@Param("id", ParseIntPipe) id: number) {
    const row = await this.prisma.bill.findUnique({
      where: { id },
      include: { milestones: true },
    });
    if (!row) throw new NotFoundException("Bill not found");
    return row;
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateBillDto
  ) {
    const row = await this.get(id);
    await assertProjectOpen(this.prisma, row.project_id);
    const data: Record<string, unknown> = {};
    if (dto.total_amount !== undefined) {
      if (row.status !== "draft" && row.status !== "official")
        throw new BadRequestException(
          "total_amount is editable only while draft or official"
        );
      data.total_amount = toBig(dto.total_amount);
    }
    if (dto.sent_date !== undefined) data.sent_date = toDate(dto.sent_date);
    if (dto.paid_date !== undefined) data.paid_date = toDate(dto.paid_date);
    if (dto.status !== undefined && dto.status !== row.status) {
      // Forward-only; manual flips are the source of truth (future bank feed
      // is out of scope).
      if (BILL_STATUS.indexOf(dto.status) <= BILL_STATUS.indexOf(row.status))
        throw new BadRequestException(
          `Invalid status transition: ${row.status} → ${dto.status}`
        );
      data.status = dto.status;
      if (dto.status === "sent") data.sent_date ??= new Date();
      if (dto.status === "paid") data.paid_date ??= new Date();
    }
    return this.prisma.bill.update({
      where: { id },
      data,
      include: { milestones: true },
    });
  }
}

// ── Payment milestones (Đợt thanh toán) ─────────────────────────────────────
class CreateMilestoneDto {
  @IsInt() project_id: number;
  @IsOptional() @IsInt() bill_id?: number; // null for the stage-4 deposit
  @IsIn(MILESTONE_TYPE) type: string;
  @IsNumber() @Min(0) amount: number;
  @IsOptional() @IsDateString() due_date?: string;
}

class UpdateMilestoneDto {
  @IsOptional() @IsInt() bill_id?: number;
  @IsOptional() @IsIn(MILESTONE_STATUS) status?: string;
  @IsOptional() @IsNumber() @Min(0) amount?: number;
  @IsOptional() @IsDateString() due_date?: string;
  @IsOptional() @IsDateString() paid_date?: string;
}

@Controller("payment-milestones")
class PaymentMilestonesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(
    @Query("project_id", new ParseIntPipe({ optional: true }))
    projectId?: number,
    @Query("bill_id", new ParseIntPipe({ optional: true })) billId?: number,
    @Query("status") status?: string
  ) {
    return this.prisma.paymentMilestone.findMany({
      where: { project_id: projectId, bill_id: billId, status },
    });
  }

  @Get(":id")
  async get(@Param("id", ParseIntPipe) id: number) {
    const row = await this.prisma.paymentMilestone.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException("Payment milestone not found");
    return row;
  }

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateMilestoneDto) {
    await assertProjectOpen(this.prisma, dto.project_id);
    // Starts as not_due (schema default). "overdue" is derived at read time,
    // never stored.
    return this.prisma.paymentMilestone.create({
      data: {
        project_id: dto.project_id,
        bill_id: dto.bill_id,
        type: dto.type,
        amount: toBig(dto.amount)!,
        due_date: toDate(dto.due_date),
      },
    });
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateMilestoneDto
  ) {
    const row = await this.get(id);
    await assertProjectOpen(this.prisma, row.project_id);
    const data: Record<string, unknown> = {};
    if (dto.bill_id !== undefined) data.bill_id = dto.bill_id;
    if (dto.amount !== undefined) data.amount = toBig(dto.amount);
    if (dto.due_date !== undefined) data.due_date = toDate(dto.due_date);
    if (dto.paid_date !== undefined) data.paid_date = toDate(dto.paid_date);
    if (dto.status !== undefined && dto.status !== row.status) {
      assertStep(MILESTONE_STATUS, row.status, dto.status);
      data.status = dto.status;
      if (dto.status === "paid") data.paid_date ??= new Date();
    }
    return this.prisma.paymentMilestone.update({ where: { id }, data });
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id", ParseIntPipe) id: number) {
    const row = await this.get(id);
    await assertProjectOpen(this.prisma, row.project_id);
    if (row.status !== "not_due")
      throw new BadRequestException(
        "Only not_due payment milestones can be deleted"
      );
    await this.prisma.paymentMilestone.delete({ where: { id } });
  }
}

@Module({
  controllers: [
    SettlementsController,
    BillsController,
    PaymentMilestonesController,
  ],
})
export class ReceivablesModule {}
