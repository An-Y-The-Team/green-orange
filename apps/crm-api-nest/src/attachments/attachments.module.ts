/**
 * Attachments — one table for every file in the bucket, owned by a project or a
 * crew member and optionally linked to the record it documents. Metadata rows
 * plus presigned S3 upload/download; bytes never pass through this process
 * (common/storage.ts).
 * Python counterpart: `apps/crm-api/app/api/routes/attachments.py` (+
 * `app/services/attachments.py`).
 */
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";
import type { Response } from "express";

import { IsCrmAdmin } from "../auth/admin";
import { type PageQuery, pageArgs, withTotalCount } from "../common/pagination";
import { assertProjectOpen } from "../common/project-lock";
import {
  ALLOWED_CONTENT_TYPES,
  MAX_UPLOAD_BYTES,
  PRESIGN_TTL_SECONDS,
  basename,
  buildKey,
  deleteObject,
  isOwnKey,
  presignGet,
  presignPut,
  storageConfigured,
} from "../common/storage";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Every file category, the owner it hangs off and the ONE record it must link
 * to (if any). Owner + link is what lets a panel find "the payment proof for
 * THIS milestone" with a filter instead of guessing from a filename.
 * Python mirror: `ATTACHMENT_KINDS` in app/models/attachment.py.
 */
type AttachmentLink =
  | "quote_id"
  | "contract_id"
  | "payment_milestone_id"
  | "bill_id"
  | "paperwork_item_id";
export const ATTACHMENT_KINDS: Record<
  string,
  { owner: "project" | "crew"; link?: AttachmentLink }
> = {
  survey: { owner: "project" },
  signed_quote: { owner: "project", link: "quote_id" },
  signed_contract: { owner: "project", link: "contract_id" },
  payment_proof: { owner: "project", link: "payment_milestone_id" },
  paperwork: { owner: "project", link: "paperwork_item_id" },
  site_log: { owner: "project" },
  finish_image: { owner: "project" },
  defect_image: { owner: "project" },
  acceptance_report: { owner: "project" },
  settlement: { owner: "project" },
  vat_invoice: { owner: "project", link: "bill_id" },
  other: { owner: "project" },
  id_card: { owner: "crew" },
  certificate: { owner: "crew" },
};
const ATTACHMENT_KIND = Object.keys(ATTACHMENT_KINDS);
const ATTACHMENT_LINKS: AttachmentLink[] = [
  "quote_id",
  "contract_id",
  "payment_milestone_id",
  "bill_id",
  "paperwork_item_id",
];

class AttachmentOwnerDto {
  @IsOptional() @IsInt() project_id?: number;
  @IsOptional() @IsInt() crew_member_id?: number;
  @IsIn(ATTACHMENT_KIND) kind: string;
}

class CreateAttachmentDto extends AttachmentOwnerDto {
  @IsOptional() @IsInt() quote_id?: number;
  @IsOptional() @IsInt() contract_id?: number;
  @IsOptional() @IsInt() payment_milestone_id?: number;
  @IsOptional() @IsInt() bill_id?: number;
  @IsOptional() @IsInt() paperwork_item_id?: number;
  @IsString() @MinLength(1) s3_key: string;
  @IsOptional() @IsString() note?: string;
}

class PresignAttachmentDto extends AttachmentOwnerDto {
  @IsString() @MinLength(1) filename: string;
  @IsString() @MinLength(1) content_type: string;
  @IsInt() @Min(1) content_length: number;
}

const OPTIONAL_INT = new ParseIntPipe({ optional: true });

/**
 * Workers' CCCD / chứng chỉ scans are personal data (NĐ 13/2023): only
 * crm-admins may list, open, upload or delete them (auth/admin.ts).
 */
function assertCrewAccess(admin: boolean): void {
  if (!admin)
    throw new ForbiddenException("Crew documents are restricted to crm-admins");
}

const STORAGE_OFF =
  "Object storage is not configured — set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY";

