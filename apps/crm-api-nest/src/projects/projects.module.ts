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
import { Type } from "class-transformer";
import {
  ArrayMinSize,
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

import { businessToday } from "../common/business-date";
import { nextCode } from "../common/code";
import { toDate } from "../common/coerce";
import { type PageQuery, pageArgs } from "../common/pagination";
import { assertProjectOpen } from "../common/project-lock";
import { STAGE_ORDER } from "../common/stage";
import { DEFAULT_PAPERWORK } from "../paperwork/paperwork.module";
import { PrismaService } from "../prisma/prisma.service";

// Enum-like values — English snake_case, from prisma/schema.prisma comments.
const STAGE = STAGE_ORDER;
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
      throw new ConflictException(`Project type is used by ${used} project(s)`);
    await this.prisma.projectType.delete({ where: { id } });
  }
}

// ── Projects ────────────────────────────────────────────────────────────────
// Stage-2 measurement rows, stored as Json (scratch input for quote prefill).
class SurveyItemDto {
  @IsString() @MinLength(1) name: string;
  @IsOptional() @IsNumber() @Min(0) quantity?: number;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsString() note?: string;
}

class CreateProjectDto {
  @IsString() @MinLength(1) name: string;
  @IsInt() client_id: number;
  @IsInt() location_id: number;
  @IsOptional() @IsInt() working_contact_id?: number;
  @IsOptional() @IsInt() decision_maker_contact_id?: number;
  @IsInt({ each: true }) @ArrayMinSize(1) type_ids: number[];
  // Starting stage — default "request". Creating at a later stage asserts
  // historical state (direct create / pre-CRM backfill); no gates run on
  // create (crm-ui-redesign.md, 2026-07-24).
  @IsOptional() @IsIn(STAGE) stage?: string;
  @IsOptional() @IsString() request_note?: string;
  @IsOptional() @IsString() referral_source?: string;
  // Accepted on create so the intake form is one write — a failed follow-up
  // PATCH used to report failure on an already-committed project (F14).
  @IsOptional() @IsDateString() appointment_at?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SurveyItemDto)
  survey_items?: SurveyItemDto[];
}

class UpdateProjectDto {
  @IsOptional() @IsString() @MinLength(1) name?: string;
  @IsOptional() @IsInt() working_contact_id?: number;
  @IsOptional() @IsInt() decision_maker_contact_id?: number;
  @IsOptional() @IsInt({ each: true }) @ArrayMinSize(1) type_ids?: number[];
  @IsOptional() @IsString() request_note?: string;
  @IsOptional() @IsString() referral_source?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SurveyItemDto)
  survey_items?: SurveyItemDto[];
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
export class ProjectsController {
  constructor(private readonly prisma: PrismaService) {}

