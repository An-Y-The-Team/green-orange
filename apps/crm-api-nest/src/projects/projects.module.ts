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
  ArrayMinSize,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";

import { nextCode } from "../common/code";
import { toDate } from "../common/coerce";
import { PrismaService } from "../prisma/prisma.service";

// Enum-like values — English snake_case, from prisma/schema.prisma comments.
const STAGE = [
  "request",
  "survey",
  "quote",
  "contract",
  "paperwork",
  "execution",
  "acceptance",
  "settlement",
  "closed",
];
const STATUS = ["active", "on_hold", "cancelled"];
const EXECUTION_SUB = ["kickoff", "hoarding", "works"];
const ACCEPTANCE_SUB = ["request_sent", "inspecting", "rework", "passed"];
const ATTACHMENT_KIND = [
  "survey",
  "site_log",
  "finish_image",
  "signed_contract",
  "acceptance_report",
  "settlement",
  "paperwork",
  "other",
];

// ── Project types (user-managed tags) ───────────────────────────────────────
class ProjectTypeDto {
  @IsString() @MinLength(1) name: string;
}

@Controller("project-types")
class ProjectTypesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.projectType.findMany({ orderBy: { name: "asc" } });
  }

  @Get(":id")
  async get(@Param("id", ParseIntPipe) id: number) {
    const row = await this.prisma.projectType.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Project type not found");
    return row;
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: ProjectTypeDto) {
    return this.prisma.projectType.create({ data: { name: dto.name } });
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: ProjectTypeDto
  ) {
    await this.get(id);
    return this.prisma.projectType.update({
      where: { id },
      data: { name: dto.name },
    });
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id", ParseIntPipe) id: number) {
    await this.get(id);
    const used = await this.prisma.project.count({
      where: { types: { some: { id } } },
    });
    if (used > 0)
      throw new ConflictException(
        `Project type is used by ${used} project(s)`
      );
    await this.prisma.projectType.delete({ where: { id } });
  }
}

// ── Projects ────────────────────────────────────────────────────────────────
class CreateProjectDto {
  @IsString() @MinLength(1) name: string;
  @IsInt() client_id: number;
  @IsInt() location_id: number;
  @IsOptional() @IsInt() working_contact_id?: number;
  @IsOptional() @IsInt() decision_maker_contact_id?: number;
  @IsInt({ each: true }) @ArrayMinSize(1) type_ids: number[];
}

class UpdateProjectDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsInt() working_contact_id?: number;
  @IsOptional() @IsInt() decision_maker_contact_id?: number;
  @IsOptional() @IsInt({ each: true }) @ArrayMinSize(1) type_ids?: number[];
  @IsOptional() @IsIn(STAGE) stage?: string;
  @IsOptional() @IsIn(STATUS) status?: string;
  @IsOptional() @IsString() cancel_reason?: string;
  @IsOptional() @IsDateString() follow_up_date?: string;
  @IsOptional() @IsDateString() appointment_at?: string;
  @IsOptional() @IsDateString() visit_date?: string;
  @IsOptional() @IsString() survey_note?: string;
  @IsOptional() @IsDateString() client_signed_date?: string;
  @IsOptional() @IsIn(EXECUTION_SUB) execution_sub_status?: string;
  @IsOptional() @IsDateString() start_date?: string;
  @IsOptional() @IsInt() @Min(0) est_duration_days?: number;
  @IsOptional() @IsInt() @Min(0) actual_duration_days?: number;
  @IsOptional() @IsString() approaches?: string;
  @IsOptional() @IsDateString() works_done_at?: string;
  @IsOptional() @IsIn(ACCEPTANCE_SUB) acceptance_sub_status?: string;
}

const DATE_FIELDS = [
  "follow_up_date",
  "appointment_at",
  "visit_date",
  "client_signed_date",
  "start_date",
  "works_done_at",
] as const;

