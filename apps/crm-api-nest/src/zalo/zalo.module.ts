import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Module,
  Post,
  UnauthorizedException,
} from "@nestjs/common";

import { Public } from "../common/public.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { signatureMatches, zaloSignature } from "./zalo-signature";

/**
 * Zalo Mini App platform webhook — the callback URL registered in the Mini App
 * Center (Bước 2 of a version review request), which Zalo requires before a
 * version can be submitted.
 *
 * It is @Public() because Zalo has no bearer token: the X-ZEvent-Signature
 * header IS the authentication, so a request that fails verification must never
 * reach a write.
 *
 * Two events matter to us:
 *   • the review verdict on a submitted version;
 *   • a worker withdrawing consent and asking for their data to be deleted.
 *
 * Anything else is acknowledged and logged rather than refused — an unknown
 * event is not an error, and a non-2xx would make Zalo retry it forever.
 */

export const EVENT_REVIEW_DONE = "versions.review.done";
// "Sự kiện user rút lại sự đồng ý và xoá dữ liệu" — the event Zalo requires a
// webhook for before a version may be submitted. Payload is exactly:
//   { event, appId, userId, timestamp }   — note: NO phone number.
export const EVENT_USER_REVOKE = "user.revoke.consent";

const REVIEW_APPROVED = 0;

type ZaloEvent = Record<string, unknown> & { event?: string };

@Controller("zalo")
export class ZaloWebhookController {
  private readonly log = new Logger("ZaloWebhook");

  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Post("webhook")
  @HttpCode(200)
  async webhook(
    @Body() payload: ZaloEvent,
    @Headers("x-zevent-signature") signature?: string
  ) {
    // The API Key from Quản lý Zalo App → Open APIs. A DIFFERENT secret from
    // ZALO_APP_SECRET, which /auth/zalo-token uses against graph.zalo.me.
    const apiKey = process.env.ZALO_API_KEY;
    // Fail CLOSED: with no key configured every caller would be trusted, so
    // this must refuse rather than wave the request through (unlike
    // /auth/zalo-token, where a missing secret is a 500 the operator sees).
    if (!apiKey || !signature) throw new UnauthorizedException();
    if (!signatureMatches(zaloSignature(payload, apiKey), signature)) {
      this.log.warn(
        `rejected a webhook with a bad signature: ${payload.event}`
      );
      throw new UnauthorizedException();
    }

    if (payload.event === EVENT_REVIEW_DONE) {
      const approved = payload.status === REVIEW_APPROVED;
      this.log.log(
        `version ${String(payload.versionId)} ${approved ? "APPROVED" : "REJECTED"}` +
          (payload.description ? `: ${String(payload.description)}` : "")
      );
      return { ok: true };
    }

    if (payload.event === EVENT_USER_REVOKE) {
      await this.forgetWorker(payload);
      return { ok: true };
    }

    this.log.log(`unhandled event ${String(payload.event)}`);
    return { ok: true };
  }

  /**
   * Honours a revocation by dropping everything that links this person to their
   * Zalo account — which also revokes their login, since auth.service.ts
   * matches on phone.
   *
   * Their TimekeepingRecord rows are deliberately KEPT. Those are the company's
   * own record of hours worked, not data Zalo provided, and they are the basis
   * for pay; destroying them on a consent withdrawal would delete an employment
   * record the business has to hold. The terms of use say exactly this, and
   * point the worker at the office for anything further.
   */
  private async forgetWorker(payload: ZaloEvent) {
    const userId = payload.userId;
    if (typeof userId !== "string" || !userId) {
      this.log.error(
        `revocation with no userId — handle by hand: ${JSON.stringify(payload)}`
      );
      return;
    }
    const { count } = await this.prisma.crewMember.updateMany({
      where: { zalo_user_id: userId },
      data: { phone: null, zalo_user_id: null },
    });
    if (count > 0) {
      this.log.log(`revocation honoured: unlinked ${count} crew member(s)`);
      return;
    }
    // Expected for anyone who has not logged in since zalo_user_id shipped, and
    // the whole reason this logs loudly rather than returning quietly: a
    // deletion request that silently did nothing is the one unacceptable
    // outcome, so it has to reach a human.
    this.log.error(
      `revocation for an unknown Zalo user ${userId} — no roster row carries ` +
        `this id, so it must be handled by hand (payload: ${JSON.stringify(payload)})`
    );
  }
}

@Module({ controllers: [ZaloWebhookController] })
export class ZaloModule {}
