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
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

import { toBig, toDate } from "../common/coerce";
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
class CreateSettlementDto {
  @IsInt() project_id: number;
  @IsOptional() @IsString() note?: string;
}

class UpdateSettlementDto {
  @IsOptional() @IsIn(SETTLEMENT_STATUS) status?: string;
  @IsOptional() @IsDateString() signed_date?: string;
  @IsOptional() @IsString() note?: string;
}

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
      include: { bill: true },
    });
  }

  @Get(":id")
  async get(@Param("id", ParseIntPipe) id: number) {
    const row = await this.prisma.settlement.findUnique({
      where: { id },
      include: { bill: true },
    });
    if (!row) throw new NotFoundException("Settlement not found");
    return row;
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateSettlementDto) {
    // Doc rule: the draft bill is prepared alongside the settlement.
    return this.prisma.$transaction(async (tx) => {
      const settlement = await tx.settlement.create({
        data: { project_id: dto.project_id, note: dto.note },
      });
      await tx.bill.create({
        data: {
          project_id: dto.project_id,
          settlement_id: settlement.id,
          total_amount: 0,
        },
      });
      return tx.settlement.findUnique({
        where: { id: settlement.id },
        include: { bill: true },
      });
    });
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateSettlementDto
  ) {
    const row = await this.get(id);
    const data: Record<string, unknown> = {};
    if (dto.note !== undefined) data.note = dto.note;
    if (dto.signed_date !== undefined) data.signed_date = toDate(dto.signed_date);
    if (dto.status !== undefined && dto.status !== row.status) {
      assertStep(SETTLEMENT_STATUS, row.status, dto.status);
      data.status = dto.status;
      if (dto.status === "signed") {
        // Doc rule: signing the settlement officializes its bill.
        data.signed_date = toDate(dto.signed_date) ?? new Date();
        const [settlement] = await this.prisma.$transaction([
          this.prisma.settlement.update({
            where: { id },
            data,
            include: { bill: true },
          }),
          this.prisma.bill.updateMany({
            where: { settlement_id: id },
            data: { status: "official" },
          }),
        ]);
        return this.get(settlement.id);
      }
    }
    return this.prisma.settlement.update({
      where: { id },
      data,
      include: { bill: true },
    });
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id", ParseIntPipe) id: number) {
    const row = await this.get(id);
    if (row.status !== "draft")
      throw new BadRequestException("Only draft settlements can be deleted");
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
  create(@Body() dto: CreateMilestoneDto) {
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
