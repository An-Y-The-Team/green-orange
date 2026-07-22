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
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from "class-validator";

import { PrismaService } from "../prisma/prisma.service";

const STATUS = ["active", "lead", "churned"];

class CreateClientDto {
  @IsString() @MinLength(2) name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(6) phone: string;
  @IsString() @MinLength(1) company: string;
  @IsIn(STATUS) status: string;
}

class UpdateClientDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsIn(STATUS) status?: string;
}

@Controller("clients")
class ClientsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.client.findMany();
  }

  @Get(":id")
  async get(@Param("id", ParseIntPipe) id: number) {
    const row = await this.prisma.client.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Client not found");
    return row;
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateClientDto) {
    return this.prisma.client.create({ data: dto });
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateClientDto
  ) {
    await this.get(id);
    return this.prisma.client.update({ where: { id }, data: dto });
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id", ParseIntPipe) id: number) {
    await this.get(id);
    await this.prisma.client.delete({ where: { id } });
  }
}

@Module({ controllers: [ClientsController] })
export class ClientsModule {}
