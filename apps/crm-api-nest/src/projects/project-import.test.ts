// POST /projects/import (bun test, fake prisma, no DB). What must not regress:
// the whole file lands in ONE transaction, ids from the request are checked
// against the client, and the money is rejected before anything is written.
import { describe, expect, test } from "bun:test";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { ImportProjectDto, ProjectImportController } from "./project-import";

const QUOTE = {
  items: [
    {
      category: "I. CHUẨN BỊ",
      description: "Bảo hiểm",
      unit: "gói",
      quantity: 1,
      unit_price: 2_000_000,
    },
    { description: "Tháo trần", unit: "m2", quantity: 120, unit_price: 85_000 },
  ],
  vat_rate: 0.08,
  discount_amount: 200_000,
};

const BASE = {
  client: {
    name: "CÔNG TY BÌNH MINH",
    type: "company",
    tax_code: "0309554620",
  },
  contact: { name: "Trần Khánh Vân", title: "PTGĐ", phone: "0912345678" },
  location: { name: "Bread Talk", address: "72 Lê Thánh Tôn" },
  name: "Bread Talk",
  type_ids: [1],
  stage: "quote",
  request_note: "Nhập từ báo giá",
  quote: QUOTE,
};

/** Every write lands in `log` as [model.op, data]; `transactions` counts $transaction calls. */
function fake(
  existing: { clients?: any[]; contacts?: any[]; locations?: any[] } = {}
) {
  const log: [string, any][] = [];
  let transactions = 0;
  let id = 100;
  const model = (name: string, rows: any[] = []) => ({
    create: async ({ data }: any) => {
      log.push([`${name}.create`, data]);
      return { id: ++id, ...data };
    },
    createMany: async ({ data }: any) => log.push([`${name}.createMany`, data]),
    findUnique: async ({ where }: any) =>
      rows.find((r) => r.id === where.id) ?? null,
    findMany: async () => [],
  });
  const tx = {
    client: model("client", existing.clients),
    contact: model("contact", existing.contacts),
    location: model("location", existing.locations),
    project: model("project"),
    paperworkItem: model("paperworkItem"),
    quote: model("quote"),
    settlement: model("settlement"),
    bill: model("bill"),
  };
  const prisma = {
    $transaction: async (fn: any) => {
      transactions++;
      return fn(tx);
    },
  } as any;
  return { prisma, log, transactions: () => transactions };
}

const ops = (log: [string, any][]) => log.map(([op]) => op);

describe("POST /projects/import", () => {
  test("new client, contact and site → one transaction, quote v1 waiting", async () => {
    const { prisma, log, transactions } = fake();
    const project: any = await new ProjectImportController(prisma).import(
      BASE as any
    );

    expect(transactions()).toBe(1);
    expect(ops(log)).toEqual([
      "client.create",
      "contact.create",
      "location.create",
      "project.create",
      "paperworkItem.createMany",
      "quote.create",
    ]);
    const [, contact] = log[1]!;
    const [, location] = log[2]!;
    expect(contact.client_id).toBe(101);
    // The new site is managed by the new contact, who also runs the job.
    expect(location.manager_contact_id).toBe(102);
    expect(project.working_contact_id).toBe(102);
    expect(project.decision_maker_contact_id).toBe(102);
    expect(project.stage).toBe("quote");
    expect(project.code).toMatch(/^CT-\d{4}-001$/);

    const [, quote] = log[5]!;
    expect(quote).toMatchObject({
      project_id: project.id,
      version: 1,
      status: "waiting",
      total_amount: 12_200_000n,
      discount_amount: 200_000n,
      vat_rate: 0.08,
    });
    expect(quote.items.create.map((r: any) => r.category)).toEqual([
      "I. CHUẨN BỊ",
      null,
    ]);
  });

  test("existing client + site: nothing re-created, manager runs the job", async () => {
    const { prisma, log } = fake({
      clients: [{ id: 7 }],
      locations: [{ id: 9, client_id: 7, manager_contact_id: 33 }],
    });
    const project: any = await new ProjectImportController(prisma).import({
      ...BASE,
      client: { id: 7 },
      contact: undefined,
      location: { id: 9 },
    } as any);
    expect(ops(log)).toEqual([
      "project.create",
      "paperworkItem.createMany",
      "quote.create",
    ]);
    expect(project).toMatchObject({
      client_id: 7,
      location_id: 9,
      working_contact_id: 33,
    });
  });

  test("a site of another client is refused", () =>
    expect(
      new ProjectImportController(
        fake({ clients: [{ id: 7 }], locations: [{ id: 9, client_id: 8 }] })
          .prisma
      ).import({ ...BASE, client: { id: 7 }, location: { id: 9 } } as any)
    ).rejects.toThrow(/does not belong to the client/));

  test("settled job: quote chốt, quyết toán + draft bill in the same transaction", async () => {
    const { prisma, log, transactions } = fake();
    await new ProjectImportController(prisma).import({
      ...BASE,
      stage: "settlement",
      settlement: {
        items: [
          {
            description: "Tháo trần",
            unit: "m2",
            quantity: 110,
            unit_price: 85_000,
          },
        ],
        vat_rate: 0.08,
        discount_amount: 0,
      },
    } as any);
    expect(transactions()).toBe(1);
    expect(ops(log).slice(-3)).toEqual([
      "quote.create",
      "settlement.create",
      "bill.create",
    ]);
    expect(log.find(([op]) => op === "quote.create")![1].status).toBe("deal");
    expect(
      log.find(([op]) => op === "settlement.create")![1].total_amount
    ).toBe(9_350_000n);
  });

  test("bad money or a settlement before its stage writes nothing", async () => {
    const over = fake();
    await expect(
      new ProjectImportController(over.prisma).import({
        ...BASE,
        quote: { ...QUOTE, discount_amount: 12_200_001 },
      } as any)
    ).rejects.toThrow(/exceeds the báo giá subtotal/);
    expect(over.transactions()).toBe(0);

    const early = fake();
    await expect(
      new ProjectImportController(early.prisma).import({
        ...BASE,
        settlement: { items: QUOTE.items, vat_rate: 0.08 },
      } as any)
    ).rejects.toThrow(/only imported at stage settlement/);
    expect(early.transactions()).toBe(0);
  });
});

describe("ImportProjectDto", () => {
  // Paths of the failing properties, nested ones included.
  const invalid = async (body: object) => {
    const errors = await validate(plainToInstance(ImportProjectDto, body));
    const paths = (es: typeof errors, at = ""): string[] =>
      es.flatMap((e) => [
        ...(e.constraints ? [`${at}${e.property}`] : []),
        ...paths(e.children ?? [], `${at}${e.property}.`),
      ]);
    return paths(errors);
  };

  test("a full new-everything body passes", async () =>
    expect(await invalid(BASE)).toEqual([]));

  test("an id stands in for the fields", async () =>
    expect(
      await invalid({
        ...BASE,
        client: { id: 7 },
        contact: { id: 3 },
        location: { id: 9 },
      })
    ).toEqual([]));

  test("a new site needs its address; a stage outside quote…settlement is refused", async () =>
    expect(
      await invalid({ ...BASE, location: { name: "x" }, stage: "closed" })
    ).toEqual(["location.address", "stage"]));

  test("the quote is required and needs a line", async () => {
    expect(await invalid({ ...BASE, quote: undefined })).toEqual(["quote"]);
    expect(await invalid({ ...BASE, quote: { ...QUOTE, items: [] } })).toEqual([
      "quote.items",
    ]);
  });
});
