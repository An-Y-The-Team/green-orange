// POST /projects/import — "Công trình mới từ Bảng Báo Giá".
//
// crm-web parses the operator's Excel workbook and matches its Bên A / site /
// contact to existing rows; this endpoint only writes. Each reference is
// either an existing id or the fields to create it from, and EVERYTHING —
// client, contact, site, project (+ CT code, paperwork checklist), quote v1,
// and for a settled job the quyết toán + its draft bill — commits in one
// transaction. A half-imported file is never left behind (a multi-call create
// once made operators re-submit and duplicate CT codes).
//
// The stage is asserted, like a direct create at a later stage: no gates run,
// nothing auto-advances. Twin: crm-api `app/api/routes/project_import.py`.
import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";

import { toBig } from "../common/coerce";
import { STAGE_ORDER } from "../common/stage";
import { PrismaService } from "../prisma/prisma.service";
import {
  QuoteItemDto,
  QuoteStatus,
  computeItems,
} from "../quotes/quotes.module";
import {
  SettlementItemDto,
  insertSettlement,
} from "../receivables/receivables.module";
import {
  DiscountDoc,
  assertDiscountWithin,
} from "../receivables/settlement-money";
import { insertProject } from "./insert-project";

const CLIENT_TYPE = ["company", "individual"];
// A workbook always carries a priced quote, so never "request"; never
// "closed" either — that locks the project before anyone has looked at it.
const IMPORT_STAGE = STAGE_ORDER.filter(
  (s) => s !== "request" && s !== "closed"
);

class ImportClientDto {
  @IsOptional() @IsInt() id?: number;
  @ValidateIf((o) => o.id == null) @IsString() @MinLength(1) name?: string;
  @ValidateIf((o) => o.id == null) @IsIn(CLIENT_TYPE) type?: string;
  @IsOptional() @IsString() tax_code?: string;
  @IsOptional() @IsString() address?: string;
}

class ImportContactDto {
  @IsOptional() @IsInt() id?: number;
  @ValidateIf((o) => o.id == null) @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() phone?: string;
}

class ImportLocationDto {
  @IsOptional() @IsInt() id?: number;
  @ValidateIf((o) => o.id == null) @IsString() @MinLength(1) name?: string;
  @ValidateIf((o) => o.id == null) @IsString() @MinLength(1) address?: string;
}

class ImportQuoteDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items: QuoteItemDto[];
  @IsNumber() @Min(0) @Max(1) vat_rate: number;
  @IsOptional() @IsNumber() @Min(0) discount_amount?: number;
}

class ImportSettlementDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SettlementItemDto)
  items: SettlementItemDto[];
  @IsNumber() @Min(0) @Max(1) vat_rate: number;
  @IsOptional() @IsNumber() @Min(0) discount_amount?: number;
}

export class ImportProjectDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => ImportClientDto)
  client: ImportClientDto;
  // Optional: a Bên A without a named representative is still a job.
  @IsOptional()
  @ValidateNested()
  @Type(() => ImportContactDto)
  contact?: ImportContactDto;
  @IsDefined()
  @ValidateNested()
  @Type(() => ImportLocationDto)
  location: ImportLocationDto;
  @IsString() @MinLength(1) name: string;
  @IsInt({ each: true }) @ArrayMinSize(1) type_ids: number[];
  @IsIn(IMPORT_STAGE) stage: string;
  @IsOptional() @IsString() request_note?: string;
  @IsDefined()
  @ValidateNested()
  @Type(() => ImportQuoteDto)
  quote: ImportQuoteDto;
  // Only for a job whose quyết toán is already in the workbook.
  @IsOptional()
  @ValidateNested()
  @Type(() => ImportSettlementDto)
  settlement?: ImportSettlementDto;
}

type Tx = Prisma.TransactionClient;

@Controller("projects")
export class ProjectImportController {
  constructor(private readonly prisma: PrismaService) {}

  @Post("import")
  @HttpCode(201)
  async import(@Body() dto: ImportProjectDto) {
    if (dto.settlement && dto.stage !== "settlement")
      throw new BadRequestException(
        "a settlement is only imported at stage settlement"
      );
    // Fail before writing anything when the money cannot be stored.
    const quote = computeItems(dto.quote.items);
    const discount = toBig(dto.quote.discount_amount ?? 0)!;
    assertDiscountWithin(quote.total, discount, DiscountDoc.QUOTE);

    return this.prisma.$transaction(async (tx) => {
      const clientId = await this.client(tx, dto.client);
      const contactId = dto.contact
        ? await this.contact(tx, clientId, dto.contact)
        : null;
      const location = await this.location(
        tx,
        clientId,
        contactId,
        dto.location
      );
      // Same defaults as POST /projects: the working contact falls back to the
      // site manager, the decision maker to the working contact.
      const working = contactId ?? location.manager_contact_id ?? null;

      const project = await insertProject(tx, {
        name: dto.name,
        client_id: clientId,
        location_id: location.id,
        working_contact_id: working,
        decision_maker_contact_id: working,
        stage: dto.stage,
        request_note: dto.request_note,
        type_ids: dto.type_ids,
      });
      await tx.quote.create({
        data: {
          project_id: project.id,
          version: 1,
          // At "quote" the client has the paper and has not answered; any
          // later stage means it was chốt. The decision date is unknown.
          status:
            dto.stage === "quote" ? QuoteStatus.WAITING : QuoteStatus.DEAL,
          total_amount: quote.total,
          discount_amount: discount,
          vat_rate: dto.quote.vat_rate,
          items: { create: quote.rows },
        },
      });
      if (dto.settlement)
        await insertSettlement(tx, {
          project_id: project.id,
          ...dto.settlement,
        });
      return project;
    });
  }

  private async client(tx: Tx, dto: ImportClientDto) {
    if (dto.id == null)
      return (
        await tx.client.create({
          data: {
            name: dto.name!,
            type: dto.type!,
            tax_code: dto.tax_code,
            address: dto.address,
          },
        })
      ).id;
    const row = await tx.client.findUnique({ where: { id: dto.id } });
    if (!row) throw new BadRequestException("client.id does not exist");
    return row.id;
  }

  private async contact(tx: Tx, clientId: number, dto: ImportContactDto) {
    if (dto.id == null)
      return (
        await tx.contact.create({
          data: {
            client_id: clientId,
            name: dto.name!,
            title: dto.title,
            phone: dto.phone,
          },
        })
      ).id;
    const row = await tx.contact.findUnique({ where: { id: dto.id } });
    if (row?.client_id !== clientId)
      throw new BadRequestException("contact.id does not belong to the client");
    return row.id;
  }

  private async location(
    tx: Tx,
    clientId: number,
    contactId: number | null,
    dto: ImportLocationDto
  ) {
    if (dto.id == null)
      return tx.location.create({
        data: {
          client_id: clientId,
          name: dto.name!,
          address: dto.address!,
          manager_contact_id: contactId,
        },
      });
    const row = await tx.location.findUnique({ where: { id: dto.id } });
    if (row?.client_id !== clientId)
      throw new BadRequestException(
        "location.id does not belong to the client"
      );
    return row;
  }
}
