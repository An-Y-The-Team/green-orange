// Seed the local demo user + v2 baseline data. Run: `bun run seed`.
// Idempotent-ish: the admin user is upserted; lookup tables (project types,
// crew roles) are upserted by name; demo rows only load into empty tables.
import { hash } from "@node-rs/argon2";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PROJECT_TYPES = ["Vệ sinh", "Thi công", "Tháo dỡ"];
const CREW_ROLES = [
  "Thợ chính",
  "Thợ phụ",
  "Nhân viên vệ sinh",
  "Giám sát",
  "Lái xe",
];

async function main() {
  const username = process.env.SEED_USER ?? "admin";
  const password = process.env.SEED_PASSWORD ?? "admin";
  await prisma.user.upsert({
    where: { username },
    update: { hashed_password: await hash(password), disabled: false },
    create: {
      username,
      hashed_password: await hash(password),
      full_name: "Quản trị viên",
    },
  });

  for (const name of PROJECT_TYPES) {
    await prisma.projectType.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of CREW_ROLES) {
    await prisma.crewRole.upsert({ where: { name }, update: {}, create: { name } });
  }

  if ((await prisma.client.count()) === 0) {
    const client = await prisma.client.create({
      data: {
        name: "Công ty TNHH An Phát",
        type: "company",
        tax_code: "0312345678",
        contacts: {
          create: [
            {
              name: "Trần Văn B",
              phone: "0912345678",
              title: "Quản lý tòa nhà",
            },
          ],
        },
      },
      include: { contacts: true },
    });
    const manager = client.contacts[0];
    const location = await prisma.location.create({
      data: {
        client_id: client.id,
        name: "Tòa nhà An Phát Q1",
        address: "123 Nguyễn Huệ, Q1, TP.HCM",
        manager_contact_id: manager.id,
      },
    });

    const veSinh = await prisma.projectType.findUniqueOrThrow({
      where: { name: "Vệ sinh" },
    });
    await prisma.project.create({
      data: {
        code: "CT-2026-001",
        name: "Vệ sinh kính mặt ngoài An Phát Q1",
        client_id: client.id,
        location_id: location.id,
        working_contact_id: manager.id,
        decision_maker_contact_id: manager.id,
        stage: "quote",
        appointment_at: new Date("2026-07-20T09:00:00+07:00"),
        visit_date: new Date("2026-07-20"),
        survey_note: "Kính 12 tầng, mặt tiền + 2 mặt bên. Cần dây đu.",
        types: { connect: { id: veSinh.id } },
        quotes: {
          create: {
            version: 1,
            status: "draft",
            total_amount: 36_000_000n,
            items: {
              create: [
                {
                  description: "Vệ sinh kính mặt ngoài (dây đu)",
                  unit: "m²",
                  quantity: 1200,
                  unit_price: 30_000n,
                  amount: 36_000_000n,
                  sort_order: 0,
                },
              ],
            },
          },
        },
      },
    });
  }

  console.log("✓ Seeded crm_nest (user, lookups, demo client/project).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
