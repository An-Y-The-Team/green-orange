-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT,
    "tagline" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "tax_id" TEXT,
    "website" TEXT,
    "representative" TEXT,
    "representative_title" TEXT,
    "bank_account" TEXT,
    "bank_name" TEXT,
    "bank_branch" TEXT,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);
