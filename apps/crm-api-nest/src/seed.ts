// Seed the local demo user + a little live data. Run: `bun run seed`.
// Idempotent-ish: the admin user is upserted; demo rows only load into empty tables.
import { hash } from "@node-rs/argon2";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

  if ((await prisma.client.count()) === 0) {
    await prisma.client.createMany({
      data: [
        {
          name: "Công ty TNHH An Phát",
          email: "lienhe@anphat.vn",
          phone: "0901234567",
          company: "An Phát",
          status: "active",
        },
        {
          name: "Chung cư Sunrise",
          email: "bql@sunrise.vn",
          phone: "0912345678",
          company: "Sunrise BQL",
          status: "lead",
        },
      ],
    });
  }

  if ((await prisma.project.count()) === 0) {
    await prisma.project.create({
      data: {
        code: "CT-2026-001",
        name: "Vệ sinh định kỳ Sunrise",
        client: "Chung cư Sunrise",
        type: "ve_sinh",
        address: "123 Nguyễn Huệ, Q1, TP.HCM",
        stage: "thi_cong",
        manager: "Trần Văn B",
        contract_value: 120_000_000n,
        estimated_cost: 80_000_000n,
        progress: 40,
        start_date: new Date("2026-06-01"),
      },
    });
  }

  if ((await prisma.crewMember.count()) === 0) {
    await prisma.crewMember.createMany({
      data: [
        {
          name: "Nguyễn Văn C",
          phone: "0987654321",
          role: "tho_chinh",
          day_rate: 450_000n,
          status: "dang_lam",
        },
        {
          name: "Lê Thị D",
          phone: "0976543210",
          role: "ve_sinh",
          day_rate: 350_000n,
          status: "dang_lam",
        },
      ],
    });
  }

  console.log("✓ Seeded crm_nest (user + demo data).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
