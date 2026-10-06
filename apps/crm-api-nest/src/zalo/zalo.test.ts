// The Zalo platform webhook. What must not regress:
//   • the signature IS the authentication — a bad or absent one must never
//     reach a database write, and a missing secret must fail CLOSED;
//   • a withdrawal unlinks the worker's Zalo identity but KEEPS their hours,
//     which are the company's employment records, not Zalo's data;
//   • an unresolvable withdrawal is loudly surfaced, never silently dropped;
//   • an unknown event is acknowledged, because a non-2xx makes Zalo retry it
//     forever.
import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";

import type { PrismaService } from "../prisma/prisma.service";
import { signatureMatches, zaloSignature } from "./zalo-signature";
import {
  EVENT_REVIEW_DONE,
  EVENT_USER_REVOKE,
  ZaloWebhookController,
} from "./zalo.module";

const API_KEY = "zalo-open-api-key";
const env = process.env.ZALO_API_KEY;
afterEach(() => {
  if (env === undefined) delete process.env.ZALO_API_KEY;
  else process.env.ZALO_API_KEY = env;
});

const fake = () => {
  const updates: Record<string, unknown>[] = [];
  const prisma = {
    crewMember: {
      updateMany: async (args: Record<string, unknown>) => {
        updates.push(args);
        return { count: 1 };
      },
    },
  } as unknown as PrismaService;
  return { prisma, updates };
};

const send = (
  payload: Record<string, unknown>,
  opts: { signature?: string; secret?: string | null } = {}
) => {
  const { prisma, updates } = fake();
  if (opts.secret === null) delete process.env.ZALO_API_KEY;
  else process.env.ZALO_API_KEY = opts.secret ?? API_KEY;
  const signature =
    opts.signature ?? zaloSignature(payload, opts.secret ?? API_KEY);
  return {
    updates,
    run: new ZaloWebhookController(prisma).webhook(payload, signature),
  };
};

describe("zaloSignature", () => {
  test("is stable regardless of the order fields arrive in", () => {
    const a = zaloSignature({ event: "x", appId: "1", timestamp: 2 }, API_KEY);
    const b = zaloSignature({ timestamp: 2, appId: "1", event: "x" }, API_KEY);
    expect(a).toBe(b);
  });

  test("changes when any field or the secret changes", () => {
    const base = zaloSignature({ event: "x", appId: "1" }, API_KEY);
    expect(zaloSignature({ event: "y", appId: "1" }, API_KEY)).not.toBe(base);
    expect(zaloSignature({ event: "x", appId: "1" }, "other")).not.toBe(base);
  });

  test("comparison rejects a length mismatch without throwing", () => {
    expect(signatureMatches("abc", "ab")).toBe(false);
    expect(signatureMatches("abc", "abc")).toBe(true);
  });
});

describe("POST /zalo/webhook — authentication", () => {
  // Zalo's documented payload shape — note there is no phone number in it.
  const withdrawal = {
    event: EVENT_USER_REVOKE,
    appId: "2646373759294038927",
    userId: "4047671499938107249",
    timestamp: 1670553442564,
  };

  test("a correctly signed withdrawal is honoured", async () => {
    const { run, updates } = send(withdrawal);
    await expect(run).resolves.toEqual({ ok: true });
    expect(updates).toHaveLength(1);
  });

  // The whole security model: without this, anyone who finds the public URL
  // could unlink any worker by guessing their number.
  test("a forged signature reaches no write", async () => {
    const { run, updates } = send(withdrawal, { signature: "deadbeef" });
    await expect(run).rejects.toThrow();
    expect(updates).toHaveLength(0);
  });

  test("a missing signature header reaches no write", async () => {
    const { prisma, updates } = fake();
    process.env.ZALO_API_KEY = API_KEY;
    await expect(
      new ZaloWebhookController(prisma).webhook(withdrawal, undefined)
    ).rejects.toThrow();
    expect(updates).toHaveLength(0);
  });

  // Fails CLOSED. An unset secret must not mean "trust everyone".
  test("no configured secret refuses every caller", async () => {
    const { run, updates } = send(withdrawal, { secret: null });
    await expect(run).rejects.toThrow();
    expect(updates).toHaveLength(0);
  });

  // A signature made with a different secret is the same class as a forgery.
  test("a signature from the wrong secret is refused", async () => {
    const payload = { ...withdrawal };
    const { prisma, updates } = fake();
    process.env.ZALO_API_KEY = API_KEY;
    await expect(
      new ZaloWebhookController(prisma).webhook(
        payload,
        zaloSignature(payload, "attacker-secret")
      )
    ).rejects.toThrow();
    expect(updates).toHaveLength(0);
  });
});

