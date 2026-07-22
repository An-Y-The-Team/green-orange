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
import { IsOptional, IsString } from "class-validator";

import { PrismaService } from "../prisma/prisma.service";

class CreateContactDto {
  @IsString() name: string;
  @IsString() email: string;
  @IsString() phone: string;
  @IsString() title: string;
  @IsString() company: string;
}

class UpdateContactDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() company?: string;
}

@Controller("contacts")
class ContactsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.contact.findMany();
  }

  @Get(":id")
  async get(@Param("id", ParseIntPipe) id: number) {
    const row = await this.prisma.contact.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Contact not found");
    return row;
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateContactDto) {
    return this.prisma.contact.create({ data: dto });
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateContactDto
  ) {
    await this.get(id);
    return this.prisma.contact.update({ where: { id }, data: dto });
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id", ParseIntPipe) id: number) {
    await this.get(id);
    await this.prisma.contact.delete({ where: { id } });
  }
}

@Module({ controllers: [ContactsController] })
export class ContactsModule {}