@Controller("projects")
class ProjectsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(
    @Query("client_id") clientId?: string,
    @Query("stage") stage?: string,
    @Query("status") status?: string
  ) {
    return this.prisma.project.findMany({
      where: {
        client_id: clientId ? Number(clientId) : undefined,
        stage: stage || undefined,
        status: status || undefined,
      },
      include: { client: true, location: true, types: true },
      orderBy: { id: "desc" },
    });
  }

  @Get(":id")
  async get(@Param("id", ParseIntPipe) id: number) {
    const row = await this.prisma.project.findUnique({
      where: { id },
      include: {
        client: true,
        location: true,
        types: true,
        working_contact: true,
        decision_maker: true,
        paperwork_items: true,
        quotes: { orderBy: { version: "desc" } },
        notes: { orderBy: { created_at: "desc" } },
      },
    });
    if (!row) throw new NotFoundException("Project not found");
    return row;
  }

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateProjectDto) {
    const location = await this.prisma.location.findUnique({
      where: { id: dto.location_id },
    });
    if (!location || location.client_id !== dto.client_id)
      throw new BadRequestException(
        "location_id does not belong to client_id"
      );
    const working =
      dto.working_contact_id ?? location.manager_contact_id ?? null;
    if (working === null)
      throw new BadRequestException(
        "working_contact_id required (location has no manager)"
      );
    const code = await nextCode(this.prisma.project, "CT");
    return this.prisma.project.create({
      data: {
        code,
        name: dto.name,
        client_id: dto.client_id,
        location_id: dto.location_id,
        working_contact_id: working,
        decision_maker_contact_id: dto.decision_maker_contact_id ?? working,
        types: { connect: dto.type_ids.map((id) => ({ id })) },
      },
      include: { client: true, location: true, types: true },
    });
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateProjectDto
  ) {
    const current = await this.prisma.project.findUnique({ where: { id } });
    if (!current) throw new NotFoundException("Project not found");

    if (
      dto.status === "cancelled" &&
      !(dto.cancel_reason ?? current.cancel_reason)
    )
      throw new BadRequestException(
        "cancel_reason is required when cancelling a project"
      );

    if (
      dto.stage !== undefined &&
      STAGE.indexOf(dto.stage) > STAGE.indexOf(current.stage)
    )
      await this.checkStageGate(id, dto, current);

    const { type_ids, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest };
    for (const f of DATE_FIELDS)
      if (dto[f] !== undefined) data[f] = toDate(dto[f]);
    if (type_ids !== undefined)
      data.types = { set: type_ids.map((tid) => ({ id: tid })) };
    return this.prisma.project.update({ where: { id }, data });
  }

  // Stage gates (docs/features/crm-business-flow.md, cross-entity rules).
  // Only forward moves are gated; backward/same-stage moves are free.
  private async checkStageGate(
    id: number,
    dto: UpdateProjectDto,
    current: { client_signed_date: Date | null; acceptance_sub_status: string | null }
  ) {
    switch (dto.stage) {
      case "contract": {
        const latest = await this.prisma.quote.findFirst({
          where: { project_id: id },
          orderBy: { version: "desc" },
        });
        if (latest?.status !== "deal")
          throw new BadRequestException(
            "Cannot enter contract stage: latest quote must have status 'deal'"
          );
        return;
      }
      case "execution": {
        const signed = dto.client_signed_date
          ? true
          : current.client_signed_date !== null;
        if (!signed)
          throw new BadRequestException(
            "Cannot enter execution stage: client_signed_date is not set"
          );
        const deposit = await this.prisma.paymentMilestone.findFirst({
          where: { project_id: id, type: "deposit", status: "paid" },
        });
        if (!deposit)
          throw new BadRequestException(
            "Cannot enter execution stage: no paid deposit milestone"
          );
        const pending = await this.prisma.paperworkItem.count({
          where: { project_id: id, status: { not: "approved" } },
        });
        if (pending > 0)
          throw new BadRequestException(
            `Cannot enter execution stage: ${pending} paperwork item(s) not approved`
          );
        return;
      }
      case "settlement": {
        const sub =
          dto.acceptance_sub_status ?? current.acceptance_sub_status;
        if (sub !== "passed")
          throw new BadRequestException(
            "Cannot enter settlement stage: acceptance sub-status must be 'passed'"
          );
        return;
      }
      case "closed": {
        const unpaidMilestones = await this.prisma.paymentMilestone.count({
          where: { project_id: id, status: { not: "paid" } },
        });
        const unpaidBills = await this.prisma.bill.count({
          where: { project_id: id, status: { not: "paid" } },
        });
        if (unpaidMilestones > 0 || unpaidBills > 0)
          throw new BadRequestException(
            "Cannot close project: unpaid payment milestones or bills remain"
          );
        return;
      }
      // survey, quote, paperwork (may start in parallel), acceptance: no gate.
    }
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id", ParseIntPipe) id: number) {
    const row = await this.prisma.project.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Project not found");
    await this.prisma.project.delete({ where: { id } });
  }
}

// ── Project notes ───────────────────────────────────────────────────────────
class CreateProjectNoteDto {
  @IsInt() project_id: number;
  @IsOptional() @IsString() tag?: string;
  @IsString() @MinLength(1) body: string;
}

@Controller("project-notes")
class ProjectNotesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Query("project_id") projectId?: string) {
    return this.prisma.projectNote.findMany({
      where: projectId ? { project_id: Number(projectId) } : undefined,
      orderBy: { created_at: "desc" },
    });
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateProjectNoteDto) {
    return this.prisma.projectNote.create({
      data: { project_id: dto.project_id, tag: dto.tag, body: dto.body },
    });
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id", ParseIntPipe) id: number) {
    const row = await this.prisma.projectNote.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Note not found");
    await this.prisma.projectNote.delete({ where: { id } });
  }
}

// ── Attachments (S3 metadata rows only; storage TBD) ───────────────────────
class CreateAttachmentDto {
  @IsInt() project_id: number;
  @IsIn(ATTACHMENT_KIND) kind: string;
  @IsOptional() @IsInt() paperwork_item_id?: number;
  @IsString() @MinLength(1) s3_key: string;
  @IsOptional() @IsString() note?: string;
}

@Controller("attachments")
class AttachmentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(
    @Query("project_id") projectId?: string,
    @Query("kind") kind?: string
  ) {
    return this.prisma.attachment.findMany({
      where: {
        project_id: projectId ? Number(projectId) : undefined,
        kind: kind || undefined,
      },
      orderBy: { created_at: "desc" },
    });
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateAttachmentDto) {
    return this.prisma.attachment.create({
      data: {
        project_id: dto.project_id,
        kind: dto.kind,
        paperwork_item_id: dto.paperwork_item_id,
        s3_key: dto.s3_key,
        note: dto.note,
      },
    });
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id", ParseIntPipe) id: number) {
    const row = await this.prisma.attachment.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Attachment not found");
    await this.prisma.attachment.delete({ where: { id } });
  }
}

@Module({
  controllers: [
    ProjectTypesController,
    ProjectsController,
    ProjectNotesController,
    AttachmentsController,
  ],
})
export class ProjectsModule {}
