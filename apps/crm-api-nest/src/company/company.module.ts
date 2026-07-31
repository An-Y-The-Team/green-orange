import { Body, Controller, Get, Module, Patch } from "@nestjs/common";
import { IsOptional, IsString, MaxLength } from "class-validator";

import { PrismaService } from "../prisma/prisma.service";

/** ~1.5 MB of base64 — generous for a letterhead mark, bounded for the row. */
const LOGO_MAX_CHARS = 2_000_000;

/**
 * Single-row company profile (id=1) — the letterhead + Bên B details printed
 * on every A4 document. All fields optional; null clears one, and the web app
 * falls back to its built-in defaults for anything unset.
 */
class UpdateCompanyProfileDto {
  @IsOptional() @IsString() name?: string | null;
  @IsOptional() @IsString() tagline?: string | null;
  @IsOptional() @IsString() address?: string | null;
  @IsOptional() @IsString() phone?: string | null;
  @IsOptional() @IsString() email?: string | null;
  @IsOptional() @IsString() tax_id?: string | null;
  @IsOptional() @IsString() website?: string | null;
  @IsOptional() @IsString() representative?: string | null;
  @IsOptional() @IsString() representative_title?: string | null;
  @IsOptional() @IsString() bank_account?: string | null;
  @IsOptional() @IsString() bank_name?: string | null;
  @IsOptional() @IsString() bank_branch?: string | null;
  // Lexical editorState JSON, opaque; null = built-in default
  @IsOptional() @IsString() letterhead_body?: string | null;
  @IsOptional() @IsString() national_body?: string | null;
  // Logo as a data URL. Capped so one row cannot grow unbounded — the upload UI
  // downscales before sending, this is the backstop.
  @IsOptional() @IsString() @MaxLength(LOGO_MAX_CHARS) logo?: string | null;
}

@Controller("company-profile")
class CompanyProfileController {
  constructor(private readonly prisma: PrismaService) {}

  /** The stored profile, or `{}` before the first save. */
  @Get()
  async get() {
    return (
      (await this.prisma.companyProfile.findUnique({
        where: { id: 1 },
      })) ?? {}
    );
  }

  @Patch()
  update(@Body() dto: UpdateCompanyProfileDto) {
    return this.prisma.companyProfile.upsert({
      where: { id: 1 },
      update: { ...dto },
      create: { id: 1, ...dto },
    });
  }
}

@Module({ controllers: [CompanyProfileController] })
export class CompanyModule {}
