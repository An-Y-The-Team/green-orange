import {
  Body,
  Controller,
  Get,
  HttpCode,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
} from "@nestjs/common";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";

import { nextCode } from "../common/code";
import { PrismaService } from "../prisma/prisma.service";

const QUOTE_TYPE = ["bao_gia", "quyet_toan"];

class QuoteItemDto {
  @IsString() @MinLength(1) description: string;
  @IsString() @MinLength(1) unit: string;
  @IsNumber() @Min(0) quantity: number;
  @IsNumber() @Min(0) unit_price: number;
}

class CreateQuoteDto {
  @IsString() @MinLength(3) title: string;
  @IsString() @MinLength(1) client: string;
  @IsString() @MinLength(1) project_code: string;
  @IsIn(QUOTE_TYPE) type: string;
  @IsDateString() issue_date: string;
  @IsDateString() valid_until: string;
  @IsNumber() @Min(0) @Max(1) vat_rate: number;
  @IsOptional() @IsString() notes?: string;
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items: QuoteItemDto[];
}

@Controller("quotes")
class QuotesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.quote.findMany();
  }

  @Get(":id")
  async get(@Param("id", ParseIntPipe) id: number) {
    const row = await this.prisma.quote.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Quote not found");
    return row;
  }

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateQuoteDto) {
    // Code prefix follows the type: quyết toán → QT, báo giá → BG. New quotes
    // start as a draft (nháp). Sequence is global by id, like the UI mock.
    const prefix = dto.type === "quyet_toan" ? "QT" : "BG";
    const code = await nextCode(this.prisma.quote, prefix);
    return this.prisma.quote.create({
      data: {
        code,
        project_code: dto.project_code,
        client: dto.client,
        title: dto.title,
        type: dto.type,
        issue_date: new Date(dto.issue_date),
        valid_until: new Date(dto.valid_until),
        vat_rate: dto.vat_rate,
        notes: dto.notes ?? "",
        items: dto.items as object[],
        // status defaults to "nhap" in the schema
      },
    });
  }
}

@Module({ controllers: [QuotesController] })
export class QuotesModule {}