describe("POST /zalo/webhook — handling", () => {
  test("a revocation unlinks the Zalo identity but keeps the hours", async () => {
    const { run, updates } = send({
      event: EVENT_USER_REVOKE,
      appId: "123",
      userId: "4047671499938107249",
      timestamp: 1,
    });
    await run;
    // Only the Zalo link is cleared. Nothing touches TimekeepingRecord, which
    // is the company's own record of work done and the basis for pay.
    expect(updates[0]).toEqual({
      where: { zalo_user_id: "4047671499938107249" },
      data: { phone: null, zalo_user_id: null },
    });
  });

  // Expected for anyone who has not logged in since zalo_user_id shipped. It
  // must still ack (or Zalo retries forever) while surfacing loudly enough that
  // the office can act — a deletion request that silently did nothing is the
  // one unacceptable outcome.
  test("a revocation for an unknown user writes nothing and still acks", async () => {
    const { prisma, updates } = (() => {
      const u: Record<string, unknown>[] = [];
      return {
        updates: u,
        prisma: {
          crewMember: {
            updateMany: async (args: Record<string, unknown>) => {
              u.push(args);
              return { count: 0 };
            },
          },
        } as unknown as PrismaService,
      };
    })();
    process.env.ZALO_API_KEY = API_KEY;
    const payload = {
      event: EVENT_USER_REVOKE,
      appId: "1",
      userId: "nobody",
      timestamp: 1,
    };
    await expect(
      new ZaloWebhookController(prisma).webhook(
        payload,
        zaloSignature(payload, API_KEY)
      )
    ).resolves.toEqual({ ok: true });
    expect(updates).toHaveLength(1); // attempted, matched nothing
  });

  test("a revocation with no userId writes nothing and still acks", async () => {
    const { run, updates } = send({
      event: EVENT_USER_REVOKE,
      appId: "1",
      timestamp: 1,
    });
    await expect(run).resolves.toEqual({ ok: true });
    expect(updates).toHaveLength(0);
  });

  test("the review verdict is acknowledged without touching the database", async () => {
    const { run, updates } = send({
      event: EVENT_REVIEW_DONE,
      appId: "123",
      versionId: 101,
      status: 0,
      description: "",
      timestamp: 1,
    });
    await expect(run).resolves.toEqual({ ok: true });
    expect(updates).toHaveLength(0);
  });

  // 200, not 4xx: an unknown event is not our error, and a non-2xx would make
  // Zalo retry it indefinitely.
  test("an unknown event is acknowledged, not refused", async () => {
    const { run } = send({ event: "something.new", timestamp: 1 });
    await expect(run).resolves.toEqual({ ok: true });
  });
});

// Pinned against Zalo's own reference implementation ("Hướng dẫn verify
// signature", 27/9/2026) using the exact example payload from its docs.
describe("zaloSignature — the documented contract", () => {
  const documented = {
    event: "versions.review.done",
    appId: "2646373759294038927",
    versionId: 101,
    status: 0,
    description: "",
    timestamp: 1670553442564,
  };

  // Sorted keys are appId, description, event, status, timestamp, versionId.
  test("concatenates values in alphabetical key order", () => {
    const content =
      "2646373759294038927" +
      "" +
      "versions.review.done" +
      "0" +
      "1670553442564" +
      "101";
    const expected = createHash("sha256")
      .update(content + API_KEY)
      .digest("hex");
    expect(zaloSignature(documented, API_KEY)).toBe(expected);
  });

  // typeof null === "object", so the reference stringifies it to "null".
  // Mapping it to "" instead would break verification on any payload with a
  // null field, and the mismatch would look like a wrong key.
  test('a null field contributes "null", not an empty string', () => {
    expect(zaloSignature({ a: null }, API_KEY)).toBe(
      zaloSignature({ a: "null" as unknown as null }, API_KEY)
    );
    expect(zaloSignature({ a: null }, API_KEY)).not.toBe(
      zaloSignature({ a: "" }, API_KEY)
    );
  });

  // String({}) is "[object Object]" — the reference JSON.stringifies instead.
  test("an object field is JSON-stringified, not coerced", () => {
    expect(zaloSignature({ a: { b: 1 } }, API_KEY)).toBe(
      zaloSignature({ a: '{"b":1}' as unknown as object }, API_KEY)
    );
  });

  test("the digest is lowercase hex", () => {
    expect(zaloSignature(documented, API_KEY)).toMatch(/^[0-9a-f]{64}$/);
  });
});
