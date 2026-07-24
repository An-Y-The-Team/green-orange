import {
  BadRequestException,
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
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from "class-validator";

import { PrismaService } from "../prisma/prisma.service";

const CLIENT_TYPE = ["company", "individual"];

// ── Clients ─────────────────────────────────────────────────────────────────
class CreateClientDto {
  @IsString() @MinLength(1) name: string;
  @IsIn(CLIENT_TYPE) type: string;
  @IsOptional() @IsString() tax_code?: string;
  @IsOptional() @IsString() note?: string;
  // the client's own email (distinct from Contact emails). For individuals it
  // also seeds their auto-created contact (client === the person).
  @IsOptional() @IsEmail() email?: string;
  // individual clients: phone seeds the auto-created default contact
  @IsOptional() @IsString() phone?: string;
  @ValidateIf((o) => o.type === "individual")
  @IsString()
  @MinLength(1)
  address?: string;
}

class UpdateClientDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsIn(CLIENT_TYPE) type?: string;
  @IsOptional() @IsString() tax_code?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() note?: string;
}

@Controller("clients")
class ClientsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.client.findMany({
      include: { _count: { select: { locations: true, projects: true } } },
    });
  }

  @Get(":id")
  async get(@Param("id", ParseIntPipe) id: number) {
    const row = await this.prisma.client.findUnique({
      where: { id },
      include: { contacts: true, locations: true },
    });
    if (!row) throw new NotFoundException("Client not found");
    return row;
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateClientDto) {
    const data = {
      name: dto.name,
      type: dto.type,
      tax_code: dto.tax_code,
      email: dto.email,
      note: dto.note,
    };
    if (dto.type !== "individual") {
      return this.prisma.client.create({
        data,
        include: { contacts: true, locations: true },
      });
    }
    // Individual = the client is their own contact, with one default location.
    return this.prisma.$transaction(async (tx) => {
      const client = await tx.client.create({ data });
      const contact = await tx.contact.create({
        data: {
          client_id: client.id,
          name: dto.name,
          phone: dto.phone,
          email: dto.email,
        },
      });
      await tx.location.create({
        data: {
          client_id: client.id,
          name: "Mặc định",
          address: dto.address!,
          manager_contact_id: contact.id,
        },
      });
      return tx.client.findUniqueOrThrow({
        where: { id: client.id },
        include: { contacts: true, locations: true },
      });
    });
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
    const projects = await this.prisma.project.count({
      where: { client_id: id },
    });
    if (projects)
      throw new ConflictException("Client has projects and cannot be deleted");
    // Locations reference contacts (manager), so delete in FK order.
    await this.prisma.$transaction([
      this.prisma.location.deleteMany({ where: { client_id: id } }),
      this.prisma.contact.deleteMany({ where: { client_id: id } }),
      this.prisma.client.delete({ where: { id } }),
    ]);
  }
}

// ── Contacts ────────────────────────────────────────────────────────────────
class CreateContactDto {
  @IsInt() client_id: number;
  @IsString() @MinLength(1) name: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() note?: string;
}

class UpdateContactDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() note?: string;
}

@Controller("contacts")
class ContactsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Query("client_id") clientId?: string) {
    return this.prisma.contact.findMany({
      where: clientId ? { client_id: Number(clientId) } : undefined,
    });
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
    const [locations, projects] = await Promise.all([
      this.prisma.location.count({ where: { manager_contact_id: id } }),
      this.prisma.project.count({
        where: {
          OR: [{ working_contact_id: id }, { decision_maker_contact_id: id }],
        },
      }),
    ]);
    if (locations || projects)
      throw new ConflictException(
        "Contact is referenced by locations or projects and cannot be deleted"
      );
    await this.prisma.contact.delete({ where: { id } });
  }
}

// ── Locations ───────────────────────────────────────────────────────────────
class CreateLocationDto {
  @IsInt() client_id: number;
  @IsString() @MinLength(1) name: string;
  @IsString() @MinLength(1) address: string;
  @IsOptional() @IsInt() manager_contact_id?: number;
}

class UpdateLocationDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsString() @MinLength(1) address?: string;
  @IsOptional() @IsInt() manager_contact_id?: number | null;
}

@Controller("locations")
class LocationsController {
  constructor(private readonly prisma: PrismaService) {}

  private async assertManagerBelongsTo(clientId: number, contactId: number) {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
    });
    if (!contact || contact.client_id !== clientId)
      throw new BadRequestException(
        "manager_contact_id must be a contact of the same client"
      );
  }

  @Get()
  list(@Query("client_id") clientId?: string) {
    return this.prisma.location.findMany({
      where: clientId ? { client_id: Number(clientId) } : undefined,
      include: { manager: true },
    });
  }

  @Get(":id")
  async get(@Param("id", ParseIntPipe) id: number) {
    const row = await this.prisma.location.findUnique({
      where: { id },
      include: { manager: true },
    });
    if (!row) throw new NotFoundException("Location not found");
    return row;
  }

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateLocationDto) {
    if (dto.manager_contact_id != null)
      await this.assertManagerBelongsTo(dto.client_id, dto.manager_contact_id);
    return this.prisma.location.create({
      data: dto,
      include: { manager: true },
    });
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateLocationDto
  ) {
    const row = await this.get(id);
    if (dto.manager_contact_id != null)
      await this.assertManagerBelongsTo(row.client_id, dto.manager_contact_id);
    return this.prisma.location.update({
      where: { id },
      data: dto,
      include: { manager: true },
    });
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id", ParseIntPipe) id: number) {
    await this.get(id);
    const projects = await this.prisma.project.count({
      where: { location_id: id },
    });
    if (projects)
      throw new ConflictException(
        "Location has projects and cannot be deleted"
      );
    await this.prisma.location.delete({ where: { id } });
  }
}

@Module({
  controllers: [ClientsController, ContactsController, LocationsController],
})
export class ClientsModule {}