@Controller("attachments")
export class AttachmentsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The kind decides the owner: a project file needs project_id and no
   * crew_member_id, a CCCD the reverse. 400 rather than letting the DB CHECK
   * surface as a 500. Then the owner must exist, and a project must be open.
   */
  private async assertOwner(
    dto: AttachmentOwnerDto,
    admin: boolean
  ): Promise<void> {
    const crew = ATTACHMENT_KINDS[dto.kind].owner === "crew";
    if (crew ? dto.crew_member_id == null : dto.project_id == null)
      throw new BadRequestException(
        `kind ${dto.kind} needs ${crew ? "crew_member_id" : "project_id"}`
      );
    if (crew ? dto.project_id != null : dto.crew_member_id != null)
      throw new BadRequestException(
        "An attachment has exactly one owner: project_id or crew_member_id"
      );
    if (crew) {
      assertCrewAccess(admin);
      const member = await this.prisma.crewMember.findUnique({
        where: { id: dto.crew_member_id },
        select: { id: true },
      });
      if (!member) throw new NotFoundException("Crew member not found");
      return;
    }
    // assertProjectOpen only rejects a CLOSED project; a project_id that does
    // not exist passes it silently and would mint signed PUTs for keys no row
    // will ever reference.
    const project = await this.prisma.project.findUnique({
      where: { id: dto.project_id },
      select: { id: true },
    });
    if (!project) throw new NotFoundException("Project not found");
    await assertProjectOpen(this.prisma, dto.project_id!);
  }

  /**
   * Exactly the kind's link, and it must sit on the same project — otherwise
   * another job's contract or milestone would collect this file silently.
   */
  private async assertLink(dto: CreateAttachmentDto): Promise<void> {
    const want = ATTACHMENT_KINDS[dto.kind].link;
    for (const link of ATTACHMENT_LINKS) {
      if (link !== want && dto[link] != null)
        throw new BadRequestException(`kind ${dto.kind} takes no ${link}`);
    }
    if (!want) return;
    const id = dto[want];
    if (id == null)
      throw new BadRequestException(`kind ${dto.kind} needs ${want}`);
    const query = { where: { id }, select: { project_id: true } };
    const row = await {
      quote_id: () => this.prisma.quote.findUnique(query),
      contract_id: () => this.prisma.contract.findUnique(query),
      payment_milestone_id: () =>
        this.prisma.paymentMilestone.findUnique(query),
      bill_id: () => this.prisma.bill.findUnique(query),
      paperwork_item_id: () => this.prisma.paperworkItem.findUnique(query),
    }[want]();
    if (!row || row.project_id !== dto.project_id)
      throw new BadRequestException(`${want} does not belong to project_id`);
  }

  /**
   * Hands out a short-lived signed PUT; the browser uploads straight to the
   * bucket and then POSTs the returned `s3_key` to `POST /attachments`. Bytes
   * never pass through this process.
   *
   * The content type and length are signed into the URL, so the checks below are
   * not the only line of defence — a client that lies about either is refused by
   * the bucket. They run here to fail fast with a sentence instead of a 403.
   */
  @Post("presign")
  @HttpCode(200)
  async presign(
    @Body() dto: PresignAttachmentDto,
    @IsCrmAdmin() admin: boolean
  ) {
    // Say which knob is missing. Without this the plain Error from requireClient
    // surfaces as a bare 500 "Máy chủ đang lỗi", and .env.example, config.py and
    // DEPLOY.md §6f all promise the opposite.
    if (!storageConfigured) throw new ServiceUnavailableException(STORAGE_OFF);
    await this.assertOwner(dto, admin);
    if (!ALLOWED_CONTENT_TYPES.has(dto.content_type))
      throw new BadRequestException(
        `Unsupported file type: ${dto.content_type}`
      );
    if (dto.content_length > MAX_UPLOAD_BYTES)
      throw new BadRequestException(
        `File is larger than ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB`
      );
    const s3_key = buildKey(dto, dto.kind, dto.filename);
    const upload_url = await presignPut(
      s3_key,
      dto.content_type,
      dto.content_length
    );
    return { upload_url, s3_key, expires_in: PRESIGN_TTL_SECONDS };
  }

  /** Short-lived signed GET for one row — the link the UI opens. */
  @Get(":id/url")
  async downloadUrl(
    @Param("id", ParseIntPipe) id: number,
    @IsCrmAdmin() admin: boolean
  ) {
    const row = await this.prisma.attachment.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Attachment not found");
    if (row.crew_member_id != null) assertCrewAccess(admin);
    // Rows from the metadata-only era (and the seed) hold a bare filename, with
    // no object behind it. Signing one yields a valid URL that opens the
    // provider's raw NoSuchKey XML in a new tab; say so instead.
    if (!isOwnKey(row, row.kind, row.s3_key))
      throw new NotFoundException(
        "This attachment predates file storage — only its name was recorded"
      );
    if (!storageConfigured) throw new ServiceUnavailableException(STORAGE_OFF);
    const download_url = await presignGet(row.s3_key, basename(row.s3_key));
    return { download_url, expires_in: PRESIGN_TTL_SECONDS };
  }

  /**
   * Filter by owner, category and/or the record a file documents — e.g.
   * `?contract_id=12` is the signed scan of contract 12, nothing else.
   * Id filters are integers: `?bill_id=abc` is a 400, not NaN into Prisma (a
   * 500). FastAPI answers the same input with 422 — the documented
   * framework-level split (AGENTS.md).
   */
  @Get()
  list(
    @Res({ passthrough: true }) res: Response,
    @Query() page: PageQuery,
    @IsCrmAdmin() admin: boolean,
    @Query("project_id", OPTIONAL_INT) project_id?: number,
    @Query("crew_member_id", OPTIONAL_INT) crew_member_id?: number,
    @Query("kind") kind?: string,
    @Query("quote_id", OPTIONAL_INT) quote_id?: number,
    @Query("contract_id", OPTIONAL_INT) contract_id?: number,
    @Query("payment_milestone_id", OPTIONAL_INT) payment_milestone_id?: number,
    @Query("bill_id", OPTIONAL_INT) bill_id?: number,
    @Query("paperwork_item_id", OPTIONAL_INT) paperwork_item_id?: number
  ) {
    // A typo'd kind would otherwise answer an empty list — indistinguishable
    // from "no files yet". hasOwn, not `ATTACHMENT_KINDS[kind]`: the object
    // literal would let `?kind=constructor` through its prototype.
    if (kind && !Object.hasOwn(ATTACHMENT_KINDS, kind))
      throw new BadRequestException(`Unknown kind: ${kind}`);
    // A non-admin asking for a worker's papers is refused; one listing without
    // an owner filter just never sees crew rows.
    if (crew_member_id != null) assertCrewAccess(admin);
    const where = {
      project_id,
      crew_member_id: admin ? crew_member_id : null,
      kind: kind || undefined,
      quote_id,
      contract_id,
      payment_milestone_id,
      bill_id,
      paperwork_item_id,
    };
    return withTotalCount(
      res,
      this.prisma.attachment.findMany({
        where,
        orderBy: [{ created_at: "desc" }, { id: "desc" }],
        ...pageArgs(page),
      }),
      this.prisma.attachment.count({ where })
    );
  }

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateAttachmentDto, @IsCrmAdmin() admin: boolean) {
    await this.assertOwner(dto, admin);
    await this.assertLink(dto);
    // The key must be one presignPut minted for THIS owner and kind. DELETE
    // removes the object this names, so an unchecked key lets a caller record a
    // row over someone else's file and then delete their bytes, leaving their
    // row behind.
    if (!isOwnKey(dto, dto.kind, dto.s3_key))
      throw new BadRequestException(
        "s3_key was not issued for this owner and kind — upload via /attachments/presign"
      );
    const want = ATTACHMENT_KINDS[dto.kind].link;
    return this.prisma.attachment.create({
      data: {
        project_id: dto.project_id,
        crew_member_id: dto.crew_member_id,
        kind: dto.kind,
        ...(want ? { [want]: dto[want] } : {}),
        s3_key: dto.s3_key,
        note: dto.note,
      },
    });
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(
    @Param("id", ParseIntPipe) id: number,
    @IsCrmAdmin() admin: boolean
  ) {
    const row = await this.prisma.attachment.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Attachment not found");
    if (row.crew_member_id != null) assertCrewAccess(admin);
    if (row.project_id != null)
      await assertProjectOpen(this.prisma, row.project_id);
    await this.prisma.attachment.delete({ where: { id } });
    // After the row, and deliberately NOT awaited: deleteObject swallows its own
    // errors, but awaiting it puts the SDK's retry backoff inside the user's
    // request — a bucket outage would turn a committed delete into a timeout
    // toast for a row that is already gone.
    void deleteObject(row.s3_key);
  }
}

@Module({ controllers: [AttachmentsController] })
export class AttachmentsModule {}