  // Contacts are owned by a client; a foreign one would show on the project
  // header and printed documents, and block the client delete with a raw FK.
  private async assertContactBelongsTo(
    clientId: number,
    contactId: number,
    field: string
  ) {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
    });
    if (!contact || contact.client_id !== clientId)
      throw new BadRequestException(
        `${field} must be a contact of the same client`
      );
  }

  @Get()
  list(
    @Query() page: PageQuery,
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
      include: {
        client: true,
        location: true,
        types: true,
        // F19: the field page needs the site contact per appointment and used to
        // refetch GET /projects/:id once per row for it. A `select` keeps the
        // list payload from growing into the detail response.
        working_contact: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { id: "desc" },
      ...pageArgs(page),
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
      throw new BadRequestException("location_id does not belong to client_id");
    // location.manager_contact_id is known-good; only client-supplied ids need it.
    if (dto.working_contact_id != null)
      await this.assertContactBelongsTo(
        dto.client_id,
        dto.working_contact_id,
        "working_contact_id"
      );
    if (dto.decision_maker_contact_id != null)
      await this.assertContactBelongsTo(
        dto.client_id,
        dto.decision_maker_contact_id,
        "decision_maker_contact_id"
      );
    const working =
      dto.working_contact_id ?? location.manager_contact_id ?? null;
    if (working === null)
      throw new BadRequestException(
        "working_contact_id required (location has no manager)"
      );
    const code = await nextCode(this.prisma.project, "CT");
    // Same transaction: auto-seed the stage-5 default paperwork checklist.
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          code,
          name: dto.name,
          client_id: dto.client_id,
          location_id: dto.location_id,
          working_contact_id: working,
          decision_maker_contact_id: dto.decision_maker_contact_id ?? working,
          stage: dto.stage ?? "request",
          appointment_at: toDate(dto.appointment_at),
          request_note: dto.request_note,
          referral_source: dto.referral_source,
          survey_items: dto.survey_items?.map((i) => ({ ...i })),
          types: { connect: dto.type_ids.map((id) => ({ id })) },
        },
        include: { client: true, location: true, types: true },
      });
      await tx.paperworkItem.createMany({
        data: DEFAULT_PAPERWORK.map((name) => ({
          project_id: project.id,
          name,
        })),
      });
      return project;
    });
  }

  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateProjectDto
  ) {
    const current = await this.prisma.project.findUnique({ where: { id } });
    if (!current) throw new NotFoundException("Project not found");

    // Closed projects are locked; the only allowed PATCH is the reopen
    // transition (stage: closed → settlement), a backward move — no gates.
    if (current.stage === "closed" && dto.stage !== "settlement")
      throw new ConflictException(
        "project is closed — reopen it (stage: settlement) before editing"
      );

    // Forward-only in [kickoff, hoarding, works]; skipping allowed
    // (kickoff → works directly — Dựng rào is optional for indoor jobs).
    if (
      dto.execution_sub_status !== undefined &&
      current.execution_sub_status !== null &&
      EXECUTION_SUB.indexOf(dto.execution_sub_status) <
        EXECUTION_SUB.indexOf(current.execution_sub_status)
    )
      throw new BadRequestException(
        "execution_sub_status can only move forward (kickoff → hoarding → works)"
      );

    if (
      dto.status === "cancelled" &&
      !(dto.cancel_reason ?? current.cancel_reason)
    )
      throw new BadRequestException(
        "cancel_reason is required when cancelling a project"
      );

    // The client comes from the row — UpdateProjectDto cannot move a project.
    if (dto.working_contact_id != null)
      await this.assertContactBelongsTo(
        current.client_id,
        dto.working_contact_id,
        "working_contact_id"
      );
    if (dto.decision_maker_contact_id != null)
      await this.assertContactBelongsTo(
        current.client_id,
        dto.decision_maker_contact_id,
        "decision_maker_contact_id"
      );

    // No stage gates (crm-ui-redesign.md, 2026-07-24): transitions are soft.
    // Forward moves auto-advance from the work (see advanceStage in the quote/
    // contract/settlement/milestone modules); a manual jump here just applies.

    const { type_ids, ...rest } = dto;
    const data: Record<string, unknown> = { ...rest };
    for (const f of DATE_FIELDS)
      if (dto[f] !== undefined) data[f] = toDate(dto[f]);
    if (type_ids !== undefined)
      data.types = { set: type_ids.map((tid) => ({ id: tid })) };
    // Server-stamped, never client-supplied (crm-ui-redesign.md, stage 7).
    if (
      dto.acceptance_sub_status === "passed" &&
      !current.acceptance_passed_date
    )
      data.acceptance_passed_date = businessToday();
    return this.prisma.project.update({ where: { id }, data });
  }

  // Every child relation is required, so Prisma defaults to Restrict — a bare
  // project.delete() raised P2003 and surfaced as a 500 for EVERY project (all
  // of them are seeded with 4 paperwork items on create). Refuse with a reason
  // when real records exist; cancel (status: cancelled) is the intended path.
  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id", ParseIntPipe) id: number) {
    const row = await this.prisma.project.findUnique({
      where: { id },
      select: {
        settlement: { select: { id: true } },
        _count: {
          select: {
            quotes: true,
            contracts: true,
            bills: true,
            payment_milestones: true,
            assignments: true,
            timekeeping: true,
            attachments: true,
          },
        },
      },
    });
    if (!row) throw new NotFoundException("Project not found");
    await assertProjectOpen(this.prisma, id);

    const blocking = Object.entries(row._count).filter(([, n]) => n > 0);
    if (row.settlement) blocking.push(["settlement", 1]);
    if (blocking.length > 0)
      throw new ConflictException(
        `cannot delete project: it still has ${blocking
          .map(([name, n]) => `${name} (${n})`)
          .join(", ")} — cancel it instead`
      );

    // Only the incidental children cascade: paperwork items are auto-seeded on
    // create, notes are annotations. Anything with business meaning blocks above.
    await this.prisma.$transaction([
      this.prisma.paperworkItem.deleteMany({ where: { project_id: id } }),
      this.prisma.projectNote.deleteMany({ where: { project_id: id } }),
      this.prisma.project.delete({ where: { id } }),
    ]);
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
  list(@Query() page: PageQuery, @Query("project_id") projectId?: string) {
    return this.prisma.projectNote.findMany({
      where: projectId ? { project_id: Number(projectId) } : undefined,
      // created_at repeats within a bulk insert — id breaks the tie so pages
      // don't overlap or drop rows.
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      ...pageArgs(page),
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
export class AttachmentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(
    @Query() page: PageQuery,
    @Query("project_id") projectId?: string,
    @Query("kind") kind?: string
  ) {
    return this.prisma.attachment.findMany({
      where: {
        project_id: projectId ? Number(projectId) : undefined,
        kind: kind || undefined,
      },
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      ...pageArgs(page),
    });
  }

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateAttachmentDto) {
    await assertProjectOpen(this.prisma, dto.project_id);
    // Another project's checklist row would collect this file silently.
    if (dto.paperwork_item_id != null) {
      const item = await this.prisma.paperworkItem.findUnique({
        where: { id: dto.paperwork_item_id },
      });
      if (!item || item.project_id !== dto.project_id)
        throw new BadRequestException(
          "paperwork_item_id does not belong to project_id"
        );
    }
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
    await assertProjectOpen(this.prisma, row.project_id);
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
