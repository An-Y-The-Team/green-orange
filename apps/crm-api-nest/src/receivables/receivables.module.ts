import {
  Body,
  ConflictException,
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
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";

import { toBig } from "../common/coerce";
import { canCollect } from "../common/milestone";
import { PrismaService } from "../prisma/prisma.service";

const MILESTONE_TYPE = ["tam_ung", "tien_do", "nghiem_thu", "giu_bao_hanh"];
const MILESTONE_STATUS = [
  "chua_den_han",
  "cho_thanh_toan",
  "da_thu",
  "qua_han",
];

class CreateMilestoneDto {
  @IsString() @MinLength(1) contract_code: string;
  @IsString() @MinLength(1) project_code: string;
  @IsString() @MinLength(1) client: string;
  @IsString() @MinLength(1) name: string;
  @IsIn(MILESTONE_TYPE) type: string;
  @IsNumber() @Min(0) due_amount: number;
  @IsString() @MinLength(1) due_date: string;
  @IsBoolean() gated_by_acceptance: boolean;
}

// Collect / update a milestone. Not yet wired in the UI, but milestone
// collection is core CRM behavior and it's where the acceptance gate lives.
class UpdateMilestoneDto {
  @IsOptional() @IsIn(MILESTONE_STATUS) status?: string;
  @IsOptional() @IsNumber() @Min(0) paid_amount?: number;
}

@Controller("payment-milestones")
class PaymentMilestonesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.paymentMilestone.findMany();
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateMilestoneDto) {
    // A new đợt starts unpaid and not-yet-due (schema defaults status/paid_amount).
    return this.prisma.paymentMilestone.create({
      data: {
        contract_code: dto.contract_code,
        project_code: dto.project_code,
        client: dto.client,
        name: dto.name,
        type: dto.type,
        due_amount: toBig(dto.due_amount)!,
        due_date: new Date(dto.due_date),
        gated_by_acceptance: dto.gated_by_acceptance,
      },
    });
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateMilestoneDto
  ) {
    const row = await this.prisma.paymentMilestone.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException("Payment milestone not found");

    // Enforce the gate when this update would collect the milestone.
    const collecting = dto.status === "da_thu" || (dto.paid_amount ?? 0) > 0;
    if (collecting && row.gated_by_acceptance) {
      const approved = await this.prisma.acceptance.count({
        where: { project_code: row.project_code, status: "da_nghiem_thu" },
      });
      if (!canCollect(row.gated_by_acceptance, approved > 0)) {
        throw new ConflictException(
          "Chưa thể thu: công trình chưa được nghiệm thu (da_nghiem_thu)."
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.paid_amount !== undefined)
      data.paid_amount = toBig(dto.paid_amount);
    return this.prisma.paymentMilestone.update({ where: { id }, data });
  }
}

@Module({ controllers: [PaymentMilestonesController] })
export class ReceivablesModule {}
