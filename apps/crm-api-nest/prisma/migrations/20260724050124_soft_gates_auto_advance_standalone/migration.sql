-- DropForeignKey
ALTER TABLE "Contract" DROP CONSTRAINT "Contract_project_id_fkey";

-- DropForeignKey
ALTER TABLE "Quote" DROP CONSTRAINT "Quote_project_id_fkey";

-- AlterTable
ALTER TABLE "Contract" ALTER COLUMN "project_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Quote" ALTER COLUMN "project_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
