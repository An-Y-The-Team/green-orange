// List filters/search/sort build ONE `where` shared by rows and count, and the
// sort whitelist maps to Prisma orderBy with the id tiebreak. Unit-tested
// against a fake Prisma — the csv/400 pipe behavior lives in
// common/list-query.test.ts.
import { describe, expect, test } from "bun:test";
import type { Response } from "express";

import type { PrismaService } from "../prisma/prisma.service";
import { ClientsController } from "./clients.module";

// The captured Prisma call args — only what the assertions read.
type ListArgs = { where: Record<string, unknown>; orderBy: unknown };
// The list DTO isn't exported; the handler signature carries it.
type ListQuery = Parameters<ClientsController["list"]>[1];

describe("client list — filters, search, sort", () => {
  const capture = () => {
    const findMany: ListArgs[] = [];
    const counts: ListArgs[] = [];
    const prisma = {
      client: {
        findMany: async (args: ListArgs) => {
          findMany.push(args);
          return [];
        },
        count: async (args: ListArgs) => {
          counts.push(args);
          return 0;
        },
      },
    } as unknown as PrismaService;
    const res = { setHeader: () => undefined } as unknown as Response;
    return {
      findMany,
      counts,
      list: (q: ListQuery) => new ClientsController(prisma).list(res, q),
    };
  };

  test("type csv lands as `in` on BOTH queries", async () => {
    const { findMany, counts, list } = capture();
    await list({ type: ["company", "individual"] });
    expect(findMany[0]?.where.type).toEqual({
      in: ["company", "individual"],
    });
    expect(counts[0]?.where).toBe(findMany[0]?.where as never);
  });

  test("search ORs name and tax_code, case-insensitively", async () => {
    const { findMany, list } = capture();
    await list({ search: "cty" });
    expect(findMany[0]?.where.OR).toEqual([
      { name: { contains: "cty", mode: "insensitive" } },
      { tax_code: { contains: "cty", mode: "insensitive" } },
    ]);
  });

  test("whitelisted sort gets the id tiebreak", async () => {
    const { findMany, list } = capture();
    await list({ sort_by: "name", sort_order: "desc" });
    expect(findMany[0]?.orderBy).toEqual([{ name: "desc" }, { id: "desc" }]);
  });

  test("no sort keeps the historical id asc order", async () => {
    const { findMany, list } = capture();
    await list({});
    expect(findMany[0]?.orderBy).toEqual([{ id: "asc" }]);
  });
});
