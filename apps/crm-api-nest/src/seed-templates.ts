// Install the built-in document templates — and NOTHING else.
//
// `seed.ts` is dev-only: it writes a whole demo dataset (công trình, báo giá,
// hóa đơn…) and must never touch prod. But the contract templates it carries
// (seed-contract-templates.ts — the real HỢP ĐỒNG THI CÔNG, twelve articles with
// every merge chip already in place) ARE production content: without them the
// template picker is empty and an author retypes the document by hand.
//
// So this script writes only `ContractTemplate`, and is safe to run against a
// live database. On the VPS the runtime image has no bun — run the compiled
// file (see DEPLOY.md §6c):
//
//   docker exec <crm-api-nest> node dist/seed-templates.js
//
// Locally: `bun run seed:templates`.
//
// Matching is by NAME, not id: ids belong to whatever the operators created in
// the UI, and an id-keyed upsert would overwrite someone's own template. An
// existing name is left alone unless `--force` is passed, so a re-run can never
// silently discard edits made in the editor.
import { PrismaClient } from "@prisma/client";

import { CONTRACT_TEMPLATES } from "./seed";

const prisma = new PrismaClient();
const force = process.argv.includes("--force");

async function main(): Promise<void> {
  for (const template of CONTRACT_TEMPLATES) {
    // `id` is deliberately dropped — prod assigns its own from the sequence.
    // `is_active` is left to the column default on create, and untouched on
    // --force, so deactivating a template in the UI survives a re-run.
    const data = {
      name: template.name,
      doc_title: template.doc_title,
      body: template.body,
      show_letterhead: template.show_letterhead,
      show_national: template.show_national,
    };

    const existing = await prisma.contractTemplate.findFirst({
      where: { name: data.name },
    });

    if (!existing) {
      const created = await prisma.contractTemplate.create({ data });
      console.log(`+ tạo mới  #${created.id}  ${data.name}`);
    } else if (force) {
      await prisma.contractTemplate.update({
        where: { id: existing.id },
        data,
      });
      console.log(`~ ghi đè   #${existing.id}  ${data.name}`);
    } else {
      console.log(
        `= giữ nguyên #${existing.id}  ${data.name} ` +
          `(dùng --force để ghi đè bằng bản mới nhất)`
      );
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
